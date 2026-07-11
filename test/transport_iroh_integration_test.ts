// Integration tests for iroh transport (the default) and transport selection.
// Verifies:
//   1. Default transport (iroh) works for RFP→bid→accept→provision flow
//   2. Explicit fedproxy transport still works (backward compat)
//   3. buildIrohUserData generates correct cloud-init (no fedproxy deps)
//   4. buildDefaultUserData still works for fedproxy transport
//   5. Transport validation: fedproxy without required hosts throws
//
// No external network: in-process dispatcher + fake PLC + bidder + requester.
// Container mode only. Run with:
//   deno test --allow-all test/transport_iroh_integration_test.ts

import { assert, assertStringIncludes, assertRejects } from "@std/assert";
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
import { createRequesterPDS, runComputeContract } from "@publicdomainrelay/requester-xrpc";
import { buildIrohUserData, buildDefaultUserData } from "@publicdomainrelay/cloud-init-common";

function didWebToHttps(s: string): string {
  return s.startsWith("did:web:") ? "https://" + s.slice("did:web:".length) : s;
}

// ── fake PLC (matches bidder_container_integration_test) ───────────────────

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
      "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/multikey/v1"],
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

// ── shared harness ────────────────────────────────────────────────────────

async function startBidder(opts: {
  logger: ReturnType<typeof createLogger>;
  ingressProxyHost: string;
  plcDirectoryUrl: string;
  dispPort: number;
}) {
  const { logger, ingressProxyHost, plcDirectoryUrl, dispPort } = opts;

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

  // local compute provider (container mode) on its own relay/serve
  const providerRelay = await makeRelay();
  const providerServe = createServe({ logger, relays: [providerRelay] });
  const provider = createComputeProviderHooks({
    provider: createLocalComputeProvider({
      logger,
      atproto: atproto as unknown as ComputeAtproto,
      serve: providerServe,
      getIssuerUrl: () => didWebToHttps(providerRelay.ingressRef),
      containerMode: "container",
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

  return { bidder, atproto, bidderRelay };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

Deno.test({
  name: "[integration] iroh transport (default): RFP→bid→accept→provision (skipSsh)",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const logger = createLogger({ serviceName: "it-iroh" });
  const cleanups: Array<() => void> = [];

  // ── dispatcher ────────────────────────────────────────────────────────
  const dispatcherApp = createRelayFactory({ hostname: "localhost" }).createApp();
  const dispatcherCtl = new AbortController();
  const { promise: dispPortReady, resolve: resolveDispPort } = Promise.withResolvers<number>();
  Deno.serve(
    { port: 0, hostname: "127.0.0.1", signal: dispatcherCtl.signal, onListen: (addr) => resolveDispPort((addr as Deno.NetAddr).port) },
    dispatcherApp.fetch,
  );
  const dispPort = await dispPortReady;
  cleanups.push(() => dispatcherCtl.abort());
  const ingressProxyHost = `localhost:${dispPort}`;

  // ── fake PLC ──────────────────────────────────────────────────────────
  const plc = createFakePlc();
  const plcCtl = new AbortController();
  const { promise: plcPortReady, resolve: resolvePlcPort } = Promise.withResolvers<number>();
  Deno.serve(
    { port: 0, hostname: "127.0.0.1", signal: plcCtl.signal, onListen: (addr) => resolvePlcPort((addr as Deno.NetAddr).port) },
    plc.app.fetch,
  );
  const plcPort = await plcPortReady;
  cleanups.push(() => plcCtl.abort());
  const plcDirectoryUrl = `http://localhost:${plcPort}`;

  // ── fetch interceptor ─────────────────────────────────────────────────
  const { installFetchInterceptor } = await import("./fetch-interceptor.ts");
  const restoreFetch = installFetchInterceptor({ realFetch: globalThis.fetch, plcDirectoryUrl, dispPort });
  cleanups.push(restoreFetch);

  try {
    const { atproto } = await startBidder({ logger, ingressProxyHost, plcDirectoryUrl, dispPort });

    // ── requester ──────────────────────────────────────────────────────
    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({
      logger, serve: requesterServe,
      plcDirectoryUrl, ingressProxyHost, label: "requester-iroh",
    });
    cleanups.push(() => requesterServe.shutdown());

    const seenBids: Array<{ did: string; uri: string }> = [];
    const origSet = requester.pendingBids.set.bind(requester.pendingBids);
    requester.pendingBids.set = ((k: string, v: Array<{ did: string; uri: string }>) => {
      for (const b of v) seenBids.push({ did: b.did, uri: b.uri });
      return origSet(k, v as never);
    }) as typeof requester.pendingBids.set;

    await requester.beginServe();

    // ── run with iroh transport (the default) ─────────────────────────
    let contractErr: unknown;
    const contract = runComputeContract(requester, {
      logger,
      ingressProxyHost,
      transport: "iroh",
      skipSsh: true,
      keepVm: true,
      bidWindowSec: 8,
      vmReadyTimeoutSec: 1,
      execProgram: "true",
      extraBidderDids: [atproto.did],
      denyBidderDids: ["did:plc:centraldefaultbidder000000"],
    }).catch((e) => { contractErr = e; });

    await Promise.race([
      contract,
      new Promise((r) => setTimeout(r, 40_000)),
    ]);

    const ourBids = seenBids.filter((b) => b.did === atproto.did);
    assert(
      ourBids.length > 0,
      `expected >=1 bid from bidder ${atproto.did}; saw ${seenBids.length} bid(s); contractErr=${contractErr ? String(contractErr) : "none"}`,
    );
    assert(
      !seenBids.some((b) => b.did === "did:plc:centraldefaultbidder000000"),
      "central default bidder must not have bid",
    );
  } finally {
    for (const c of cleanups.reverse()) {
      try { c(); } catch { /* best effort */ }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
});

Deno.test({
  name: "[integration] transport=fedproxy with explicit hosts still works (backward compat)",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const logger = createLogger({ serviceName: "it-fedproxy-bw" });
  const cleanups: Array<() => void> = [];

  const dispatcherApp = createRelayFactory({ hostname: "localhost" }).createApp();
  const dispatcherCtl = new AbortController();
  const { promise: dispPortReady, resolve: resolveDispPort } = Promise.withResolvers<number>();
  Deno.serve(
    { port: 0, hostname: "127.0.0.1", signal: dispatcherCtl.signal, onListen: (addr) => resolveDispPort((addr as Deno.NetAddr).port) },
    dispatcherApp.fetch,
  );
  const dispPort = await dispPortReady;
  cleanups.push(() => dispatcherCtl.abort());
  const ingressProxyHost = `localhost:${dispPort}`;

  const plc = createFakePlc();
  const plcCtl = new AbortController();
  const { promise: plcPortReady, resolve: resolvePlcPort } = Promise.withResolvers<number>();
  Deno.serve(
    { port: 0, hostname: "127.0.0.1", signal: plcCtl.signal, onListen: (addr) => resolvePlcPort((addr as Deno.NetAddr).port) },
    plc.app.fetch,
  );
  const plcPort = await plcPortReady;
  cleanups.push(() => plcCtl.abort());
  const plcDirectoryUrl = `http://localhost:${plcPort}`;

  const { installFetchInterceptor } = await import("./fetch-interceptor.ts");
  const restoreFetch = installFetchInterceptor({ realFetch: globalThis.fetch, plcDirectoryUrl, dispPort });
  cleanups.push(restoreFetch);

  try {
    const { atproto } = await startBidder({ logger, ingressProxyHost, plcDirectoryUrl, dispPort });

    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({
      logger, serve: requesterServe,
      plcDirectoryUrl, ingressProxyHost, label: "requester-fedproxy",
    });
    cleanups.push(() => requesterServe.shutdown());

    const seenBids: Array<{ did: string; uri: string }> = [];
    const origSet = requester.pendingBids.set.bind(requester.pendingBids);
    requester.pendingBids.set = ((k: string, v: Array<{ did: string; uri: string }>) => {
      for (const b of v) seenBids.push({ did: b.did, uri: b.uri });
      return origSet(k, v as never);
    }) as typeof requester.pendingBids.set;

    await requester.beginServe();

    // ── explicit fedproxy transport ────────────────────────────────────
    let contractErr: unknown;
    const contract = runComputeContract(requester, {
      logger,
      ingressProxyHost,
      transport: "fedproxy",
      skipSsh: true,
      keepVm: true,
      bidWindowSec: 8,
      vmReadyTimeoutSec: 1,
      execProgram: "true",
      extraBidderDids: [atproto.did],
      denyBidderDids: ["did:plc:centraldefaultbidder000000"],
    }).catch((e) => { contractErr = e; });

    await Promise.race([
      contract,
      new Promise((r) => setTimeout(r, 40_000)),
    ]);

    const ourBids = seenBids.filter((b) => b.did === atproto.did);
    assert(
      ourBids.length > 0,
      `expected >=1 bid; contractErr=${contractErr ? String(contractErr) : "none"}`,
    );
  } finally {
    for (const c of cleanups.reverse()) {
      try { c(); } catch { /* best effort */ }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
});

// ── Unit tests ────────────────────────────────────────────────────────────

Deno.test({
  name: "[unit] buildIrohUserData generates valid cloud-init with SSH bridging",
}, () => {
  const ctx = {
    ingressProxyHost: "relay.example.com:2222",
    audHost: "relay.example.com",
    privateKeyHex: "00".repeat(32),
    jsrUrl: "jsr.example.com:5556",
    sshAuthorizedKey: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... test@vm",
  };

  const yaml = buildIrohUserData(ctx);

  // Must be valid cloud-config
  assertStringIncludes(yaml, "#cloud-config");
  // Must include sshd config
  assertStringIncludes(yaml, "openssh-server");
  assertStringIncludes(yaml, "10-iroh.conf");
  assertStringIncludes(yaml, "PermitRootLogin prohibit-password");
  // Must include iroh service
  assertStringIncludes(yaml, "iroh.service");
  assertStringIncludes(yaml, "/usr/local/bin/iroh endpoint");
  assertStringIncludes(yaml, "--bind 0.0.0.0:9876");
  assertStringIncludes(yaml, "--bridge tcp/127.0.0.1:22");
  // Must include authorized_keys
  assertStringIncludes(yaml, "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... test@vm");
  // Must NOT include fedproxy-client or websocat
  assert(!yaml.includes("fedproxy-client"), "iroh cloud-init must not reference fedproxy-client");
  assert(!yaml.includes("websocat"), "iroh cloud-init must not reference websocat");
  assert(!yaml.includes("ATPRP_URL"), "iroh cloud-init must not reference ATPRP_URL");
});

Deno.test({
  name: "[unit] buildIrohUserData uses targetPort from context",
}, () => {
  const ctx = {
    ingressProxyHost: "relay.example.com",
    audHost: "relay.example.com",
    privateKeyHex: "aa".repeat(32),
    jsrUrl: "jsr.example.com",
    sshAuthorizedKey: "ssh-ed25519 AAA...",
    targetPort: 2222,
  };

  const yaml = buildIrohUserData(ctx);
  // targetPort=2222 → bridge should point at port 2222, not default 22
  assertStringIncludes(yaml, "tcp/127.0.0.1:2222");
  // "tcp/127.0.0.1:22" followed by newline or end-of-string means default port leaked
  assert(!/tcp\/127\.0\.0\.1:22\b/.test(yaml), "default port 22 must not appear when targetPort=2222");
});

Deno.test({
  name: "[unit] buildDefaultUserData still generates fedproxy-client cloud-init",
}, () => {
  const ctx = {
    vmName: "test-vm",
    didPlc: "did:plc:abcdef123456",
    didPlcKey: "abcdef123456",
    relayHost: "xrpc.fedproxy.com",
    xrpcRelaySubdomain: "test-subdomain",
    sshAuthorizedKey: "ssh-ed25519 AAA...",
  };

  const yaml = buildDefaultUserData(ctx);

  assertStringIncludes(yaml, "#cloud-config");
  assertStringIncludes(yaml, "fedproxy-client.service");
  assertStringIncludes(yaml, "websocat.service");
  assertStringIncludes(yaml, "ATPRP_URL");
  assertStringIncludes(yaml, "setup-websocat");
  // Must NOT include iroh
  assert(!yaml.includes("iroh.service"), "fedproxy cloud-init must not reference iroh");
});

Deno.test({
  name: "[unit] transport=fedproxy without ingressProxyHost throws",
}, async () => {
  const logger = createLogger({ serviceName: "it-validate" });

  // Create a minimal PDS without a relay
  const serve = createServe({ logger, tcp: { port: 0 } });
  const pds = await createRequesterPDS({
    logger,
    serve,
    plcDirectoryUrl: "https://plc.directory",
    label: "validate-test",
    skipIngress: true,
  });
  await pds.beginServe();

  try {
    await assertRejects(
      () => runComputeContract(pds, {
        logger,
        transport: "fedproxy",
        // no ingressProxyHost — should throw
        skipSsh: true,
        keepVm: true,
        bidWindowSec: 1,
        vmReadyTimeoutSec: 1,
        execProgram: "true",
      }),
      Error,
      "ingressProxyHost",
    );
  } finally {
    serve.shutdown();
    await pds.dispose();
    await new Promise((r) => setTimeout(r, 200));
  }
});
