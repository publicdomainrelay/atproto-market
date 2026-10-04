# Context: lib-did-plc-generated

Repository: `atproto-market`

This context is the generated HTTP client layer for the PLC directory API, produced from the service's OpenAPI description rather than written by hand. It exists so the rest of atproto-market - principally lib/did-plc/client.ts and its mod.ts barrel - can resolve DID documents and read or append PLC operations through typed request/response shapes without re-deriving the wire format, and so the wire contract can be regenerated when the PLC directory service changes. It depends on sc.atproto-market and is upstream of itself, meaning it is the leaf of the dependency graph and nothing inside it should depend on higher layers.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
