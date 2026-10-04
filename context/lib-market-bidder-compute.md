# Context: lib-market-bidder-compute

Repository: `atproto-market`

This context exists so that the compute VM market can be served by a market bidder without the generic bidder package knowing anything about VM provisioning. It is the adapter layer: it turns a ComputeProvider into the MarketBidderProviderRef the bidder host expects, supplying serviceId and appliesTo for routing and delegating setup/teardown to the provider, while the callbacks implement the VM-specific RFP, accept, and event semantics. It sits downstream of the atproto-market bidder abstractions and is what concrete compute providers plug into.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/market-bidder-compute/mod.ts` file mod.ts (lib/market-bidder-compute/mod.ts)
- `function:5ec21894bcf015b3164a07db128adf72` function createVmBidderCallbacks (lib/market-bidder-compute/mod.ts)
- `function:aed470efa09431ae131407c08a4b3c37` function createComputeProviderHooks (lib/market-bidder-compute/mod.ts)
- `interface:462aac25716496197891c11616e37b58` interface VmBidderDeps (lib/market-bidder-compute/mod.ts)
<!-- SPECD_MANAGED_END -->
