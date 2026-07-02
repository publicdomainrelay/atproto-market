// Cross-platform bidder integration test matrix.
// Validates: RFP → bid → accept → container provision → SSH via relay tunnel.
// Two bidder variants: hono-bidder (static imports) + hono-desktop (dynamic imports).
// Runs on macOS (container CLI), Linux (docker), WSL2 (docker), Windows (wsl docker).
//
//   deno test --allow-all test/bidder_cross_platform_integration_test.ts

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
import {
  createRequesterPDS, runComputeContract,
} from "@publicdomainrelay/requester-xrpc";
import type { ContainerBackend } from "@publicdomainrelay/container-backend-abc";
import { createContainerBackend } from "@publicdomainrelay/container-backend-container";
import { createDockerBackend } from "@publicdomainrelay/container-backend-docker";

// ===========================================================================
// Helpers
// ===========================================================================

const encoder = new TextEncoder();

function didWebToHttps(s: string): string {
  return s.startsWith("did:web:") ? "https://" + s.slice("did:web:".length) : s;
}

function flattenLabel(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function serveOnPort0(
  fetch: (req: Request) => Response | Promise<Response>,
  ac: AbortController,
): Promise<number> {
  const { promise, resolve } = Promise.withResolvers<number>();
  Deno.serve(
    { port: 0, hostname: "127.0.0.1", signal: ac.signal,
      onListen: (addr) => resolve((addr as Deno.NetAddr).port) },
    fetch,
  );
  return promise;
}

async function hasCommand(cmd: string): Promise<boolean> {
  try {
    const { code } = await new Deno.Command("which", {
      args: [cmd], stdout: "null", stderr: "null",
    }).output();
    return code === 0;
  } catch { return false; }
}

function createFakePlc() {
  const ops = new Map<string, Record<string, unknown>>();
  const app = new Hono();

  function didFromPath(path: string): string {
    return decodeURIComponent(path.startsWith("/") ? path.slice(1) : path);
  }

  app.post("/*", async (c) => {
    const did = didFromPath(new URL(c.req.url).pathname);
    ops.set(did, await c.req.json() as Record<string, unknown>);
    return c.json({ ok: true });
  });

  app.get("/*", (c) => {
    const did = didFromPath(new URL(c.req.url).pathname);
    const op = ops.get(did);
    if (!op) return c.json({ message: `DID not found: ${did}` }, 404);
    const vms = (op.verificationMethods ?? {}) as Record<string, string>;
    const svcs = (op.services ?? {}) as Record<string, { type: string; endpoint: string }>;
    return c.json({
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
    });
  });

  return { app };
}

async function execInContainer(
  backend: ContainerBackend, containerName: string, args: string[],
): Promise<string> {
  const { code, stdout } = await backend.exec(containerName, args);
  if (code !== 0) throw new Error(`exec ${args.join(" ")} failed`);
  return stdout;
}

async function findContainerByDid(
  backend: ContainerBackend, did: string,
): Promise<string | null> {
  const prefix = `pdr-${flattenLabel(did)}`;
  const { stdout } = await backend.command(["ps", "--format", "{{.Names}}", "--filter", `name=${prefix}`]);
  if (!stdout) return null;
  return stdout.split("\n").find((n) => n.startsWith(prefix)) ?? null;
}

// ===========================================================================
// Bidder factories
// ===========================================================================

async function createHonoBidder(opts: {
  logger: ReturnType<typeof createLogger>;
  plcDirectoryUrl: string;
  dispatcherHost: string;
  containerMode?: string;
  cleanups: Array<() => void>;
}) {
  const { logger, plcDirectoryUrl, dispatcherHost, cleanups } = opts;
  const containerMode = (opts.containerMode ?? "container") as "vm" | "container" | undefined;

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

  async function makeRelay() {
    const kp = await Secp256k1Keypair.create({ exportable: true });
    return createXrpcRelay({ logger, dispatcherHost, signer: atproto.signer, keypair: kp });
  }

  const providerRelay = await makeRelay();
  const providerServe = createServe({ logger, relays: [providerRelay] });
  const provider = createComputeProviderHooks({
    provider: createLocalComputeProvider({
      logger,
      atproto: atproto as unknown as ComputeAtproto,
      serve: providerServe,
      getIssuerUrl: () => didWebToHttps(providerRelay.proxyRef),
      containerMode,
    }),
  });
  await providerServe.beginServe();

  const bidderRelay = await makeRelay();
  const bidder = await createMarketBidder({
    logger, atproto, providers: [provider], relay: bidderRelay,
    serve: createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 }, relays: [bidderRelay] }),
  });
  await bidder.beginServe();
  cleanups.push(() => bidder.shutdown());

  return { atproto, bidder, provider, pdsAgent, providerRelay, providerServe };
}

