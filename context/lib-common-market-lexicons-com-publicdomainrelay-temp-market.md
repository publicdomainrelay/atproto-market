# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-market

Repository: `atproto-market`

This context exists so a consumer of the market lexicon package can call and construct the market protocol's records and XRPC methods without reading the wire-format JSON Lexicons: the generated bindings give typed `$build`/`$validate`/`$parse` helpers for every record, typed `$Input`/`$Output` payloads for every procedure, typed query params and results for `listBidders`, and a shared NSID constant (`$nsid`/`$lxm`) per method for service-proxying via the `atproto-proxy` header. It is the single source of truth for the market registry, RFP, bid, accept, receipt and event vocabulary, and it pins the cross-lexicon dependencies (strongRef, attested signatures, payload variant subdirectories) that those record schemas rely on.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
