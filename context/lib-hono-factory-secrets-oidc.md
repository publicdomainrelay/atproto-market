# Context: lib-hono-factory-secrets-oidc

Repository: `atproto-market`

This context exists to separate the transport concern of serving secrets (route registration, bearer extraction, JSON response shape, 401 error shape, logging) from the policy concern of deciding who may read them. By accepting a SecretsAuthorizer, a getSecrets callback, an optional route and an optional logger through SecretsFactoryOptions, the factory lets a caller mount the same secrets endpoint in different hosts and test it without real service-auth wiring, whereas the authorization implementation and the secret entry shape live in their own packages.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/hono-factory-secrets-oidc/mod.ts` file mod.ts (lib/hono-factory-secrets-oidc/mod.ts)
- `function:9217ff283324c4a352117c8801e75b4a` function createSecretsApp (lib/hono-factory-secrets-oidc/mod.ts)
- `function:d93e06a7dd7538ef41434823de865c6e` function extractBearer (lib/hono-factory-secrets-oidc/mod.ts)
- `interface:7e777067ac67ae39e4b4da5c05ea6802` interface SecretsFactoryOptions (lib/hono-factory-secrets-oidc/mod.ts)
<!-- SPECD_MANAGED_END -->
