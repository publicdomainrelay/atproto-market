# Context: lib-abc-trust-graph

Repository: `atproto-market`

This context exists so that trust-graph consumers depend on shape rather than on any particular trust source. Concrete implementations live outside this package: createBskyMutualsVouchResolver and createTangledGraphVouchResolver satisfy VouchResolver, createBadgeBlueKeysOperatorDiscovery satisfies OperatorDiscovery, and createBadgeBlueKeysDelegatedTrustResolver satisfies DelegatedTrustResolver, with consumers such as createMarketBidder composing them. Keeping the interfaces here in one comment-free mod.ts lets those implementations and consumers share a single contract without a dependency cycle, and keeps the dependency direction one-way: this package depends only on atproto-market and imports nothing from its implementors.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/abc/trust-graph/mod.ts` file mod.ts (lib/abc/trust-graph/mod.ts)
- `interface:38a3bf6bf78442c7b5b45b6d9bf4808a` interface DelegatedTrustResolver (lib/abc/trust-graph/mod.ts)
- `interface:b2933b2ab4555371bb0e5ec335ba619e` interface VouchResolver (lib/abc/trust-graph/mod.ts)
- `interface:f67ff70cf97f5034470e6129668b747a` interface OperatorDiscovery (lib/abc/trust-graph/mod.ts)
<!-- SPECD_MANAGED_END -->
