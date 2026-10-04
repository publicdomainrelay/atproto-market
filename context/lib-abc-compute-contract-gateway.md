# Context: lib-abc-compute-contract-gateway

Repository: `atproto-market`

This context exists to fix the contract that separates compute provisioning consumers from the gateway transport that actually talks to a PDS and a VM provider. By naming ComputeContractGateway as a standalone interface in the abc layer, callers in the market can request a VM or an ephemeral or persistent worker and delete an existing compute receipt without importing the xrpc implementation or its dependencies on requester PDS wiring, SSH session providers and cloud-init helpers. The interface also pins the lifecycle obligation that a gateway must be started before use and torn down afterwards, and pins the shared shapes (CallerIdentity, ComputeRequestVMInput, ComputeRequestWorkerInput, GatewayComputeResponse) that cross that boundary, so a second transport or a test double can be substituted without changing call sites.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/abc/compute-contract-gateway/mod.ts` file mod.ts (lib/abc/compute-contract-gateway/mod.ts)
- `interface:686284d942a70c576d3538a0ee80e825` interface ComputeContractGateway (lib/abc/compute-contract-gateway/mod.ts)
<!-- SPECD_MANAGED_END -->
