# Context: lib-atproto-oauth-helpers

Repository: `atproto-market`

This context exists so the two OAuth clients in the repository — the bidder agent and the requester — can share one DPoP-capable Web Crypto runtime and one pair of session/state stores instead of each vendoring its own. It is a library, not a program: it exposes only functions and one class, has no CLI surface, and is deliberately provider-free apart from the abstract Key and the store/runtime interfaces from @atproto/oauth-client and @atproto/jwk. Its scope is deliberately narrow — key generation and JWS signing, random bytes, hashing, in-memory OAuth state, JSON-file session persistence, client metadata, and the loopback redirect listener needed by an out-of-browser authorization-code flow.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
