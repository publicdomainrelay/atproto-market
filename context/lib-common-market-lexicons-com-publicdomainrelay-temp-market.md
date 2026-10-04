# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-market

Repository: `atproto-market`

This context exists so a consumer of the market lexicon package can call and construct the market protocol's records and XRPC methods without reading the wire-format JSON Lexicons: the generated bindings give typed `$build`/`$validate`/`$parse` helpers for every record, typed `$Input`/`$Output` payloads for every procedure, typed query params and results for `listBidders`, and a shared NSID constant (`$nsid`/`$lxm`) per method for service-proxying via the `atproto-proxy` header. It is the single source of truth for the market registry, RFP, bid, accept, receipt and event vocabulary, and it pins the cross-lexicon dependencies (strongRef, attested signatures, payload variant subdirectories) that those record schemas rely on.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/accept.defs.ts` file accept.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/accept.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/accept.ts` file accept.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/accept.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/accepts.ts` file accepts.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/accepts.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/badgeBlueKey.defs.ts` file badgeBlueKey.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/badgeBlueKey.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/badgeBlueKey.ts` file badgeBlueKey.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/badgeBlueKey.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bid.defs.ts` file bid.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bid.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bid.ts` file bid.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bid.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderAssociation.defs.ts` file bidderAssociation.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderAssociation.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderAssociation.ts` file bidderAssociation.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderAssociation.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderDiscovery.defs.ts` file bidderDiscovery.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderDiscovery.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderDiscovery.ts` file bidderDiscovery.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderDiscovery.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderRegistration.defs.ts` file bidderRegistration.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderRegistration.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderRegistration.ts` file bidderRegistration.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bidderRegistration.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids.ts` file bids.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/event.defs.ts` file event.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/event.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/event.ts` file event.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/event.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/listBidders.defs.ts` file listBidders.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/listBidders.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/listBidders.ts` file listBidders.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/listBidders.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/offering.defs.ts` file offering.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/offering.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/offering.ts` file offering.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/offering.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies.ts` file policies.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/receipt.defs.ts` file receipt.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/receipt.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/receipt.ts` file receipt.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/receipt.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/receipts.ts` file receipts.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/receipts.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/registerBidder.defs.ts` file registerBidder.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/registerBidder.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/registerBidder.ts` file registerBidder.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/registerBidder.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/relays.defs.ts` file relays.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/relays.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/relays.ts` file relays.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/relays.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/rfp.defs.ts` file rfp.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/rfp.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/rfp.ts` file rfp.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/rfp.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/submitAccept.defs.ts` file submitAccept.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/submitAccept.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/submitAccept.ts` file submitAccept.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/submitAccept.ts)

_11 more reference(s) indexed but not listed here to stay inside the 1500-token budget._
<!-- SPECD_MANAGED_END -->
