# Context: lib-trust-graph-tangled-graph

Repository: `atproto-market`

This context exists so the generic trust graph can resolve web-of-trust vouches from records stored in a repository without knowing anything about the record layout, the transport, or how the records are fetched. Callers (the market bidder and the requester XRPC paths) supply a repo-scoped listRecords function, optionally a logger, and receive a VouchResolver they can hand to trust-graph evaluation. The module is deliberately transport-agnostic: it never performs I/O itself, and it treats lookup failure as "no vouches" rather than an error so a transient repository outage degrades trust rather than breaking the caller.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
