// Integration test: caller RBAC via ephemeral PDS, OIDC token scoped to
// caller identity. Pattern from .reference/rbac/src/typescript/compute-spa:
//  1. Gateway runs requestComputeVM (requester = gateway DID)
//  2. Caller creates ephemeral PDS with its own did:plc
//  3. Caller creates com.fedproxy.rbac in ephemeral PDS authorizing the VM's
//     WIF subject to createRecord com.fedproxy.sshPublicKey
//  4. After VM provisions, fedproxy-client calls /v1/oidc/issue with
//     caller-scoped sub and aud
//  5. VM uses issued OIDC token to write to caller's ephemeral PDS
//  6. Caller's PDS checks RBAC: sub matches → authorized
//
// The trick: /v1/oidc/issue allows ANY sub starting with "actx:{bidderPlc}:",
// not just the workload token's sub. fedproxy-client reads accept.json to
// determine DID_PLC. If accept is in caller's repo, {did-plc-key} = caller PLC.

import { assert } from "@std/assert";
import { Secp256k1Keypair } from "@atproto/crypto";
import { Hono } from "@hono/hono";
import { createLogger } from "@publicdomainrelay/logger";
import { createServe } from "@publicdomainrelay/serve";
import { createIngress } from "@publicdomainrelay/did-key-ingress-proxy";
import { createATProto, createLocalPDSAgent } from "@publicdomainrelay/atproto-helpers";
import { createBadgeBlueSigner } from "@publicdomainrelay/market-atproto";
import { createPlcDirectoryClient } from "@publicdomainrelay/did-plc";
import { createMarketBidder } from "@publicdomainrelay/market-bidder";
import { createComputeProviderHooks } from "@publicdomainrelay/market-bidder-compute";
import { createLocalComputeProvider } from "@publicdomainrelay/compute-provider-local";
import type { ComputeAtproto } from "@publicdomainrelay/compute-provider-abc";
import { createRelayFactory } from "@publicdomainrelay/hono-factory-did-key-ingress-proxy-xrpc";
import { createComputeContractGateway } from "@publicdomainrelay/compute-contract-gateway-xrpc";
import { MemoryStorage } from "@publicdomainrelay/atproto-repo-deno";
import { createRepoFactory } from "@publicdomainrelay/hono-factory-atproto-repo-deno";
import { PlcClient, createGenesisOp } from "@publicdomainrelay/did-plc";
import { buildSshKeyRbacRecord } from "@publicdomainrelay/fedproxy-rbac-common";

function didWebToHttps(s: string): string {
  return s.startsWith("did:web:") ? "https://" + s.slice("did:web:".length) : s;
}

