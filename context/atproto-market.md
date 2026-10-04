# Context: atproto-market

Repository: `atproto-market`

This context exists so that the marketplace packages do not each re-implement identity, signing, PLC and record-write plumbing. createATProto centralizes how the repo obtains an agent bound to a DID and signer and how records are created and updated against arbitrary collections, while createMarketClient centralizes construction of the market XRPC client over a service. Downstream packages (bidders, gateways, market settlement, trust graph, requester) depend on these two factories rather than on raw agents or raw XRPC services.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
