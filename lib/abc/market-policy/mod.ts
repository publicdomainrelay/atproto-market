import type { StrongRef } from "@publicdomainrelay/market-common";

export interface PolicyViolation {
  msg: string;
  policyId: string | StrongRef;
}

/** Cross-cutting dependencies for policy evaluation. */
export interface PolicyEvalCtx {
  /** DID of the entity being evaluated (bidder's ATProto DID, NOT their did:key). */
  subjectDid: string;
  /**
   * DID of the ROOT requester — the entity who originally created the policy.
   * NOT the immediate sub-requester. This ensures policy carries downstream:
   * if Bob subcontracts Alice's RFP to Carol, Carol is evaluated against
   * Alice's policy (rootRequesterDid), not Bob's.
   */
  rootRequesterDid: string;
  /** DID of the immediate counterparty (for logging/audit). */
  counterpartyDid: string;
  /** Resolve an AT Protocol record by strongRef. */
  resolve: (ref: StrongRef) => Promise<Record<string, unknown>>;
  /**
   * Resolve the operator DID for a given bidder DID. Reads the
   * bidderAssociation record from the bidder's repo to bridge the
   * did:key to operator DID gap for vouch graph traversal.
   * Returns the operatorDid, or null if no association exists.
   */
  resolveOperatorDid: (bidderDid: string) => Promise<string | null>;
  /** Logger. */
  log: (level: string, msg: string, meta?: Record<string, unknown>) => void;
  /** StrongRef to the policy record from the RFP. Set by caller for remote policy evaluation. */
  policyRef?: StrongRef;
}

/** A pluggable fulfillment policy — admission criteria for an RFP. */
export interface FulfillmentPolicy {
  /** NSID of this policy's record type. */
  readonly policyNsid: string;
  /** Human-readable label for UI display. */
  readonly label: string;
  /**
   * Create the policy record (mint as a signed AT Protocol record).
   * Called by the root requester when publishing the initial RFP.
   * The returned StrongRef is copied verbatim into any sub-RFPs.
   */
  createPolicyPayload(ctx: PolicyEvalCtx): Promise<StrongRef>;
  /**
   * Evaluate whether a bidder satisfies this policy.
   * Called at EVERY level of the fulfillment chain:
   * - by bidders before creating a bid
   * - by sub-bidders before creating a sub-bid
   * - by the root requester before accepting any bid
   */
  evaluate(ctx: PolicyEvalCtx): Promise<{ allow: boolean; violations: PolicyViolation[] }>;
}
