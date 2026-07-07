import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { registerErrorMiddleware } from "@publicdomainrelay/hono-error-middleware";
import { createLogger } from "@publicdomainrelay/logger";
import type { PolicyHandler } from "@publicdomainrelay/policy-abc";
import { PolicyError } from "@publicdomainrelay/policy-common";
import {
  GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID,
  GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_LXM,
  MARKET_EVALUATE_POLICY_NSID,
  MARKET_EVALUATE_POLICY_LXM,
} from "@publicdomainrelay/policy-common";

export interface PolicyEngineFactoryOptions {
  hostname: string;
  handlers: PolicyHandler[];
  signingKey?: { did(): string; sign(bytes: Uint8Array): Promise<Uint8Array> };
  strictAuth?: boolean;
}

function verifyServiceAuthToken(authHeader: string | null, hostname: string, lxm: string, strictAuth?: boolean): void {
  if (!strictAuth) return;
  if (!authHeader) throw new PolicyError("missing Authorization header", 401, "Unauthorized");
  if (!authHeader.startsWith("Bearer ")) throw new PolicyError("invalid Authorization header", 401, "Unauthorized");
  const token = authHeader.slice("Bearer ".length);
  const parts = token.split(".");
  if (parts.length !== 3) throw new PolicyError("invalid JWT format", 401, "Unauthorized");
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const expectedAud = `did:web:${hostname}`;
    if (payload.aud !== expectedAud) {
      throw new PolicyError(`aud mismatch: expected ${expectedAud}, got ${payload.aud}`, 401, "Unauthorized");
    }
    if (lxm && payload.lxm !== lxm) {
      throw new PolicyError(`lxm mismatch: expected ${lxm}, got ${payload.lxm}`, 401, "Unauthorized");
    }
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new PolicyError("token expired", 401, "Unauthorized");
    }
  } catch (err) {
    if (err instanceof PolicyError) throw err;
    throw new PolicyError(`invalid JWT payload: ${err}`, 401, "Unauthorized");
  }
}

export function createPolicyEngineFactory(opts: PolicyEngineFactoryOptions): { app: Hono } {
  const { hostname, handlers, strictAuth } = opts;
  const log = createLogger({ serviceName: "policy-engine" });

  const app = new Hono();
  app.use("*", cors());
  registerErrorMiddleware(app, log as never);

  // deno-lint-ignore no-explicit-any
  function header(c: any, name: string): string | null {
    return (c.req.header(name) ?? null) as string | null;
  }

  function requireAuth(lxm: string) {
    // deno-lint-ignore no-explicit-any
    return async (c: any, next: any) => {
      const host = (header(c, "host") ?? hostname).split(":")[0];
      const authHeader = header(c, "authorization");
      try {
        verifyServiceAuthToken(authHeader, host, lxm, strictAuth);
      } catch (err) {
        if (err instanceof PolicyError) {
          return new Response(JSON.stringify(err.toJSON()), {
            status: err.status,
            headers: { "content-type": "application/json" },
          });
        }
        throw err;
      }
      await next();
    };
  }

  app.get("/.well-known/did.json", (c) => {
    const host = (c.req.header("host") ?? hostname).split(":")[0];
    return c.json({
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: `did:web:${host}`,
      service: [
        { id: "#market_evaluate_policy", type: "PolicyEngineService", serviceEndpoint: `https://${host}` },
        { id: "#gate_registry_worker_manifest_permissions", type: "PolicyEngineService", serviceEndpoint: `https://${host}` },
      ],
    });
  });

  // deno-lint-ignore no-explicit-any
  app.post(`/xrpc/${MARKET_EVALUATE_POLICY_NSID}`, requireAuth(MARKET_EVALUATE_POLICY_LXM), async (c: any) => {
    let body: Record<string, unknown>;
    try { body = await c.req.json(); } catch { throw new PolicyError("Invalid JSON body", 400, "InvalidRequest"); }
    if (!body.subjectDid || !body.rootRequesterDid) {
      throw new PolicyError("subjectDid and rootRequesterDid are required", 400, "InvalidRequest");
    }
    if (handlers.length === 0) return c.json({ allow: false, violations: [{ msg: "no policy handlers configured", policyId: "no-handlers" }] });
    for (const handler of handlers) {
      let result;
      try { result = await handler.evaluate(body); } catch (err) { return c.json({ allow: false, violations: [{ msg: `handler ${handler.name} threw: ${err}`, policyId: handler.name }] }); }
      if (!result.allow) return c.json(result);
    }
    return c.json({ allow: true, violations: [] });
  });

  // deno-lint-ignore no-explicit-any
  app.post(`/xrpc/${GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID}`, requireAuth(GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_LXM), async (c: any) => {
    let body: Record<string, unknown>;
    try { body = await c.req.json(); } catch { throw new PolicyError("Invalid JSON body", 400, "InvalidRequest"); }
    const manifest = body.manifest as Record<string, unknown> | undefined;
    if (!manifest) throw new PolicyError("manifest is required", 400, "InvalidRequest");
    if (handlers.length === 0) return c.json({ allow: false, violations: [{ msg: "no policy handlers configured", policyId: "no-handlers" }] });
    for (const handler of handlers) {
      let result;
      try { result = await handler.evaluate(manifest); } catch (err) { return c.json({ allow: false, violations: [{ msg: `handler ${handler.name} threw: ${err}`, policyId: handler.name }] }); }
      if (!result.allow) return c.json(result);
    }
    return c.json({ allow: true, violations: [] });
  });

  return { app };
}
