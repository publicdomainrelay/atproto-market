# Context: lib-compute-contract-gateway-xrpc

Repository: `atproto-market`

This context exists to give consumers of the compute-contract gateway a transport-agnostic implementation that speaks the ComputeContractGateway abstraction on top of the requester-XRPC package, so that a Hono/gateway front end (and its integration tests) can create a gateway, start it, and issue VM or worker compute requests without knowing how the underlying requester PDS, SSH session provider, fedproxy ingress naming or worker manifest publication work. It centralizes option defaulting, lazy PDS lifecycle, and the mapping from runComputeContract results to GatewayComputeResponse.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/compute-contract-gateway-xrpc/mod.ts` file mod.ts (lib/compute-contract-gateway-xrpc/mod.ts)
- `function:03370a182fd0653c2e57c9c946423ce7` function createComputeContractGateway (lib/compute-contract-gateway-xrpc/mod.ts)
- `interface:ecee421eb7bb2708411146ff260c58b2` interface GatewayOptions (lib/compute-contract-gateway-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
