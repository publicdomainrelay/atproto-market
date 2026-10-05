# Context: lib-hono-factory-compute-contract-gateway-xrpc

Repository: `atproto-market`

This context exists to specify the xrpc transport layer of the compute-contract gateway: it is the Hono factory that turns an abstract ComputeContractGateway implementation into an HTTP service, exposing the four gateway operations as authenticated atproto XRPC POST routes, publishing the did:web identity and service entry that clients resolve the gateway through, and enforcing per-method service-auth (LXM) so a token minted for one method cannot be replayed against another. It sits between the abstract gateway interface lib/abc/compute-contract-gateway, the service-auth helper lib/market-atproto, and the shared gateway constants lib/common/compute-contract-gateway-common, and deliberately hands the returned Hono app back to the caller rather than binding a socket itself so the same factory can be embedded in a CLI or a test harness.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/hono-factory-compute-contract-gateway-xrpc/mod.ts` file mod.ts (lib/hono-factory-compute-contract-gateway-xrpc/mod.ts)
- `function:35f62ddaabe8e88061e3c0f6d7f5c28c` function requireAuth (lib/hono-factory-compute-contract-gateway-xrpc/mod.ts)
- `function:fb9c0b643b6c0ae7e354f595aa7280cf` function createComputeContractGatewayFactory (lib/hono-factory-compute-contract-gateway-xrpc/mod.ts)
- `interface:9ce82a55642acec416e2eb4c3b27f13c` interface ComputeContractGatewayFactoryOptions (lib/hono-factory-compute-contract-gateway-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