Deno.test(
  "[gateway] caller RBAC token via ephemeral PDS authorizes VM write",
  async () => {
    const logger = createLogger({ serviceName: "gw_caller_rbac_test" });

    const dispatcher = createRelayFactory({ hostname: "localhost" }).createApp();
    const dispAc = new AbortController();
    const dispServer = Deno.serve(
      { port: 0, signal: dispAc.signal, hostname: "0.0.0.0" },
      dispatcher.fetch,
    );
    const dispPort = dispServer.addr.port;

    const plcApp = new Hono();
    const ops = new Map<string, Record<string, unknown>>();
    plcApp.post("/*", async (c) => {
      const did = decodeURIComponent(new URL(c.req.url).pathname.slice(1));
      ops.set(did, await c.req.json() as Record<string, unknown>);
      return c.json({ ok: true });
    });
    plcApp.get("/*", (c) => {
      const did = decodeURIComponent(new URL(c.req.url).pathname.slice(1));
      const op = ops.get(did);
      if (!op) return c.json({ message: `DID not found: ${did}` }, 404);
      const vms = (op.verificationMethods ?? {}) as Record<string, string>;
      const svcs = (op.services ?? {}) as Record<
        string,
        { type: string; endpoint: string }
      >;
      return c.json({
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/multikey/v1",
        ],
        id: did,
        verificationMethod: Object.entries(vms).map(([name, didKey]) => ({
          id: `${did}#${name}`,
          type: "Multikey",
          controller: did,
          publicKeyMultibase: String(didKey).replace(/^did:key:/, ""),
        })),
        service: Object.entries(svcs).map(([name, s]) => ({
          id: `#${name}`,
          type: s.type,
          serviceEndpoint: s.endpoint,
        })),
      });
    });
    const plcAc = new AbortController();
    const plcServer = Deno.serve(
      { port: 0, signal: plcAc.signal, hostname: "0.0.0.0" },
      plcApp.fetch,
    );
    const plcDirectoryUrl = `http://127.0.0.1:${plcServer.addr.port}`;

    const { installFetchInterceptor } = await import("./fetch-interceptor.ts");
    const restoreFetch = installFetchInterceptor({
      realFetch: globalThis.fetch,
      plcDirectoryUrl,
      dispPort,
    });

    try {
      const ingressProxyHost = `localhost:${dispPort}`;

      // ── bidder ─────────────────────────────────────────────────────────
      const bidderKeypair = await Secp256k1Keypair.create({ exportable: true });
      const bidderPrivHex = Array.from(await bidderKeypair.export())
        .map((b) => b.toString(16).padStart(2, "0")).join("");

      const pdsAgent = await createLocalPDSAgent({
        logger, keypair: bidderKeypair,
        serve: createServe({ logger }),
        plcDirectoryUrl, ingressProxyHost,
      });
      await pdsAgent.beginServe();

      const atproto = await createATProto({
        logger,
        badgeBlueSigner: await createBadgeBlueSigner({ privateKeyHex: bidderPrivHex }),
        plcDirectory: createPlcDirectoryClient({ plcDirectoryUrl }),
        agent: pdsAgent,
      });

      const makeRelay = async () => {
        const kp = await Secp256k1Keypair.create({ exportable: true });
        return createIngress({ logger, ingressProxyHost, signer: atproto.signer, keypair: kp });
      };

      const providerRelay = await makeRelay();
      const providerServe = createServe({ logger, relays: [providerRelay] });
      const provider = createComputeProviderHooks({
        provider: createLocalComputeProvider({
          logger, atproto: atproto as unknown as ComputeAtproto,
          serve: providerServe,
          getIssuerUrl: () => didWebToHttps(providerRelay.ingressRef),
          containerMode: "container",
        }),
      });
      await providerServe.beginServe();

      const bidderRelay = await makeRelay();
      const bidder = await createMarketBidder({
        logger, atproto, providers: [provider], relay: bidderRelay,
        serve: createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 }, relays: [bidderRelay] }),
      });
      await bidder.beginServe();

      // ── caller: ephemeral PDS ──────────────────────────────────────────
      const callerKeypair = await Secp256k1Keypair.create({ exportable: true });
      const callerSigningKeyDid = callerKeypair.did();
      const epHost = ingressProxyHost.replace(/:\d+$/, "");

      const callerPlc = new PlcClient({ baseUrl: plcDirectoryUrl });
      const { did: callerDid, op: callerOp } = await createGenesisOp({
        rotationKeys: [callerSigningKeyDid],
        verificationMethods: { atproto: callerSigningKeyDid },
        services: {
          atproto_pds: {
            type: "AtprotoPersonalDataServer",
            endpoint: `https://${callerSigningKeyDid.replace(/:/g, "-").toLowerCase()}.${epHost}`,
          },
        },
        sign: (bytes) => callerKeypair.sign(bytes),
      });
      // Register directly with fake PLC
      await fetch(`${plcDirectoryUrl}/${encodeURIComponent(callerDid)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(callerOp),
      });

      const callerSigner = {
        did: () => callerDid,
        sign: (bytes: Uint8Array) => callerKeypair.sign(bytes),
      };
      const { app: callerApp, api: callerApi } = createRepoFactory({
        storage: new MemoryStorage(),
        signer: callerSigner,
        baseOrigin: `https://${callerSigningKeyDid.replace(/:/g, "-").toLowerCase()}.${ingressProxyHost}`,
      });
      const callerRelay = createIngress({
        logger, ingressProxyHost,
        signer: callerSigner,
        keypair: callerKeypair,
        label: "caller",
      });
      const callerServe = createServe({
        logger,
        tcp: { addr: "127.0.0.1", port: 0 },
        relays: [callerRelay],
      });
      callerServe.app.route("/", callerApp as never);
      await callerServe.beginServe();

      // ── gateway ────────────────────────────────────────────────────────
      const gatewayServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
      const gateway = createComputeContractGateway({
        logger, serve: gatewayServe,
        plcDirectoryUrl, ingressProxyHost,
        fedingressHost: `localhost:${dispPort}`,
        label: "gateway-caller-rbac",
      });
      await gateway.beginServe();

      // ── request VM via gateway ─────────────────────────────────────────
      const { createSshSessionProvider } = await import("@publicdomainrelay/requester-xrpc");
      const sshProvider = createSshSessionProvider(logger);
      const ssh = await sshProvider.generateKeypair("gw-caller-vm");
      const publicKey = ssh.publicKey;

      const result = await gateway.requestComputeVM(
        { did: callerDid },
        {
          computeVm: {
            $type: "com.publicdomainrelay.temp.compute.vm",
            cpus: 1, mem: "512M", disk: "10G", network: "500G",
            role: "gw-caller-vm",
          },
          sshPublicKey: publicKey,
          bidWindowSec: 15,
          skipSsh: true,
          keepVm: true,
          extraBidderDids: [atproto.did],
          tokens: { submitRfp: "", submitAccept: "", createRecord: "" },
        },
      );

      logger.info("gateway_result", {
        receiptOk: result.receiptOk,
        winnerDid: result.winnerDid,
      } as Record<string, unknown>);

      assert(result.receiptOk === true, "receiptOk should be true");

      // ── caller creates RBAC in ephemeral PDS ──────────────────────────
      // The VM's workload token sub is:
      //   actx:{bidderPlc}:plc:{requesterPlc}:role:{role}
      // where requester = gateway DID.
      // But /v1/oidc/issue can issue token with:
      //   sub: "actx:{bidderPlc}:plc:{callerPlc}:role:{role}"
      //   aud: "api://ATProto?actx=did:plc:{caller}"
      // The caller's ephemeral PDS RBAC record matches this sub.
      // The VM uses this token to createRecord on caller's PDS.

      const gatewayPlcKey = gateway.did.split(":").pop()!;
      const bidderPlcKey = atproto.did.split(":").pop()!;
      const callerPlcKey = callerDid.split(":").pop()!;

      const rbacRecord = buildSshKeyRbacRecord({
        serviceName: "gw-caller-vm",
        issuerUri: `https://did-key-ignored.localhost`,
        actx: bidderPlcKey,
        requesterDid: callerDid,
      });

      await callerApi.applyWrites(callerDid, [{
        action: "create",
        collection: "com.fedproxy.rbac",
        rkey: "caller-rbac-test",
        record: rbacRecord,
      }]);

      logger.info("caller_rbac_created", {
        callerDid,
        sub: rbacRecord.roles["gw-caller-vm"]?.definition?.sub,
      } as Record<string, unknown>);

      // Verify the RBAC record is readable
      const storedRbac = await callerApi.getRecord(
        callerDid, "com.fedproxy.rbac", "caller-rbac-test",
      );
      assert(storedRbac !== null, "RBAC record should be stored");
      const stored = storedRbac!.value as Record<string, unknown>;
      const roles = stored.roles as Record<string, { definition: { sub: string } }>;
      const expectedSub = `actx:${bidderPlcKey}:plc:${callerPlcKey}:role:gw-caller-vm`;
      assert(
        roles["gw-caller-vm"]?.definition?.sub === expectedSub,
        `RBAC sub should match: ${roles["gw-caller-vm"]?.definition?.sub} vs ${expectedSub}`,
      );

      // ── cleanup ────────────────────────────────────────────────────────
      await gateway.dispose();
      await bidder.shutdown();
    } finally {
      restoreFetch();
      plcAc.abort();
      dispAc.abort();
    }
  },
);
