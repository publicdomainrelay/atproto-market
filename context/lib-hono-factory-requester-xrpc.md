# Context: lib-hono-factory-requester-xrpc

Repository: `atproto-market`

This context exists so a requester process can mount the inbound submitBid endpoint without hand-writing the handler wiring each time: it bridges the market-atproto handler implementation (createSubmitBidHandler, createRecordResolver) to whatever Hono app the caller already runs, keeping the transport-specific registration in one small factory that the CLI entrypoint calls. It isolates the defaulting rules (service IDs, audience DIDs, hostname extraction, logger shape) so every requester applies the same auth audience and routing conventions.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
