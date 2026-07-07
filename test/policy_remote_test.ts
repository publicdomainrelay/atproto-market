Deno.test("remote policy — engine rejects with allow:false", async () => {
  const { createRemotePolicy } = await import("@publicdomainrelay/market-policy-remote");
  const { MARKET_EVALUATE_POLICY_NSID } = await import("@publicdomainrelay/market-lexicons");

  const engineCalled = Promise.withResolvers<{ body: unknown; auth: string | null }>();

  const ac = new AbortController();
  const server = Deno.serve({ port: 0, signal: ac.signal, onListen() {} }, async (req) => {
    const auth = req.headers.get("authorization");
    const body = await req.json();
    engineCalled.resolve({ body, auth });
    return new Response(JSON.stringify({ allow: false, violations: [{ msg: "test rejection", policyId: "test-policy" }] }), {
      headers: { "content-type": "application/json" },
    });
  });

  const port = server.addr.port;
  const engineUrl = `http://127.0.0.1:${port}`;
  const engineDid = `did:web:127.0.0.1%3A${port}`;

  const signer = {
    did() { return "did:key:zTestSigner"; },
    async sign(bytes: Uint8Array) { return new Uint8Array(64); },
  };

  const policy = createRemotePolicy({ signer });

  const policyRef = { uri: "at://test/policy/1", cid: "testcid" };

  const resolve = async (_ref: { uri: string; cid: string }) => ({
    $type: "com.publicdomainrelay.temp.market.policies.remote",
    policyEngine: engineDid,
    requesterDid: "did:plc:requester",
    createdAt: new Date().toISOString(),
  });

  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:requester",
    resolve,
    resolveOperatorDid: async () => null,
    log: () => {},
    policyRef,
  });

  ac.abort();
  await server.finished.catch(() => {});

  if (result.allow) throw new Error(`expected allow:false, got violations=${JSON.stringify(result.violations)}`);
  if (result.violations.length !== 1) throw new Error(`expected 1 violation, got ${result.violations.length}`);
  if (result.violations[0].msg !== "test rejection") throw new Error(`unexpected violation msg: ${result.violations[0].msg}`);

  const called = await engineCalled.promise;
  if (!called.auth) throw new Error("engine not called with auth header");
  if (!called.auth.startsWith("Bearer ")) throw new Error(`expected Bearer token, got ${called.auth}`);
  if (called.body.subjectDid !== "did:plc:bidder") throw new Error(`wrong subjectDid: ${called.body.subjectDid}`);
  if (called.body.rootRequesterDid !== "did:plc:requester") throw new Error(`wrong rootRequesterDid: ${called.body.rootRequesterDid}`);
});

Deno.test("remote policy — engine accepts with allow:true", async () => {
  const { createRemotePolicy } = await import("@publicdomainrelay/market-policy-remote");

  const ac = new AbortController();
  const server = Deno.serve({ port: 0, signal: ac.signal, onListen() {} }, async (_req) => {
    return new Response(JSON.stringify({ allow: true, violations: [] }), {
      headers: { "content-type": "application/json" },
    });
  });

  const port = server.addr.port;
  const engineDid = `did:web:127.0.0.1%3A${port}`;

  const signer = {
    did() { return "did:key:zTestSigner"; },
    async sign(bytes: Uint8Array) { return new Uint8Array(64); },
  };

  const policy = createRemotePolicy({ signer });

  const resolve = async () => ({
    $type: "com.publicdomainrelay.temp.market.policies.remote",
    policyEngine: engineDid,
  });

  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:requester",
    resolve,
    resolveOperatorDid: async () => null,
    log: () => {},
    policyRef: { uri: "at://test/policy/2", cid: "testcid2" },
  });

  ac.abort();
  await server.finished.catch(() => {});

  if (!result.allow) throw new Error(`expected allow:true, got violations=${JSON.stringify(result.violations)}`);
  if (result.violations.length !== 0) throw new Error(`expected 0 violations, got ${result.violations.length}`);
});

Deno.test("remote policy — no signer returns violation", async () => {
  const { createRemotePolicy } = await import("@publicdomainrelay/market-policy-remote");

  const policy = createRemotePolicy();

  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:requester",
    resolve: async () => ({ policyEngine: "did:web:example.com" }),
    resolveOperatorDid: async () => null,
    log: () => {},
    policyRef: { uri: "at://test/policy/3", cid: "testcid3" },
  });

  if (result.allow) throw new Error("expected allow:false when no signer");
  if (!result.violations[0]?.msg.includes("no signer")) throw new Error(`unexpected msg: ${result.violations[0]?.msg}`);
});

Deno.test("remote policy — no policyEngine returns violation", async () => {
  const { createRemotePolicy } = await import("@publicdomainrelay/market-policy-remote");

  const signer = {
    did() { return "did:key:zTestSigner"; },
    async sign(bytes: Uint8Array) { return new Uint8Array(64); },
  };
  const policy = createRemotePolicy({ signer });

  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:requester",
    resolve: async () => ({ $type: "test" }),
    resolveOperatorDid: async () => null,
    log: () => {},
    policyRef: { uri: "at://test/policy/4", cid: "testcid4" },
  });

  if (result.allow) throw new Error("expected allow:false when no policyEngine");
  if (!result.violations[0]?.msg.includes("policyEngine")) throw new Error(`unexpected msg: ${result.violations[0]?.msg}`);
});

