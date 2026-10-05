# Context: lib-trust-graph-bsky-mutuals

Repository: `atproto-market`

This context exists to pin down the one adapter that lets the trust graph read its vouch signal out of Bluesky's social graph instead of from a bespoke trust store: it fixes the shape of the injection point (BskyMutualsVouchResolverOpts) and the exact semantics of the two VouchResolver methods the factory returns. It is written so the module can be reimplemented or audited without reading the Bluesky client behind getFollows, and so the fail-soft contract is explicit -- a follow source that is slow, rate-limited or down must degrade to "no vouch" rather than abort trust evaluation, with a per-actor warn log as the only evidence left behind.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/trust-graph-bsky-mutuals/mod.ts` file mod.ts (lib/trust-graph-bsky-mutuals/mod.ts)
- `function:34fc226f1ebe43b6ca206f58c9e43a2f` function createBskyMutualsVouchResolver (lib/trust-graph-bsky-mutuals/mod.ts)
- `interface:db90b579bdaef85c0398478a8d9c2578` interface BskyMutualsVouchResolverOpts (lib/trust-graph-bsky-mutuals/mod.ts)
<!-- SPECD_MANAGED_END -->
