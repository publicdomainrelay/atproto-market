# Context: lib-trust-graph-bsky-mutuals

Repository: `atproto-market`

This context exists to plug a real social signal — the Bluesky follow graph — into the trust graph's resolver seam without the trust graph knowing anything about Bluesky or about how follows are fetched. The module owns only the interpretation (follows are vouches) and the failure policy (a broken follow lookup must not break trust evaluation), while the caller supplies the transport via getFollows and observation via log. Keeping it as a thin, dependency-injected adapter means the trust graph can be exercised with a fake follow source and the same resolver can later be backed by a cache, a PDS, or an indexer.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/trust-graph-bsky-mutuals/mod.ts` file mod.ts (lib/trust-graph-bsky-mutuals/mod.ts)
- `function:34fc226f1ebe43b6ca206f58c9e43a2f` function createBskyMutualsVouchResolver (lib/trust-graph-bsky-mutuals/mod.ts)
- `interface:db90b579bdaef85c0398478a8d9c2578` interface BskyMutualsVouchResolverOpts (lib/trust-graph-bsky-mutuals/mod.ts)
<!-- SPECD_MANAGED_END -->
