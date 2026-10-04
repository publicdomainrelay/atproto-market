# Context: lib-common-market-lexicons

Repository: `atproto-market`

This context exists so every other package in atproto-market can name the same lexicons through one import surface instead of hard-coding NSID strings, and so the @atproto/lex-generated TypeScript bindings for those lexicons are vendored and exported from a single place. Consumers import the generated value/definition objects from the com and network barrels for encoding, decoding and lexicon validation, while server, bidder, requester and CLI code imports the NSID constants from nsids.ts when building at:// URIs, collection names, service-id lookups and $type tags. Keeping the NSID constants hand-written and separate from the generated bindings lets the identifiers be added or aliased without regenerating lexicons, and the _LXM aliases preserve older call sites that used the LXM naming.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com.ts` file com.ts (lib/common/market-lexicons/com.ts)
- `file:lib/common/market-lexicons/mod.ts` file mod.ts (lib/common/market-lexicons/mod.ts)
- `file:lib/common/market-lexicons/network.ts` file network.ts (lib/common/market-lexicons/network.ts)
- `file:lib/common/market-lexicons/nsids.ts` file nsids.ts (lib/common/market-lexicons/nsids.ts)
<!-- SPECD_MANAGED_END -->
