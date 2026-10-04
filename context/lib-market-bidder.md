# Context: lib-market-bidder

Repository: `atproto-market`

This context exists to hold the bidder-side lifecycle orchestration for the market: the single place where a bidder's identity, allowlist, offering record, policy scope gate and record-discovery watchers are assembled from injectable dependencies. It sits downstream of the market ABC/lexicon/server packages and upstream of any concrete bidder entrypoint, so that provider callbacks, policy executors and trust resolvers can be composed without the factory knowing anything about process startup or transport ownership. Its guest on-network route is also the channel by which a guest reports the iroh ticket the requester will dial, so it must pass that value through verbatim.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
