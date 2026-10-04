# Context: lib-market-settlement-free

Repository: `atproto-market`

This context exists so that the atproto-market can settle a bid without money: an operator advertises a free grant endpoint, a bidder writes an accepts.free record and calls that endpoint, and both sides agree on the resulting receipts.free strongRef. Splitting client and server into one package keeps the wire contract (the accepts.free record shape, the /<uri>/<cid> grant path, the receipts.free response body) in a single place, and keeps the bidder from having to know how the operator mints or signs the receipt. FreeGrantError exists so the server half can attach an HTTP status to a rejection and let the transport layer decide how to render it, instead of throwing bare Errors.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
