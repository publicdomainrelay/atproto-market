// Integration: bsky-mutuals policy evaluation.
// Tests FulfillmentPolicy.evaluate() directly with a mock PolicyEvalCtx.
// Full ephemeral-hono-pds integration test (RFP flow) would follow the
// bidder_policy_remote_integration_test.ts harness pattern.

import { createBskyMutualPolicy } from "@publicdomainrelay/market-policy-direct-network-bsky-mutual";

Deno.test("mutuals — self always allowed", async () => {
  const policy = createBskyMutualPolicy();
  const result = await policy.evaluate({
    subjectDid: "did:plc:same",
    rootRequesterDid: "did:plc:same",
    counterpartyDid: "did:plc:same",
    resolve: async () => ({}),
    resolveOperatorDid: async () => null,
    log: () => {},
  });
  if (!result.allow) throw new Error(`expected allow:true for self, got violations=${JSON.stringify(result.violations)}`);
});

Deno.test("mutuals — no vouch resolver returns violation", async () => {
  const policy = createBskyMutualPolicy();
  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({}),
    resolveOperatorDid: async () => "did:plc:operator",
    log: () => {},
  });
  if (result.allow) throw new Error("expected allow:false when no vouch resolver");
  if (!result.violations[0]?.msg.includes("resolver not configured")) {
    throw new Error(`unexpected violation: ${result.violations[0]?.msg}`);
  }
});

Deno.test("mutuals — no operator association returns violation", async () => {
  const resolver = {
    getVouchedDids: async (_did: string) => new Set<string>(),
    isVouched: async (_a: string, _b: string) => false,
  };
  const policy = createBskyMutualPolicy({ vouchResolver: resolver });
  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({}),
    resolveOperatorDid: async () => null,
    log: () => {},
  });
  if (result.allow) throw new Error("expected allow:false when no operator association");
  if (!result.violations[0]?.msg.includes("no operator association")) {
    throw new Error(`unexpected violation: ${result.violations[0]?.msg}`);
  }
});

Deno.test("mutuals — operator matches root requester returns allow", async () => {
  const resolver = {
    getVouchedDids: async (_did: string) => new Set<string>(),
    isVouched: async (_a: string, _b: string) => false,
  };
  const policy = createBskyMutualPolicy({ vouchResolver: resolver });
  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({}),
    resolveOperatorDid: async () => "did:plc:requester",
    log: () => {},
  });
  if (!result.allow) throw new Error(`expected allow:true when operator matches root requester, got ${JSON.stringify(result.violations)}`);
});

Deno.test("mutuals — mutual follows returns allow", async () => {
  const rootFollows = new Set(["did:plc:operator"]);
  const operatorFollows = new Set(["did:plc:requester"]);
  const resolver = {
    getVouchedDids: async (did: string) => did === "did:plc:requester" ? rootFollows : operatorFollows,
    isVouched: async (_a: string, _b: string) => false,
  };
  const policy = createBskyMutualPolicy({ vouchResolver: resolver });
  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({}),
    resolveOperatorDid: async () => "did:plc:operator",
    log: () => {},
  });
  if (!result.allow) throw new Error(`expected allow:true for mutual follows, got ${JSON.stringify(result.violations)}`);
});

Deno.test("mutuals — one-way follow returns violation", async () => {
  const rootFollows = new Set(["did:plc:operator"]);
  const operatorFollows = new Set<string>();
  const resolver = {
    getVouchedDids: async (did: string) => did === "did:plc:requester" ? rootFollows : operatorFollows,
    isVouched: async (_a: string, _b: string) => false,
  };
  const policy = createBskyMutualPolicy({ vouchResolver: resolver });
  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({}),
    resolveOperatorDid: async () => "did:plc:operator",
    log: () => {},
  });
  if (result.allow) throw new Error("expected allow:false for one-way follow");
  if (!result.violations[0]?.msg.includes("not mutual")) {
    throw new Error(`unexpected violation: ${result.violations[0]?.msg}`);
  }
});

Deno.test("mutuals — buildPolicyRecord returns correct shape", () => {
  const policy = createBskyMutualPolicy();
  const record = policy.buildPolicyRecord("did:plc:alice");
  if (record.requesterDid !== "did:plc:alice") throw new Error(`expected requesterDid, got ${record.requesterDid}`);
  if (!record.$type) throw new Error("expected $type");
});
