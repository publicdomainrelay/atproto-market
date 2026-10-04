# Context: lib-hono-factory-market-settlement-x402

Repository: `atproto-market`

This context exists to bind the x402 settlement server logic to an HTTP surface: it is the Hono factory layer that turns the path-parsing and receipt-minting helpers into a route mounted by the application, while keeping agent, resolver, signer and payment middleware injected by the caller rather than hard-coded.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/hono-factory-market-settlement-x402/mod.ts` file mod.ts (lib/hono-factory-market-settlement-x402/mod.ts)
- `function:78e258a8c5323f8774599a9e9adf6dad` function createX402SettlementFactory (lib/hono-factory-market-settlement-x402/mod.ts)
- `interface:689a63cbfa61ba7bfe171e76eeea36d4` interface X402SettlementConfig (lib/hono-factory-market-settlement-x402/mod.ts)
- `type_alias:aed7d5829498218c0606453c9468be76` type_alias X402SettlementEnv (lib/hono-factory-market-settlement-x402/mod.ts)
<!-- SPECD_MANAGED_END -->
