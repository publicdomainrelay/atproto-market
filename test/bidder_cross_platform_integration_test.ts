// Cross-platform bidder integration test matrix.
// Validates: RFP → bid → accept → container provision.
// Two bidder variants: hono-bidder (static imports for core flow) +
// hono-bidder CLI subprocess (local ssh-xrpc-relay).
// Runs on macOS (container CLI), Linux (docker), WSL2 (docker), Windows (wsl docker).
//
//   deno test --allow-all test/bidder_cross_platform_integration_test.ts

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
import {
  createRequesterPDS, ensureWebsocat, runComputeContract,
} from "@publicdomainrelay/requester-xrpc";
import type { ContainerBackend } from "@publicdomainrelay/container-backend-abc";
import { createContainerBackend } from "@publicdomainrelay/container-backend-container";
import { createDockerBackend } from "@publicdomainrelay/container-backend-docker";
import { generateLocalhostTlsCert } from "@publicdomainrelay/tls-localhost";
import { installFetchInterceptor } from "./fetch-interceptor.ts";

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
  hostname = "127.0.0.1",
  cert?: string,
  key?: string,
): Promise<number> {
  const { promise, resolve } = Promise.withResolvers<number>();
  const tlsOpts = cert && key ? { cert, key } : {};
  Deno.serve(
    { port: 0, hostname, signal: ac.signal,
      onListen: (addr) => resolve((addr as Deno.NetAddr).port), ...tlsOpts },
    fetch,
  );
  return promise;
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

async function findContainerByDid(
  backend: ContainerBackend, did: string,
): Promise<string | null> {
  const prefix = `pdr-${flattenLabel(did)}`;
  const { stdout } = await backend.command(["ps", "--format", "{{.Names}}", "--filter", `name=${prefix}`]);
  if (!stdout) return null;
  return stdout.split("\n").find((n) => n.startsWith(prefix)) ?? null;
}

// ===========================================================================
// Subprocess bidder spawner
// ===========================================================================

interface BidderProcess {
  did: string;
  cleanup: () => void;
}

async function spawnBidder(opts: {
  modPath: string;
  args: string[];
  label: string;
  env?: Record<string, string>;
}): Promise<BidderProcess> {
  const decoder = new TextDecoder();
  const cmd = new Deno.Command("deno", {
    args: ["run", "-A", opts.modPath, ...opts.args],
    env: opts.env,
    stdout: "piped",
    stderr: "piped",
  });
  const child = cmd.spawn();
  let killed = false;
  const cleanup = () => {
    killed = true;
    try { child.kill("SIGTERM"); } catch { /* already exited */ }
  };

  const { promise, resolve, reject } = Promise.withResolvers<string>();

  // Forward stderr to test stderr for visibility
  (async () => {
    const reader = child.stderr.getReader();
    let buf = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buf += chunk;
        while (true) {
          const nl = buf.indexOf("\n");
          if (nl < 0) break;
          Deno.stderr.writeSync(encoder.encode(`[${opts.label}] ${buf.slice(0, nl)}\n`));
          buf = buf.slice(nl + 1);
        }
      }
    } catch { /* stream closed */ }
  })();

  // Parse bidder_ready from stdout
  (async () => {
    const reader = child.stdout.getReader();
    let buf = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buf += chunk;
        while (true) {
          const nl = buf.indexOf("\n");
          if (nl < 0) break;
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          Deno.stderr.writeSync(encoder.encode(`[${opts.label}:out] ${line}\n`));
          try {
            const parsed = JSON.parse(line);
            if (parsed.event === "bidder_ready" && parsed.did) {
              resolve(parsed.did);
            }
          } catch { /* not JSON, skip */ }
        }
      }
    } catch { /* stream closed */ }
    if (!killed) reject(new Error(`[${opts.label}] process exited without bidder_ready`));
  })();

  const timeout = setTimeout(() => {
    if (!killed) reject(new Error(`[${opts.label}] bidder_ready timeout after 60s`));
  }, 60_000);

  try {
    const did = await promise;
    clearTimeout(timeout);
    return { did, cleanup };
  } catch (e) {
    clearTimeout(timeout);
    cleanup();
    throw e;
  }
}

