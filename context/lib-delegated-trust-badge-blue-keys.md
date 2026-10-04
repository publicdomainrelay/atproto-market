# Context: lib-delegated-trust-badge-blue-keys

Repository: `atproto-market`

This context exists so that delegated trust is transitive through an association record rather than through a direct vouch: an operator that vouches for a DID should also be trusted by that DID's associated parties. It hides the two record shapes and the failure modes behind the DelegatedTrustResolver contract so market-bidder and requester-xrpc can wire it in without knowing the badgeBlueKeys layout.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
