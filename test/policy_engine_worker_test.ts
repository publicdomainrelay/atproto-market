import { assertEquals, assert, assertStringIncludes } from "@std/assert";
import { evaluateRfpPolicy, buildPolicyRecord } from "@publicdomainrelay/market-policy";
import { createWorkerPolicyEngine } from "@publicdomainrelay/market-policy-engine-worker";
import {
  POLICIES_BUILTIN_NSID,
  POLICIES_SERVICE_NSID,
  POLICIES_DENO_WORKER_NSID,
} from "@publicdomainrelay/market-lexicons";

const POLICY_REF = {
  uri: "at://did:plc:req/com.publicdomainrelay.temp.market.policies.builtin/abc",
  cid: "bafyreiabc",
};

function builtinRecord(name: string, args: Record<string, unknown> = {}) {
  return {
    $type: POLICIES_BUILTIN_NSID,
    name,
    description: "",
    args,
    requesterDid: "did:plc:req",
    createdAt: new Date().toISOString(),
  };
}

const BASE = {
  policyRef: POLICY_REF,
  perspective: "requester" as const,
  selfDid: "did:plc:req",
  subjectDid: "did:plc:bidder",
  rootRequesterDid: "did:plc:req",
  counterpartyDid: "did:plc:bidder",
};

Deno.test("buildPolicyRecord picks the engine kind off what it was given", () => {
  const spec = { name: "only-me", args: { bidWindowSec: 9, firstFree: true } };

  const builtin = buildPolicyRecord({ spec, requesterDid: "did:plc:req" });
  assertEquals(builtin.nsid, POLICIES_BUILTIN_NSID);
  assertEquals(builtin.record.$type, POLICIES_BUILTIN_NSID);
  assertEquals((builtin.record.policies as Array<{ name: string; args: Record<string, unknown> }>)[0].name, "only-me");
  assertEquals((builtin.record.policies as Array<{ args: Record<string, unknown> }>)[0].args, { bidWindowSec: 9, firstFree: true });

  const service = buildPolicyRecord({ spec, requesterDid: "did:plc:req", policyEngine: "did:web:engine.test" });
  assertEquals(service.nsid, POLICIES_SERVICE_NSID);
  assertEquals(service.record.policyEngine, "did:web:engine.test");

  const worker = buildPolicyRecord({
    spec,
    requesterDid: "did:plc:req",
    manifest: { uri: "at://did:plc:req/x/1", cid: "bafy" },
  });
  assertEquals(worker.nsid, POLICIES_DENO_WORKER_NSID);
  assert(worker.record.manifest);
});

Deno.test("builtin policy runs in the sandbox and allows a matching operator", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.resolve(builtinRecord("only-me")),
    resolveOperatorDid: (did: string) => Promise.resolve(did === "did:plc:bidder" || did === "did:plc:req" ? "did:plc:req" : null),
  });
  assertEquals(result.allow, true);
});

Deno.test("builtin policy allows a shared operator across distinct ephemeral DIDs", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    subjectDid: "did:plc:bidder-ephemeral",
    rootRequesterDid: "did:plc:req-ephemeral",
    selfDid: "did:plc:req-ephemeral",
    counterpartyDid: "did:plc:bidder-ephemeral",
    resolve: () => Promise.resolve(builtinRecord("only-me")),
    resolveOperatorDid: (did: string) =>
      Promise.resolve(did === "did:plc:bidder-ephemeral" || did === "did:plc:req-ephemeral" ? "did:plc:shared" : null),
  });
  assertEquals(result.allow, true);
});

Deno.test("builtin policy denies a mismatched operator", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.resolve(builtinRecord("only-me")),
    resolveOperatorDid: (did: string) =>
      Promise.resolve(did === "did:plc:bidder" ? "did:plc:bidder" : did === "did:plc:req" ? "did:plc:req" : null),
  });
  assertEquals(result.allow, false);
  assertEquals(result.violations[0].msg, "operator mismatch");
});

Deno.test("sandboxed policy reaches the host for vouch data it cannot fetch itself", async () => {
  const asked: string[] = [];
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.resolve(builtinRecord("tangled-vouch")),
    resolveOperatorDid: () => Promise.resolve("did:plc:operator"),
    getVouchedDids: (did) => {
      asked.push(did);
      return Promise.resolve(new Set(["did:plc:operator"]));
    },
  });
  assertEquals(result.allow, true);
  assertEquals(asked, ["did:plc:req"]);
});

Deno.test("policy log lines cross back to the host", async () => {
  const lines: string[] = [];
  await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.resolve(builtinRecord("only-me")),
    resolveOperatorDid: () => Promise.resolve("did:plc:req"),
    log: (_level, msg) => lines.push(msg),
  });
  assert(lines.some((l) => l.includes("only-me evaluate")));
});

Deno.test("an unknown policy name denies rather than throwing", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.resolve(builtinRecord("no-such-policy")),
  });
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "unknown policy");
});

Deno.test("an unknown engine kind denies", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.resolve({ $type: "com.example.policies.martian", name: "only-me" }),
  });
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "unknown policy engine kind");
});

Deno.test("a failed policy record resolution denies", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.reject(new Error("gone")),
  });
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "failed to resolve policy record");
});

