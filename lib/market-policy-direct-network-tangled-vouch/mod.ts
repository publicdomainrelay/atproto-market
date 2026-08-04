import type { TrustPolicy } from "@publicdomainrelay/market-policy-abc";

export const TANGLED_VOUCH_POLICY_NAME = "tangled-vouch";

export function createDirectNetworkPolicy(): TrustPolicy {
  return {
    kind: "trust" as const,
    name: TANGLED_VOUCH_POLICY_NAME,
    description: "Bidders whose operator DID appears in the requester's Tangled vouch graph may bid.",
    needsVouchSet: true,

    decide({ did, selfDid, vouchedDids, query }) {
      if (did === selfDid) return true;
      if (vouchedDids?.has(did)) return true;
      if (query) {
        // Direct vouch from any trusted operator, or the requester resolves to
        // an operator vouched by self (the transitive promotion).
        for (const op of query.trustedOperators()) {
          if (query.vouchedBy(op).has(did)) return true;
        }
        const op = query.operatorOf(did);
        if (op === undefined) return undefined;
        return query.isVouched(selfDid, op) || query.isVouched(op, selfDid);
      }
      return false;
    },

    async evaluate(ctx) {
      ctx.log("info", "tangled-vouch evaluate", { subjectDid: ctx.subjectDid, rootRequesterDid: ctx.rootRequesterDid });

      if (ctx.subjectDid === ctx.rootRequesterDid) return { allow: true, violations: [] };

      const operatorDid = await ctx.resolveOperatorDid(ctx.subjectDid);
      if (!operatorDid) {
        ctx.log("info", "tangled-vouch: no operator association", { subjectDid: ctx.subjectDid });
        return { allow: false, violations: [{ msg: "no operator association", policyId: TANGLED_VOUCH_POLICY_NAME }] };
      }

      if (operatorDid === ctx.rootRequesterDid) return { allow: true, violations: [] };

      try {
        const vouchedDids = await ctx.getVouchedDids(ctx.rootRequesterDid);
        const ok = vouchedDids.has(operatorDid);
        if (!ok) {
          ctx.log("info", "tangled-vouch: operator not in vouch set", {
            operatorDid, rootRequesterDid: ctx.rootRequesterDid, vouchedCount: vouchedDids.size,
          });
          return { allow: false, violations: [{ msg: "not vouched", policyId: TANGLED_VOUCH_POLICY_NAME }] };
        }
        return { allow: true, violations: [] };
      } catch (err) {
        return { allow: false, violations: [{ msg: String(err), policyId: TANGLED_VOUCH_POLICY_NAME }] };
      }
    },
  };
}
