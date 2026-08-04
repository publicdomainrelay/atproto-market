/**
 * Structural strong reference. Deliberately not the branded market-common
 * StrongRef: policy records cross a postMessage boundary into the sandbox, so
 * the shape has to survive structured cloning and stay assignable both ways.
 */
export interface StrongRef {
  uri: string;
  cid: string;
}

export interface PolicyArgs {
  bidWindowSec?: number;
  firstFree?: boolean;
  [key: string]: unknown;
}

export interface PolicySpec {
  name: string;
  description?: string;
  args: PolicyArgs;
}

export const DEFAULT_POLICY_NAME = "only-me";
export const DEFAULT_BID_WINDOW_SEC = 30;

export const POLICY_CLI_OPTION = {
  type: "string" as const,
  description: "Policy name to evaluate bidders against",
  env: "POLICY",
  default: DEFAULT_POLICY_NAME,
};

export const POLICY_ARGS_CLI_OPTION = {
  type: "string" as const,
  description: 'Policy arguments as JSON, e.g. {"bidWindowSec":30,"firstFree":true}',
  env: "POLICY_ARGS",
};

export const ONLY_REMOTE_POLICY_EXEC_CLI_OPTION = {
  type: "boolean" as const,
  description: "Refuse to execute any policy locally; only policies.service records are evaluated",
  env: "ONLY_REMOTE_POLICY_EXEC",
};

export const ALLOW_UNTRUSTED_POLICY_EXEC_CLI_OPTION = {
  type: "boolean" as const,
  description: "Permit policies.denoWorker records to run caller-supplied bundles in the local sandbox",
  env: "ALLOW_UNTRUSTED_POLICY_EXEC",
};

export function parsePolicyArgs(raw: unknown): PolicyArgs {
  if (raw === undefined || raw === null || raw === "") return {};
  if (typeof raw === "object") return raw as PolicyArgs;
  if (typeof raw !== "string") return {};
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("policy args must be a JSON object");
  }
  return parsed as PolicyArgs;
}

export function bidWindowSecOf(args: PolicyArgs | undefined): number {
  const raw = args?.bidWindowSec;
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_BID_WINDOW_SEC;
}

export function firstFreeOf(args: PolicyArgs | undefined): boolean {
  return args?.firstFree === true;
}

export type PolicyPerspective = "bidder" | "requester";

export interface PolicyViolation {
  msg: string;
  policyId: string | StrongRef;
}

export interface PolicyResult {
  allow: boolean;
  violations: PolicyViolation[];
}

export interface PolicyEvalCtx {
  policyName: string;
  args: PolicyArgs;
  /** Who is evaluating: the bidder deciding whether to bid, or the requester. */
  perspective: PolicyPerspective;
  /** The DID running this evaluation. */
  selfDid: string;
  /** The other side of the transaction. */
  counterpartyDid: string;
  subjectDid: string;
  rootRequesterDid: string;
  resolve: (ref: StrongRef) => Promise<Record<string, unknown>>;
  resolveOperatorDid: (bidderDid: string) => Promise<string | null>;
  /**
   * Vouch/follow set for a DID. Host-brokered so policies stay pure and can run
   * inside a zero-permission sandbox.
   */
  getVouchedDids: (did: string) => Promise<Set<string>>;
  log: (level: string, msg: string, meta?: Record<string, unknown>) => void;
  policyRef?: StrongRef;
  /** The workload a bidder is being asked to run. */
  demand?: {
    rfpRef: StrongRef;
    payloadRef: StrongRef;
    payloadNsid: string;
    payload?: Record<string, unknown>;
  };
  /** The bid offered in response (requester side). */
  offer?: {
    bidRef: StrongRef;
    payloadRef: StrongRef;
    payloadNsid: string;
    payload?: Record<string, unknown>;
  };
}

export interface PreFilterInput {
  did: string;
  selfDid: string;
  vouchedDids?: Set<string>;
  args: PolicyArgs;
  /** Sync trust cache for the hot path. */
  query?: import("@publicdomainrelay/market-policy-trust-abc").TrustQuery;
}

/**
 * Trust policies gate engagement: "may I transact with this counterparty".
 * `decide` is the sync hot-path gate over the trust cache; undefined means
 * "cannot decide from cache alone" and the caller refreshes + falls back to
 * `evaluate`. `evaluate` is the full async decision (sandbox or remote).
 */
export interface TrustPolicy {
  readonly kind: "trust";
  readonly name: string;
  readonly description: string;
  /**
   * True when this policy admits parties beyond the requester's own operator,
   * so a vouch set must be warmed before the sync gate can answer.
   */
  readonly needsVouchSet?: boolean;
  decide(input: PreFilterInput): boolean | undefined;
  evaluate(ctx: PolicyEvalCtx): Promise<PolicyResult>;
}

/**
 * Work policies gate the workload itself: "do I want to run this".
 * Declared `perspectives` so a wrong-side flag fails loud instead of no-op.
 * Never runs on the hot path -- only after a trust decision admits the
 * counterparty.
 */
export interface WorkPolicy {
  readonly kind: "work";
  readonly name: string;
  readonly description: string;
  readonly perspectives: PolicyPerspective[];
  evaluate(ctx: PolicyEvalCtx): Promise<PolicyResult>;
}

export type Policy = TrustPolicy | WorkPolicy;

export interface PolicyRegistry {
  get(name: string): Policy | undefined;
  names(): string[];
}

/**
 * A work policy declares which sides it is meaningful on. Fails loud when a
 * flag requests it from the wrong perspective instead of silently no-oping.
 */
export function assertPolicyPerspective(policy: Policy, perspective: PolicyPerspective): void {
  if (policy.kind === "work" && !policy.perspectives.includes(perspective)) {
    throw new Error(
      `policy "${policy.name}" is not usable from the ${perspective} side (perspectives: ${policy.perspectives.join(", ")})`,
    );
  }
}

export interface RequesterAssociationChecker {
  isRequesterAssociated(requesterDid: string): Promise<boolean>;
}

export class PolicyScopeFilter {
  constructor(
    readonly policy: Policy | null | undefined,
    readonly args: PolicyArgs,
    readonly selfDid: string,
    readonly vouchedDids?: Set<string>,
    readonly checker?: RequesterAssociationChecker,
    readonly query?: import("@publicdomainrelay/market-policy-trust-abc").TrustQuery,
  ) {}

  /**
   * Sync hot-path gate. undefined = the policy cannot decide from cache alone;
   * the async filter() then refreshes and re-asks. Work policies have no sync
   * gate -- engagement is decided first, workload is evaluated in onRfp.
   */
  preFilter(did: string): boolean | undefined {
    if (!this.policy) return true;
    if (this.policy.kind !== "trust") return true;
    return this.policy.decide({
      did,
      selfDid: this.selfDid,
      vouchedDids: this.vouchedDids,
      args: this.args,
      query: this.query,
    });
  }

  async filter(issuerDid: string): Promise<boolean> {
    const verdict = this.preFilter(issuerDid);
    if (verdict !== undefined) return verdict;
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
