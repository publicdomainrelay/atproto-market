import type { FulfillmentPolicy } from "@publicdomainrelay/market-policy-abc";
import type { PolicyEvalCtx } from "@publicdomainrelay/market-policy-abc";
import { createOnlyMePolicy } from "@publicdomainrelay/market-policy-only-me";
import { createDirectNetworkPolicy } from "@publicdomainrelay/market-policy-direct-network";
import { createWorkflowGhaPolicy } from "@publicdomainrelay/market-policy-workflow-gha";

export type PolicyMode = "only_me" | "direct_network" | "policy_based";

export function createPolicy(mode: PolicyMode | null | undefined): FulfillmentPolicy | null {
  if (!mode) return null;
  switch (mode) {
    case "only_me": return createOnlyMePolicy();
    case "direct_network": return createDirectNetworkPolicy();
    case "policy_based": return createWorkflowGhaPolicy();
  }
}
