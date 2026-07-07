import type { PolicyHandler, PolicyResult } from "@publicdomainrelay/policy-abc";
import { GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID } from "@publicdomainrelay/policy-common";

export function createDenyAllPolicy(): PolicyHandler {
  return {
    name: "deny-all",
    async evaluate(_ctx) {
      return { allow: false, violations: [{ msg: "denied by deny-all policy", policyId: "deny-all" }] };
    },
  };
}

export function createAllowAllPolicy(): PolicyHandler {
  return {
    name: "allow-all",
    async evaluate(_ctx) {
      return { allow: true, violations: [] };
    },
  };
}

export function createAllowNetPolicy(): PolicyHandler<{ permissions?: Record<string, unknown> }> {
  const ALLOWED = new Set(["net"]);
  return {
    name: "allow-net",
    async evaluate(ctx) {
      const perms = ctx.permissions;
      const violations: PolicyResult["violations"] = [];
      if (perms) {
        for (const [key, val] of Object.entries(perms)) {
          if (val === undefined || val === false) continue;
          if (!ALLOWED.has(key)) {
            violations.push({
              msg: `Permission "${key}" not allowed; only net is permitted`,
              policyId: "allow-net",
            });
          }
        }
      }
      return { allow: violations.length === 0, violations };
    },
  };
}

export const BUILTIN_POLICIES: Record<string, () => PolicyHandler> = {
  "deny-all": createDenyAllPolicy,
  "allow-all": createAllowAllPolicy,
  "allow-net": createAllowNetPolicy,
};

export function resolvePolicies(names: string[]): PolicyHandler[] {
  return names.map((n) => {
    const factory = BUILTIN_POLICIES[n];
    if (!factory) throw new Error(`unknown policy: ${n}. Available: ${Object.keys(BUILTIN_POLICIES).join(", ")}`);
    return factory();
  });
}
