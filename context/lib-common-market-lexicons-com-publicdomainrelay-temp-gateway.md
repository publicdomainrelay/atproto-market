# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-gateway

Repository: `atproto-market`

The context exists so that gateway clients and servers share one machine-checked definition of the gateway XRPC surface instead of hand-writing request and response shapes. Each NSID is declared once with its parameter, input, output and error-name schemas, and TypeScript types are derived from those schemas with `l.InferOutput` / `l.InferPayload` / `l.InferPayloadBody`, so callers get typed payloads and the gateway gets runtime validation from the same source. The `.ts` shim files exist so the package can be imported either at the definition level (`./deleteCompute.defs.ts`) or as a default-exported `main` handler value, which is what a server registration or a generated client consumes.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
