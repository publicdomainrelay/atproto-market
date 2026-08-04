import type { PolicyEvalCtx, PolicyResult } from "@publicdomainrelay/market-policy-abc";
import { createPolicyRegistry } from "@publicdomainrelay/market-policy-registry";

const registry = createPolicyRegistry();

(globalThis as unknown as { policy: unknown }).policy = {
  name: "builtin-registry",
  description: "Dispatches to a first-party policy by name.",
  async evaluate(ctx: PolicyEvalCtx): Promise<PolicyResult> {
    const policy = registry.get(ctx.policyName);
    if (!policy) {
      return {
        allow: false,
        violations: [{ msg: `unknown policy: ${ctx.policyName}`, policyId: ctx.policyName }],
      };
    }
    return await policy.evaluate(ctx);
  },
};