Deno.test("onlyRemotePolicyExec refuses to run a builtin record locally", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.resolve(builtinRecord("only-me")),
    resolveOperatorDid: () => Promise.resolve("did:plc:req"),
    onlyRemotePolicyExec: true,
  });
  assertEquals(result.allow, false);
  assertEquals(result.violations[0].policyId, "local-policy-exec-disabled");
});

Deno.test("onlyRemotePolicyExec still lets a service record through to the engine", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () =>
      Promise.resolve({
        $type: POLICIES_SERVICE_NSID,
        name: "only-me",
        args: {},
        policyEngine: "did:web:engine.invalid",
      }),
    onlyRemotePolicyExec: true,
  });
  // No signer configured, so it stops there -- the point is it was not blocked
  // by the local-exec gate.
  assertEquals(result.allow, false);
  assertEquals(result.violations[0].policyId, "no-signer");
});

Deno.test("a service record without an engine denies", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.resolve({ $type: POLICIES_SERVICE_NSID, name: "only-me" }),
  });
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "policyEngine not set");
});

// ---------------------------------------------------------------------------
// Untrusted caller-supplied bundles
// ---------------------------------------------------------------------------

const ALLOW_ALL_BUNDLE = `
globalThis.policy = {
  name: "byo",
  description: "caller supplied",
  async evaluate(ctx) {
    const operator = await ctx.resolveOperatorDid(ctx.subjectDid);
    return operator === ctx.rootRequesterDid
      ? { allow: true, violations: [] }
      : { allow: false, violations: [{ msg: "byo says no", policyId: "byo" }] };
  },
};
`;

function denoWorkerRecord(bundleUri = "at://did:plc:req/manifest/1") {
  return {
    $type: POLICIES_DENO_WORKER_NSID,
    name: "byo",
    description: "",
    args: {},
    manifest: { uri: bundleUri, cid: "bafymanifest" },
    requesterDid: "did:plc:req",
    createdAt: new Date().toISOString(),
  };
}

function resolveWithManifest(bundle: string) {
  return (ref: { uri: string }) =>
    Promise.resolve(
      ref.uri.includes("manifest") ? { bundle } : denoWorkerRecord(),
    ) as Promise<Record<string, unknown>>;
}

Deno.test("an untrusted bundle is refused unless explicitly allowed", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: resolveWithManifest(ALLOW_ALL_BUNDLE),
    resolveOperatorDid: () => Promise.resolve("did:plc:req"),
  });
  assertEquals(result.allow, false);
  assertEquals(result.violations[0].policyId, "untrusted-policy-exec-disabled");
});

Deno.test("an untrusted bundle runs when allowUntrustedPolicyExec is set", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: resolveWithManifest(ALLOW_ALL_BUNDLE),
    resolveOperatorDid: () => Promise.resolve("did:plc:req"),
    allowUntrustedPolicyExec: true,
  });
  assertEquals(result.allow, true);
});

Deno.test("an untrusted bundle can deny, and its host RPC works", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: resolveWithManifest(ALLOW_ALL_BUNDLE),
    resolveOperatorDid: () => Promise.resolve("did:plc:someone-else"),
    allowUntrustedPolicyExec: true,
  });
  assertEquals(result.allow, false);
  assertEquals(result.violations[0].msg, "byo says no");
});

Deno.test("a bundle that never assigns globalThis.policy denies", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: resolveWithManifest("const nothing = 1;"),
    allowUntrustedPolicyExec: true,
  });
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "did not assign globalThis.policy");
});

Deno.test("a denoWorker record with no manifest denies", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: () => Promise.resolve({ $type: POLICIES_DENO_WORKER_NSID, name: "byo" }),
    allowUntrustedPolicyExec: true,
  });
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "no manifest ref");
});

Deno.test("a throwing policy bundle denies instead of hanging", async () => {
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: resolveWithManifest('globalThis.policy = { evaluate() { throw new Error("nope"); } };'),
    allowUntrustedPolicyExec: true,
  });
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "policy threw");
});

Deno.test("a policy that never answers is cut off by the timeout", async () => {
  const engine = createWorkerPolicyEngine({ allowUntrusted: true, timeoutMs: 750 });
  const result = await engine.evaluate({
    policyName: "hang",
    args: {},
    perspective: "requester",
    selfDid: "did:plc:req",
    subjectDid: "did:plc:bidder",
    rootRequesterDid: "did:plc:req",
    counterpartyDid: "did:plc:bidder",
    bundle: "globalThis.policy = { evaluate() { return new Promise(() => {}); } };",
    bridge: {
      resolve: () => Promise.resolve({}),
      resolveOperatorDid: () => Promise.resolve(null),
      getVouchedDids: () => Promise.resolve(new Set<string>()),
      log: () => {},
    },
  });
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "timed out");
});

Deno.test("a sandboxed bundle has no network permission", async () => {
  const NET_BUNDLE = `
globalThis.policy = {
  async evaluate() {
    try {
      await fetch("http://127.0.0.1:1/nope");
      return { allow: true, violations: [] };
    } catch (err) {
      return { allow: false, violations: [{ msg: "fetch blocked: " + err.name, policyId: "sandbox" }] };
    }
  },
};
`;
  const result = await evaluateRfpPolicy({
    ...BASE,
    resolve: resolveWithManifest(NET_BUNDLE),
    allowUntrustedPolicyExec: true,
  });
  assertEquals(result.allow, false);
  assertStringIncludes(result.violations[0].msg, "fetch blocked");
});
