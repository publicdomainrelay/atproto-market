import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { Secp256k1Keypair } from "@atproto/crypto";
import { createPolicyEngineFactory } from "@publicdomainrelay/hono-factory-policy-builtin";
import { createMarketPolicyHostFactory } from "@publicdomainrelay/hono-factory-market-policy-host";
import { createPolicyHostXrpc } from "@publicdomainrelay/market-policy-host-xrpc";
import type { PolicyHost } from "@publicdomainrelay/market-policy-common";
import { MARKET_POLICY_CHECK_SCOPE_NSID } from "@publicdomainrelay/policy-common";
import type { Signer } from "@publicdomainrelay/market-policy-engine-service";

function signerFromKp(kp: Secp256k1Keypair): Signer {
  return {
    did() {
      return kp.did();
    },
    async sign(bytes: Uint8Array): Promise<Uint8Array> {
      return await kp.sign(bytes);
    },
  };
}

async function serveOnPort0(app: { fetch: (req: Request) => Promise<Response> }): Promise<{ port: number; stop: () => Promise<void> }> {
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve(
    { port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (addr) => resolvePort((addr as { port: number }).port) },
    app.fetch,
  );
  const port = await portReady;
  return { port, stop: async () => { ac.abort(); await server.finished.catch(() => {}); } };
}

// ---------------------------------------------------------------------------
// checkScope -- fast trust-only decision on the policy engine
// ---------------------------------------------------------------------------

Deno.test("checkScope allows a requester whose operator matches", async () => {
  const factory = createPolicyEngineFactory({
    hostname: "localhost",
    policies: [],
    resolveOperatorDid: (did) => Promise.resolve(did === "did:plc:bidder" ? "did:plc:req" : null),
  });
  const { port, stop } = await serveOnPort0(factory.createApp() as unknown as { fetch: (req: Request) => Promise<Response> });
  try {
    const res = await fetch(`http://127.0.0.1:${port}/xrpc/${MARKET_POLICY_CHECK_SCOPE_NSID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "only-me",
        perspective: "bidder",
        selfDid: "did:plc:req",
        subjectDid: "did:plc:bidder",
        rootRequesterDid: "did:plc:req",
        counterpartyDid: "did:plc:bidder",
      }),
    });
    const body = await res.json() as { allow: boolean };
    assertEquals(body.allow, true);
  } finally {
    await stop();
  }
});

Deno.test("checkScope denies a mismatched operator and an unknown trust name", async () => {
  const factory = createPolicyEngineFactory({
    hostname: "localhost",
    policies: [],
    resolveOperatorDid: () => Promise.resolve(null),
  });
  const { port, stop } = await serveOnPort0(factory.createApp() as unknown as { fetch: (req: Request) => Promise<Response> });
  try {
    const denyRes = await fetch(`http://127.0.0.1:${port}/xrpc/${MARKET_POLICY_CHECK_SCOPE_NSID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "only-me",
        perspective: "bidder",
        selfDid: "did:plc:req",
        subjectDid: "did:plc:bidder",
        rootRequesterDid: "did:plc:req",
        counterpartyDid: "did:plc:bidder",
      }),
    });
    const deny = await denyRes.json() as { allow: boolean; violations: Array<{ msg: string }> };
    assertEquals(deny.allow, false);

    const unknownRes = await fetch(`http://127.0.0.1:${port}/xrpc/${MARKET_POLICY_CHECK_SCOPE_NSID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "no-such", perspective: "bidder", selfDid: "did:plc:req" }),
    });
    const unknown = await unknownRes.json() as { allow: boolean };
    assertEquals(unknown.allow, false);
  } finally {
    await stop();
  }
});

// ---------------------------------------------------------------------------
// Host XRPC -- call-out from an engine to a served host
// ---------------------------------------------------------------------------

const fakeHost: PolicyHost = {
  resolveOperator: (did) => Promise.resolve(did === "did:plc:bidder" ? "did:plc:op" : null),
  getVouchedDids: (did) => Promise.resolve(new Set([`${did}-friend`])),
  getTrustSet: () => Promise.resolve({ operators: ["did:plc:op"], associated: { "did:plc:op": ["did:plc:req"] }, vouches: {} }),
  getRecord: (ref) => Promise.resolve({ uri: ref.uri, marker: "vm", cpus: 2 }),
  log: () => {},
};

Deno.test("engine can call back into a host over XRPC", async () => {
  const kp = await Secp256k1Keypair.create({ exportable: true });
  const hostServer = createMarketPolicyHostFactory({ hostname: "localhost", host: fakeHost });
  const { port, stop } = await serveOnPort0(hostServer.createApp() as unknown as { fetch: (req: Request) => Promise<Response> });
  try {
    const client = createPolicyHostXrpc({
      baseUrl: `http://127.0.0.1:${port}`,
      audDid: "did:web:127.0.0.1%3A" + port,
      signer: signerFromKp(kp),
    });

    assertEquals(await client.resolveOperator("did:plc:bidder"), "did:plc:op");
    assertEquals(await client.resolveOperator("did:plc:stranger"), null);
    assertEquals(await client.getVouchedDids("did:plc:req"), new Set(["did:plc:req-friend"]));
    const trust = await client.getTrustSet();
    assertEquals(trust.operators, ["did:plc:op"]);
    const record = await client.getRecord({ uri: "at://did:plc:req/com.example/1", cid: "c" });
    assertEquals(record.cpus, 2);
  } finally {
    await stop();
  }
});

Deno.test("host rejects a missing audience token under strictAuth", async () => {
  const hostServer = createMarketPolicyHostFactory({ hostname: "localhost", host: fakeHost, strictAuth: true });
  const { port, stop } = await serveOnPort0(hostServer.createApp() as unknown as { fetch: (req: Request) => Promise<Response> });
  try {
    const res = await fetch(`http://127.0.0.1:${port}/xrpc/com.publicdomainrelay.temp.market.policy.host.getTrustSet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  } finally {
    await stop();
  }
});
