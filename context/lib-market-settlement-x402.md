# Context: lib-market-settlement-x402

Repository: `atproto-market`

This context exists to encapsulate the x402 payment settlement flow so the rest of the market can treat payment as a signed-record exchange rather than an ad-hoc HTTP call: the bidder-side client produces accepts.x402 plus a receipt URL fetch, and the service-side helpers turn the request path into the records needed to mint or verify the receipts.x402 proof. It is a self-contained package whose only outward surface is mod.ts, keeping the egress safety check, timeout defaults and error-status conventions in one place.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
