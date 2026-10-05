// Integration: start a real bidder (container-mode local compute provider) and
// drive a real requester (request-vm-ssh lib) against it through a real local
// xrpc relay dispatcher, proving the whole live SSH-over-iroh chain:
//
//   RFP -> bid -> accept -> the guest's cloud-init installs dumbpipe and starts
//   the listener -> the guest reports its iroh ticket to the requester's own
//   per-contract endpoint (POST /v1/on-network, authenticated with the workload
//   identity the provider minted) -> ssh with a `dumbpipe connect <ticket>`
//   ProxyCommand runs the exec program inside the real guest.
//
// No external network: a high-fidelity in-process fake PLC directory derives
// DID documents from the genesis ops the components submit, and global fetch is
// patched to send https://plc.directory + https://*.localhost traffic to the
// local PLC / dispatcher (the dispatcher routes by Host-header subdomain).
//
// The dispatcher serves one app on two listeners, exactly as the OAuth suite
// does: plain HTTP for the in-process components, and TLS for the guest. The
// guest reaches the dispatcher as <sub>.relay.localhost (hostnameOnly drops the
// port), so the certificate's SANs are relay.localhost and *.relay.localhost --
// a single-label wildcard such as *.localhost is rejected by TLS stacks. The
// provider is given the guest TLS port and the CA so it rewrites the guest's
// https://*.localhost URLs onto that port, resolves them to the container
// gateway and installs the CA in the guest's trust store: the report endpoint
// URL is baked into the cloud-config the guest runs.
//
// Container mode only (no full VM, no deno workers). The local provider
// auto-selects the container backend per OS: macOS `container`, else Docker.
// Both are assumed always available, so the test runs by default. Run it with:
//   deno test --allow-all test/bidder_container_integration_test.ts

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
import { createOidcProvisioningEnricher } from "@publicdomainrelay/oidc-issuer-hono";
import { createRbacProvisioner } from "@publicdomainrelay/rbac-atproto";
import type { ComputeAtproto } from "@publicdomainrelay/compute-provider-abc";
import type { ContainerBackend } from "@publicdomainrelay/container-backend-abc";
import { createContainerBackend } from "@publicdomainrelay/container-backend-container";
import { createDockerBackend } from "@publicdomainrelay/container-backend-docker";
import { generateLocalhostTlsCert } from "@publicdomainrelay/tls-localhost";
import { createRelayFactory } from "@publicdomainrelay/hono-factory-did-key-ingress-proxy-xrpc";
import { flattenLabel } from "@publicdomainrelay/cloud-init-common";
import { installFetchInterceptor, resolveDidKeyFromPlc } from "./fetch-interceptor.ts";
import { createRequesterPDS, runComputeContract } from "@publicdomainrelay/requester-xrpc";

function didWebToHttps(s: string): string {
  return s.startsWith("did:web:") ? "https://" + s.slice("did:web:".length) : s;
}

function serveOnPort0(
  f: (r: Request) => Response | Promise<Response>,
  ac: AbortController,
  hostname = "127.0.0.1",
  cert?: string,
  key?: string,
): Promise<number> {
  const { promise, resolve } = Promise.withResolvers<number>();
  const tlsOpts = cert && key ? { cert, key } : {};
  Deno.serve(
    {
      port: 0,
      hostname,
      signal: ac.signal,
      onListen: (a) => resolve((a as Deno.NetAddr).port),
      ...tlsOpts,
    },
    f,
  );
  return promise;
}

/** The guest container the provider names pdr-<flattened did>-*. */
async function findContainerByDid(
  backend: ContainerBackend,
  did: string,
): Promise<string | null> {
  const prefix = `pdr-${flattenLabel(did)}`;
  const { stdout } = await backend.command([
    "ps",
    "--format",
    "{{.Names}}",
    "--filter",
    `name=${prefix}`,
  ]);
  if (!stdout) return null;
  return stdout.split("\n").find((n) => n.startsWith(prefix)) ?? null;
}

// -- high-fidelity fake PLC directory --------------------------------------
// POST /<did>  stores the genesis op.  GET /<did>  derives the DID document
// (verificationMethod from op.verificationMethods, service from op.services).

