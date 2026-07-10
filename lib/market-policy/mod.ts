import type { FulfillmentPolicy, PolicyViolation, PolicyMode, PolicyEvalCtx } from "@publicdomainrelay/market-policy-abc";
import { ONLY_ME, TANGLED_VOUCH, MUTUALS, DYNAMIC } from "@publicdomainrelay/market-policy-abc";
import { createOnlyMePolicy } from "@publicdomainrelay/market-policy-only-me";
import { createDirectNetworkPolicy } from "@publicdomainrelay/market-policy-direct-network-tangled-vouch";
import { createBskyMutualPolicy } from "@publicdomainrelay/market-policy-direct-network-bsky-mutual";
import { createRemotePolicy } from "@publicdomainrelay/market-policy-remote";
import type { VouchResolver } from "@publicdomainrelay/trust-graph-abc";

export type { PolicyMode };

export function createPolicy(
  mode: PolicyMode | null | undefined,
  opts?: {
    signer?: { did(): string; sign(bytes: Uint8Array): Promise<Uint8Array> };
    vouchResolver?: VouchResolver;
  },
): FulfillmentPolicy | null {
  if (!mode) return null;
  switch (mode) {
    case ONLY_ME: return createOnlyMePolicy();
    case TANGLED_VOUCH: return createDirectNetworkPolicy(opts?.vouchResolver ? { vouchResolver: opts.vouchResolver } : undefined);
    case MUTUALS: return createBskyMutualPolicy();
    case DYNAMIC: return createRemotePolicy(opts);
    default: return null;
  }
}

export interface EvaluateRfpPolicyOpts {
  policyRef: { uri: string; cid: string };
  subjectDid: string;
  rootRequesterDid: string;
  counterpartyDid: string;
  resolve: (ref: { uri: string; cid: string }) => Promise<Record<string, unknown>>;
  resolveOperatorDid?: (bidderDid: string) => Promise<string | null>;
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
    resolveOperatorDid: opts.resolveOperatorDid ?? (async () => null),
    log: (level, msg, meta) => log(level, msg, meta),
    policyRef: opts.policyRef as never,
  });
}