Deno.test("remote policy — no policyRef returns violation", async () => {
  const { createRemotePolicy } = await import("@publicdomainrelay/market-policy-remote");

  const policy = createRemotePolicy();

  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:requester",
    resolve: async () => ({}),
    resolveOperatorDid: async () => null,
    log: () => {},
  });

  if (result.allow) throw new Error("expected allow:false when no policyRef");
  if (!result.violations[0]?.msg.includes("policyRef")) throw new Error(`unexpected msg: ${result.violations[0]?.msg}`);
});

Deno.test("only_me policy returns violations on mismatch", async () => {
  const { createOnlyMePolicy } = await import("@publicdomainrelay/market-policy-only-me");

  const policy = createOnlyMePolicy();

  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:requester",
    resolve: async () => ({}),
    resolveOperatorDid: async () => "did:plc:someone-else",
    log: () => {},
  });

  if (result.allow) throw new Error("expected allow:false for operator mismatch");
  if (result.violations.length !== 1) throw new Error(`expected 1 violation, got ${result.violations.length}`);
  if (result.violations[0].msg !== "operator mismatch") throw new Error(`unexpected msg: ${result.violations[0].msg}`);
  if (result.violations[0].policyId !== "com.publicdomainrelay.temp.market.policies.only_me") throw new Error(`unexpected policyId: ${result.violations[0].policyId}`);
});

Deno.test("only_me policy returns allow:true when operator matches", async () => {
  const { createOnlyMePolicy } = await import("@publicdomainrelay/market-policy-only-me");

  const policy = createOnlyMePolicy();

  const result = await policy.evaluate({
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:requester",
    counterpartyDid: "did:plc:requester",
    resolve: async () => ({}),
    resolveOperatorDid: async () => "did:plc:requester",
    log: () => {},
  });

  if (!result.allow) throw new Error(`expected allow:true, got violations=${JSON.stringify(result.violations)}`);
  if (result.violations.length !== 0) throw new Error(`expected 0 violations, got ${result.violations.length}`);
});

Deno.test("direct_network policy — self always allowed", async () => {
  const { createDirectNetworkPolicy } = await import("@publicdomainrelay/market-policy-direct-network");

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
  if (result.violations.length !== 0) throw new Error(`expected 0 violations, got ${result.violations.length}`);
});

Deno.test("allow-net handler — allows no permissions", async () => {
  const { createAllowNetOnlyPolicyHandler } = await import("@publicdomainrelay/compute-deno-atproto");
  const handler = createAllowNetOnlyPolicyHandler();
  const result = await handler.evaluate({ lock: "", json: "", bundle: "" });
  if (!result.allow) throw new Error(`expected allow:true for no perms, got violations=${JSON.stringify(result.violations)}`);
});

Deno.test("allow-net handler — allows net:true", async () => {
  const { createAllowNetOnlyPolicyHandler } = await import("@publicdomainrelay/compute-deno-atproto");
  const handler = createAllowNetOnlyPolicyHandler();
  const result = await handler.evaluate({ lock: "", json: "", bundle: "", permissions: { net: true } });
  if (!result.allow) throw new Error(`expected allow:true for net only, got violations=${JSON.stringify(result.violations)}`);
});

Deno.test("allow-net handler — denies read:true", async () => {
  const { createAllowNetOnlyPolicyHandler } = await import("@publicdomainrelay/compute-deno-atproto");
  const handler = createAllowNetOnlyPolicyHandler();
  const result = await handler.evaluate({ lock: "", json: "", bundle: "", permissions: { read: true } });
  if (result.allow) throw new Error("expected allow:false for read permission");
  if (!result.violations[0]?.msg.includes("read")) throw new Error(`unexpected msg: ${result.violations[0]?.msg}`);
});

Deno.test("allow-net handler — denies write + run", async () => {
  const { createAllowNetOnlyPolicyHandler } = await import("@publicdomainrelay/compute-deno-atproto");
  const handler = createAllowNetOnlyPolicyHandler();
  const result = await handler.evaluate({ lock: "", json: "", bundle: "", permissions: { write: true, run: true } });
  if (result.allow) throw new Error("expected allow:false for write+run");
  if (result.violations.length < 2) throw new Error(`expected >=2 violations, got ${result.violations.length}`);
});

Deno.test("allow-net handler — allows net:true with other false perms", async () => {
  const { createAllowNetOnlyPolicyHandler } = await import("@publicdomainrelay/compute-deno-atproto");
  const handler = createAllowNetOnlyPolicyHandler();
  const result = await handler.evaluate({ lock: "", json: "", bundle: "", permissions: { net: true, read: false, write: undefined as unknown as boolean } });
  if (!result.allow) throw new Error(`expected allow:true, got violations=${JSON.stringify(result.violations)}`);
});

Deno.test("allow-net handler — denies env + ffi", async () => {
  const { createAllowNetOnlyPolicyHandler } = await import("@publicdomainrelay/compute-deno-atproto");
  const handler = createAllowNetOnlyPolicyHandler();
  const result = await handler.evaluate({ lock: "", json: "", bundle: "", permissions: { env: true, ffi: true } });
  if (result.allow) throw new Error("expected allow:false for env+ffi");
  if (!result.violations.some(v => v.msg.includes("env"))) throw new Error("missing env violation");
  if (!result.violations.some(v => v.msg.includes("ffi"))) throw new Error("missing ffi violation");
});