function createFakePlc() {
  const ops = new Map<string, Record<string, unknown>>();
  const app = new Hono();

  function didFromPath(path: string): string {
    const raw = decodeURIComponent(path.startsWith("/") ? path.slice(1) : path);
    return raw;
  }

  app.post("/*", async (c) => {
    const did = didFromPath(new URL(c.req.url).pathname);
    const op = await c.req.json().catch(() => ({}));
    ops.set(did, op as Record<string, unknown>);
    return c.json({ ok: true });
  });

  app.get("/*", (c) => {
    const did = didFromPath(new URL(c.req.url).pathname);
    const op = ops.get(did);
    if (!op) return c.json({ message: `DID not found: ${did}` }, 404);
    const vms = (op.verificationMethods ?? {}) as Record<string, string>;
    const svcs = (op.services ?? {}) as Record<string, { type: string; endpoint: string }>;
    const doc = {
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
    };
    return c.json(doc);
  });

  return { app };
}

Deno.test({
  name: "[integration] bidder (container mode) provisions a guest and runs SSH over iroh",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const logger = createLogger({ serviceName: "it" });
  const cleanups: Array<() => void> = [];

  // -- container backend: without a runtime there is nothing to SSH into ----
  const backend: ContainerBackend = Deno.build.os === "darwin"
    ? createContainerBackend()
    : createDockerBackend();
  if (!(await backend.ensureRunning())) {
    console.log(`[SKIP] container backend not available (${Deno.build.os})`);
    return;
  }
  const gateway = await backend.defaultGateway();
  logger.info("container_backend", { type: backend.type, gateway });

  // -- dispatcher: relay.localhost, plain + TLS listeners on 0.0.0.0 --------
  // The guest reaches <sub>.relay.localhost, so the two-label base gives the
  // certificate a usable wildcard; additionalHosts admits the gateway IP the
  // guest dials.
  const { caCertPem, serverCertPem, serverKeyPem } = await generateLocalhostTlsCert({
    extraDnsSans: ["relay.localhost", "*.relay.localhost"],
  });
  const dispatcherApp = createRelayFactory({
    hostname: "relay.localhost",
    additionalHosts: [gateway],
    resolveDidKey: resolveDidKeyFromPlc,
  }).createApp();
  const dispAc = new AbortController();
  const dispTlsAc = new AbortController();
  const dispPort = await serveOnPort0(dispatcherApp.fetch, dispAc, "0.0.0.0");
  const dispTlsPort = await serveOnPort0(
    dispatcherApp.fetch,
    dispTlsAc,
    "0.0.0.0",
    serverCertPem,
    serverKeyPem,
  );
  cleanups.push(() => { dispAc.abort(); dispTlsAc.abort(); });
  // The requester's ingress URL is https://<sub>.relay.localhost (hostnameOnly
  // drops the port): a name the container resolves to the gateway.
  const ingressProxyHost = `relay.localhost:${dispPort}`;

  // -- fake PLC -------------------------------------------------------------
  const plc = createFakePlc();
  const plcCtl = new AbortController();
  const plcPort = await serveOnPort0(plc.app.fetch, plcCtl);
  cleanups.push(() => plcCtl.abort());
  const plcDirectoryUrl = `http://localhost:${plcPort}`;

  // -- fetch interception ---------------------------------------------------
  // The requester verifies the reporter token by fetching the provider issuer's
  // discovery document and JWKS at the issuer_uri the winning bid_config names
  // -- a host carrying the guest TLS port. Point the interceptor at the TLS
  // listener with the CA, so that fetch stays https instead of being
  // downgraded to http against a TLS listener.
  const restoreFetch = installFetchInterceptor({
    realFetch: globalThis.fetch,
    plcDirectoryUrl,
    dispPort: dispTlsPort,
    caCertPem,
  });
  cleanups.push(restoreFetch);

  let bidderDid = "";
  try {
    // -- bidder -----------------------------------------------------------
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
    bidderDid = atproto.did;

    const makeRelay = async () => {
      const kp = await Secp256k1Keypair.create({ exportable: true });
      return createIngress({ logger, ingressProxyHost, signer: atproto.signer, keypair: kp });
    };

    // local compute provider (container mode) on its own relay/serve. The
    // issuer URL is the provider's own relay name with the guest TLS port, so
    // the issuer_uri in the winning bid_config is reachable by the guest and by
    // this process's interceptor.
    const providerRelay = await makeRelay();
    const providerServe = createServe({ logger, relays: [providerRelay] });
    const issuerUrl = () => didWebToHttps(providerRelay.ingressRef);
    const provider = createComputeProviderHooks({
      provider: createLocalComputeProvider({
        logger,
        atproto: atproto as unknown as ComputeAtproto,
        serve: providerServe,
        getIssuerUrl: issuerUrl,
        // The guest is issued its workload-identity token by the provider's
        // OIDC issuer; the report POST exchanges that token and the requester
        // verifies the exchanged token against this issuer's JWKS.
        oidcProvisioner: createOidcProvisioningEnricher(issuerUrl),
        rbacProvisioner: createRbacProvisioner(),
        containerMode: "container",
        ingressProxyHost,
        // Guest-side rewriting: https://*.localhost -> gateway:<dispTlsPort>.
        caCertPem,
        guestTlsPort: dispTlsPort,
      }),
    });
    await providerServe.beginServe();

    // market factory on its own relay/serve
    const bidderRelay = await makeRelay();
    const bidder = await createMarketBidder({
      logger, atproto, providers: [provider], relay: bidderRelay,
      serve: createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 }, relays: [bidderRelay] }),
    });
    await bidder.beginServe();
    cleanups.push(() => bidder.shutdown());

    // -- requester (wires its own submitBid -> pendingBids handler) --------
    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({
      logger, serve: requesterServe,
      plcDirectoryUrl, ingressProxyHost, label: "requester",
    });
    cleanups.push(() => requesterServe.shutdown());
    await requester.beginServe();

    // -- run the whole contract, SSH included ------------------------------
    // No Promise.race cap: the contract owns the flow to the end. Tearing the
    // services down while the bidder is still provisioning aborts its in-flight
    // record resolves and surfaces as `TypeError: fetch failed`, which is a
    // teardown race, not a provisioning failure.
    let contractErr: unknown;
    const result = await runComputeContract(requester, {
      logger,
      ingressProxyHost,
      skipSsh: false,
      keepVm: true,
      policy: { name: "open", args: { bidWindowSec: 8 } },
      vmReadyTimeoutSec: 180,
      // The exit code only succeeds inside the real guest: the exec program
      // both echoes a marker and tests the binary the guest's cloud-init
      // installed.
      execProgram: "test -x /usr/local/bin/dumbpipe && echo SSH_OK_VIA_IROH",
      extraBidderDids: [atproto.did],
      denyBidderDids: ["did:plc:centraldefaultbidder000000"],
    }).catch((e) => {
      contractErr = e;
      return undefined;
    });

    assert(
      result,
      `contract must complete; contractErr=${contractErr ? String(contractErr) : "none"}`,
    );
    assert(
      result!.winnerDid === atproto.did,
      `winner must be our bidder ${atproto.did}, got ${result!.winnerDid}`,
    );
    // A green run proves the whole chain: the guest installed dumbpipe, the
    // guest reported its ticket to the requester's per-contract endpoint, and
    // ssh with `dumbpipe connect <ticket>` ran the command in the guest.
    assert(
      result!.sshReady === true,
      `guest SSH must become ready over iroh, got ${result!.sshReady}`,
    );
    assert(
      result!.sshExitCode === 0,
      `ssh exec must exit 0 inside the guest, got ${result!.sshExitCode}`,
    );
  } finally {
    // Remove the kept guest container; the contract itself is already done.
    if (bidderDid) {
      const name = await findContainerByDid(backend, bidderDid).catch(() => null);
      if (name) await backend.rm(name).catch(() => {});
    }
    for (const c of cleanups.reverse()) {
      try { c(); } catch { /* best effort */ }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
});
