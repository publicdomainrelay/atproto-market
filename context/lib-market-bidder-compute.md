# Context: lib-market-bidder-compute

Repository: `atproto-market`

This context exists so that the compute VM market can be served by a market bidder without the generic bidder package knowing anything about VM provisioning. It is the adapter layer: it turns a ComputeProvider into the MarketBidderProviderRef the bidder host expects, supplying serviceId and appliesTo for routing and delegating setup/teardown to the provider, while the callbacks implement the VM-specific RFP, accept, and event semantics. It sits downstream of the atproto-market bidder abstractions and is what concrete compute providers plug into. It also turns the guest's iroh endpoint id, read back from the provider, into the contract event the requester uses as its SSH transport target.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
