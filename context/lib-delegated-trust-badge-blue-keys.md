# Context: lib-delegated-trust-badge-blue-keys

Repository: `atproto-market`

This context exists to pin down the delegated-trust adapter that lets a market bidder or requester (lib/market-bidder, lib/requester-xrpc) resolve which DIDs are trusted on a subject's behalf when the subject is merely an associate of an operator. It sits between the ABC trust graph's DelegatedTrustResolver contract and the badgeBlueKeys lexicon records, translating association records into operator DIDs whose vouch sets extend the subject's own. The module is deliberately transport-free: the vouch source and the record listing arrive as injected capabilities, so the resolver can be composed with any PDS or repository implementation.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/delegated-trust-badge-blue-keys/mod.ts` file mod.ts (lib/delegated-trust-badge-blue-keys/mod.ts)
- `function:473e9effb9d9e91445db68e031e329ea` function createBadgeBlueKeysDelegatedTrustResolver (lib/delegated-trust-badge-blue-keys/mod.ts)
- `interface:05ddb65bca17c3188f02d33eda8b8481` interface DelegatedTrustBadgeBlueKeysOpts (lib/delegated-trust-badge-blue-keys/mod.ts)
- `interface:9ba074d070c57eb2e62aa0df62cb0178` interface ListedRecord (lib/delegated-trust-badge-blue-keys/mod.ts)
<!-- SPECD_MANAGED_END -->
