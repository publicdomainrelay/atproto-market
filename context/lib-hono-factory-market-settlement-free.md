# Context: lib-hono-factory-market-settlement-free

Repository: `atproto-market`

The context exists so that the free settlement mode has a transport adapter that a market server can mount without knowing how receipts are minted: the ABC-level free settlement server logic (parseGrantPath, mintGrantForAccepts) is wrapped in a Hono factory, and all environment-specific dependencies (agent, record resolver, signer, logger, mount path) are injected through FreeSettlementConfig rather than read from globals. It keeps the free-settlement HTTP surface thin, configurable, and reusable across deployments, at the cost of being usable only where a caller can supply an Agent, a RecordResolver, and a RecordSigner.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
