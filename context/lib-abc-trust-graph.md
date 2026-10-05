# Context: lib-abc-trust-graph

Repository: `atproto-market`

This context exists so that every trust source in the repository can be consumed through one small, uniform set of port interfaces rather than each consumer binding directly to a particular graph, vouch store or badge service. It fixes the shape of the questions the market bidder, the bidder-side delegated-trust resolver and other consumers may ask about trust: which DIDs a DID vouches for, whether a given vouch exists, which operators run an account, and which DIDs a self DID trusts by delegation. Because the layer holds only declarations, concrete sources stay swappable behind it and the dependency direction runs one way, from implementations and consumers into this package.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/abc/trust-graph/mod.ts` file mod.ts (lib/abc/trust-graph/mod.ts)
- `interface:38a3bf6bf78442c7b5b45b6d9bf4808a` interface DelegatedTrustResolver (lib/abc/trust-graph/mod.ts)
- `interface:b2933b2ab4555371bb0e5ec335ba619e` interface VouchResolver (lib/abc/trust-graph/mod.ts)
- `interface:f67ff70cf97f5034470e6129668b747a` interface OperatorDiscovery (lib/abc/trust-graph/mod.ts)
<!-- SPECD_MANAGED_END -->
