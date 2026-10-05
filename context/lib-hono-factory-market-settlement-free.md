# Context: lib-hono-factory-market-settlement-free

Repository: `atproto-market`

This context exists to pin down the boundary between the transport-agnostic free settlement logic in lib-market-settlement-free and the HTTP surface that exposes it: callers that mount a free-settlement receipt endpoint need to know exactly what dependency surface they must supply, what URL shape is published, and what the endpoint returns. It documents createFreeSettlementFactory as the only construction entrypoint, fixes the shape of the injected dependencies, and records the request-scoped environment type so middleware and downstream handlers can be layered on the same Hono app without redefining the context variables.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/hono-factory-market-settlement-free/mod.ts` file mod.ts (lib/hono-factory-market-settlement-free/mod.ts)
- `function:7bbe9c9808ae3467009f796d9d61f7a7` function createFreeSettlementFactory (lib/hono-factory-market-settlement-free/mod.ts)
- `interface:d9c1f785121068db886f45f3e476e730` interface FreeSettlementConfig (lib/hono-factory-market-settlement-free/mod.ts)
- `type_alias:259f1f8ce12ab1cae693c13fa0c86028` type_alias FreeSettlementEnv (lib/hono-factory-market-settlement-free/mod.ts)
<!-- SPECD_MANAGED_END -->
