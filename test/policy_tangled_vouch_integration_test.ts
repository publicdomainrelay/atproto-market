// Integration: tangled-vouch policy evaluation with a local PDS.
// Tests FulfillmentPolicy.evaluate() directly with a mock PolicyEvalCtx.
// Full ephemeral-hono-pds integration test (RFP flow) would follow the
// bidder_policy_remote_integration_test.ts harness pattern; this covers
// the core evaluate logic which is the gap.

import { createDirectNetworkPolicy } from "@publicdomainrelay/market-policy-direct-network-tangled-vouch";

Deno.test("tangled-vouch — self always allowed", async () => {
  const policy = createDirectNetworkPolicy();
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

Deno.test("tangled-vouch — no vouch resolver returns violation", async () => {
  const policy = createDirectNetworkPolicy();
  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({}),
    resolveOperatorDid: async () => "did:plc:operator",
    log: () => {},
  });
  if (result.allow) throw new Error("expected allow:false when no vouch resolver");
  if (!result.violations[0]?.msg.includes("vouch resolver not configured")) {
    throw new Error(`unexpected violation: ${result.violations[0]?.msg}`);
  }
});

Deno.test("tangled-vouch — no operator association returns violation", async () => {
  const vouched = new Set(["did:plc:other"]);
  const resolver = {
    getVouchedDids: async (_did: string) => vouched,
    isVouched: async (_a: string, _b: string) => vouched.has(_b),
  };
  const policy = createDirectNetworkPolicy({ vouchResolver: resolver });
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

Deno.test("tangled-vouch — operator matches root requester returns allow", async () => {
  const vouched = new Set<string>();
  const resolver = {
    getVouchedDids: async (_did: string) => vouched,
    isVouched: async (_a: string, _b: string) => false,
  };
  const policy = createDirectNetworkPolicy({ vouchResolver: resolver });
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

Deno.test("tangled-vouch — operator in vouch set returns allow", async () => {
  const vouched = new Set(["did:plc:operator"]);
  const resolver = {
    getVouchedDids: async (_did: string) => vouched,
    isVouched: async (_a: string, _b: string) => vouched.has(_b),
  };
  const policy = createDirectNetworkPolicy({ vouchResolver: resolver });
  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({}),
    resolveOperatorDid: async () => "did:plc:operator",
    log: () => {},
  });
  if (!result.allow) throw new Error(`expected allow:true for vouched operator, got ${JSON.stringify(result.violations)}`);
});

Deno.test("tangled-vouch — operator not in vouch set returns violation", async () => {
  const vouched = new Set(["did:plc:other"]);
  const resolver = {
    getVouchedDids: async (_did: string) => vouched,
    isVouched: async (_a: string, _b: string) => false,
  };
  const policy = createDirectNetworkPolicy({ vouchResolver: resolver });
  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({}),
    resolveOperatorDid: async () => "did:plc:operator",
    log: () => {},
  });
  if (result.allow) throw new Error("expected allow:false when operator not vouched");
  if (!result.violations[0]?.msg.includes("not vouched")) {
    throw new Error(`unexpected violation: ${result.violations[0]?.msg}`);
  }
});

Deno.test("tangled-vouch — buildPolicyRecord returns correct shape", () => {
  const policy = createDirectNetworkPolicy();
  const record = policy.buildPolicyRecord("did:plc:alice");
  if (record.requesterDid !== "did:plc:alice") throw new Error(`expected requesterDid, got ${record.requesterDid}`);
  if (!record.$type) throw new Error("expected $type");
});
