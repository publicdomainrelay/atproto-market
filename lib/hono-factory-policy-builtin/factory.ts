import { createFactory } from "@hono/hono/factory";
import type { Context, Next } from "@hono/hono";
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
  MARKET_POLICY_DESCRIBE_NSID,
  MARKET_POLICY_DESCRIBE_LXM,
  MARKET_POLICY_CHECK_SCOPE_NSID,
  MARKET_POLICY_CHECK_SCOPE_LXM,
} from "@publicdomainrelay/policy-common";
import { resolvePolicies } from "@publicdomainrelay/policy-builtin";
import type { Policy } from "@publicdomainrelay/market-policy-abc";
import { createPolicyRegistry } from "@publicdomainrelay/market-policy-registry";

export interface PolicyEngineFactoryOptions {
  hostname: string;
  policies: string[];
  extraHandlers?: PolicyHandler[];
  strictAuth?: boolean;
  /** Extra named market policies beyond the first-party registry. */
  extraMarketPolicies?: Policy[];
  /** Record resolution for market policies evaluated here. */
  resolve?: (ref: { uri: string; cid: string }) => Promise<Record<string, unknown>>;
  resolveOperatorDid?: (bidderDid: string) => Promise<string | null>;
  getVouchedDids?: (did: string) => Promise<Set<string>>;
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

export function createPolicyEngineFactory(opts: PolicyEngineFactoryOptions) {
  const { hostname, strictAuth } = opts;
  const log = createLogger({ serviceName: "policy-engine" });
  const handlers = [...resolvePolicies(opts.policies), ...(opts.extraHandlers ?? [])];
  const marketPolicies = createPolicyRegistry(opts.extraMarketPolicies);

  function requireAuth(lxm: string) {
    return async (c: Context, next: Next) => {
      const host = (c.req.header("host") ?? hostname).split(":")[0];
      const authHeader = c.req.header("authorization") ?? null;
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

  return createFactory({
    initApp: (app) => {
      app.use("*", cors());
      registerErrorMiddleware(app, log as never);

      app.get("/.well-known/did.json", (c) => {
        const host = (c.req.header("host") ?? hostname).split(":")[0];
        return c.json({
          "@context": ["https://www.w3.org/ns/did/v1"],
          id: `did:web:${host}`,
          service: [
            { id: "#market_evaluate_policy", type: "PolicyEngineService", serviceEndpoint: `https://${host}` },
            { id: "#market_policy_describe", type: "PolicyEngineService", serviceEndpoint: `https://${host}` },
            { id: "#gate_registry_worker_manifest_permissions", type: "PolicyEngineService", serviceEndpoint: `https://${host}` },
          ],
        });
      });

      app.post(`/xrpc/${MARKET_EVALUATE_POLICY_NSID}`, requireAuth(MARKET_EVALUATE_POLICY_LXM), async (c) => {
        let body: Record<string, unknown>;
        try { body = await c.req.json(); } catch { throw new PolicyError("Invalid JSON body", 400, "InvalidRequest"); }
        if (!body.subjectDid || !body.rootRequesterDid) {
          throw new PolicyError("subjectDid and rootRequesterDid are required", 400, "InvalidRequest");
        }

        // A policies.service record names a policy; run it out of the same
        // registry local execution uses, so a name means the same thing either
        // side of the wire.
        const name = typeof body.name === "string" ? body.name : "";
        if (name) {
          const named = marketPolicies.get(name);
          if (!named) {
            return c.json({
              allow: false,
              violations: [{ msg: `unknown policy: ${name}`, policyId: name }],
            });
          }
          const args = (body.args ?? {}) as Record<string, unknown>;
          try {
            const result = await named.evaluate({
              policyName: name,
              args,
              perspective: (body.perspective === "requester" ? "requester" : "bidder"),
              selfDid: (body.selfDid ?? body.rootRequesterDid) as string,
              subjectDid: body.subjectDid as string,
              rootRequesterDid: body.rootRequesterDid as string,
              counterpartyDid: (body.counterpartyDid ?? body.subjectDid) as string,
              resolve: opts.resolve ?? (async () => ({})),
              resolveOperatorDid: opts.resolveOperatorDid ?? (async () => null),
              getVouchedDids: opts.getVouchedDids ?? (async () => new Set<string>()),
              log: (level, msg, meta) => log[level as "info" | "warn" | "error"]?.(msg, meta),
              policyRef: body.policyRef as { uri: string; cid: string } | undefined,
            });
            return c.json(result);
          } catch (err) {
            return c.json({ allow: false, violations: [{ msg: `policy ${name} threw: ${err}`, policyId: name }] });
          }
        }

        if (handlers.length === 0) return c.json({ allow: false, violations: [{ msg: "no policy handlers configured", policyId: "no-handlers" }] });
        for (const handler of handlers) {
          let result;
          try { result = await handler.evaluate(body); } catch (err) { return c.json({ allow: false, violations: [{ msg: `handler ${handler.name} threw: ${err}`, policyId: handler.name }] }); }
          if (!result.allow) return c.json(result);
        }
        return c.json({ allow: true, violations: [] });
      });

      app.post(`/xrpc/${MARKET_POLICY_CHECK_SCOPE_NSID}`, requireAuth(MARKET_POLICY_CHECK_SCOPE_LXM), async (c) => {
        let body: Record<string, unknown>;
        try { body = await c.req.json(); } catch { throw new PolicyError("Invalid JSON body", 400, "InvalidRequest"); }
        const name = typeof body.name === "string" ? body.name : "";
        const p = marketPolicies.get(name);
        if (!p || p.kind !== "trust") {
          return c.json({ allow: false, violations: [{ msg: `no trust policy named ${name}`, policyId: name }] });
        }
        // Fast trust-only decision: run the trust policy's evaluate with no
        // workload context. Hosts may substitute a sync decide() over their
        // TrustSet when one is available.
        const selfDid = (body.selfDid ?? body.rootRequesterDid) as string;
        const counterpartyDid = (body.counterpartyDid ?? body.subjectDid) as string;
        try {
          const result = await p.evaluate({
            policyName: name,
            args: (body.args ?? {}) as Record<string, unknown>,
            perspective: (body.perspective === "requester" ? "requester" : "bidder"),
            selfDid,
            subjectDid: body.subjectDid as string,
            rootRequesterDid: body.rootRequesterDid as string,
            counterpartyDid,
            resolve: opts.resolve ?? (async () => ({})),
            resolveOperatorDid: opts.resolveOperatorDid ?? (async () => null),
            getVouchedDids: opts.getVouchedDids ?? (async () => new Set<string>()),
            log: (level, msg, meta) => log[level as "info" | "warn" | "error"]?.(msg, meta),
          });
          return c.json(result);
        } catch (err) {
          return c.json({ allow: false, violations: [{ msg: `checkScope threw: ${err}`, policyId: name }] });
        }
      });

      app.post(`/xrpc/${MARKET_POLICY_DESCRIBE_NSID}`, requireAuth(MARKET_POLICY_DESCRIBE_LXM), (c) => {
        const policies = [...marketPolicies.names()].map((name) => {
          const p = marketPolicies.get(name);
          if (!p) return null;
          return {
            name,
            kind: p.kind,
            description: p.description,
            ...(p.kind === "work" ? { perspectives: p.perspectives } : {}),
          };
        }).filter((x): x is NonNullable<typeof x> => x !== null);
        return c.json({ policies });
      });

      app.post(`/xrpc/${GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_NSID}`, requireAuth(GATE_REGISTRY_WORKER_MANIFEST_PERMISSIONS_LXM), async (c) => {
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
    },
  });
}
