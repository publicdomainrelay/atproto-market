# Context: lib-hono-factory-did-plc-directory

Repository: `atproto-market`

This context exists so the PLC directory's HTTP surface can be constructed by a caller and mounted into a larger atproto service, while the audit-relevant rules of a PLC operation log (structure, CID, signature, prev chain, rotation-key authority, and log-to-DID-document resolution) live in small, separately testable functions. It separates the transport layer (factory + handlers) from the validation and resolution logic so that a service embedding the directory supplies its own PlcStore, version string and signature verifier, and gets back a standard routes set plus the store it was given.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
