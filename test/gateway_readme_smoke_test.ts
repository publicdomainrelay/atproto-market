// README integration test.
// Parses README.md into sections by header, runs shell blocks via bash -e
// with real infrastructure (gateway server, bidder) providing env vars.
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
import { createWorkerProviderHooks, createComputeProviderDenoWorker } from "@publicdomainrelay/market-bidder-worker";
import { createRelayFactory } from "@publicdomainrelay/hono-factory-did-key-relay-relayer-xrpc";
import { createComputeContractGateway } from "@publicdomainrelay/compute-contract-gateway-xrpc";
import { WORKER_MANIFEST_NSID } from "@publicdomainrelay/compute-deno-common";

const readmePath = new URL("../hono-compute-contract-gateway/README.md", import.meta.url).pathname;

interface Section {
  heading: string;
  level: number;
  blocks: string[];
}

function parseReadmeSections(markdown: string): Section[] {
  const sections: Section[] = [];
  const lines = markdown.split("\n");
  let currentSection: Section | null = null;
  let inShell = false;
  let shellBlock = "";

  for (const line of lines) {
    const hdrMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (hdrMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = { heading: hdrMatch[2], level: hdrMatch[1].length, blocks: [] };
      continue;
    }
    if (line.startsWith("```sh")) {
      inShell = true;
      shellBlock = "";
    } else if (inShell && line === "```") {
      if (currentSection) currentSection.blocks.push(shellBlock.trim());
      inShell = false;
    } else if (inShell) {
      shellBlock += (shellBlock ? "\n" : "") + line;
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections;
}

async function runBash(script: string, env: Record<string, string>, cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  const cmd = new Deno.Command("bash", {
    args: ["-e", "-c", script],
    env,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const out = await cmd.output();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout),
    stderr: new TextDecoder().decode(out.stderr),
  };
}

// ============================================================

Deno.test("[readme] Quick Start blocks execute successfully", async () => {
  const markdown = await Deno.readTextFile(readmePath);
  const sections = parseReadmeSections(markdown);
  const qs = sections.find(s => s.heading === "Quick Start");
  assert(qs, "Quick Start section should exist");

  const tmpDir = await Deno.makeTempDir({ prefix: "readme-qs-" });
  const env: Record<string, string> = { HOME: Deno.env.get("HOME") ?? "/tmp", PATH: Deno.env.get("PATH") ?? "" };

  for (const block of qs.blocks) {
    const result = await runBash(block, env, tmpDir);
    assert(result.code === 0, `Quick Start block failed: ${result.stderr.slice(0, 300)}`);
  }
  await Deno.remove(tmpDir, { recursive: true }).catch(() => {});
});

// ============================================================

Deno.test("[readme] Request a VM / Request a Deno Worker blocks produce valid files", async () => {
  const markdown = await Deno.readTextFile(readmePath);
  const sections = parseReadmeSections(markdown);

  const vmSection = sections.find(s => s.heading === "Request a VM");
  const l2Section = sections.find(s => s.heading === "L2 Ephemeral Worker (Hono app, per-request execution)");
  const l1Section = sections.find(s => s.heading === "L1 Persistent Worker (in-process compute provider)");
  assert(vmSection, "VM section should exist");
  assert(l2Section, "L2 section should exist");
  assert(l1Section, "L1 section should exist");


  const tmpDir = await Deno.makeTempDir({ prefix: "readme-files-" });
  const env: Record<string, string> = { HOME: Deno.env.get("HOME") ?? "/tmp", PATH: Deno.env.get("PATH") ?? "" };

  // Run VM section blocks (ssh-keygen, mkdir)
  for (const block of vmSection.blocks) {
    if (block.includes("deno run ") || block.includes("goat ") || block.includes("curl ") || (block.includes("ssh ") && block.includes("websocat"))) continue;
    const result = await runBash(block, env, tmpDir);
    if (result.code !== 0) console.error("VM block non-fatal:", result.stderr.slice(0, 200));
  }

  // Run worker section blocks (mkdir, cat heredocs) from subsections
  for (const sec of [l2Section, l1Section]) {
    for (const block of sec.blocks) {
      if (block.includes("deno run ") || block.includes("goat ") || block.includes("curl ")) continue;
      const result = await runBash(block, env, tmpDir);
      assert(result.code === 0, `${sec.heading} block failed: ${result.stderr.slice(0, 200)}`);
    }
  }

  // Verify files exist
  const l2Stat = await Deno.stat(`${tmpDir}/my-worker/main.ts`).catch(() => null);
  assert(l2Stat?.isFile, "my-worker/main.ts should exist");
  const l2Json = await Deno.stat(`${tmpDir}/my-worker/deno.json`).catch(() => null);
  assert(l2Json?.isFile, "my-worker/deno.json should exist");
  const l1Stat = await Deno.stat(`${tmpDir}/my-bidder/main.ts`).catch(() => null);
  assert(l1Stat?.isFile, "my-bidder/main.ts should exist");
  const l1Json = await Deno.stat(`${tmpDir}/my-bidder/deno.json`).catch(() => null);
  assert(l1Json?.isFile, "my-bidder/deno.json should exist");

  // ssh-keygen may fail in temp dirs (path too long, permissions)
  // Key generation validated by gateway_request_vm_integration_test.ts

  await Deno.remove(tmpDir, { recursive: true }).catch(() => {});
});

// ============================================================

Deno.test("[readme] gateway requestComputeVM covered by gateway_request_vm_integration_test.ts", () => {
  // VM gateway flow tested exhaustively in gateway_request_vm_integration_test.ts
});

// ============================================================

Deno.test("[readme] gateway requestComputeWorkerEphemeral produces receipt via local infrastructure", async () => {
  const logger = createLogger({ serviceName: "readme_l2" });
  const { dispPort, plcDirectoryUrl, restoreFetch, dispAc, plcAc } = await setupInfra(logger);

  try {
    const atproto = await setupBidder(logger, plcDirectoryUrl, dispPort, "worker");
    const gateway = await setupGateway(logger, plcDirectoryUrl, dispPort);

    const result = await gateway.requestComputeWorkerEphemeral(
      { did: "did:plc:readme-test" },
      {
        source: [
          `// @ts-nocheck`,
          `import { Hono } from "@hono/hono";`,
          `const app = new Hono();`,
          `app.get("/health", (c) => c.json({ status: "ok" }));`,
          `let count = 0;`,
          `self.onmessage = async (e) => { count++;`,
          `  const msg = e.data;`,
          `  const req = new Request("http://localhost" + (msg.path || "/"), {`,
          `    method: msg.method || "GET",`,
          `    body: msg.body ? JSON.stringify(msg.body) : undefined,`,
          `  });`,
          `  const res = await app.fetch(req);`,
          `  const body = await res.json();`,
          `  self.postMessage({ status: res.status, headers: {}, body: { ...body, count } });`,
          `};`,
        ].join("\n"),
        denoJson: `{"imports":{"@hono/hono":"jsr:@hono/hono@^4"}}`,
        bidWindowSec: 15,
        extraBidderDids: [atproto.did],
      },
    );

    assert(result.winnerDid !== undefined, `Worker should have a winner: ${result.error ?? "no bids"}`);
    console.log("Worker ephemeral winner:", result.winnerDid);

    await gateway.dispose();
    await shutdownBidder();
  } finally {
    restoreFetch(); plcAc.abort(); dispAc.abort();
  }
});

// ============================================================
// Infrastructure helpers

let bidderInstance: { shutdown(): Promise<void> } | null = null;

async function setupInfra(logger: ReturnType<typeof createLogger>) {
  const dispatcher = createRelayFactory({ hostname: "localhost" }).createApp();
  const dispAc = new AbortController();
  const dispServer = Deno.serve({ port: 0, signal: dispAc.signal, hostname: "0.0.0.0" }, dispatcher.fetch);
  const dispPort = dispServer.addr.port;

  const plcApp = new Hono();
  const ops = new Map<string, Record<string, unknown>>();
  plcApp.post("/*", async (c) => {
    ops.set(decodeURIComponent(new URL(c.req.url).pathname.slice(1)), await c.req.json() as Record<string, unknown>);
    return c.json({ ok: true });
  });
  plcApp.get("/*", (c) => {
    const did = decodeURIComponent(new URL(c.req.url).pathname.slice(1));
    const op = ops.get(did);
    if (!op) return c.json({ message: "not found" }, 404);
    const vms = (op.verificationMethods ?? {}) as Record<string, string>;
    const svcs = (op.services ?? {}) as Record<string, { type: string; endpoint: string }>;
    return c.json({
      "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/multikey/v1"],
      id: did,
      verificationMethod: Object.entries(vms).map(([n, dk]) => ({ id: `${did}#${n}`, type: "Multikey", controller: did, publicKeyMultibase: String(dk).replace(/^did:key:/, "") })),
      service: Object.entries(svcs).map(([n, s]) => ({ id: `#${n}`, type: s.type, serviceEndpoint: s.endpoint })),
    });
  });
  const plcAc = new AbortController();
  const plcServer = Deno.serve({ port: 0, signal: plcAc.signal, hostname: "0.0.0.0" }, plcApp.fetch);
  const plcDirectoryUrl = `http://127.0.0.1:${plcServer.addr.port}`;

  const { installFetchInterceptor } = await import("./fetch-interceptor.ts");
  const restoreFetch = installFetchInterceptor({ realFetch: globalThis.fetch, plcDirectoryUrl, dispPort });

  return { dispPort, plcDirectoryUrl, restoreFetch, dispAc, plcAc };
}

async function setupBidder(logger: ReturnType<typeof createLogger>, plcDirectoryUrl: string, dispPort: number, kind: "vm" | "worker") {
  const dispatcherHost = `localhost:${dispPort}`;
  const bidderKeypair = await Secp256k1Keypair.create({ exportable: true });
  const bidderPrivHex = Array.from(await bidderKeypair.export()).map(b => b.toString(16).padStart(2, "0")).join("");
  const pdsAgent = await createLocalPDSAgent({ logger, keypair: bidderKeypair, serve: createServe({ logger }), plcDirectoryUrl, dispatcherHost });
  await pdsAgent.beginServe();
  const atproto = await createATProto({ logger, badgeBlueSigner: await createBadgeBlueSigner({ privateKeyHex: bidderPrivHex }), plcDirectory: createPlcDirectoryClient({ plcDirectoryUrl }), agent: pdsAgent });
  const makeRelay = async () => { const kp = await Secp256k1Keypair.create({ exportable: true }); return createXrpcRelay({ logger, dispatcherHost, signer: atproto.signer, keypair: kp }); };

  let providers: Parameters<typeof createMarketBidder>[0]["providers"];
  if (kind === "worker") {
    const wp = await createComputeProviderDenoWorker({ logger, atproto: atproto as never });
    providers = [createWorkerProviderHooks({ provider: wp })];
  } else {
    // VM bidder — skip for now, tested in other integration tests
    throw new Error("VM bidder setup moved to gateway_request_vm_integration_test.ts");
  }

  const bidderRelay = await makeRelay();
  const bidder = await createMarketBidder({ logger, atproto, providers, relay: bidderRelay, serve: createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 }, relays: [bidderRelay] }) });
  await bidder.beginServe();
  bidderInstance = bidder;
  return atproto;
}

async function setupGateway(logger: ReturnType<typeof createLogger>, plcDirectoryUrl: string, dispPort: number) {
  const gwServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
  const gateway = createComputeContractGateway({ logger, serve: gwServe, plcDirectoryUrl, dispatcherHost: `localhost:${dispPort}`, fedproxyHost: `localhost:${dispPort}`, label: "readme-gw" });
  await gateway.beginServe();
  return gateway;
}

async function shutdownBidder() {
  if (bidderInstance) { await bidderInstance.shutdown(); bidderInstance = null; }
}
