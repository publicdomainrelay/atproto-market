# Context: lib-guest-capability-secrets

Repository: `atproto-market`

This context exists to specify the guest-side secrets capability: the unit that exposes a set of SecretEntry values to a sandboxed guest over a per-contract OIDC-authorized HTTPS ingress, and that ties that exposure to the lifecycle of the capability grant. It exists so the host can hand a guest an addressable secrets endpoint (URL, route, audience, accept path) during prepare, grant scoped access on contract, and guarantee teardown on revoke or dispose, without the caller having to know about the keypair, relay, serve or authorizer wiring.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
