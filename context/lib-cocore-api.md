# Context: lib-cocore-api

Repository: `atproto-market`

This context exists so callers elsewhere in atproto-market can manage cocore API keys without hand-rolling XRPC plumbing or service-auth signing. It isolates the cocore-specific details — the default AppView host, the did:web audience derivation, the three api-key NSIDs, and the error convention — behind a small typed surface, and keeps token minting injectable so the caller supplies getServiceAuth rather than the module owning credentials.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
