import type { FulfillmentPolicy, PolicyEvalCtx } from "@publicdomainrelay/market-policy-abc";
import { POLICIES_ONLY_ME_NSID } from "@publicdomainrelay/market-lexicons";

export function createOnlyMePolicy(): FulfillmentPolicy {
  return {
    policyNsid: POLICIES_ONLY_ME_NSID,
    buildPolicyRecord(requesterDid: string) {
      return { $type: this.policyNsid, requesterDid, createdAt: new Date().toISOString() };
    },

    async evaluate(ctx) {
      ctx.log("info", "only_me evaluate", { subjectDid: ctx.subjectDid, rootRequesterDid: ctx.rootRequesterDid });

      const operatorDid = await ctx.resolveOperatorDid(ctx.subjectDid);
      if (!operatorDid) return { allow: false, violations: [{ msg: "no operator association", policyId: POLICIES_ONLY_ME_NSID }] };

      const ok = operatorDid === ctx.rootRequesterDid;
      if (!ok) {
        ctx.log("info", "only_me: operator mismatch", { operatorDid, rootRequesterDid: ctx.rootRequesterDid });
        return { allow: false, violations: [{ msg: "operator mismatch", policyId: POLICIES_ONLY_ME_NSID }] };
      }
      return { allow: true, violations: [] };
    },
  };
}