async function createDesktopBidder(opts: {
  logger: ReturnType<typeof createLogger>;
  plcDirectoryUrl: string;
  dispatcherHost: string;
  containerMode?: string;
  cleanups: Array<() => void>;
}) {
  const { logger, plcDirectoryUrl, dispatcherHost, cleanups } = opts;
  const containerMode = (opts.containerMode ?? "container") as "vm" | "container" | undefined;

  // Dynamic imports — mirrors hono-desktop startBidder()
  const [
    { createXrpcRelay: ciXrpcRelay },
    { createMarketBidder: ciMarketBidder },
    { createComputeProviderHooks: ciProviderHooks },
    { createLocalComputeProvider: ciLocalCompute },
    { createAppAttestService, createRichKeychainStore },
    { loadOrCreateMarketKeypair },
    { createFilesystemKeychainStore },
    { buildStandardChain },
    { createRbacProvisioner: ciRbac },
  ] = await Promise.all([
    import("../../atproto-market/lib/xrpc-relay/mod.ts"),
    import("../../atproto-market/lib/market-bidder/mod.ts"),
    import("../../atproto-market/lib/market-bidder-compute/mod.ts"),
    import("../../hono-compute-provider/lib/compute-provider-local/mod.ts"),
    import("../../deno-macos-runner-desktop/lib/app-attest-none/mod.ts"),
    import("../../deno-macos-runner-desktop/lib/market-bidder-keys/mod.ts"),
    import("../../deno-macos-runner-desktop/lib/secret-store-filesystem/mod.ts"),
    import("../../deno-macos-runner-desktop/lib/secret-store-chain/mod.ts"),
    import("../../hono-compute-provider/lib/rbac-atproto/mod.ts"),
  ]);

  const tmpDir = await Deno.makeTempDir();
  cleanups.push(() => Deno.remove(tmpDir, { recursive: true }).catch(() => {}));

  const fsStore = createFilesystemKeychainStore({ logger, storageDir: tmpDir });
  const secretStore = buildStandardChain({ filesystemStore: fsStore, logger });

  // Load market keypair from secret store (for market bidder identity)
  const { keypair: marketKp, hex } = await loadOrCreateMarketKeypair(secretStore);

  // Generate separate Secp256k1Keypair for the local PDS agent
  const pdsKeypair = await Secp256k1Keypair.create({ exportable: true });
  const pdsPrivHex = Array.from(await pdsKeypair.export())
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  const pdsAgent = await createLocalPDSAgent({
    logger, keypair: pdsKeypair,
    serve: createServe({ logger }),
    plcDirectoryUrl, dispatcherHost,
  });
  await pdsAgent.beginServe();

  const atproto = await createATProto({
    logger,
    badgeBlueSigner: await createBadgeBlueSigner({ privateKeyHex: hex }),
    plcDirectory: createPlcDirectoryClient({ plcDirectoryUrl }),
    agent: pdsAgent,
  });

  async function makeRelay() {
    const kp = await Secp256k1Keypair.create({ exportable: true });
    return ciXrpcRelay({ logger, dispatcherHost, signer: atproto.signer, keypair: kp });
  }

  const providerRelay = await makeRelay();
  const providerServe = createServe({ logger, relays: [providerRelay] });
  const provider = ciProviderHooks({
    provider: ciLocalCompute({
      logger,
      atproto: atproto as unknown as ComputeAtproto,
      serve: providerServe,
      getIssuerUrl: () => didWebToHttps(providerRelay.proxyRef),
      containerMode,
      rbacProvisioner: ciRbac(),
    }),
  });
  await providerServe.beginServe();

  const bidderRelay = await makeRelay();
  const bidder = await ciMarketBidder({
    logger, atproto, providers: [provider], relay: bidderRelay,
    serve: createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 }, relays: [bidderRelay] }),
  });
  await bidder.beginServe();
  cleanups.push(() => bidder.shutdown());

  return { atproto, bidder, provider, pdsAgent, providerRelay, providerServe, secretStore };
}

