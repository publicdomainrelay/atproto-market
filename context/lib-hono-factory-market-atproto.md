# Context: lib-hono-factory-market-atproto

Repository: `atproto-market`

This context exists to give the market server a transport-agnostic Hono factory layer: callers hand it a MarketServerDeps bundle and whichever market callbacks they support, and it returns a configured Hono app exposing the market XRPC endpoints. It keeps the HTTP wiring (route paths, error boundary, deps injection, handler construction) in one small package so the market-bidder entrypoint and other hosts can mount a market server without duplicating route registration or the NSID constants that live in the lexicons package.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/hono-factory-market-atproto/mod.ts` file mod.ts (lib/hono-factory-market-atproto/mod.ts)
- `function:800a02055445c67608223d52523a4f52` function createMarketFactory (lib/hono-factory-market-atproto/mod.ts)
- `interface:8e5a087b65382c18eeeb71bed01f210a` interface MarketFactoryHandlers (lib/hono-factory-market-atproto/mod.ts)
- `type_alias:7760b83d04c47b7681b47b9d97351064` type_alias MarketEnv (lib/hono-factory-market-atproto/mod.ts)
<!-- SPECD_MANAGED_END -->
