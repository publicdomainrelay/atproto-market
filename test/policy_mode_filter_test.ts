import { PolicyModeFilter, ONLY_ME, TANGLED_VOUCH, MUTUALS, DYNAMIC } from "@publicdomainrelay/market-policy-abc";

Deno.test("PolicyModeFilter.preFilter — null mode returns true", () => {
  const filter = new PolicyModeFilter(null, "did:plc:self");
  if (!filter.preFilter("did:plc:other")) throw new Error("expected true for null mode");
});

Deno.test("PolicyModeFilter.preFilter — undefined mode returns true", () => {
  const filter = new PolicyModeFilter(undefined, "did:plc:self");
  if (!filter.preFilter("did:plc:other")) throw new Error("expected true for undefined mode");
});

Deno.test("PolicyModeFilter.preFilter — dynamic mode returns true", () => {
  const filter = new PolicyModeFilter(DYNAMIC, "did:plc:self");
  if (!filter.preFilter("did:plc:other")) throw new Error("expected true for dynamic mode");
});

Deno.test("PolicyModeFilter.preFilter — only-me self returns true", () => {
  const filter = new PolicyModeFilter(ONLY_ME, "did:plc:self");
  if (!filter.preFilter("did:plc:self")) throw new Error("expected true for self");
});

Deno.test("PolicyModeFilter.preFilter — only-me other returns false", () => {
  const filter = new PolicyModeFilter(ONLY_ME, "did:plc:self");
  if (filter.preFilter("did:plc:other")) throw new Error("expected false for other in only-me");
});

Deno.test("PolicyModeFilter.preFilter — tangled-vouch self returns true", () => {
  const filter = new PolicyModeFilter(TANGLED_VOUCH, "did:plc:self");
  if (!filter.preFilter("did:plc:self")) throw new Error("expected true for self");
});

Deno.test("PolicyModeFilter.preFilter — tangled-vouch vouched returns true", () => {
  const vouched = new Set(["did:plc:vouched"]);
  const filter = new PolicyModeFilter(TANGLED_VOUCH, "did:plc:self", vouched);
  if (!filter.preFilter("did:plc:vouched")) throw new Error("expected true for vouched did");
});

Deno.test("PolicyModeFilter.preFilter — tangled-vouch other returns false", () => {
  const vouched = new Set(["did:plc:vouched"]);
  const filter = new PolicyModeFilter(TANGLED_VOUCH, "did:plc:self", vouched);
  if (filter.preFilter("did:plc:other")) throw new Error("expected false for non-vouched did");
});

Deno.test("PolicyModeFilter.preFilter — mutuals same as tangled-vouch", () => {
  const vouched = new Set(["did:plc:vouched"]);
  const filter = new PolicyModeFilter(MUTUALS, "did:plc:self", vouched);
  if (!filter.preFilter("did:plc:vouched")) throw new Error("expected true for vouched in mutuals");
  if (filter.preFilter("did:plc:other")) throw new Error("expected false for other in mutuals");
});

Deno.test("PolicyModeFilter.preFilter — empty vouchedDids returns false for other", () => {
  const filter = new PolicyModeFilter(TANGLED_VOUCH, "did:plc:self", new Set());
  if (filter.preFilter("did:plc:other")) throw new Error("expected false for other with empty vouched");
});

Deno.test("PolicyModeFilter.filter — preFilter true skips checker", async () => {
  let checkerCalled = false;
  const checker = { isRequesterAssociated: async (_did: string) => { checkerCalled = true; return true; } };
  const filter = new PolicyModeFilter(DYNAMIC, "did:plc:self", undefined, checker);
  const result = await filter.filter("did:plc:any");
  if (!result) throw new Error("expected true");
  if (checkerCalled) throw new Error("checker should not have been called");
});

Deno.test("PolicyModeFilter.filter — preFilter false, checker returns true", async () => {
  const checker = { isRequesterAssociated: async (_did: string) => true };
  const filter = new PolicyModeFilter(ONLY_ME, "did:plc:self", undefined, checker);
  const result = await filter.filter("did:plc:other");
  if (!result) throw new Error("expected true when checker returns true");
});

Deno.test("PolicyModeFilter.filter — preFilter false, checker returns false", async () => {
  const checker = { isRequesterAssociated: async (_did: string) => false };
  const filter = new PolicyModeFilter(ONLY_ME, "did:plc:self", undefined, checker);
  const result = await filter.filter("did:plc:other");
  if (result) throw new Error("expected false when checker returns false");
});

Deno.test("PolicyModeFilter.filter — preFilter false, no checker returns false", async () => {
  const filter = new PolicyModeFilter(ONLY_ME, "did:plc:self");
  const result = await filter.filter("did:plc:other");
  if (result) throw new Error("expected false with no checker");
});

Deno.test("PolicyModeFilter.filter — checker throws returns false", async () => {
  const checker = { isRequesterAssociated: async (_did: string) => { throw new Error("boom"); } };
  const filter = new PolicyModeFilter(ONLY_ME, "did:plc:self", undefined, checker);
  const result = await filter.filter("did:plc:other");
  if (result) throw new Error("expected false when checker throws");
});

Deno.test("PolicyModeFilter.toAcceptScopeFilter — returns function", async () => {
  const filter = new PolicyModeFilter(DYNAMIC, "did:plc:self");
  const fn = filter.toAcceptScopeFilter();
  const result = await fn({ issuerDid: "did:plc:any" });
  if (!result) throw new Error("expected true for dynamic mode");
});

Deno.test("PolicyModeFilter.toAcceptScopeFilter — respects preFilter", async () => {
  const filter = new PolicyModeFilter(ONLY_ME, "did:plc:self");
  const fn = filter.toAcceptScopeFilter();
  const selfResult = await fn({ issuerDid: "did:plc:self" });
  if (!selfResult) throw new Error("expected true for self");
  const otherResult = await fn({ issuerDid: "did:plc:other" });
  if (otherResult) throw new Error("expected false for other");
});