// ===========================================================================
// Inline bidder factories — core bid flow (skipSsh: true)
// ===========================================================================

async function createHonoBidderInline(opts: {
  logger: ReturnType<typeof createLogger>;
  plcDirectoryUrl: string;
  ingressProxyHost: string;
  cleanups: Array<() => void>;
}) {
  const { logger, plcDirectoryUrl, ingressProxyHost, cleanups } = opts;

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

  async function makeRelay() {
    const kp = await Secp256k1Keypair.create({ exportable: true });
    return createIngress({ logger, ingressProxyHost, signer: atproto.signer, keypair: kp });
  }

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

  const bidderRelay = await makeRelay();
  const bidder = await createMarketBidder({
    logger, atproto, providers: [provider], relay: bidderRelay,
    serve: createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 }, relays: [bidderRelay] }),
  });
  await bidder.beginServe();
  cleanups.push(() => bidder.shutdown());

  return { atproto, bidder };
}

async function createDesktopBidderInline(opts: {
  logger: ReturnType<typeof createLogger>;
  plcDirectoryUrl: string;
  ingressProxyHost: string;
  cleanups: Array<() => void>;
}) {
  const { logger, plcDirectoryUrl, ingressProxyHost, cleanups } = opts;

  const [
    { createIngress: ciXrpcRelay },
    { createMarketBidder: ciMarketBidder },
    { createComputeProviderHooks: ciProviderHooks },
    { createLocalComputeProvider: ciLocalCompute },
    { loadOrCreateMarketKeypair },
    { createFilesystemKeychainStore },
    { buildStandardChain },
    { createRbacProvisioner: ciRbac },
  ] = await Promise.all([
    import("../../atproto-market/lib/did-key-ingress-proxy/mod.ts"),
    import("../../atproto-market/lib/market-bidder/mod.ts"),
    import("../../atproto-market/lib/market-bidder-compute/mod.ts"),
    import("../../hono-compute-provider/lib/compute-provider-local/mod.ts"),
    import("../../deno-macos-runner-desktop/lib/market-bidder-keys/mod.ts"),
    import("../../deno-macos-runner-desktop/lib/secret-store-filesystem/mod.ts"),
    import("../../deno-macos-runner-desktop/lib/secret-store-chain/mod.ts"),
    import("../../hono-compute-provider/lib/rbac-atproto/mod.ts"),
  ]);

  const tmpDir = await Deno.makeTempDir();
  cleanups.push(() => Deno.remove(tmpDir, { recursive: true }).catch(() => {}));

  const fsStore = createFilesystemKeychainStore({ logger, storageDir: tmpDir });
  const secretStore = buildStandardChain({ filesystemStore: fsStore, logger });
  const { keypair: marketKp, hex } = await loadOrCreateMarketKeypair(secretStore);

  const pdsKeypair = await Secp256k1Keypair.create({ exportable: true });

  const pdsAgent = await createLocalPDSAgent({
    logger, keypair: pdsKeypair,
    serve: createServe({ logger }),
    plcDirectoryUrl, ingressProxyHost,
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
    return ciXrpcRelay({ logger, ingressProxyHost, signer: atproto.signer, keypair: kp });
  }

  const providerRelay = await makeRelay();
  const providerServe = createServe({ logger, relays: [providerRelay] });
  const provider = ciProviderHooks({
    provider: ciLocalCompute({
      logger,
      atproto: atproto as unknown as ComputeAtproto,
      serve: providerServe,
      getIssuerUrl: () => didWebToHttps(providerRelay.ingressRef),
      containerMode: "container",
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

  return { atproto, bidder };
}

// ===========================================================================
// Test
// ===========================================================================

const ORG = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
const HONO_BIDDER = `${ORG}/atproto-market/hono-bidder/mod.ts`;

Deno.test({
  name: "cross-platform bidder matrix",
  sanitizeOps: false,
  sanitizeResources: false,
}, async (t) => {
  const logger = createLogger({ serviceName: "matrix" });
  const cleanups: Array<() => void> = [];

  // ── Container backend ─────────────────────────────────────────────────
  const backend: ContainerBackend = Deno.build.os === "darwin"
    ? createContainerBackend()
    : createDockerBackend();
  if (!(await backend.ensureRunning())) {
    console.log(`[SKIP] container backend not available (${Deno.build.os})`);
    return;
  }
  console.log(`[platform] ${Deno.build.os}, backend: ${backend.type}`);
  const gateway = await backend.defaultGateway();

  // ── TLS cert for dispatcher (OIDC/onNetwork require HTTPS) ─────────────
  // Two-label base (relay.localhost) so the cert SAN is *.relay.localhost —
  // OpenSSL and rustls both reject single-label wildcards like *.localhost.
  const { caCertPem, serverCertPem, serverKeyPem } = await generateLocalhostTlsCert({
    extraDnsSans: ["relay.localhost", "*.relay.localhost"],
  });

  // ── Shared infra: dispatcher ──────────────────────────────────────────
  const dispatcherApp = createRelayFactory({
    hostname: "relay.localhost",
    additionalHosts: [gateway],
  }).createApp();
  // Dual listeners on the same app: plain HTTP for in-process components
  // (no way to inject a CA into this process's WebSocket/fetch after start),
  // TLS for the subprocess bidder (DENO_CERT) and guest containers (cloud-init
  // CA injection) — OIDC prove/onNetwork require HTTPS.
  const dispAc = new AbortController();
  const dispPort = await serveOnPort0(dispatcherApp.fetch, dispAc, "0.0.0.0");
  const dispTlsAc = new AbortController();
  const dispTlsPort = await serveOnPort0(dispatcherApp.fetch, dispTlsAc, "0.0.0.0", serverCertPem, serverKeyPem);
  cleanups.push(() => { dispAc.abort(); dispTlsAc.abort(); });
  const ingressProxyHost = `relay.localhost:${dispPort}`;

  // ── Shared infra: fake PLC ────────────────────────────────────────────
  const plc = createFakePlc();
  const plcAc = new AbortController();
  const plcPort = await serveOnPort0(plc.app.fetch, plcAc);
  cleanups.push(() => plcAc.abort());
  const plcDirectoryUrl = `http://127.0.0.1:${plcPort}`;

  // ── Fetch interception ────────────────────────────────────────────────
  const restoreFetch = installFetchInterceptor({
    realFetch: globalThis.fetch,
    plcDirectoryUrl,
    dispPort,
  });
  cleanups.push(restoreFetch);

  // =====================================================================
  // Core bid flow (skipSsh: true) — inline helpers
  // =====================================================================

  async function runCoreBidFlow(opts: {
    label: string;
    createBidder: () => Promise<{ atproto: { did: string } }>;
  }) {
    const bidder = await opts.createBidder();

    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({
      logger, serve: requesterServe,
      plcDirectoryUrl, ingressProxyHost, label: "requester",
    });
    cleanups.push(() => requesterServe.shutdown());
    await requester.beginServe();

    const seenBids: Array<{ did: string; uri: string }> = [];
    const origSet = requester.pendingBids.set.bind(requester.pendingBids);
    requester.pendingBids.set = ((k: string, v: Array<{ did: string; uri: string }>) => {
      for (const b of v) seenBids.push({ did: b.did, uri: b.uri });
      return origSet(k, v as never);
    }) as typeof requester.pendingBids.set;

    const contract = runComputeContract(requester, {
      logger,
      ingressProxyHost,
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

    const ourBids = seenBids.filter((b) => b.did === bidder.atproto.did);
    assert(ourBids.length > 0,
      `expected >=1 bid from ${bidder.atproto.did}; got ${seenBids.length} bid(s) from ${JSON.stringify(seenBids.map(b => b.did))}`);
    assert(!seenBids.some((b) => b.did === "did:plc:centraldefaultbidder000000"),
      "central default bidder must not have bid");

    const name = await findContainerByDid(backend, bidder.atproto.did);
    if (name) await backend.rm(name).catch(() => {});
  }

  await t.step("[bidder:hono-bidder] core bid flow (container mode)", async () => {
    await runCoreBidFlow({
      label: "hono-bidder",
      createBidder: () => createHonoBidderInline({ logger, plcDirectoryUrl, ingressProxyHost, cleanups }),
    });
  });

  await t.step("[bidder:hono-desktop] core bid flow (container mode)", async () => {
    await runCoreBidFlow({
      label: "hono-desktop",
      createBidder: () => createDesktopBidderInline({ logger, plcDirectoryUrl, ingressProxyHost, cleanups }),
    });
  });

  // =====================================================================
  // Local SSH relay — hono-bidder CLI subprocess, standard flow
  // =====================================================================

  async function runSshStep(opts: {
    label: string;
    spawnConfig: { modPath: string; args: string[] };
  }) {
    const proc = await spawnBidder({
      modPath: opts.spawnConfig.modPath,
      args: opts.spawnConfig.args,
      label: opts.label,
      env: { CA_CERT_PEM: caCertPem },
    });
    cleanups.push(proc.cleanup);

    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({
      logger, serve: requesterServe,
      plcDirectoryUrl, ingressProxyHost,
      label: `requester-${flattenLabel(opts.label)}`,
    });
    cleanups.push(() => requesterServe.shutdown());
    await requester.beginServe();

    const result = await runComputeContract(requester, {
      logger,
      // Use gateway IP so the guest container can reach the relay dispatcher.
      // "localhost" inside the container = container's own loopback, not the host.
      ingressProxyHost: `${gateway}:${dispPort}`,
      // audHost for JWT — must match relay's hostname (localhost), not gateway IP
      fedingressHost: "relay.localhost",
      skipSsh: false,
      keepVm: false,
      bidWindowSec: 8,
      vmReadyTimeoutSec: 240,
      execProgram: "echo SSH_OK_VIA_RELAY && uname -a",
      extraBidderDids: [proc.did],
      denyBidderDids: ["did:plc:centraldefaultbidder000000"],
      // The guest announces its fqdn as <sub>.<gateway-ip>:<port> (reachable
      // from inside the container network). On the host, rewrite to
      // <sub>.relay.localhost:<port> — resolves to loopback and the Host
      // header matches the dispatcher's subdomain routing. Plain listener:
      // only guest OIDC needs the TLS one.
      sshProxyCommandFn: (fqdn: string) => {
        const sub = fqdn.split(".")[0];
        const port = fqdn.includes(":") ? fqdn.slice(fqdn.lastIndexOf(":") + 1) : "80";
        return `websocat --binary ws://${sub}.relay.localhost:${port}/xrpc/com.fedproxy.temp.xrpc.tunnel`;
      },
    });

    assert(result.event === "compute_request_complete",
      `[${opts.label}] expected compute_request_complete, got ${result.event}: ${result.error ?? ""}`);
    assert(result.sshReady === true, `[${opts.label}] guest never reachable over ssh relay`);
    assert(result.sshExitCode === 0, `[${opts.label}] ssh session exited ${result.sshExitCode}`);
  }

  // websocat needed for SSH ProxyCommand tunnel — CI runners may not have it.
  await ensureWebsocat(logger).catch(() => {});

  await t.step("[bidder:hono-bidder] ssh via local xrpc relay", async () => {
    await runSshStep({
      label: "hono-bidder-local-ssh",
      spawnConfig: {
        modPath: HONO_BIDDER,
        args: [
          "--ingress-proxy-host", ingressProxyHost,
          "--plc-directory-url", plcDirectoryUrl,
          "--relay-url", `http://localhost:${dispPort}`,
          "--guest-tls-port", String(dispTlsPort),
          "--policy-mode", "DYNAMIC",
          "--compute-provider-local",
          "--serve-port", "0",
          "--skip-qr",
        ],
      },
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
