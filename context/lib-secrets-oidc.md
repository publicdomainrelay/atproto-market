# Context: lib-secrets-oidc

Repository: `atproto-market`

This context exists so the requester side can validate workload-identity tokens minted by an OIDC provider for guests without itself being an OIDC issuer: it verifies against the provider's published JWKS rather than oidc-issuer-hono's OIDCToken.validate (which would require configureOidc() and generate an unused signing key), and it turns a verified subject into an RBAC decision for a specific request path and method.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
