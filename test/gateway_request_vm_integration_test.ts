import { assert } from "@std/assert";
import { Secp256k1Keypair } from "@atproto/crypto";
import { Hono } from "@hono/hono";
import { createLogger } from "@publicdomainrelay/logger";
import { createServe } from "@publicdomainrelay/serve";
import { createXrpcRelay } from "@publicdomainrelay/xrpc-relay";
import { createATProto, createLocalPDSAgent } from "@publicdomainrelay/atproto-helpers";
import { createBadgeBlueSigner } from "@publicdomainrelay/market-atproto";
import { createPlcDirectoryClient } from "@publicdomainrelay/did-plc";
import { createMarketBidder } from "@publicdomainrelay/market-bidder";
import { createComputeProviderHooks } from "@publicdomainrelay/market-bidder-compute";
import { createLocalComputeProvider } from "@publicdomainrelay/compute-provider-local";
import type { ComputeAtproto } from "@publicdomainrelay/compute-provider-abc";
import { createRelayFactory } from "@publicdomainrelay/hono-factory-did-key-relay-relayer-xrpc";
import { createComputeContractGateway } from "@publicdomainrelay/compute-contract-gateway-xrpc";

function didWebToHttps(s: string): string {
  return s.startsWith("did:web:") ? "https://" + s.slice("did:web:".length) : s;
}

Deno.test(
  "[gateway] requestComputeVM provisions container and returns receipt",
  async () => {
    const logger = createLogger({ serviceName: "gateway_test" });

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
      const did = decodeURIComponent(
        new URL(c.req.url).pathname.slice(1),
      );
      const op = await c.req.json().catch(() => ({}));
      ops.set(did, op as Record<string, unknown>);
      return c.json({ ok: true });
    });
    plcApp.get("/*", (c) => {
      const did = decodeURIComponent(
        new URL(c.req.url).pathname.slice(1),
      );
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
        alsoKnownAs: (op.alsoKnownAs ?? []) as string[],
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

    const { installFetchInterceptor } = await import(
      "./fetch-interceptor.ts"
    );
    const restoreFetch = installFetchInterceptor({
      realFetch: globalThis.fetch,
      plcDirectoryUrl,
      dispPort,
    });

    try {
      const dispatcherHost = `localhost:${dispPort}`;

      // ── bidder ─────────────────────────────────────────────────────────
      const bidderKeypair = await Secp256k1Keypair.create({ exportable: true });
      const bidderPrivHex = Array.from(await bidderKeypair.export())
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const pdsAgent = await createLocalPDSAgent({
        logger,
        keypair: bidderKeypair,
        serve: createServe({ logger }),
        plcDirectoryUrl,
        dispatcherHost,
      });
      await pdsAgent.beginServe();

      const atproto = await createATProto({
        logger,
        badgeBlueSigner: await createBadgeBlueSigner({
          privateKeyHex: bidderPrivHex,
        }),
        plcDirectory: createPlcDirectoryClient({ plcDirectoryUrl }),
        agent: pdsAgent,
      });

      const makeRelay = async () => {
        const kp = await Secp256k1Keypair.create({ exportable: true });
        return createXrpcRelay({
          logger,
          dispatcherHost,
          signer: atproto.signer,
          keypair: kp,
        });
      };

      const providerRelay = await makeRelay();
      const providerServe = createServe({
        logger,
        relays: [providerRelay],
      });
      const provider = createComputeProviderHooks({
        provider: createLocalComputeProvider({
          logger,
          atproto: atproto as unknown as ComputeAtproto,
          serve: providerServe,
          getIssuerUrl: () =>
            didWebToHttps(providerRelay.proxyRef),
          containerMode: "container",
        }),
      });
      await providerServe.beginServe();

      const bidderRelay = await makeRelay();
      const bidder = await createMarketBidder({
        logger,
        atproto,
        providers: [provider],
        relay: bidderRelay,
        serve: createServe({
          logger,
          tcp: { addr: "127.0.0.1", port: 0 },
          relays: [bidderRelay],
        }),
      });
      await bidder.beginServe();

      // ── gateway ────────────────────────────────────────────────────────
      const gatewayServe = createServe({
        logger,
        tcp: { addr: "127.0.0.1", port: 0 },
      });
      const gateway = createComputeContractGateway({
        logger,
        serve: gatewayServe,
        plcDirectoryUrl,
        dispatcherHost,
        fedproxyHost: `localhost:${dispPort}`,
        label: "gateway",
        relayUrls: [],
      });
      await gateway.beginServe();

      // ── request compute ────────────────────────────────────────────────
      const { createSshSessionProvider } = await import(
        "@publicdomainrelay/requester-xrpc"
      );
      const sshProvider = createSshSessionProvider(logger);
      const ssh = await sshProvider.generateKeypair("gateway-test-vm");
      const publicKey = ssh.publicKey;

      const result = await gateway.requestComputeVM(
        { did: "did:plc:test-caller" },
        {
          computeVm: {
            $type: "com.publicdomainrelay.temp.compute.vm",
            cpus: 1,
            mem: "512M",
            disk: "10G",
            network: "500G",
            role: "gateway-test-vm",
          },
          sshPublicKey: publicKey,
          bidWindowSec: 15,
          extraBidderDids: [atproto.did],
          tokens: {
            submitRfp: "",
            submitAccept: "",
            createRecord: "",
          },
        },
      );

      logger.info("gateway_result", result as unknown as Record<string, unknown>);

      assert(result.receiptOk === true, "receiptOk should be true");
      assert(
        typeof result.receiptUri === "string",
        "receiptUri should be a string",
      );
      assert(
        typeof result.websocatUrl === "string",
        "websocatUrl should be a string",
      );
      assert(
        result.websocatUrl!.includes("gateway-test-vm"),
        "websocatUrl should include vm name",
      );
      assert(
        typeof result.winnerDid === "string",
        "winnerDid should be a string",
      );

      await gateway.dispose();
      await bidder.shutdown();
    } finally {
      restoreFetch();
      plcAc.abort();
      dispAc.abort();
    }
  },
);
