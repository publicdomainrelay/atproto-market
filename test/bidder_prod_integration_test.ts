// Production fedproxy.com SSH relay integration test.
// Validates: RFP -> bid -> accept -> container provision -> SSH via fedproxy.com.
// Spawns hono-bidder CLI subprocess. Uses real plc.directory + xrpc.fedproxy.com
// so the relay can resolve all DIDs. Auto-skips when prod infra unreachable.
//
// Runs on macOS (container), Linux (docker), WSL2 (docker), Windows (wsl docker).
//
//   deno test --allow-all test/bidder_prod_integration_test.ts

import { assert } from "@std/assert";
import { Secp256k1Keypair } from "@atproto/crypto";
import { createLogger } from "@publicdomainrelay/logger";
import { createServe } from "@publicdomainrelay/serve";
import { createRelayFactory } from "@publicdomainrelay/hono-factory-did-key-ingress-proxy-xrpc";
import {
  createRequesterPDS, ensureWebsocat, runComputeContract,
} from "@publicdomainrelay/requester-xrpc";
import type { ContainerBackend } from "@publicdomainrelay/container-backend-abc";
import { createContainerBackend } from "@publicdomainrelay/container-backend-container";
import { createDockerBackend } from "@publicdomainrelay/container-backend-docker";

// ===========================================================================
// Helpers
// ===========================================================================

const encoder = new TextEncoder();

function flattenLabel(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function hasCommand(cmd: string): Promise<boolean> {
  try {
    const { code } = await new Deno.Command("which", {
      args: [cmd], stdout: "null", stderr: "null",
    }).output();
    return code === 0;
  } catch { return false; }
}

async function probeRtt(url: string, timeoutMs = 5000): Promise<number | null> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const start = Date.now();
    const r = await fetch(url, { signal: ac.signal });
    clearTimeout(t);
    await r.body?.cancel();
    // Any response (including 404) proves the host is reachable.
    return Date.now() - start;
  } catch { return null; }
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
}): Promise<BidderProcess> {
  const decoder = new TextDecoder();
  const cmd = new Deno.Command("deno", {
    args: ["run", "-A", opts.modPath, ...opts.args],
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
          try {
            const parsed = JSON.parse(line);
            if (parsed.event === "bidder_ready" && parsed.did) {
              resolve(parsed.did);
              return;
            }
          } catch { /* not JSON */ }
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
// Test
// ===========================================================================

const ORG = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
const HONO_BIDDER = `${ORG}/atproto-market/hono-bidder/mod.ts`;

const PROD_PLC = "https://plc.directory";
const PROD_DISPATCHER = "xrpc.fedproxy.com";
const PROD_FEDPROXY = "fedproxy.com";

Deno.test({
  name: "prod fedproxy.com SSH relay",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: Deno.env.get("DENO_TEST_PROD") !== "1",
}, async (t) => {
  // ── Reachability probes ───────────────────────────────────────────────
  const plcRtt = await probeRtt(`${PROD_PLC}/`);
  const dispRtt = await probeRtt(`https://${PROD_DISPATCHER}/.well-known/did.json`);
  const fedproxyRtt = await probeRtt(`https://${PROD_FEDPROXY}/`);

  if (plcRtt === null || dispRtt === null || fedproxyRtt === null) {
    const missing = [];
    if (plcRtt === null) missing.push(PROD_PLC);
    if (dispRtt === null) missing.push(PROD_DISPATCHER);
    if (fedproxyRtt === null) missing.push(PROD_FEDPROXY);
    console.log(`[SKIP] prod infrastructure unreachable: ${missing.join(", ")}`);
    console.log(`[RTT] plc=${plcRtt ?? "N/A"}ms disp=${dispRtt ?? "N/A"}ms fedproxy=${fedproxyRtt ?? "N/A"}ms`);
    return;
  }
  console.log(`[RTT] plc=${plcRtt}ms disp=${dispRtt}ms fedproxy=${fedproxyRtt}ms`);

  const logger = createLogger({ serviceName: "prod-matrix" });
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

  await ensureWebsocat(logger).catch(() => {});
  if (!(await hasCommand("websocat"))) {
    console.log("[SKIP] websocat not installed");
    return;
  }

  await t.step("[bidder:hono-bidder] prod ssh via fedproxy.com", async () => {
    const proc = await spawnBidder({
      modPath: HONO_BIDDER,
      args: [
        "--ingress-proxy-host", PROD_DISPATCHER,
        "--plc-directory-url", PROD_PLC,
        "--compute-provider-local",
        "--compute-provider-local-container-mode", "container",
        "--serve-port", "0",
      ],
      label: "hono-bidder-prod-ssh",
    });
    cleanups.push(proc.cleanup);

    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({
      logger, serve: requesterServe,
      plcDirectoryUrl: PROD_PLC,
      ingressProxyHost: PROD_DISPATCHER,
      label: "requester-prod-ssh",
    });
    cleanups.push(() => requesterServe.shutdown());
    await requester.beginServe();

    const result = await runComputeContract(requester, {
      logger,
      ingressProxyHost: PROD_DISPATCHER,
      fedingressHost: PROD_FEDPROXY,
      rbac: true,
      skipSsh: false,
      transport: "fedproxy",
      keepVm: false,
      bidWindowSec: 15,
      vmReadyTimeoutSec: 300,
      execProgram: "echo SSH_OK_VIA_FEDPROXY && uname -a",
      extraBidderDids: [proc.did],
      denyBidderDids: ["did:plc:centraldefaultbidder000000"],
    });

    assert(result.event === "compute_request_complete",
      `[prod-ssh] expected compute_request_complete, got ${result.event}: ${result.error ?? ""}`);
    assert(result.sshReady === true, "[prod-ssh] guest never reachable over fedproxy ssh relay");
    assert(result.sshExitCode === 0, `[prod-ssh] ssh session exited ${result.sshExitCode}`);

    const name = await findContainerByDid(backend, proc.did);
    if (name) await backend.rm(name).catch(() => {});
  });

  // =====================================================================
  // Cleanup
  // =====================================================================
  for (const c of cleanups.reverse()) {
    try { await c(); } catch { /* best effort */ }
  }
  await new Promise((r) => setTimeout(r, 200));
});