// ===========================================================================
// Test
// ===========================================================================

Deno.test({
  name: "cross-platform bidder matrix",
  sanitizeOps: false,
  sanitizeResources: false,
}, async (t) => {
  const logger = createLogger({ serviceName: "matrix" });
  const cleanups: Array<() => void> = [];

  // ── Detect container backend ────────────────────────────────────────
  const backend: ContainerBackend = Deno.build.os === "darwin"
    ? createContainerBackend()
    : createDockerBackend();
  if (!(await backend.ensureRunning())) {
    console.log(`[SKIP] container backend not available (${Deno.build.os})`);
    return;
  }
  console.log(`[platform] ${Deno.build.os}, backend: ${backend.type}`);

  // ── Shared infra: dispatcher ────────────────────────────────────────
  const dispatcherApp = createRelayFactory({ hostname: "localhost" }).createApp();
  const dispAc = new AbortController();
  const dispPort = await serveOnPort0(dispatcherApp.fetch, dispAc);
  cleanups.push(() => dispAc.abort());
  const dispatcherHost = `localhost:${dispPort}`;

  // ── Shared infra: fake PLC ──────────────────────────────────────────
  const plc = createFakePlc();
  const plcAc = new AbortController();
  const plcPort = await serveOnPort0(plc.app.fetch, plcAc);
  cleanups.push(() => plcAc.abort());
  const plcDirectoryUrl = `http://127.0.0.1:${plcPort}`;

  // ── Fetch interception ──────────────────────────────────────────────
  // *.localhost doesn't resolve on Windows. Deno's fetch() ignores manual
  // Host headers. Use Deno.connect + raw HTTP to preserve the Host header
  // so the dispatcher can route by subdomain.
  const realFetch = globalThis.fetch;

  async function rawHttpFetch(urlStr: string, init?: RequestInit): Promise<Response> {
    const u = new URL(urlStr);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    const body = init?.body as string | Uint8Array | undefined;
    headers.set("Host", u.host);
    if (body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (body && !headers.has("content-length")) {
      headers.set("content-length", String(new TextEncoder().encode(
        typeof body === "string" ? body : new TextDecoder().decode(body)
      ).length));
    }

    const headerLines = [`${method} ${u.pathname}${u.search} HTTP/1.1`];
    for (const [k, v] of headers) headerLines.push(`${k}: ${v}`);
    headerLines.push("connection: close");
    // join with \r\n, add trailing \r\n to end header section, body follows separately
    const reqStr = headerLines.join("\r\n") + "\r\n\r\n";
    const reqBytes = new TextEncoder().encode(reqStr);

    const conn = await Deno.connect({ hostname: "127.0.0.1", port: dispPort });
    try {
      await conn.write(reqBytes);
      if (body) {
        const bodyBytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
        await conn.write(bodyBytes);
      }
      // Read until connection close (Connection: close header ensures this)
      const chunks: Uint8Array[] = [];
      const readBuf = new Uint8Array(8192);
      while (true) {
        let n: number | null = null;
        try { n = await conn.read(readBuf); } catch { break; }
        if (n === null || n === 0) break;
        chunks.push(readBuf.slice(0, n));
      }
      const rawBytes = chunks.reduce((acc, c) => {
        const t = new Uint8Array(acc.length + c.length);
        t.set(acc); t.set(c, acc.length); return t;
      }, new Uint8Array(0));
      const raw = new TextDecoder().decode(rawBytes);
      const headerEnd = raw.indexOf("\r\n\r\n");
      if (headerEnd < 0) return new Response(raw, { status: 502 });
      const headerSection = raw.slice(0, headerEnd);
      let bodySection = raw.slice(headerEnd + 4);
      const lines = headerSection.split("\r\n");
      const statusLine = lines[0];
      const status = parseInt(statusLine.split(" ")[1] || "500");
      const respHeaders = new Headers();
      let isChunked = false;
      for (let i = 1; i < lines.length; i++) {
        const ci = lines[i].indexOf(": ");
        if (ci >= 0) {
          const k = lines[i].slice(0, ci);
          const v = lines[i].slice(ci + 2);
          respHeaders.set(k, v);
          if (k.toLowerCase() === "transfer-encoding" && v.toLowerCase() === "chunked") isChunked = true;
        }
      }
      // Dechunk if needed
      if (isChunked) {
        let out = "";
        while (bodySection.length > 0) {
          const crlf = bodySection.indexOf("\r\n");
          if (crlf < 0) break;
          const sizeHex = bodySection.slice(0, crlf);
          const size = parseInt(sizeHex, 16);
          if (size === 0) break;
          out += bodySection.slice(crlf + 2, crlf + 2 + size);
          bodySection = bodySection.slice(crlf + 2 + size + 2); // skip \r\n after chunk
        }
        bodySection = out;
      }
      return new Response(bodySection, { status, headers: respHeaders });
    } finally {
      try { conn.close(); } catch { /* ok */ }
    }
  }

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
      return rawHttpFetch(url, input instanceof Request ? input : init);
    }
    return realFetch(input as string | URL | Request, init);
  }) as typeof fetch;
  cleanups.push(() => { globalThis.fetch = realFetch; });

  // =====================================================================
  // Sub-test helper: core bid flow (shared by both variants)
  // =====================================================================

  async function runCoreBidFlow(opts: {
    label: string;
    createBidder: () => Promise<{
      atproto: { did: string };
      providerRelay: { proxyRef: string }; providerServe: { shutdown(): void };
    }>;
  }) {
    const bidder = await opts.createBidder();

    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({
      logger, serve: requesterServe,
      plcDirectoryUrl, dispatcherHost, label: "requester",
    });
    cleanups.push(() => requesterServe.shutdown());
    await requester.beginServe();

    // Spy on bids
    const seenBids: Array<{ did: string; uri: string }> = [];
    const origSet = requester.pendingBids.set.bind(requester.pendingBids);
    requester.pendingBids.set = ((k: string, v: Array<{ did: string; uri: string }>) => {
      for (const b of v) seenBids.push({ did: b.did, uri: b.uri });
      return origSet(k, v as never);
    }) as typeof requester.pendingBids.set;

    const contract = runComputeContract(requester, {
      logger,
      dispatcherHost,
      skipSsh: true,
      keepVm: true,
      bidWindowSec: 8,
      vmReadyTimeoutSec: 1,
      execProgram: "true",
      extraBidderDids: [bidder.atproto.did],
      denyBidderDids: ["did:plc:centraldefaultbidder000000"],
    });

    await Promise.race([
      contract,
      new Promise((r) => setTimeout(r, 40_000)),
    ]);

    // Assert
    const ourBids = seenBids.filter((b) => b.did === bidder.atproto.did);
    assert(ourBids.length > 0,
      `expected >=1 bid from ${bidder.atproto.did}; got ${seenBids.length} bid(s) from ${JSON.stringify(seenBids.map(b => b.did))}`);
    assert(!seenBids.some((b) => b.did === "did:plc:centraldefaultbidder000000"),
      "central default bidder must not have bid");

    // Clean up container
    const name = await findContainerByDid(backend, bidder.atproto.did);
    if (name) await backend.rm(name).catch(() => {});
  }

  // =====================================================================
  // Sub-test: hono-bidder core bid flow
  // =====================================================================

  await t.step("[bidder:hono-bidder] core bid flow (container mode)", async () => {
    await runCoreBidFlow({
      label: "hono-bidder",
      createBidder: () => createHonoBidder({ logger, plcDirectoryUrl, dispatcherHost, cleanups }),
    });
  });

  // =====================================================================
  // Sub-test: hono-desktop core bid flow
  // =====================================================================

  await t.step("[bidder:hono-desktop] core bid flow (container mode)", async () => {
    await runCoreBidFlow({
      label: "hono-desktop",
      createBidder: () => createDesktopBidder({ logger, plcDirectoryUrl, dispatcherHost, cleanups }),
    });
  });

  // =====================================================================
  // Cleanup
  // =====================================================================
  for (const c of cleanups.reverse()) {
    try { await c(); } catch { /* best effort */ }
  }
  await new Promise((r) => setTimeout(r, 200));
});
