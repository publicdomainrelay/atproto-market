# Context: lib-hono-factory-secrets-oidc

Repository: `atproto-market`

This context exists to separate the transport concern of serving secrets (route registration, bearer extraction, JSON response shape, 401 error shape, logging) from the policy concern of deciding who may read them. By accepting a SecretsAuthorizer, a getSecrets callback, an optional route and an optional logger through SecretsFactoryOptions, the factory lets a caller mount the same secrets endpoint in different hosts and test it without real service-auth wiring, whereas the authorization implementation and the secret entry shape live in their own packages.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
