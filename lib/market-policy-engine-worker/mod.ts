import type { PolicyArgs, PolicyResult, PolicyViolation } from "@publicdomainrelay/market-policy-abc";
import type { PolicyWorkerInbound, PolicyWorkerOutbound } from "@publicdomainrelay/market-policy-common";
import { POLICY_WORKER_TIMEOUT_MS, UNTRUSTED_EXEC_DISABLED } from "@publicdomainrelay/market-policy-common";
import type { PersistentWorker } from "@publicdomainrelay/sandbox-abc";
import type { SandboxPermissions } from "@publicdomainrelay/sandbox-common";
import { createPersistentDenoWorker } from "@publicdomainrelay/sandbox-deno";
import { BUILTIN_POLICY_BUNDLE } from "./builtin-bundle.ts";

export interface StrongRefLike {
  uri: string;
  cid: string;
}

export interface PolicyHostBridge {
  resolve: (ref: StrongRefLike) => Promise<Record<string, unknown>>;
  resolveOperatorDid: (bidderDid: string) => Promise<string | null>;
  getVouchedDids: (did: string) => Promise<Set<string>>;
  log: (level: string, msg: string, meta?: Record<string, unknown>) => void;
}

export interface WorkerPolicyEvalInput {
  policyName: string;
  args: PolicyArgs;
  perspective: "bidder" | "requester";
  selfDid: string;
  subjectDid: string;
  rootRequesterDid: string;
  counterpartyDid: string;
  policyRef?: StrongRefLike;
  demand?: { rfpRef: StrongRefLike; payloadRef: StrongRefLike; payloadNsid: string; payload?: Record<string, unknown> };
  offer?: { bidRef: StrongRefLike; payloadRef: StrongRefLike; payloadNsid: string; payload?: Record<string, unknown> };
  bridge: PolicyHostBridge;
  /** Untrusted bundle source. When set the registry is not used. */
  bundle?: string;
  permissions?: SandboxPermissions;
}

export interface WorkerPolicyEngineOptions {
  allowUntrusted?: boolean;
  timeoutMs?: number;
  createWorker?: (url: string | URL, permissions?: SandboxPermissions) => PersistentWorker;
}

/**
 * Host-RPC shim appended to every policy bundle. The bundle's only job is to
 * assign globalThis.policy; this drives it. Identical for first-party and
 * caller-supplied bundles, so both execute through one code path.
 */
const POLICY_WORKER_SHIM = `
const pending = new Map();
let nextRpcId = 1;
function send(m) { self.postMessage(m); }
function rpc(method, arg) {
  const id = nextRpcId++;
  const { promise, resolve, reject } = Promise.withResolvers();
  pending.set(id, { resolve, reject });
  send({ type: "rpc", id, method, arg });
  return promise;
}
self.onmessage = async (ev) => {
  const message = ev.data;
  if (message.type === "rpc-result") {
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.ok) entry.resolve(message.value);
    else entry.reject(new Error(message.error ?? "rpc failed"));
    return;
  }
  if (message.type !== "evaluate") return;
  const policy = globalThis.policy;
  if (!policy || typeof policy.evaluate !== "function") {
    send({ type: "result", allow: false, violations: [{ msg: "bundle did not assign globalThis.policy", policyId: message.policyName }] });
    return;
  }
  try {
    const result = await policy.evaluate({
      policyName: message.policyName,
      args: message.args,
      perspective: message.perspective,
      selfDid: message.selfDid,
      subjectDid: message.subjectDid,
      rootRequesterDid: message.rootRequesterDid,
      counterpartyDid: message.counterpartyDid,
      resolve: (ref) => rpc("resolve", ref),
      resolveOperatorDid: (did) => rpc("resolveOperatorDid", did),
      getVouchedDids: async (did) => {
        const v = await rpc("getVouchedDids", did);
        return v instanceof Set ? v : new Set(v ?? []);
      },
      log: (level, msg, meta) => send({ type: "log", level, msg, meta }),
      policyRef: message.policyRef,
      demand: message.demand,
      offer: message.offer,
    });
    send({ type: "result", allow: !!result.allow, violations: result.violations ?? [] });
  } catch (err) {
    send({ type: "result", allow: false, violations: [{ msg: "policy threw: " + err, policyId: message.policyName }] });
  }
};
`;

