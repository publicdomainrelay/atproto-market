# Context: lib-common-compute-contract-gateway-common

Repository: `atproto-market`

It exists so that the gateway's ABC interface layer and its XRPC transport implementation agree on one set of identifiers and data shapes without depending on each other: the common package sits at the bottom of the dependency direction and imports nothing (deno.json declares an empty imports map), so both the interface layer and the transport can depend on it. Keeping the NSID strings and the contract state/bid/response types here means a change to the wire contract is made once and both sides see it.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
