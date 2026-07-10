import type { FulfillmentPolicy, PolicyEvalCtx } from "@publicdomainrelay/market-policy-abc";
import { POLICIES_DIRECT_NETWORK_BSKY_MUTUAL_NSID } from "@publicdomainrelay/market-lexicons";
import type { VouchResolver } from "@publicdomainrelay/trust-graph-abc";

export interface BskyMutualPolicyOpts {
  vouchResolver?: VouchResolver;
}

export function createBskyMutualPolicy(opts?: BskyMutualPolicyOpts): FulfillmentPolicy {
  const vouchResolver = opts?.vouchResolver;

  return {
    policyNsid: POLICIES_DIRECT_NETWORK_BSKY_MUTUAL_NSID,
    buildPolicyRecord(requesterDid: string) {
      return { $type: this.policyNsid, requesterDid, createdAt: new Date().toISOString() };
    },

    async evaluate(ctx) {
      ctx.log("info", "bsky_mutual evaluate", { subjectDid: ctx.subjectDid, rootRequesterDid: ctx.rootRequesterDid });

      if (ctx.subjectDid === ctx.rootRequesterDid) return { allow: true, violations: [] };

      const operatorDid = await ctx.resolveOperatorDid(ctx.subjectDid);
      if (!operatorDid) {
        ctx.log("info", "bsky_mutual: no operator association", { subjectDid: ctx.subjectDid });
        return { allow: false, violations: [{ msg: "no operator association", policyId: POLICIES_DIRECT_NETWORK_BSKY_MUTUAL_NSID }] };
      }

      if (operatorDid === ctx.rootRequesterDid) return { allow: true, violations: [] };

      try {
        if (!vouchResolver) {
          ctx.log("warn", "bsky_mutual: no vouch resolver configured");
          return { allow: false, violations: [{ msg: "bsky-mutual resolver not configured", policyId: POLICIES_DIRECT_NETWORK_BSKY_MUTUAL_NSID }] };
        }
        const rootFollows = await vouchResolver.getVouchedDids(ctx.rootRequesterDid);
        const operatorFollows = await vouchResolver.getVouchedDids(operatorDid);

        const mutual = rootFollows.has(operatorDid) && operatorFollows.has(ctx.rootRequesterDid);
        if (!mutual) {
          ctx.log("info", "bsky_mutual: not mutual follows", {
            operatorDid, rootRequesterDid: ctx.rootRequesterDid,
            rootFollowsCount: rootFollows.size, operatorFollowsCount: operatorFollows.size,
          });
          return { allow: false, violations: [{ msg: "not mutual follows", policyId: POLICIES_DIRECT_NETWORK_BSKY_MUTUAL_NSID }] };
        }
        return { allow: true, violations: [] };
      } catch (err) {
        return { allow: false, violations: [{ msg: String(err), policyId: POLICIES_DIRECT_NETWORK_BSKY_MUTUAL_NSID }] };
      }
    },
  };
}
