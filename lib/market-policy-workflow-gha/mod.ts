import type { FulfillmentPolicy } from "@publicdomainrelay/market-policy-abc";
import { POLICIES_WORKFLOW_GHA_NSID } from "@publicdomainrelay/market-lexicons";

export function createWorkflowGhaPolicy(): FulfillmentPolicy {
  return {
    policyNsid: POLICIES_WORKFLOW_GHA_NSID,
    buildPolicyRecord(requesterDid: string) {
      return { $type: this.policyNsid, requesterDid, createdAt: new Date().toISOString() };
    },

    async evaluate(ctx) {
      ctx.log("warn", "workflow_gha policy evaluate not yet implemented", {
        subjectDid: ctx.subjectDid, rootRequesterDid: ctx.rootRequesterDid,
      });
      return { allow: false, violations: [{ msg: "not yet implemented", policyId: POLICIES_WORKFLOW_GHA_NSID }] };
    },
  };
}
