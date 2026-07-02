// Integration: validate full SSH shell via relay tunnel.
// Same harness as bidder_container_integration_test but with SSH enabled.
// Validates: RFP flow → container provisioned → SSH via relay websocket tunnel.
//
// Run:
//   deno test --allow-all test/bidder_ssh_relay_test.ts

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
import { createRequesterPDS, runComputeContract } from "@publicdomainrelay/requester-xrpc";

function didWebToHttps(s: string): string {
  return s.startsWith("did:web:") ? "https://" + s.slice("did:web:".length) : s;
}

// ── fake PLC ──────────────────────────────────────────────────────────────

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
        id: `${did}#${name}`, type: "Multikey", controller: did,
        publicKeyMultibase: String(didKey).replace(/^did:key:/, ""),
      })),
      service: Object.entries(svcs).map(([name, s]) => ({
        id: `#${name}`, type: s.type, serviceEndpoint: s.endpoint,
      })),
    };
    return c.json(doc);
  });

  return { app };
}

Deno.test({
  name: "[integration] SSH shell via relay tunnel after container provision",
  sanitizeOps: false,
  sanitizeResources: false,
  // The guest must run buildTunnelUserData's tunnel-subscriber.service, which
  // `deno run`s jsr:@publicdomainrelay/hono-did-key-relay-tunnel-subscriber
  // via a JSR_URL override — that requires a local hono-jsr registry serving
  // this workspace's packages, reachable from inside the container. That
  // registry harness does not exist yet. Without it the guest never joins
  // the relay tunnel, so the ssh assertions below correctly fail rather than
  // passing on an unexercised path. Un-ignore once hono-jsr is wired in.
  ignore: true,
}, async () => {
  const logger = createLogger({ serviceName: "ssh-relay-it" });
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
  const dispatcherHost = `localhost:${dispPort}`;

  // ── fake PLC ────────────────────────────────────────────────────────────
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

  // ── fetch interception ────────────────────────────────────────────────
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    let url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://plc.directory/")) {
      url = plcDirectoryUrl + url.slice("https://plc.directory".length);
      return realFetch(new Request(url, input instanceof Request ? input : init));
    }
    const m = url.match(/^https:\/\/([^/]+)(\/.*)?$/);
    if (m && (m[1].endsWith(".localhost") || m[1] === "localhost" || m[1].includes(".localhost:"))) {
      let host = m[1];
      if (!host.includes(":")) host = `${host}:${dispPort}`;
      url = `http://${host}${m[2] ?? ""}`;
      return realFetch(new Request(url, input instanceof Request ? input : init));
    }
    return realFetch(input as string | URL | Request, init);
  }) as typeof fetch;
  cleanups.push(() => { globalThis.fetch = realFetch; });

  try {
    // ── bidder ──────────────────────────────────────────────────────────
    const bidderKeypair = await Secp256k1Keypair.create({ exportable: true });
    const bidderPrivHex = Array.from(await bidderKeypair.export())
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    const pdsAgent = await createLocalPDSAgent({
      logger, keypair: bidderKeypair,
      serve: createServe({ logger }),
      plcDirectoryUrl, dispatcherHost,
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
      return createXrpcRelay({ logger, dispatcherHost, signer: atproto.signer, keypair: kp });
    };

    // local compute provider (container mode)
    const providerRelay = await makeRelay();
    const providerServe = createServe({ logger, relays: [providerRelay] });
    const provider = createComputeProviderHooks({
      provider: createLocalComputeProvider({
        logger,
        atproto: atproto as unknown as ComputeAtproto,
        serve: providerServe,
        getIssuerUrl: () => didWebToHttps(providerRelay.proxyRef),
        containerMode: "container",
      }),
    });
    await providerServe.beginServe();

    // market on its own relay/serve
    const bidderRelay = await makeRelay();
    const bidder = await createMarketBidder({
      logger, atproto, providers: [provider], relay: bidderRelay,
      serve: createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 }, relays: [bidderRelay] }),
    });
    await bidder.beginServe();
    cleanups.push(() => bidder.shutdown());

    // ── requester ───────────────────────────────────────────────────────
    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({
      logger, serve: requesterServe,
      plcDirectoryUrl, dispatcherHost, label: "requester",
    });
    cleanups.push(() => requesterServe.shutdown());
    await requester.beginServe();

    // ── run contract WITH SSH ───────────────────────────────────────────
    // execProgram runs on the guest via SSH through the relay websocket tunnel.
    // A successful exit proves the full path: relay websocket → VM sshd → shell.
    const startTime = Date.now();
    // The SSH tunnel uses websocat directly (not fetch), so the fetch
    // interception that maps https://*.localhost → http://localhost:PORT
    // doesn't apply.  Use proxyCommandFn to rewrite wss://*.fedproxy.com
    // → ws://localhost:PORT so the tunnel reaches the local dispatcher.
    const proxyCommandFn = (_fqdn: string) => `websocat --binary ws://${dispatcherHost}`;

    const result = await runComputeContract(requester, {
      logger,
      dispatcherHost,
      sshProxyCommandFn: proxyCommandFn,
      skipSsh: false,
      keepVm: false,
      bidWindowSec: 8,
      vmReadyTimeoutSec: 120,
      execProgram: "echo SSH_OK_VIA_RELAY && uname -a && whoami && hostname",
      extraBidderDids: [atproto.did],
      denyBidderDids: ["did:plc:centraldefaultbidder000000"],
    });

    assert(result.event === "compute_request_complete", `expected compute_request_complete, got ${result.event}: ${result.error ?? ""}`);
    assert(result.sshReady === true, "ssh guest never became reachable through relay tunnel");
    assert(result.sshExitCode === 0, `ssh session exited ${result.sshExitCode}`);

    const elapsed = Date.now() - startTime;
    console.log(`\nSSH relay test completed in ${(elapsed / 1000).toFixed(1)}s`);
    console.log("All assertions passed — SSH shell via relay tunnel verified");
  } finally {
    for (const c of cleanups.reverse()) {
      try { c(); } catch { /* best effort */ }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
});
