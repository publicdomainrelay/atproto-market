import type { PolicyArgs, PolicyResult, PolicySpec } from "@publicdomainrelay/market-policy-abc";
import {
  POLICIES_BUILTIN_NSID,
  POLICIES_SERVICE_NSID,
  POLICIES_DENO_WORKER_NSID,
} from "@publicdomainrelay/market-lexicons";
import { LOCAL_EXEC_DISABLED, UNKNOWN_POLICY_ENGINE } from "@publicdomainrelay/market-policy-common";
import { createWorkerPolicyEngine, type PolicyHostBridge } from "@publicdomainrelay/market-policy-engine-worker";
import { createServicePolicyEngine, type Signer } from "@publicdomainrelay/market-policy-engine-service";

export type { PolicyArgs, PolicySpec };

export interface StrongRefLike {
  uri: string;
  cid: string;
}

export interface BuildPolicyRecordOpts {
  spec: PolicySpec;
  requesterDid: string;
  /** DID of a remote policy engine. When set, mints a policies.service record. */
  policyEngine?: string;
  /** Strong ref to a worker manifest. When set, mints a policies.denoWorker record. */
  manifest?: StrongRefLike;
  permissions?: Record<string, unknown>;
}

export interface BuiltPolicyRecord {
  nsid: string;
  record: Record<string, unknown>;
}

export function buildPolicyRecord(opts: BuildPolicyRecordOpts): BuiltPolicyRecord {
  const { spec, requesterDid } = opts;
  const base = {
    policies: [{
      name: spec.name,
      description: spec.description ?? "",
      args: spec.args ?? {},
    }],
    requesterDid,
    createdAt: new Date().toISOString(),
  };

  if (opts.manifest) {
    return {
      nsid: POLICIES_DENO_WORKER_NSID,
      record: {
        $type: POLICIES_DENO_WORKER_NSID,
        ...base,
        manifest: { $type: "com.atproto.repo.strongRef", uri: opts.manifest.uri, cid: opts.manifest.cid },
        ...(opts.permissions ? { permissions: opts.permissions } : {}),
      },
    };
  }

  if (opts.policyEngine) {
    return {
      nsid: POLICIES_SERVICE_NSID,
      record: { $type: POLICIES_SERVICE_NSID, ...base, policyEngine: opts.policyEngine },
    };
  }

  return {
    nsid: POLICIES_BUILTIN_NSID,
    record: { $type: POLICIES_BUILTIN_NSID, ...base },
  };
}

export interface EvaluateRfpPolicyOpts {
  policyRef: StrongRefLike;
  subjectDid: string;
  rootRequesterDid: string;
  counterpartyDid: string;
  /** Who is running this evaluation. */
  perspective: import("@publicdomainrelay/market-policy-abc").PolicyPerspective;
  /** The DID running this evaluation. */
  selfDid: string;
  demand?: { rfpRef: StrongRefLike; payloadRef: StrongRefLike; payloadNsid: string; payload?: Record<string, unknown> };
  offer?: { bidRef: StrongRefLike; payloadRef: StrongRefLike; payloadNsid: string; payload?: Record<string, unknown> };
  resolve: (ref: StrongRefLike) => Promise<Record<string, unknown>>;
  resolveOperatorDid?: (bidderDid: string) => Promise<string | null>;
  getVouchedDids?: (did: string) => Promise<Set<string>>;
  signer?: Signer;
  log?: (level: string, msg: string, meta?: Record<string, unknown>) => void;
  onlyRemotePolicyExec?: boolean;
  allowUntrustedPolicyExec?: boolean;
  workerTimeoutMs?: number;
}

function nsidFromRecord(record: Record<string, unknown>, ref: StrongRefLike): string {
  const declared = record.$type;
  if (typeof declared === "string" && declared.length > 0) return declared;
  return ref.uri.split("/")[3] ?? "";
}

