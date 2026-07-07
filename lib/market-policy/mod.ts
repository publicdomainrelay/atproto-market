import type { FulfillmentPolicy, PolicyViolation } from "@publicdomainrelay/market-policy-abc";
import type { PolicyEvalCtx } from "@publicdomainrelay/market-policy-abc";
import { createOnlyMePolicy } from "@publicdomainrelay/market-policy-only-me";
import { createDirectNetworkPolicy } from "@publicdomainrelay/market-policy-direct-network";
import { createRemotePolicy } from "@publicdomainrelay/market-policy-remote";

export type PolicyMode = "only_me" | "direct_network" | "policy_based";

export function createPolicy(
  mode: PolicyMode | null | undefined,
  opts?: { signer?: { did(): string; sign(bytes: Uint8Array): Promise<Uint8Array> } },
): FulfillmentPolicy | null {
  if (!mode) return null;
  switch (mode) {
    case "only_me": return createOnlyMePolicy();
    case "direct_network": return createDirectNetworkPolicy();
    case "policy_based": return createRemotePolicy(opts);
  }
}

export interface EvaluateRfpPolicyOpts {
  policyRef: { uri: string; cid: string };
  subjectDid: string;
  rootRequesterDid: string;
  counterpartyDid: string;
  resolve: (ref: { uri: string; cid: string }) => Promise<Record<string, unknown>>;
  signer?: { did(): string; sign(bytes: Uint8Array): Promise<Uint8Array> };
  log?: (level: string, msg: string, meta?: Record<string, unknown>) => void;
}

export async function evaluateRfpPolicy(
  opts: EvaluateRfpPolicyOpts,
): Promise<{ allow: boolean; violations: PolicyViolation[] }> {
  const noopLog = () => {};
  const log = opts.log ?? noopLog;

  let policyRecord: Record<string, unknown>;
  try {
    policyRecord = await opts.resolve(opts.policyRef);
  } catch (err) {
    return { allow: false, violations: [{ msg: `failed to resolve policy record: ${err}`, policyId: opts.policyRef.uri }] };
  }

  const policyEngine = policyRecord.policyEngine as string | undefined;
  if (!policyEngine) return { allow: true, violations: [] };

  const policy = createRemotePolicy({ signer: opts.signer });
  return await policy.evaluate({
    subjectDid: opts.subjectDid,
    rootRequesterDid: opts.rootRequesterDid,
    counterpartyDid: opts.counterpartyDid,
    resolve: async (ref) => await opts.resolve(ref as { uri: string; cid: string }),
    resolveOperatorDid: async () => null,
    log: (level, msg, meta) => log(level, msg, meta),
    policyRef: opts.policyRef as never,
  });
}
