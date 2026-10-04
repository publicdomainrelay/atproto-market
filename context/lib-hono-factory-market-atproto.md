# Context: lib-hono-factory-market-atproto

Repository: `atproto-market`

This context exists so that market server implementations (for example the bidder entrypoint) can obtain a ready Hono app exposing the market XRPC surface without re-wiring routing, error handling and dependency injection each time. It separates the transport-side wiring (routes, context variables, error boundary) from the handler construction in lib/market-atproto/server.ts, letting a caller opt into only the XRPC methods it actually serves by populating the corresponding optional fields of MarketFactoryHandlers.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
