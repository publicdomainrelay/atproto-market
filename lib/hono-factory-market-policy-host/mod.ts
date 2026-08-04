import { createFactory } from "@hono/hono/factory";
import type { Context, Next } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import type { PolicyHost } from "@publicdomainrelay/market-policy-common";
import {
  MARKET_POLICY_HOST_RESOLVE_OPERATOR_NSID,
  MARKET_POLICY_HOST_RESOLVE_OPERATOR_LXM,
  MARKET_POLICY_HOST_GET_VOUCHED_DIDS_NSID,
  MARKET_POLICY_HOST_GET_VOUCHED_DIDS_LXM,
  MARKET_POLICY_HOST_GET_TRUST_SET_NSID,
  MARKET_POLICY_HOST_GET_TRUST_SET_LXM,
  MARKET_POLICY_HOST_GET_RECORD_NSID,
  MARKET_POLICY_HOST_GET_RECORD_LXM,
} from "@publicdomainrelay/policy-common";

export interface MarketPolicyHostFactoryOptions {
  hostname: string;
  host: PolicyHost;
  strictAuth?: boolean;
}

function verifyServiceAuthToken(authHeader: string | null, hostname: string, lxm: string, strictAuth?: boolean): void {
  if (!strictAuth) return;
  if (!authHeader) throw new Error("missing Authorization header");
  if (!authHeader.startsWith("Bearer ")) throw new Error("invalid Authorization header");
  const token = authHeader.slice("Bearer ".length);
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid JWT format");
  const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
  if (payload.aud !== `did:web:${hostname}`) throw new Error("aud mismatch");
  if (lxm && payload.lxm !== lxm) throw new Error("lxm mismatch");
  if (payload.exp && (payload.exp as number) * 1000 < Date.now()) throw new Error("token expired");
}

export function createMarketPolicyHostFactory(opts: MarketPolicyHostFactoryOptions) {
  const { hostname, host, strictAuth } = opts;

  function requireAuth(lxm: string) {
    return async (c: Context, next: Next) => {
      const host = (c.req.header("host") ?? hostname).split(":")[0];
      try {
        verifyServiceAuthToken(c.req.header("authorization") ?? null, host, lxm, strictAuth);
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      await next();
    };
  }

  return createFactory({
    initApp: (app) => {
      app.use("*", cors());

      app.get("/.well-known/did.json", (c) => {
        const h = (c.req.header("host") ?? hostname).split(":")[0];
        return c.json({
          "@context": ["https://www.w3.org/ns/did/v1"],
          id: `did:web:${h}`,
          service: [
            { id: "#policy_host_resolve_operator", type: "PolicyHostService", serviceEndpoint: `https://${h}` },
            { id: "#policy_host_get_vouched_dids", type: "PolicyHostService", serviceEndpoint: `https://${h}` },
            { id: "#policy_host_get_trust_set", type: "PolicyHostService", serviceEndpoint: `https://${h}` },
            { id: "#policy_host_get_record", type: "PolicyHostService", serviceEndpoint: `https://${h}` },
          ],
        });
      });

      app.post(`/xrpc/${MARKET_POLICY_HOST_RESOLVE_OPERATOR_NSID}`, requireAuth(MARKET_POLICY_HOST_RESOLVE_OPERATOR_LXM), async (c) => {
        const body = await c.req.json() as { did?: string };
        if (!body.did) return c.json({ error: "did required" }, 400);
        const operatorDid = await host.resolveOperator(body.did);
        return c.json({ operatorDid });
      });

      app.post(`/xrpc/${MARKET_POLICY_HOST_GET_VOUCHED_DIDS_NSID}`, requireAuth(MARKET_POLICY_HOST_GET_VOUCHED_DIDS_LXM), async (c) => {
        const body = await c.req.json() as { did?: string };
        if (!body.did) return c.json({ error: "did required" }, 400);
        const dids = await host.getVouchedDids(body.did);
        return c.json({ dids: [...dids] });
      });

      app.post(`/xrpc/${MARKET_POLICY_HOST_GET_TRUST_SET_NSID}`, requireAuth(MARKET_POLICY_HOST_GET_TRUST_SET_LXM), async (c) => {
        const snapshot = await host.getTrustSet();
        return c.json(snapshot);
      });

      app.post(`/xrpc/${MARKET_POLICY_HOST_GET_RECORD_NSID}`, requireAuth(MARKET_POLICY_HOST_GET_RECORD_LXM), async (c) => {
        const body = await c.req.json() as { ref?: { uri: string; cid: string } };
        if (!body.ref) return c.json({ error: "ref required" }, 400);
        const value = await host.getRecord(body.ref);
        return c.json({ value });
      });
    },
  });
}
