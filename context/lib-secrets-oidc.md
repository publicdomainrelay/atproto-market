# Context: lib-secrets-oidc

Repository: `atproto-market`

This context exists so the requester side can validate workload-identity tokens minted by an OIDC provider for guests without itself being an OIDC issuer: it verifies against the provider's published JWKS rather than oidc-issuer-hono's OIDCToken.validate (which would require configureOidc() and generate an unused signing key), and it turns a verified subject into an RBAC decision for a specific request path and method.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/secrets-oidc/mod.ts` file mod.ts (lib/secrets-oidc/mod.ts)
- `function:5f4aad08662e2d2094582832d7b08310` function createSecretsAuthorizer (lib/secrets-oidc/mod.ts)
- `function:d7d076f635e975de9b23dac9be2ef9e7` function getJwks (lib/secrets-oidc/mod.ts)
- `interface:05b597fb30f58132a5be06a41f6fba0d` interface SecretsAuthorizer (lib/secrets-oidc/mod.ts)
- `interface:bf1e05cf2e07ed74d51e51e2e63afc40` interface SecretsGrant (lib/secrets-oidc/mod.ts)
- `interface:d3e1a8191afeaac9625fd120d563275c` interface AuthorizedRequest (lib/secrets-oidc/mod.ts)
- `interface:dc48a990f6ac35504ef07082ebff16e1` interface CreateSecretsAuthorizerOpts (lib/secrets-oidc/mod.ts)
<!-- SPECD_MANAGED_END -->
