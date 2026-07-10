import type { StrongRef } from "@publicdomainrelay/market-common";

export type PolicyMode = "only-me" | "tangled-vouch" | "mutuals" | "dynamic";

export const POLICY_MODES: readonly PolicyMode[] = ["only-me", "tangled-vouch", "mutuals", "dynamic"];

export const ONLY_ME: PolicyMode = "only-me";
export const TANGLED_VOUCH: PolicyMode = "tangled-vouch";
export const MUTUALS: PolicyMode = "mutuals";
export const DYNAMIC: PolicyMode = "dynamic";

export const POLICY_MODE_CLI_OPTION = {
  type: "string" as const,
  description: `Policy mode: ${POLICY_MODES.join(", ")}`,
  env: "POLICY_MODE",
  default: ONLY_ME,
};

export function isValidPolicyMode(raw: unknown): raw is PolicyMode {
  return typeof raw === "string" && (POLICY_MODES as readonly string[]).includes(raw);
}

export interface RequesterAssociationChecker {
  isRequesterAssociated(requesterDid: string): Promise<boolean>;
}

export class PolicyModeFilter {
  constructor(
    readonly mode: PolicyMode | null | undefined,
    readonly selfDid: string,
    readonly vouchedDids?: Set<string>,
    readonly checker?: RequesterAssociationChecker,
  ) {}

  preFilter(did: string): boolean {
    if (!this.mode || this.mode === DYNAMIC) return true;
    if (did === this.selfDid) return true;
    if (this.vouchedDids?.has(did)) return true;
    if (this.mode === ONLY_ME) return false;
    return false;
  }

  async filter(issuerDid: string): Promise<boolean> {
    if (this.preFilter(issuerDid)) return true;
    if (this.checker) {
      try {
        return await this.checker.isRequesterAssociated(issuerDid);
      } catch {
        return false;
      }
    }
    return false;
  }

  toAcceptScopeFilter(): (input: { issuerDid: string }) => Promise<boolean> {
    return ({ issuerDid }) => this.filter(issuerDid);
  }
}

export interface PolicyViolation {
  msg: string;
  policyId: string | StrongRef;
}

export interface PolicyEvalCtx {
  subjectDid: string;
  rootRequesterDid: string;
  counterpartyDid: string;
  resolve: (ref: StrongRef) => Promise<Record<string, unknown>>;
  resolveOperatorDid: (bidderDid: string) => Promise<string | null>;
  log: (level: string, msg: string, meta?: Record<string, unknown>) => void;
  policyRef?: StrongRef;
}

export interface FulfillmentPolicy {
  readonly policyNsid: string;
  buildPolicyRecord(requesterDid: string, policyEngineEndpoint?: string): Record<string, unknown>;
  evaluate(ctx: PolicyEvalCtx): Promise<{ allow: boolean; violations: PolicyViolation[] }>;
}
