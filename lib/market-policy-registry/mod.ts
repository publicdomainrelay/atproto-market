import type { Policy, PolicyRegistry } from "@publicdomainrelay/market-policy-abc";
import { createOnlyMePolicy, createOpenPolicy } from "@publicdomainrelay/market-policy-only-me";
import { createDirectNetworkPolicy } from "@publicdomainrelay/market-policy-direct-network-tangled-vouch";
import { createBskyMutualPolicy } from "@publicdomainrelay/market-policy-direct-network-bsky-mutual";
import { createUnderFourCpusPolicy, createBidPayloadFilterPolicy } from "@publicdomainrelay/market-policy-work";

export const BUILTIN_POLICY_FACTORIES: Record<string, () => Policy> = {
  "open": createOpenPolicy,
  "only-me": createOnlyMePolicy,
  "tangled-vouch": createDirectNetworkPolicy,
  "mutuals": createBskyMutualPolicy,
  "under-4-cpus": createUnderFourCpusPolicy,
  "bid-payload": createBidPayloadFilterPolicy,
};

export function createPolicyRegistry(extra?: Policy[]): PolicyRegistry {
  const policies = new Map<string, Policy>();
  for (const [name, factory] of Object.entries(BUILTIN_POLICY_FACTORIES)) {
    policies.set(name, factory());
  }
  for (const policy of extra ?? []) policies.set(policy.name, policy);

  return {
    get(name: string): Policy | undefined {
      return policies.get(name);
    },
    names(): string[] {
      return [...policies.keys()];
    },
  };
}

export function policyNames(): string[] {
  return Object.keys(BUILTIN_POLICY_FACTORIES);
}
