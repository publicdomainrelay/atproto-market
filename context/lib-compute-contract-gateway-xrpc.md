# Context: lib-compute-contract-gateway-xrpc

Repository: `atproto-market`

It exists to expose the abstract ComputeContractGateway port over XRPC transport, so a host process can hand it a logger and a serve handle and get a running gateway identity plus VM/worker provisioning without knowing anything about requester PDS, PLC registration, or SSH session plumbing. The dynamic imports keep the requester and cloud-init packages out of the module graph until a gateway actually starts, and the option record is the single configuration surface for identity, ingress hostnames, storage location, and relays.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/compute-contract-gateway-xrpc/mod.ts` file mod.ts (lib/compute-contract-gateway-xrpc/mod.ts)
- `function:03370a182fd0653c2e57c9c946423ce7` function createComputeContractGateway (lib/compute-contract-gateway-xrpc/mod.ts)
- `interface:ecee421eb7bb2708411146ff260c58b2` interface GatewayOptions (lib/compute-contract-gateway-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
