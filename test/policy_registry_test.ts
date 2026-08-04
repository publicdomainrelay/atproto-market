import { assertEquals, assert } from "@std/assert";
import { createPolicyRegistry, policyNames } from "@publicdomainrelay/market-policy-registry";
import { createTrustSet } from "@publicdomainrelay/market-policy-trust-abc";
import type { Policy, PolicyEvalCtx } from "@publicdomainrelay/market-policy-abc";
import {
  PolicyScopeFilter,
  parsePolicyArgs,
  bidWindowSecOf,
  firstFreeOf,
  DEFAULT_BID_WINDOW_SEC,
} from "@publicdomainrelay/market-policy-abc";

function ctx(over: Partial<PolicyEvalCtx> = {}): PolicyEvalCtx {
  return {
    policyName: "only-me",
    args: {},
    perspective: "requester",
    selfDid: "did:plc:req",
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:req",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({}),
    resolveOperatorDid: async () => null,
    getVouchedDids: async () => new Set<string>(),
    log: () => {},
    ...over,
  };
}

Deno.test("registry exposes the former hardcoded modes as names", () => {
  assertEquals(policyNames().sort(), ["bid-payload", "mutuals", "only-me", "open", "tangled-vouch", "under-4-cpus"]);
});

Deno.test("registry returns undefined for an unknown name", () => {
  assertEquals(createPolicyRegistry().get("nope"), undefined);
});

Deno.test("registry accepts extra policies and they win by name", () => {
  const extra: Policy = {
    kind: "work",
    name: "always-yes",
    description: "test",
    perspectives: ["bidder", "requester"],
    evaluate: () => Promise.resolve({ allow: true, violations: [] }),
  };
  const registry = createPolicyRegistry([extra]);
  assertEquals(registry.get("always-yes")?.name, "always-yes");
  assert(registry.names().includes("always-yes"));
});

Deno.test("only-me allows when the bidder's operator IS the requester's operator (same raw DID)", async () => {
  const policy = createPolicyRegistry().get("only-me")!;
  const result = await policy.evaluate(ctx({
    resolveOperatorDid: async (did: string) => (did === "did:plc:req" || did === "did:plc:bidder" ? "did:plc:req" : null),
  }));
  assertEquals(result.allow, true);
});

Deno.test("only-me allows a shared operator even when the raw requester DID is a different ephemeral DID", async () => {
  // A user runs the bidder and requester on separate machines, both OAuth'd to
  // the same ATProto account: subjectDid and rootRequesterDid are distinct
  // ephemeral DIDs, but both resolve to the shared account DID. only-me must
  // compare operator(bidder) === operator(requester), NOT operator(bidder) ===
  // rootRequesterDid.
  const policy = createPolicyRegistry().get("only-me")!;
  const result = await policy.evaluate(ctx({
    subjectDid: "did:plc:bidder-ephemeral",
    rootRequesterDid: "did:plc:req-ephemeral",
    selfDid: "did:plc:req-ephemeral",
    counterpartyDid: "did:plc:bidder-ephemeral",
    resolveOperatorDid: async (did: string) =>
      did === "did:plc:bidder-ephemeral" || did === "did:plc:req-ephemeral" ? "did:plc:shared" : null,
  }));
  assertEquals(result.allow, true);
});

Deno.test("only-me denies when the two operators differ (self-owned ephemeral on both, unrelated)", async () => {
  const policy = createPolicyRegistry().get("only-me")!;
  const mismatch = await policy.evaluate(ctx({
    resolveOperatorDid: async (did: string) =>
      did === "did:plc:bidder" ? "did:plc:bidder" : did === "did:plc:req" ? "did:plc:req" : null,
  }));
  assertEquals(mismatch.allow, false);
  assertEquals(mismatch.violations[0].msg, "operator mismatch");
});

Deno.test("only-me denies on a missing bidder operator association", async () => {
  const policy = createPolicyRegistry().get("only-me")!;
  const missing = await policy.evaluate(ctx({ resolveOperatorDid: async () => null }));
  assertEquals(missing.allow, false);
  assertEquals(missing.violations[0].msg, "no operator association");
});

Deno.test("tangled-vouch allows an operator in the host-brokered vouch set", async () => {
  const policy = createPolicyRegistry().get("tangled-vouch")!;
  const result = await policy.evaluate(ctx({
    policyName: "tangled-vouch",
    resolveOperatorDid: async () => "did:plc:operator",
    getVouchedDids: async () => new Set(["did:plc:operator"]),
  }));
  assertEquals(result.allow, true);
});

Deno.test("tangled-vouch denies an operator outside the vouch set", async () => {
  const policy = createPolicyRegistry().get("tangled-vouch")!;
  const result = await policy.evaluate(ctx({
    policyName: "tangled-vouch",
    resolveOperatorDid: async () => "did:plc:operator",
    getVouchedDids: async () => new Set(["did:plc:someone-else"]),
  }));
  assertEquals(result.allow, false);
  assertEquals(result.violations[0].msg, "not vouched");
});

