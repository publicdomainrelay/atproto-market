import type { TrustPolicy } from "@publicdomainrelay/market-policy-abc";

export const OPEN_POLICY_NAME = "open";
export const ONLY_ME_POLICY_NAME = "only-me";

export function createOpenPolicy(): import("@publicdomainrelay/market-policy-abc").TrustPolicy {
  return {
    kind: "trust",
    name: OPEN_POLICY_NAME,
    description: "Open admission -- no restriction on who may bid or fulfill.",
    decide() {
      return true;
    },
    async evaluate() {
      return { allow: true, violations: [] };
    },
  };
}

export function createOnlyMePolicy(): TrustPolicy {
  return {
    kind: "trust" as const,
    name: ONLY_ME_POLICY_NAME,
    description: "Only the requester's own DIDs may bid on and fulfill this RFP.",

    decide({ did, selfDid, query }) {
      // Identity trivially shares an operator with itself; anyone else must
      // resolve to the same operator, from the sync trust cache when present.
      if (did === selfDid) return true;
      if (!query) return undefined;
      return query.sameOperator(did, selfDid);
    },

    async evaluate(ctx) {
      ctx.log("info", "only-me evaluate", { subjectDid: ctx.subjectDid, rootRequesterDid: ctx.rootRequesterDid });

      // only-me admits a bid when BOTH sides resolve to the same operator --
      // operatorOf(bidder) === operatorOf(requester). Comparing the bidder's
      // operator against the requester's raw DID breaks the shared-operator
      // case: a user running the bidder on one machine and the requester on
      // another, both OAuth'd (or associated) to the same ATProto account, has
      // two distinct ephemeral DIDs that both resolve to the shared account.
      // A side with no separate operator is its own operator.
      const bidderOp = await ctx.resolveOperatorDid(ctx.subjectDid);
      if (!bidderOp) {
        ctx.log("info", "only-me: no operator association", { subjectDid: ctx.subjectDid });
        return { allow: false, violations: [{ msg: "no operator association", policyId: ONLY_ME_POLICY_NAME }] };
      }

      const requesterOp = (await ctx.resolveOperatorDid(ctx.rootRequesterDid)) ?? ctx.rootRequesterDid;

      if (bidderOp !== requesterOp) {
        ctx.log("info", "only-me: operator mismatch", { bidderOp, requesterOp, rootRequesterDid: ctx.rootRequesterDid });
        return { allow: false, violations: [{ msg: "operator mismatch", policyId: ONLY_ME_POLICY_NAME }] };
      }
      return { allow: true, violations: [] };
    },
  };
}