function deny(msg: string, policyId: string | StrongRefLike): PolicyResult {
  return { allow: false, violations: [{ msg, policyId } as PolicyViolation] };
}

function toDataUrl(source: string): string {
  return `data:application/javascript;base64,${btoa(unescape(encodeURIComponent(source)))}`;
}

export function createWorkerPolicyEngine(opts?: WorkerPolicyEngineOptions) {
  const timeoutMs = opts?.timeoutMs ?? POLICY_WORKER_TIMEOUT_MS;
  const spawn = opts?.createWorker ?? createPersistentDenoWorker;

  return {
    async evaluate(input: WorkerPolicyEvalInput): Promise<PolicyResult> {
      if (input.bundle !== undefined && !opts?.allowUntrusted) {
        return deny(
          "untrusted policy bundle execution is disabled; pass --allow-untrusted-policy-exec to permit it",
          UNTRUSTED_EXEC_DISABLED,
        );
      }

      // One mechanism for both: a standalone JS bundle that assigns
      // globalThis.policy, plus the host-RPC shim. Only the provenance differs
      // -- first-party bundle built from the registry, or caller-supplied.
      const bundle = input.bundle ?? BUILTIN_POLICY_BUNDLE;
      const workerUrl = toDataUrl(`${bundle}\n${POLICY_WORKER_SHIM}`);

      // First-party bundles get no permissions at all; the host performs every
      // read on their behalf. Untrusted bundles get only what they declared.
      const permissions: SandboxPermissions = input.bundle !== undefined ? (input.permissions ?? {}) : {};

      let worker: PersistentWorker;
      try {
        worker = spawn(workerUrl, permissions);
      } catch (err) {
        return deny(`failed to start policy worker: ${err}`, input.policyName);
      }

      const { promise, resolve } = Promise.withResolvers<PolicyResult>();
      let settled = false;
      const finish = (result: PolicyResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.shutdown().catch(() => {});
        resolve(result);
      };

      const timer = setTimeout(() => {
        finish(deny(`policy worker timed out after ${timeoutMs}ms`, input.policyName));
      }, timeoutMs);

      worker.onMessage((raw) => {
        const message = raw as PolicyWorkerOutbound;
        if (!message || typeof message !== "object") return;

        if (message.type === "log") {
          input.bridge.log(message.level, message.msg, message.meta);
          return;
        }

        if (message.type === "error") {
          finish(deny(`policy worker error: ${message.message}`, input.policyName));
          return;
        }

        if (message.type === "result") {
          finish({ allow: message.allow, violations: message.violations as PolicyViolation[] });
          return;
        }

        if (message.type === "rpc") {
          const reply = (ok: boolean, value?: unknown, error?: string) => {
            const out: PolicyWorkerInbound = { type: "rpc-result", id: message.id, ok, value, error };
            worker.postMessage(out);
          };
          const call = message.method === "resolve"
            ? input.bridge.resolve(message.arg as StrongRefLike)
            : message.method === "resolveOperatorDid"
            ? input.bridge.resolveOperatorDid(message.arg as string)
            : input.bridge.getVouchedDids(message.arg as string);
          call
            .then((value) => reply(true, value))
            .catch((err) => reply(false, undefined, String(err)));
        }
      });

      const evaluateMessage: PolicyWorkerInbound = {
        type: "evaluate",
        policyName: input.policyName,
        args: input.args as Record<string, unknown>,
        perspective: input.perspective,
        selfDid: input.selfDid,
        subjectDid: input.subjectDid,
        rootRequesterDid: input.rootRequesterDid,
        counterpartyDid: input.counterpartyDid,
        policyRef: input.policyRef,
        demand: input.demand,
        offer: input.offer,
      };
      worker.postMessage(evaluateMessage);

      return await promise;
    },
  };
}
