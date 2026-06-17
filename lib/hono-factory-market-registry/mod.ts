// Hono factory for the market registry service. Wraps registration store,
// health checker, and XRPC handlers in Hono routes. Composed, not subclassed.

import { createFactory } from "@hono/hono/factory";
import { cors } from "@hono/hono/cors";
import { REGISTER_BIDDER_NSID, LIST_BIDDERS_NSID } from "@publicdomainrelay/market-lexicons";
import type { MarketServerDeps } from "@publicdomainrelay/market-atproto";
import {
  createRegisterBidderHandler,
  createListBiddersHandler,
} from "@publicdomainrelay/market-atproto";
import type {
  RegisterBidderCallback,
  ListBiddersCallback,
} from "@publicdomainrelay/market-atproto";
import type { RegistrationStore, HealthChecker } from "@publicdomainrelay/market-abc";

export interface MarketRegistryFactoryOptions {
  /** Market server deps forwarded to registry handlers. */
  deps: MarketServerDeps;
  /** PDS-backed registration store (created by CLI). */
  store: RegistrationStore;
  /** Timer-based health checker (created by CLI, started externally). */
  healthChecker?: HealthChecker;
  /** Called when a bidder registers. Default: upsert in store. */
  onRegister?: RegisterBidderCallback;
  /** Called when listing bidders. Default: query store. */
  onList?: ListBiddersCallback;
  /** Public key multibase for the did:web document. */
  atprotoPublicKeyMultibase?: string;
}

export function createMarketRegistryFactory(opts: MarketRegistryFactoryOptions) {
  const { deps, store, healthChecker, atprotoPublicKeyMultibase } = opts;

  // Default callbacks use the store directly.
  const onRegister: RegisterBidderCallback = opts.onRegister ??
    (async ({ bidderDid, appliesTo }) => {
      const { uri, cid } = await store.register({ bidderDid, appliesTo });
      return { body: { registrationUri: uri, registrationCid: cid } };
    });

  const onList: ListBiddersCallback = opts.onList ??
    (async ({ payloadNsid, maxResults, cursor }) => {
      const result = await store.listBidders({ payloadNsid, maxResults, cursor });
      return { body: result };
    });

  const registerBidderHandler = createRegisterBidderHandler({ deps, onRegister });
  const listBiddersHandler = createListBiddersHandler({ deps, onList });

  return createFactory({
    initApp: (app) => {
      app.use("*", cors());

      // did:web document — dynamic host from Host header so it works behind
      // relay tunnels (e.g. market-registry--xxx.fedproxy.com).
      if (atprotoPublicKeyMultibase) {
        app.get("/.well-known/did.json", (c) => {
          const host = c.req.header("host") ?? "";
          const webDid = `did:web:${host}`;
          return c.json({
            "@context": ["https://www.w3.org/ns/did/v1"],
            id: webDid,
            verificationMethod: [{
              id: `${webDid}#atproto`,
              type: "Multikey",
              controller: webDid,
              publicKeyMultibase: atprotoPublicKeyMultibase,
            }],
            service: [{
              id: "#pdr_temp_market",
              type: "PDRTempMarket",
              serviceEndpoint: `https://${host}`,
            }],
          });
        });
      }

      // XRPC handlers — mounted on /xrpc/<nsid>
      app.post(`/xrpc/${REGISTER_BIDDER_NSID}`, (c) => registerBidderHandler(c.req.raw));
      app.get(`/xrpc/${LIST_BIDDERS_NSID}`, (c) => listBiddersHandler(c.req.raw));

      // Health check
      app.get("/xrpc/_health", (c) => c.json({ ok: true }));
    },
  });
}
