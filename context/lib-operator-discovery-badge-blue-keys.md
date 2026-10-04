# Context: lib-operator-discovery-badge-blue-keys

Repository: `atproto-market`

Exists so operator (delegated-trust) relationships published as badgeBlueKeys records can be resolved without the discovery logic knowing anything about transports or repositories: the caller injects own-repo and public-repo record listing, and the module supplies the canonical record-shape interpretation and caching. It encodes one deliberate correctness rule -- the canonical shape is {challenge: operator, keyId: associated}, so the inverted legacy shape {challenge: subject, keyId: operator} must not be read as this subject's operator -- which prevents mis-resolving operators as self-operated bidders.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
