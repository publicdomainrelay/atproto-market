# Context: lib-did-plc-generated-core

Repository: `atproto-market`

This context exists because the did:plc API client is generated from an OpenAPI document and needs a self-contained core layer that every generated operation calls into. It centralizes the mechanical parts of HTTP dispatch that the generator does not want to inline per endpoint: resolving auth into a header or cookie, encoding bodies per content type, mapping positional arguments onto path and query parameters, applying OpenAPI serialization styles, building and de-duplicating query strings, and streaming server-sent events with retry. Keeping it as one reviewed unit makes the generated surface auditable and lets the client layer import a single stable set of helpers instead of duplicating serialization logic across generated operation files.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
