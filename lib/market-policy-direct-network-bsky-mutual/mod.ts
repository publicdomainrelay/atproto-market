import type { TrustPolicy } from "@publicdomainrelay/market-policy-abc";

export const MUTUALS_POLICY_NAME = "mutuals";

export function createBskyMutualPolicy(): TrustPolicy {
  return {
    kind: "trust" as const,
    name: MUTUALS_POLICY_NAME,
    description: "Bidders whose operator DID mutually follows the requester on Bluesky may bid.",
    needsVouchSet: true,

    decide({ did, selfDid, vouchedDids, query }) {
      if (did === selfDid) return true;
      if (vouchedDids?.has(did)) return true;
      if (query) {
        for (const op of query.trustedOperators()) {
          if (query.vouchedBy(op).has(did)) return true;
        }
        const op = query.operatorOf(did);
        if (op === undefined) return undefined;
        return query.isVouched(selfDid, op) && query.isVouched(op, selfDid);
      }
      return false;
    },

    async evaluate(ctx) {
      ctx.log("info", "mutuals evaluate", { subjectDid: ctx.subjectDid, rootRequesterDid: ctx.rootRequesterDid });

      if (ctx.subjectDid === ctx.rootRequesterDid) return { allow: true, violations: [] };

      const operatorDid = await ctx.resolveOperatorDid(ctx.subjectDid);
      if (!operatorDid) {
        ctx.log("info", "mutuals: no operator association", { subjectDid: ctx.subjectDid });
        return { allow: false, violations: [{ msg: "no operator association", policyId: MUTUALS_POLICY_NAME }] };
      }

      if (operatorDid === ctx.rootRequesterDid) return { allow: true, violations: [] };

      try {
        const rootFollows = await ctx.getVouchedDids(ctx.rootRequesterDid);
        const operatorFollows = await ctx.getVouchedDids(operatorDid);

        const mutual = rootFollows.has(operatorDid) && operatorFollows.has(ctx.rootRequesterDid);
        if (!mutual) {
          ctx.log("info", "mutuals: not mutual follows", {
            operatorDid, rootRequesterDid: ctx.rootRequesterDid,
            rootFollowsCount: rootFollows.size, operatorFollowsCount: operatorFollows.size,
          });
          return { allow: false, violations: [{ msg: "not mutual follows", policyId: MUTUALS_POLICY_NAME }] };
        }
        return { allow: true, violations: [] };
      } catch (err) {
        return { allow: false, violations: [{ msg: String(err), policyId: MUTUALS_POLICY_NAME }] };
      }
    },
  };
}
