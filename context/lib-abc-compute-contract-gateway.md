# Context: lib-abc-compute-contract-gateway

Repository: `atproto-market`

This context exists to fix the contract that every compute gateway implementation and every caller agrees on, without committing to a transport. It is the abstract boundary layer (abc) of the Deno + Hono ABC layering: implementations such as createComputeContractGateway in lib/compute-contract-gateway-xrpc and the Hono factory in lib/hono-factory-compute-contract-gateway-xrpc depend on ComputeContractGateway, and market callers raise compute requests through it, so VM and worker provisioning, receipt-addressed deletion and gateway start/stop are all expressed once as an interface rather than duplicated per implementation. It depends on the shared common package for the record types crossing the boundary, so those types are defined once and cannot drift between the gateway and its callers.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/abc/compute-contract-gateway/mod.ts` file mod.ts (lib/abc/compute-contract-gateway/mod.ts)
- `interface:686284d942a70c576d3538a0ee80e825` interface ComputeContractGateway (lib/abc/compute-contract-gateway/mod.ts)
<!-- SPECD_MANAGED_END -->