Deno.test("mutuals requires the vouch to go both ways", async () => {
  const policy = createPolicyRegistry().get("mutuals")!;
  const mutual = await policy.evaluate(ctx({
    policyName: "mutuals",
    resolveOperatorDid: async () => "did:plc:operator",
    getVouchedDids: async (did) =>
      did === "did:plc:req" ? new Set(["did:plc:operator"]) : new Set(["did:plc:req"]),
  }));
  assertEquals(mutual.allow, true);

  const oneWay = await policy.evaluate(ctx({
    policyName: "mutuals",
    resolveOperatorDid: async () => "did:plc:operator",
    getVouchedDids: async (did) =>
      did === "did:plc:req" ? new Set(["did:plc:operator"]) : new Set<string>(),
  }));
  assertEquals(oneWay.allow, false);
  assertEquals(oneWay.violations[0].msg, "not mutual follows");
});

Deno.test("only vouch-based policies declare needsVouchSet", () => {
  const registry = createPolicyRegistry();
  const onlyMe = registry.get("only-me")!;
  const tangled = registry.get("tangled-vouch")!;
  const mutuals = registry.get("mutuals")!;
  if (onlyMe.kind !== "trust" || tangled.kind !== "trust" || mutuals.kind !== "trust") throw new Error("expected trust policies");
  assertEquals(onlyMe.needsVouchSet, undefined);
  assertEquals(tangled.needsVouchSet, true);
  assertEquals(mutuals.needsVouchSet, true);
});

Deno.test("PolicyScopeFilter passes everything when no policy is set", async () => {
  const filter = new PolicyScopeFilter(null, {}, "did:plc:self");
  assertEquals(filter.preFilter("did:plc:anyone"), true);
  assertEquals(await filter.filter("did:plc:anyone"), true);
});

Deno.test("PolicyScopeFilter under only-me is operator-first", async () => {
  const policy = createPolicyRegistry().get("only-me")!;
  const set = createTrustSet({ selfDid: "did:plc:self" });
  set.setOperator("did:plc:self", null); // self-owned
  set.setOperator("did:plc:other", "did:plc:self"); // other's operator is self
  const filter = new PolicyScopeFilter(policy, {}, "did:plc:self", undefined, undefined, set);

  assertEquals(filter.preFilter("did:plc:self"), true);
  assertEquals(filter.preFilter("did:plc:other"), true, "operator-first: other shares self's operator");
  assertEquals(await filter.filter("did:plc:stranger"), false, "unknown abstains -> checker false");
});

Deno.test("PolicyScopeFilter under tangled-vouch admits the vouched set", () => {
  const policy = createPolicyRegistry().get("tangled-vouch")!;
  const filter = new PolicyScopeFilter(policy, {}, "did:plc:self", new Set(["did:plc:friend"]));
  assertEquals(filter.preFilter("did:plc:friend"), true);
  assertEquals(filter.preFilter("did:plc:stranger"), false);
});

Deno.test("PolicyScopeFilter falls back to the association checker", async () => {
  const policy = createPolicyRegistry().get("only-me")!;
  const filter = new PolicyScopeFilter(policy, {}, "did:plc:self", undefined, {
    isRequesterAssociated: (did) => Promise.resolve(did === "did:plc:associated"),
  });
  assertEquals(await filter.filter("did:plc:associated"), true);
  assertEquals(await filter.filter("did:plc:stranger"), false);
});

Deno.test("PolicyScopeFilter treats a throwing checker as a rejection", async () => {
  const policy = createPolicyRegistry().get("only-me")!;
  const filter = new PolicyScopeFilter(policy, {}, "did:plc:self", undefined, {
    isRequesterAssociated: () => Promise.reject(new Error("boom")),
  });
  assertEquals(await filter.filter("did:plc:stranger"), false);
});

Deno.test("policy args parse from JSON and from objects", () => {
  assertEquals(parsePolicyArgs('{"bidWindowSec":5,"firstFree":true}'), { bidWindowSec: 5, firstFree: true });
  assertEquals(parsePolicyArgs(undefined), {});
  assertEquals(parsePolicyArgs(""), {});
  assertEquals(parsePolicyArgs({ firstFree: true }), { firstFree: true });
});

Deno.test("policy args reject non-object JSON", () => {
  let threw = false;
  try {
    parsePolicyArgs("[1,2,3]");
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("bid window and firstFree read off policy args with defaults", () => {
  assertEquals(bidWindowSecOf({ bidWindowSec: 7 }), 7);
  assertEquals(bidWindowSecOf({}), DEFAULT_BID_WINDOW_SEC);
  assertEquals(bidWindowSecOf(undefined), DEFAULT_BID_WINDOW_SEC);
  assertEquals(bidWindowSecOf({ bidWindowSec: -1 }), DEFAULT_BID_WINDOW_SEC);
  assertEquals(firstFreeOf({ firstFree: true }), true);
  assertEquals(firstFreeOf({}), false);
});
