# Context: lib-trust-graph-tangled-graph

Repository: `atproto-market`

This context exists so the generic trust graph can resolve web-of-trust vouches from records stored in a repository without knowing anything about the record layout, the transport, or how the records are fetched. Callers (the market bidder and the requester XRPC paths) supply a repo-scoped listRecords function, optionally a logger, and receive a VouchResolver they can hand to trust-graph evaluation. The module is deliberately transport-agnostic: it never performs I/O itself, and it treats lookup failure as "no vouches" rather than an error so a transient repository outage degrades trust rather than breaking the caller.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/trust-graph-tangled-graph/mod.ts` file mod.ts (lib/trust-graph-tangled-graph/mod.ts)
- `function:c548791fdd9c126249e41e29c7d44c44` function createTangledGraphVouchResolver (lib/trust-graph-tangled-graph/mod.ts)
- `interface:96c0ea570aaadab563b357e40f8b2254` interface TangledGraphVouchResolverOpts (lib/trust-graph-tangled-graph/mod.ts)
- `interface:f3b2726e5ba78287474a3382ccf87cc2` interface ListedRecord (lib/trust-graph-tangled-graph/mod.ts)
<!-- SPECD_MANAGED_END -->
