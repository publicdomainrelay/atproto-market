import type { WorkPolicy } from "@publicdomainrelay/market-policy-abc";

export const UNDER_4_CPUS_POLICY_NAME = "under-4-cpus";
export const BID_PAYLOAD_FILTER_POLICY_NAME = "bid-payload";

export function createUnderFourCpusPolicy(): WorkPolicy {
  return {
    kind: "work",
    name: UNDER_4_CPUS_POLICY_NAME,
    description: "Only bid on VMs that need at most maxCpus vCPUs.",
    perspectives: ["bidder"],

    async evaluate(ctx) {
      const maxCpus = typeof ctx.args.maxCpus === "number" ? ctx.args.maxCpus : 4;
      if (!ctx.demand) return { allow: true, violations: [] };

      let payload = ctx.demand.payload;
      if (!payload) {
        try {
          payload = await ctx.resolve(ctx.demand.payloadRef);
        } catch (err) {
          return { allow: false, violations: [{ msg: `failed to resolve demand payload: ${err}`, policyId: UNDER_4_CPUS_POLICY_NAME }] };
        }
      }
      const cpus = payload.cpus;
      if (typeof cpus !== "number") return { allow: true, violations: [] };
      if (cpus > maxCpus) {
        return {
          allow: false,
          violations: [{ msg: `VM needs ${cpus} cpus; this bidder's cap is ${maxCpus}`, policyId: UNDER_4_CPUS_POLICY_NAME }],
        };
      }
      return { allow: true, violations: [] };
    },
  };
}

export function createBidPayloadFilterPolicy(): WorkPolicy {
  const DEFAULT_ALLOWED = ["com.publicdomainrelay.temp.market.bids.free"];
  return {
    kind: "work",
    name: BID_PAYLOAD_FILTER_POLICY_NAME,
    description: "Only accept bids whose payload type is allowed.",
    perspectives: ["requester"],

    async evaluate(ctx) {
      const allowed = Array.isArray(ctx.args.allowedPayloadNsids)
        ? (ctx.args.allowedPayloadNsids as string[])
        : DEFAULT_ALLOWED;
      if (!ctx.offer) return { allow: true, violations: [] };
      if (!allowed.includes(ctx.offer.payloadNsid)) {
        return {
          allow: false,
          violations: [{ msg: `bid payload type ${ctx.offer.payloadNsid} not allowed`, policyId: BID_PAYLOAD_FILTER_POLICY_NAME }],
        };
      }
      return { allow: true, violations: [] };
    },
  };
}
