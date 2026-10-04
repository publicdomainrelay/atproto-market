# Context: lib-market-bidder

Repository: `atproto-market`

This context exists to hold the bidder-side lifecycle orchestration for the market: the single place where a bidder's identity, allowlist, offering record, policy scope gate and record-discovery watchers are assembled from injectable dependencies. It sits downstream of the market ABC/lexicon/server packages and upstream of any concrete bidder entrypoint, so that provider callbacks, policy executors and trust resolvers can be composed without the factory knowing anything about process startup or transport ownership. Its guest on-network route is also the channel by which a guest reports the iroh ticket the requester will dial, so it must pass that value through verbatim.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/market-bidder/mod.ts` file mod.ts (lib/market-bidder/mod.ts)
- `function:47138519ea324c71993a2053303ad1a3` function beginServe (lib/market-bidder/mod.ts)
- `function:9b2026d2f9671120feac1c6c94133674` function createMarketBidder (lib/market-bidder/mod.ts)
- `function:b19f7ada80292e197cdcc8a29e763b0c` function buildOffering (lib/market-bidder/mod.ts)
- `function:b839dc17d3496456f26776592f7f10d3` function ensureOffering (lib/market-bidder/mod.ts)
- `function:e2d4401ef119cf8107620590e41e0a6c` function shutdown (lib/market-bidder/mod.ts)
- `function:ececd2885fb9130953d79504bd2faf46` function ensureOperatorAllowlist (lib/market-bidder/mod.ts)
- `interface:9a1b67b2492832d7ba6133e09229a106` interface MarketBidderConfig (lib/market-bidder/mod.ts)
- `interface:d09a574816bbdda0321751f00f3c47d6` interface MarketBidder (lib/market-bidder/mod.ts)
<!-- SPECD_MANAGED_END -->
