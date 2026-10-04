# Context: lib-delegated-trust-badge-blue-keys

Repository: `atproto-market`

This context exists so that delegated trust is transitive through an association record rather than through a direct vouch: an operator that vouches for a DID should also be trusted by that DID's associated parties. It hides the two record shapes and the failure modes behind the DelegatedTrustResolver contract so market-bidder and requester-xrpc can wire it in without knowing the badgeBlueKeys layout.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/delegated-trust-badge-blue-keys/mod.ts` file mod.ts (lib/delegated-trust-badge-blue-keys/mod.ts)
- `function:473e9effb9d9e91445db68e031e329ea` function createBadgeBlueKeysDelegatedTrustResolver (lib/delegated-trust-badge-blue-keys/mod.ts)
- `interface:05ddb65bca17c3188f02d33eda8b8481` interface DelegatedTrustBadgeBlueKeysOpts (lib/delegated-trust-badge-blue-keys/mod.ts)
- `interface:9ba074d070c57eb2e62aa0df62cb0178` interface ListedRecord (lib/delegated-trust-badge-blue-keys/mod.ts)
<!-- SPECD_MANAGED_END -->
