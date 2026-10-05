# Context: lib-guest-capability-secrets

Repository: `atproto-market`

This context exists so a host can hand a guest a working, authorizer-protected secrets endpoint without knowing anything about ingress relays, OIDC verification or Hono routing. It is the composition seam of the secrets feature: it binds the abstract GuestCapability lifecycle (prepare, onContract, onRevoke, dispose) to the concrete secrets pieces that live in sibling packages, so that lib/secrets-oidc supplies the authorizer, lib/common/secrets-common supplies the entry and RBAC record shapes, lib/did-key-ingress-proxy supplies the public relay, lib/hono-factory-secrets-oidc supplies the app, and lib/abc/guest-capability supplies the contract it is held to.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/guest-capability-secrets/mod.ts` file mod.ts (lib/guest-capability-secrets/mod.ts)
- `function:0d24cd5f66964dd094175db073cc3baf` function createSecretsCapability (lib/guest-capability-secrets/mod.ts)
- `interface:0c769a67d709c48b40d3f1032540989a` interface CreateSecretsCapabilityOpts (lib/guest-capability-secrets/mod.ts)
<!-- SPECD_MANAGED_END -->
