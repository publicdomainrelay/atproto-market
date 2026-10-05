# Context: lib-hono-factory-market-settlement-x402

Repository: `atproto-market`

The factory exists so a host Hono application can mount an x402 receipt endpoint as a sub-app without knowing how receipts are minted. It is the transport-layer adapter between an HTTP GET under a configurable path and the settlement library's mintReceiptForAccepts: the caller injects the agent, the record resolver and the signer (so the factory never constructs credentials itself), and optionally injects a payment middleware and logger. It exists in the factory layer of the ABC split, depending on lib-market-settlement-x402 for parsing and minting and on lib-abc-market, lib-market-atproto and lib-common-market-common for the Agent, RecordResolver, RecordSigner and Logger types.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/hono-factory-market-settlement-x402/mod.ts` file mod.ts (lib/hono-factory-market-settlement-x402/mod.ts)
- `function:78e258a8c5323f8774599a9e9adf6dad` function createX402SettlementFactory (lib/hono-factory-market-settlement-x402/mod.ts)
- `interface:689a63cbfa61ba7bfe171e76eeea36d4` interface X402SettlementConfig (lib/hono-factory-market-settlement-x402/mod.ts)
- `type_alias:aed7d5829498218c0606453c9468be76` type_alias X402SettlementEnv (lib/hono-factory-market-settlement-x402/mod.ts)
<!-- SPECD_MANAGED_END -->
