import type { FulfillmentPolicy, PolicyEvalCtx } from "@publicdomainrelay/market-policy-abc";
import { POLICIES_DIRECT_NETWORK_NSID } from "@publicdomainrelay/market-lexicons";
import type { VouchResolver } from "@publicdomainrelay/trust-graph-abc";

export interface DirectNetworkPolicyOpts {
  vouchResolver?: VouchResolver;
}

export function createDirectNetworkPolicy(
  opts?: DirectNetworkPolicyOpts,
): FulfillmentPolicy {
  return {
    policyNsid: POLICIES_DIRECT_NETWORK_NSID,
    buildPolicyRecord(requesterDid: string) {
      return { $type: this.policyNsid, requesterDid, createdAt: new Date().toISOString() };
    },

    async evaluate(ctx) {
      ctx.log("info", "direct_network evaluate", { subjectDid: ctx.subjectDid, rootRequesterDid: ctx.rootRequesterDid });

      if (ctx.subjectDid === ctx.rootRequesterDid) return { allow: true, violations: [] };

      const operatorDid = await ctx.resolveOperatorDid(ctx.subjectDid);
      if (!operatorDid) {
        ctx.log("info", "direct_network: no operator association", { subjectDid: ctx.subjectDid });
        return { allow: false, violations: [{ msg: "no operator association", policyId: POLICIES_DIRECT_NETWORK_NSID }] };
      }

      if (operatorDid === ctx.rootRequesterDid) return { allow: true, violations: [] };

      try {
        if (!opts?.vouchResolver) {
          ctx.log("warn", "direct_network: no vouch resolver configured");
          return { allow: false, violations: [{ msg: "vouch resolver not configured", policyId: POLICIES_DIRECT_NETWORK_NSID }] };
        }
        const resolver = opts.vouchResolver;

        const vouchedDids = await resolver.getVouchedDids(ctx.rootRequesterDid);
        const ok = vouchedDids.has(operatorDid);
        if (!ok) {
          ctx.log("info", "direct_network: operator not in vouch set", {
            operatorDid, rootRequesterDid: ctx.rootRequesterDid, vouchedCount: vouchedDids.size,
          });
          return { allow: false, violations: [{ msg: "not vouched", policyId: POLICIES_DIRECT_NETWORK_NSID }] };
        }
        return { allow: true, violations: [] };
      } catch (err) {
        return { allow: false, violations: [{ msg: String(err), policyId: POLICIES_DIRECT_NETWORK_NSID }] };
      }
    },
  };
}
