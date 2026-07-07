import type { FulfillmentPolicy, PolicyEvalCtx } from "@publicdomainrelay/market-policy-abc";
import { POLICIES_DIRECT_NETWORK_NSID } from "@publicdomainrelay/market-lexicons";

const VOUCH_NSID = "sh.tangled.graph.vouch";

/**
 * Resolve the set of DIDs vouched for by a given DID.
 * Mirrors getVouchedDids() from spindle/marketRFP.ts:326-340.
 * Uses resolveOperatorDid-style listRecords not StrongRef resolve.
 */
async function getVouchedDids(
  did: string,
  listRecords: (repo: string, collection: string, opts?: { limit?: number }) => Promise<{ records?: Array<{ uri: string; value: Record<string, unknown> }> }>,
  log: PolicyEvalCtx["log"],
): Promise<Set<string>> {
  try {
    const result = await listRecords(did, VOUCH_NSID, { limit: 200 });
    const records = result?.records ?? [];
    const vouched = new Set<string>();
    for (const rec of records) {
      const kind = rec.value.kind as string | undefined;
      if (kind === "denounce") continue;
      const rkey = rec.uri.split("/").pop() ?? "";
      if (rkey.startsWith("did:")) vouched.add(rkey);
    }
    return vouched;
  } catch (err) {
    log("warn", "direct_network: vouch lookup failed", { did, error: String(err) });
    return new Set();
  }
}

export function createDirectNetworkPolicy(): FulfillmentPolicy {
  return {
    policyNsid: POLICIES_DIRECT_NETWORK_NSID,
    label: "Direct Network",

    async createPolicyPayload(ctx) {
      ctx.log("info", "direct_network policy created", { requesterDid: ctx.subjectDid, vouchNsid: VOUCH_NSID });
      return { uri: `at://${ctx.subjectDid}/${POLICIES_DIRECT_NETWORK_NSID}/policy` as never, cid: "" as never };
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
        const vouchedDids = await getVouchedDids(
          ctx.rootRequesterDid,
          async (repo, collection, opts) => {
            const result = await ctx.resolve({
              uri: `at://${repo}/${collection}` as never,
              cid: "" as never,
            });
            return result as { records?: Array<{ uri: string; value: Record<string, unknown> }> };
          },
          ctx.log,
        );
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
