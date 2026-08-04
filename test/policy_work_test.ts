import { assertEquals, assertStringIncludes } from "@std/assert";
import { createUnderFourCpusPolicy, createBidPayloadFilterPolicy } from "@publicdomainrelay/market-policy-work";
import { assertPolicyPerspective } from "@publicdomainrelay/market-policy-abc";
import { createPolicyRegistry } from "@publicdomainrelay/market-policy-registry";
import type { PolicyEvalCtx } from "@publicdomainrelay/market-policy-abc";

function ctx(over: Partial<PolicyEvalCtx> = {}): PolicyEvalCtx {
  return {
    policyName: "under-4-cpus",
    args: {},
    perspective: "bidder" as const,
    selfDid: "did:plc:bidder",
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:req",
    counterpartyDid: "did:plc:req",
    resolve: async () => ({}),
    resolveOperatorDid: async () => null,
    getVouchedDids: async () => new Set<string>(),
    log: () => {},
    ...over,
  };
}

Deno.test("under-4-cpus allows a small VM from its demand payload", async () => {
  const policy = createUnderFourCpusPolicy();
  const result = await policy.evaluate(ctx({
    demand: {
      rfpRef: { uri: "at://x/1", cid: "c" },
      payloadRef: { uri: "at://x/vm/1", cid: "c" },
      payloadNsid: "com.publicdomainrelay.temp.compute.vm",
      payload: { cpus: 2 },
    },
  }));
  assertEquals(result.allow, true);
});

Deno.test("under-4-cpus denies a VM over its maxCpus cap", async () => {
  const policy = createUnderFourCpusPolicy();
  const result = await policy.evaluate(ctx({
    args: { maxCpus: 4 },
    demand: {
      rfpRef: { uri: "at://x/1", cid: "c" },
      payloadRef: { uri: "at://x/vm/1", cid: "c" },
      payloadNsid: "com.publicdomainrelay.temp.compute.vm",
      payload: { cpus: 8 },
    },
  }));
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "8 cpus");
});

Deno.test("under-4-cpus resolves the payload through ctx.resolve when not pre-fetched", async () => {
  const policy = createUnderFourCpusPolicy();
  const result = await policy.evaluate(ctx({
    demand: {
      rfpRef: { uri: "at://x/1", cid: "c" },
      payloadRef: { uri: "at://x/vm/1", cid: "c" },
      payloadNsid: "com.publicdomainrelay.temp.compute.vm",
    },
    resolve: async () => ({ cpus: 16 }),
  }));
  assertEquals(result.allow, false);
});

Deno.test("under-4-cpus abstains when the demand has no cpu info", async () => {
  const policy = createUnderFourCpusPolicy();
  const result = await policy.evaluate(ctx({
    demand: {
      rfpRef: { uri: "at://x/1", cid: "c" },
      payloadRef: { uri: "at://x/vm/1", cid: "c" },
      payloadNsid: "com.publicdomainrelay.temp.compute.vm",
      payload: {},
    },
  }));
  assertEquals(result.allow, true);
});

Deno.test("bid-payload filter allows the default free bid payload", async () => {
  const policy = createBidPayloadFilterPolicy();
  const result = await policy.evaluate(ctx({
    policyName: "bid-payload",
    perspective: "requester",
    offer: {
      bidRef: { uri: "at://x/1", cid: "c" },
      payloadRef: { uri: "at://x/bid/1", cid: "c" },
      payloadNsid: "com.publicdomainrelay.temp.market.bids.free",
    },
  }));
  assertEquals(result.allow, true);
});

Deno.test("bid-payload filter denies a disallowed payload type", async () => {
  const policy = createBidPayloadFilterPolicy();
  const result = await policy.evaluate(ctx({
    policyName: "bid-payload",
    perspective: "requester",
    args: { allowedPayloadNsids: ["com.publicdomainrelay.temp.market.bids.free"] },
    offer: {
      bidRef: { uri: "at://x/1", cid: "c" },
      payloadRef: { uri: "at://x/bid/1", cid: "c" },
      payloadNsid: "com.publicdomainrelay.temp.market.bids.x402",
    },
  }));
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "bids.x402");
});

Deno.test("assertPolicyPerspective fails loud on a wrong-side work policy", () => {
  const under4 = createUnderFourCpusPolicy();
  let threw = false;
  try {
    assertPolicyPerspective(under4, "requester");
  } catch (err) {
    threw = true;
    assertStringIncludes(String(err), "not usable from the requester side");
  }
  assert(threw);

  // Trust policies are side-agnostic -- no throw.
  const onlyMe = createPolicyRegistry().get("only-me")!;
  assertPolicyPerspective(onlyMe, "bidder");
  assertPolicyPerspective(onlyMe, "requester");
});

Deno.test("work policies are registered in the registry", () => {
  const registry = createPolicyRegistry();
  assert(registry.names().includes("under-4-cpus"));
  assert(registry.names().includes("bid-payload"));
  assertEquals(registry.get("under-4-cpus")!.kind, "work");
  assertEquals(registry.get("bid-payload")!.kind, "work");
});

// deno-lint-ignore no-explicit-any
function assert(v: unknown, msg?: string): asserts v { if (!v) throw new Error(msg ?? "assertion failed"); }
