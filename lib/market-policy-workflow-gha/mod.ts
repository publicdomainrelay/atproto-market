import type { FulfillmentPolicy } from "@publicdomainrelay/market-policy-abc";
import { POLICIES_WORKFLOW_GHA_NSID } from "@publicdomainrelay/market-lexicons";

/**
 * Runs a GitHub Actions workflow via the policy-engine for maximum
 * configurability. The workflow evaluates whether a bidder satisfies the
 * requester's values, strategic plans, and principles. Same workflow
 * evaluates everyone in the subcontracting chain.
 *
 * Future: resolve workflowRef, POST to engineUrl/request/create,
 * poll for completion, return allow/deny.
 */
export function createWorkflowGhaPolicy(): FulfillmentPolicy {
  return {
    policyNsid: POLICIES_WORKFLOW_GHA_NSID,
    label: "Policy-based",

    async createPolicyPayload(ctx) {
      ctx.log("warn", "workflow_gha policy create not yet implemented");
      return { uri: `at://${ctx.subjectDid}/${POLICIES_WORKFLOW_GHA_NSID}/policy` as never, cid: "" as never };
    },

    async evaluate(ctx) {
      ctx.log("warn", "workflow_gha policy evaluate not yet implemented", {
        subjectDid: ctx.subjectDid, rootRequesterDid: ctx.rootRequesterDid,
      });
      return false;
    },
  };
}
