// The policy engine resolves a named market policy out of the same registry
// used for local sandbox execution, so "only-me" means the same thing whether a
// requester runs it in-process or delegates to a remote engine.

import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { createPolicyEngineFactory } from "@publicdomainrelay/hono-factory-policy-builtin";
import { MARKET_EVALUATE_POLICY_NSID, MARKET_POLICY_DESCRIBE_NSID } from "@publicdomainrelay/policy-common";
import type { PolicyEngineFactoryOptions } from "@publicdomainrelay/hono-factory-policy-builtin";

async function withEngine<T>(
  opts: PolicyEngineFactoryOptions,
  fn: (
    post: (body: Record<string, unknown>) => Promise<{ allow: boolean; violations: Array<{ msg: string; policyId: string }> }>,
    describe: () => Promise<{ policies: Array<{ name: string; kind: string; perspectives?: string[] }> }>,
  ) => Promise<T>,
): Promise<T> {
  const factory = createPolicyEngineFactory(opts);
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve(
    { port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (a) => resolvePort((a as Deno.NetAddr).port) },
    factory.createApp().fetch,
  );
  const port = await portReady;
  try {
    const describe = async () => {
      const res = await fetch(`http://127.0.0.1:${port}/xrpc/${MARKET_POLICY_DESCRIBE_NSID}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      return await res.json() as { policies: Array<{ name: string; kind: string; perspectives?: string[] }> };
    };
    const describeIn = describe;
    return await fn(async (body) => {
      const res = await fetch(`http://127.0.0.1:${port}/xrpc/${MARKET_EVALUATE_POLICY_NSID}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return await res.json();
    }, describeIn);
  } finally {
    ac.abort();
    await server.finished.catch(() => {});
  }
}

Deno.test("engine runs a named only-me policy and allows a matching operator", async () => {
  await withEngine(
    {
      hostname: "localhost",
      policies: [],
      resolveOperatorDid: (did: string) =>
        Promise.resolve(did === "did:plc:bidder" || did === "did:plc:req" ? "did:plc:req" : null),
    },
    async (post) => {
      const body = await post({
        name: "only-me",
        args: {},
        subjectDid: "did:plc:bidder",
        rootRequesterDid: "did:plc:req",
        counterpartyDid: "did:plc:bidder",
      });
      assertEquals(body.allow, true);
    },
  );
});

Deno.test("engine runs a named only-me policy and denies a mismatched operator", async () => {
  await withEngine(
    {
      hostname: "localhost",
      policies: [],
      resolveOperatorDid: (did: string) =>
        Promise.resolve(did === "did:plc:bidder" ? "did:plc:bidder" : did === "did:plc:req" ? "did:plc:req" : null),
    },
    async (post) => {
      const body = await post({
        name: "only-me",
        args: {},
        subjectDid: "did:plc:bidder",
        rootRequesterDid: "did:plc:req",
        counterpartyDid: "did:plc:bidder",
      });
      assertEquals(body.allow, false);
      assertEquals(body.violations[0].msg, "operator mismatch");
    },
  );
});

Deno.test("engine serves tangled-vouch off its own vouch lookup", async () => {
  await withEngine(
    {
      hostname: "localhost",
      policies: [],
      resolveOperatorDid: () => Promise.resolve("did:plc:operator"),
      getVouchedDids: () => Promise.resolve(new Set(["did:plc:operator"])),
    },
    async (post) => {
      const body = await post({
        name: "tangled-vouch",
        args: {},
        subjectDid: "did:plc:bidder",
        rootRequesterDid: "did:plc:req",
        counterpartyDid: "did:plc:bidder",
      });
      assertEquals(body.allow, true);
    },
  );
});

Deno.test("engine denies an unknown policy name", async () => {
  await withEngine({ hostname: "localhost", policies: [] }, async (post) => {
    const body = await post({
      name: "no-such-policy",
      args: {},
      subjectDid: "did:plc:bidder",
      rootRequesterDid: "did:plc:req",
    });
    assertEquals(body.allow, false);
    assertStringIncludes(body.violations[0].msg, "unknown policy");
  });
});

Deno.test("a nameless body still falls through to the configured handlers", async () => {
  await withEngine({ hostname: "localhost", policies: ["deny-all"] }, async (post) => {
    const body = await post({
      subjectDid: "did:plc:bidder",
      rootRequesterDid: "did:plc:req",
    });
    assertEquals(body.allow, false);
    assertEquals(body.violations[0].policyId, "deny-all");
  });
});

Deno.test("engine surfaces an extra named policy", async () => {
  await withEngine(
    {
      hostname: "localhost",
      policies: [],
      extraMarketPolicies: [{
        kind: "work",
        name: "always-no",
        description: "test",
        perspectives: ["bidder", "requester"],
        evaluate: () => Promise.resolve({ allow: false, violations: [{ msg: "nope", policyId: "always-no" }] }),
      }],
    },
    async (post) => {
      const body = await post({
        name: "always-no",
        args: {},
        subjectDid: "did:plc:bidder",
        rootRequesterDid: "did:plc:req",
      });
      assertEquals(body.allow, false);
      assertEquals(body.violations[0].msg, "nope");
    },
  );
});

Deno.test("engine describe returns the registry with kinds and perspectives", async () => {
  await withEngine({ hostname: "localhost", policies: [] }, async (_post, describe) => {
    const body = await describe();
    const byName = new Map(body.policies.map((p) => [p.name, p]));
    assert(byName.has("only-me"));
    assert(byName.has("under-4-cpus"));
    assertEquals(byName.get("under-4-cpus")!.kind, "work");
    assertEquals(byName.get("under-4-cpus")!.perspectives, ["bidder"]);
    assertEquals(byName.get("only-me")!.kind, "trust");
  });
});
