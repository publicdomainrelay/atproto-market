# Context: lib-hono-factory-secrets-oidc

Repository: `atproto-market`

This context pins down what the hono-factory-secrets-oidc package guarantees to its callers: the shape of the injection options, the lenient bearer-parsing contract, and the exact HTTP behaviour of the single GET route it registers, so that consumers such as guest-capability-secrets can swap in their own authorizer and secret source without the factory owning any atproto service-auth policy. It exists to keep the factory layer a thin transport adapter, mapping authorization outcomes onto JSON responses and log events rather than resolving tokens itself.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/hono-factory-secrets-oidc/mod.ts` file mod.ts (lib/hono-factory-secrets-oidc/mod.ts)
- `function:9217ff283324c4a352117c8801e75b4a` function createSecretsApp (lib/hono-factory-secrets-oidc/mod.ts)
- `function:d93e06a7dd7538ef41434823de865c6e` function extractBearer (lib/hono-factory-secrets-oidc/mod.ts)
- `interface:7e777067ac67ae39e4b4da5c05ea6802` interface SecretsFactoryOptions (lib/hono-factory-secrets-oidc/mod.ts)
<!-- SPECD_MANAGED_END -->
