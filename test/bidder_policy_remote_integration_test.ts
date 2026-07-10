// Integration: full dynamic policy flow with a local policy engine.
// Starts dispatcher, fake PLC, policy engine, bidder (acceptScope=dynamic),
// and requester. The requester creates an RFP with policyMode=dynamic +
// policyEngineEndpoint → did:web:127.0.0.1%3A<port>. The bidder evaluates
// the policy via the engine before bidding. The requester evaluates after
// winner selection.
//
// No external network. Same harness as bidder_container_integration_test.

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
import { createRequesterPDS, runComputeContract } from "@publicdomainrelay/requester-xrpc";
import { DYNAMIC } from "@publicdomainrelay/market-policy-abc";

function didWebToHttps(s: string): string {
  return s.startsWith("did:web:") ? "https://" + s.slice("did:web:".length) : s;
}

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
  name: "[integration] dynamic — engine allow → bid + accept succeed",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const logger = createLogger({ serviceName: "it-policy-remote" });

  const cleanups: Array<() => void> = [];

  // ── policy engine (local HTTP server) ────────────────────────────────────
  const engineLog: Array<{ body: unknown; auth: string | null }> = [];
  const engineCtl = new AbortController();
  const { promise: enginePortReady, resolve: resolveEnginePort } = Promise.withResolvers<number>();
  const engineServer = Deno.serve(
    { port: 0, hostname: "127.0.0.1", signal: engineCtl.signal, onListen: (addr) => resolveEnginePort((addr as Deno.NetAddr).port) },
    async (req) => {
      const auth = req.headers.get("authorization");
      const body = await req.json();
      engineLog.push({ body, auth });
      // Allow all — the policy engine is permissive in this test
      return new Response(JSON.stringify({ allow: true, violations: [] }), {
        headers: { "content-type": "application/json" },
      });
    },
  );
  const enginePort = await enginePortReady;
  cleanups.push(() => { try { engineCtl.abort(); } catch { /* */ } });
  const engineDid = `did:web:127.0.0.1%3A${enginePort}`;

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

  // ── fake PLC ───────────────────────────────────────────────────────────
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

  // ── Fetch interception ─────────────────────────────────────────────────
  const { installFetchInterceptor } = await import("./fetch-interceptor.ts");
  const restoreFetch = installFetchInterceptor({
    realFetch: globalThis.fetch,
    plcDirectoryUrl,
    dispPort,
  });
  cleanups.push(restoreFetch);

  try {

    // ── bidder (acceptScope=dynamic) ──────────────────────────────────
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

    // market bidder with acceptScope=dynamic
    const bidderRelay = await makeRelay();
    const bidder = await createMarketBidder({
      logger, atproto, providers: [provider], relay: bidderRelay,
      serve: createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 }, relays: [bidderRelay] }),
      acceptScope: DYNAMIC,
    });
    await bidder.beginServe();
    cleanups.push(() => bidder.shutdown());

    // ── requester ─────────────────────────────────────────────────────────
    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({
      logger, serve: requesterServe,
      plcDirectoryUrl, ingressProxyHost, label: "requester",
    });
    cleanups.push(() => requesterServe.shutdown());

    // Spy on bids
    const seenBids: Array<{ did: string; uri: string }> = [];
    const origSet = requester.pendingBids.set.bind(requester.pendingBids);
    requester.pendingBids.set = ((k: string, v: Array<{ did: string; uri: string }>) => {
      for (const b of v) seenBids.push({ did: b.did, uri: b.uri });
      return origSet(k, v as never);
    }) as typeof requester.pendingBids.set;

    await requester.beginServe();

    // ── run the contract with dynamic policy ─────────────────────────────────
    let contractErr: unknown;
    const contract = runComputeContract(requester, {
      logger,
      ingressProxyHost,
      skipSsh: true,
      keepVm: true,
      bidWindowSec: 10,
      vmReadyTimeoutSec: 1,
      execProgram: "true",
      extraBidderDids: [atproto.did],
      denyBidderDids: ["did:plc:centraldefaultbidder000000"],
      policyMode: DYNAMIC,
      policyEngineEndpoint: engineDid,
    }).catch((e) => { contractErr = e; });
    await Promise.race([
      contract,
      new Promise((r) => setTimeout(r, 40_000)),
    ]);

    // ── assertions ────────────────────────────────────────────────────────
    // Bidder should have evaluated policy and created a bid
    const ourBids = seenBids.filter((b) => b.did === atproto.did);
    assert(
      ourBids.length > 0,
      `expected >=1 bid from bidder ${atproto.did}; saw ${seenBids.length} bid(s) from ${
        JSON.stringify(seenBids.map((b) => b.did))
      }; contractErr=${contractErr ? String(contractErr) : "none"}`,
    );

    // Policy engine should have been called by the bidder (onRfp evaluation)
    const bidderCalls = engineLog.filter((e) => (e.body as Record<string, unknown>)?.subjectDid === atproto.did);
    assert(
      bidderCalls.length > 0,
      `expected >=1 policy engine call from bidder; got ${engineLog.length} total calls`,
    );

    // Every engine call should have a Bearer token
    for (const entry of engineLog) {
      assert(
        entry.auth?.startsWith("Bearer "),
        `policy engine call missing auth: ${JSON.stringify(entry.auth)}`,
      );
    }

    // No contract error
    assert(
      !contractErr,
      `contract should not have errored: ${contractErr}`,
    );

    logger.info("dynamic_policy_integration_ok", {
      engineCalls: engineLog.length,
      bids: seenBids.length,
      bidderCalls: bidderCalls.length,
    });
  } finally {
    for (const c of cleanups.reverse()) {
      try { c(); } catch { /* best effort */ }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
});
