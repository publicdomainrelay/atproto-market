# Context: lib-common-compute-contract-gateway-common

Repository: `atproto-market`

It exists so that the gateway's ABC interface layer and its XRPC transport implementation agree on one set of identifiers and data shapes without depending on each other: the common package sits at the bottom of the dependency direction and imports nothing (deno.json declares an empty imports map), so both the interface layer and the transport can depend on it. Keeping the NSID strings and the contract state/bid/response types here means a change to the wire contract is made once and both sides see it.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/compute-contract-gateway-common/mod.ts` file mod.ts (lib/common/compute-contract-gateway-common/mod.ts)
- `file:lib/common/compute-contract-gateway-common/nsids.ts` file nsids.ts (lib/common/compute-contract-gateway-common/nsids.ts)
- `file:lib/common/compute-contract-gateway-common/types.ts` file types.ts (lib/common/compute-contract-gateway-common/types.ts)
- `interface:41ae11030dc803c5fa163f76b3aaeeb0` interface GatewayPolicySpec (lib/common/compute-contract-gateway-common/types.ts)
- `interface:54d56e2397fdff2c37bd648570123818` interface CallerIdentity (lib/common/compute-contract-gateway-common/types.ts)
- `interface:79ac11ae8e1a5e878c56818d0ea8f713` interface GatewayBidEntry (lib/common/compute-contract-gateway-common/types.ts)
- `interface:869e37e6b7707634513f48f2312f0215` interface GatewayEventEntry (lib/common/compute-contract-gateway-common/types.ts)
- `interface:869f60653fa984f384ebda98b750465b` interface GatewayTokens (lib/common/compute-contract-gateway-common/types.ts)
- `interface:a92d50db702dea8d4a773cdf785d7086` interface GatewayComputeResponse (lib/common/compute-contract-gateway-common/types.ts)
- `interface:bb907138ab8576908b425812a1323e8a` interface GatewayContractState (lib/common/compute-contract-gateway-common/types.ts)
- `interface:cba9e8e50afd227d1e11556b44027a17` interface ComputeRequestWorkerInput (lib/common/compute-contract-gateway-common/types.ts)
- `interface:e9438a48f8507c2cb4704a23772cbcfd` interface ComputeRequestVMInput (lib/common/compute-contract-gateway-common/types.ts)
<!-- SPECD_MANAGED_END -->
