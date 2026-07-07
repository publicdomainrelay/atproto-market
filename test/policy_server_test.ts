import { createPolicyEngineFactory } from "@publicdomainrelay/hono-factory-policy-builtin";
import { resolvePolicies } from "@publicdomainrelay/policy-builtin";
import { MARKET_EVALUATE_POLICY_NSID, GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID } from "@publicdomainrelay/policy-common";

Deno.test("policy server — allow-net accepts manifest with net only", async () => {
  const handlers = resolvePolicies(["allow-net"]);
  const factory = createPolicyEngineFactory({ hostname: "localhost", handlers });
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve({ port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (a) => resolvePort((a as Deno.NetAddr).port) }, factory.app.fetch);
  const port = await portReady;

  const url = `http://127.0.0.1:${port}/xrpc/${GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest: { permissions: { net: true } } }),
  });
  const body = await res.json() as { allow: boolean; violations: Array<{ msg: string }> };
  ac.abort();
  await server.finished.catch(() => {});
  if (!body.allow) throw new Error(`expected allow:true, got ${JSON.stringify(body)}`);
  if (body.violations.length !== 0) throw new Error(`expected 0 violations, got ${body.violations.length}`);
});

Deno.test("policy server — allow-net denies manifest with read permission", async () => {
  const handlers = resolvePolicies(["allow-net"]);
  const factory = createPolicyEngineFactory({ hostname: "localhost", handlers });
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve({ port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (a) => resolvePort((a as Deno.NetAddr).port) }, factory.app.fetch);
  const port = await portReady;

  const url = `http://127.0.0.1:${port}/xrpc/${GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest: { permissions: { read: true } } }),
  });
  const body = await res.json() as { allow: boolean; violations: Array<{ msg: string }> };
  ac.abort();
  await server.finished.catch(() => {});
  if (body.allow) throw new Error("expected allow:false for read permission");
  if (!body.violations[0]?.msg.includes("read")) throw new Error(`unexpected msg: ${body.violations[0]?.msg}`);
});

Deno.test("policy server — market evaluate returns allow with no handlers", async () => {
  const handlers = resolvePolicies(["allow-all"]);
  const factory = createPolicyEngineFactory({ hostname: "localhost", handlers });
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve({ port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (a) => resolvePort((a as Deno.NetAddr).port) }, factory.app.fetch);
  const port = await portReady;

  const url = `http://127.0.0.1:${port}/xrpc/${MARKET_EVALUATE_POLICY_NSID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subjectDid: "did:plc:test", rootRequesterDid: "did:plc:root" }),
  });
  const body = await res.json() as { allow: boolean; violations: Array<{ msg: string }> };
  ac.abort();
  await server.finished.catch(() => {});
  if (!body.allow) throw new Error(`expected allow:true, got ${JSON.stringify(body)}`);
});

Deno.test("policy server — deny-all blocks everything", async () => {
  const handlers = resolvePolicies(["deny-all"]);
  const factory = createPolicyEngineFactory({ hostname: "localhost", handlers });
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve({ port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (a) => resolvePort((a as Deno.NetAddr).port) }, factory.app.fetch);
  const port = await portReady;

  const url = `http://127.0.0.1:${port}/xrpc/${GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest: { permissions: {} } }),
  });
  const body = await res.json() as { allow: boolean; violations: Array<{ msg: string }> };
  ac.abort();
  await server.finished.catch(() => {});
  if (body.allow) throw new Error("expected allow:false from deny-all");
  if (body.violations.length === 0) throw new Error("expected violations from deny-all");
});

Deno.test("policy server — DID document serves service entries", async () => {
  const handlers = resolvePolicies(["allow-net"]);
  const factory = createPolicyEngineFactory({ hostname: "localhost", handlers });
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve({ port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (a) => resolvePort((a as Deno.NetAddr).port) }, factory.app.fetch);
  const port = await portReady;

  const res = await fetch(`http://127.0.0.1:${port}/.well-known/did.json`);
  const doc = await res.json() as { id: string; service: Array<{ id: string }> };
  ac.abort();
  await server.finished.catch(() => {});
  if (!doc.id.startsWith("did:web:")) throw new Error(`expected did:web DID, got ${doc.id}`);
  if (!doc.service.some((s) => s.id === "#market_evaluate_policy")) throw new Error("missing market_evaluate_policy service entry");
  if (!doc.service.some((s) => s.id === "#gate_registry_worker_manifest_permissions")) throw new Error("missing gate_registry_worker_manifest_permissions service entry");
});

Deno.test("policy server — empty handlers default-deny", async () => {
  const factory = createPolicyEngineFactory({ hostname: "localhost", handlers: [] });
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve({ port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (a) => resolvePort((a as Deno.NetAddr).port) }, factory.app.fetch);
  const port = await portReady;

  const res = await fetch(`http://127.0.0.1:${port}/xrpc/${GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest: { permissions: {} } }),
  });
  const body = await res.json() as { allow: boolean; violations: Array<{ msg: string }> };
  ac.abort();
  await server.finished.catch(() => {});
  if (body.allow) throw new Error("expected deny when no handlers configured");
  if (!body.violations[0]?.msg.includes("no policy handlers")) throw new Error(`unexpected: ${body.violations[0]?.msg}`);
});

Deno.test("policy server — handler throw becomes violation", async () => {
  const throwingHandler = { name: "thrower", async evaluate(_ctx: Record<string, unknown>) { throw new Error("boom"); } };
  const factory = createPolicyEngineFactory({ hostname: "localhost", handlers: [throwingHandler] });
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve({ port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (a) => resolvePort((a as Deno.NetAddr).port) }, factory.app.fetch);
  const port = await portReady;

  const res = await fetch(`http://127.0.0.1:${port}/xrpc/${MARKET_EVALUATE_POLICY_NSID}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subjectDid: "did:plc:test", rootRequesterDid: "did:plc:root" }),
  });
  const body = await res.json() as { allow: boolean; violations: Array<{ msg: string }> };
  ac.abort();
  await server.finished.catch(() => {});
  if (body.allow) throw new Error("expected deny when handler throws");
  if (!body.violations[0]?.msg.includes("thrower threw")) throw new Error(`unexpected: ${body.violations[0]?.msg}`);
});

Deno.test("policy server — allow-net reads permissions from full manifest", async () => {
  const handlers = resolvePolicies(["allow-net"]);
  const factory = createPolicyEngineFactory({ hostname: "localhost", handlers });
  const ac = new AbortController();
  const { promise: portReady, resolve: resolvePort } = Promise.withResolvers<number>();
  const server = Deno.serve({ port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: (a) => resolvePort((a as Deno.NetAddr).port) }, factory.app.fetch);
  const port = await portReady;

  // Send full manifest (not just permissions subset)
  const res = await fetch(`http://127.0.0.1:${port}/xrpc/${GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest: { lock: "v3", json: '{"imports":{}}', bundle: "(()=>{})()", persistent: true, permissions: { read: true, write: true } } }),
  });
  const body = await res.json() as { allow: boolean; violations: Array<{ msg: string }> };
  ac.abort();
  await server.finished.catch(() => {});
  if (body.allow) throw new Error("expected deny for read+write in full manifest");
  if (body.violations.length < 2) throw new Error(`expected >=2 violations, got ${body.violations.length}`);
});
