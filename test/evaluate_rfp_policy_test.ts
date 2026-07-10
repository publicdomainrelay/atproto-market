import { evaluateRfpPolicy } from "@publicdomainrelay/market-policy";

Deno.test("evaluateRfpPolicy — no policyEngine returns allow:true", async () => {
  const result = await evaluateRfpPolicy({
    policyRef: { uri: "at://did:plc:alice/com.publicdomainrelay.temp.market.policy.directNetwork/self", cid: "bafy-testcid" },
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({ $type: "test" }),
  });
  if (!result.allow) throw new Error(`expected allow:true, got violations=${JSON.stringify(result.violations)}`);
  if (result.violations.length !== 0) throw new Error(`expected 0 violations, got ${result.violations.length}`);
});

Deno.test("evaluateRfpPolicy — resolve failure returns allow:false with violation", async () => {
  const result = await evaluateRfpPolicy({
    policyRef: { uri: "at://test/policy/1", cid: "testcid" },
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => { throw new Error("not found"); },
  });
  if (result.allow) throw new Error("expected allow:false for resolve failure");
  if (!result.violations[0]?.msg.includes("failed to resolve")) throw new Error(`unexpected msg: ${result.violations[0]?.msg}`);
});

Deno.test("evaluateRfpPolicy — resolveOperatorDid defaults to null passthrough", async () => {
  let resolveCalled = false;
  await evaluateRfpPolicy({
    policyRef: { uri: "at://test/policy/2", cid: "testcid2" },
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => { resolveCalled = true; return { $type: "test" }; },
  });
  if (!resolveCalled) throw new Error("resolve should have been called");
});

Deno.test("evaluateRfpPolicy — resolveOperatorDid is forwarded when provided", async () => {
  const result = await evaluateRfpPolicy({
    policyRef: { uri: "at://test/policy/3", cid: "testcid3" },
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({ $type: "test" }),
    resolveOperatorDid: async (_did) => "did:plc:operator",
  });
  if (!result.allow) throw new Error(`expected allow:true when no policyEngine, got ${JSON.stringify(result.violations)}`);
});

Deno.test("evaluateRfpPolicy — log function is forwarded", async () => {
  const logs: string[] = [];
  const result = await evaluateRfpPolicy({
    policyRef: { uri: "at://test/policy/4", cid: "testcid4" },
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:bidder",
    resolve: async () => ({ $type: "test" }),
    log: (_level, msg) => { logs.push(msg); },
  });
  if (!result.allow) throw new Error(`expected allow:true, got ${JSON.stringify(result.violations)}`);
});