export async function evaluateRfpPolicy(opts: EvaluateRfpPolicyOpts): Promise<PolicyResult> {
  const log = opts.log ?? (() => {});

  let policyRecord: Record<string, unknown>;
  try {
    policyRecord = await opts.resolve(opts.policyRef);
  } catch (err) {
    return { allow: false, violations: [{ msg: `failed to resolve policy record: ${err}`, policyId: opts.policyRef.uri }] };
  }

  const nsid = nsidFromRecord(policyRecord, opts.policyRef);

  // The record is a set of named policies. Fall back to the legacy single-name
  // shape for records minted before the set refactor.
  const policies = Array.isArray(policyRecord.policies)
    ? policyRecord.policies as Array<{ name?: unknown; args?: unknown }>
    : policyRecord.name
    ? [{ name: policyRecord.name, args: policyRecord.args }]
    : [];

  // Service records delegate each policy to the remote engine by name.
  if (nsid === POLICIES_SERVICE_NSID) {
    const policyEngine = policyRecord.policyEngine as string | undefined;
    if (!policyEngine) {
      return { allow: false, violations: [{ msg: "policyEngine not set in policy record", policyId: opts.policyRef.uri }] };
    }
    for (const p of policies) {
      const result = await createServicePolicyEngine().evaluate({
        policyName: String(p.name ?? ""),
        args: (p.args ?? {}) as PolicyArgs,
        policyEngine,
        perspective: opts.perspective,
        selfDid: opts.selfDid,
        counterpartyDid: opts.counterpartyDid,
        subjectDid: opts.subjectDid,
        rootRequesterDid: opts.rootRequesterDid,
        policyRef: opts.policyRef,
        demand: opts.demand,
        offer: opts.offer,
        signer: opts.signer,
        log,
      });
      if (!result.allow) return result;
    }
    return { allow: true, violations: [] };
  }

  if (opts.onlyRemotePolicyExec) {
    return {
      allow: false,
      violations: [{
        msg: `local policy execution disabled; ${nsid} requires a policies.service record`,
        policyId: LOCAL_EXEC_DISABLED,
      }],
    };
  }

  const bridge: PolicyHostBridge = {
    resolve: (ref) => opts.resolve(ref),
    resolveOperatorDid: opts.resolveOperatorDid ?? (async () => null),
    getVouchedDids: opts.getVouchedDids ?? (async () => new Set<string>()),
    log,
  };

  const engine = createWorkerPolicyEngine({
    allowUntrusted: opts.allowUntrustedPolicyExec,
    timeoutMs: opts.workerTimeoutMs,
  });

  for (const p of policies) {
    const policyName = String(p.name ?? "");
    const args = (p.args ?? {}) as PolicyArgs;
    let result: PolicyResult;

    if (nsid === POLICIES_DENO_WORKER_NSID) {
      const manifestRef = policyRecord.manifest as StrongRefLike | undefined;
      if (!manifestRef?.uri || !manifestRef?.cid) {
        return { allow: false, violations: [{ msg: "denoWorker policy has no manifest ref", policyId: opts.policyRef.uri }] };
      }
      let bundle: string;
      try {
        const manifest = await opts.resolve(manifestRef);
        const raw = manifest.bundle;
        if (typeof raw !== "string" || raw.length === 0) {
          return { allow: false, violations: [{ msg: "worker manifest has no bundle", policyId: manifestRef.uri }] };
        }
        bundle = raw;
      } catch (err) {
        return { allow: false, violations: [{ msg: `failed to resolve worker manifest: ${err}`, policyId: manifestRef.uri }] };
      }
      result = await engine.evaluate({
        policyName,
        args,
        perspective: opts.perspective,
        selfDid: opts.selfDid,
        counterpartyDid: opts.counterpartyDid,
        subjectDid: opts.subjectDid,
        rootRequesterDid: opts.rootRequesterDid,
        policyRef: opts.policyRef,
        bridge,
        bundle,
        permissions: policyRecord.permissions as Record<string, boolean | string[]> | undefined,
      });
    } else if (nsid === POLICIES_BUILTIN_NSID) {
      result = await engine.evaluate({
        policyName,
        args,
        perspective: opts.perspective,
        selfDid: opts.selfDid,
        counterpartyDid: opts.counterpartyDid,
        subjectDid: opts.subjectDid,
        rootRequesterDid: opts.rootRequesterDid,
        policyRef: opts.policyRef,
        demand: opts.demand,
        offer: opts.offer,
        bridge,
      });
    } else {
      return {
        allow: false,
        violations: [{ msg: `unknown policy engine kind: ${nsid}`, policyId: UNKNOWN_POLICY_ENGINE }],
      };
    }

    if (!result.allow) return result;
  }

  return { allow: true, violations: [] };
}
