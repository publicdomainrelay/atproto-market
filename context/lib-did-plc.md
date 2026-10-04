# Context: lib-did-plc

Repository: `atproto-market`

This context exists so the rest of atproto-market has one typed, runtime-portable way to talk to the PLC directory and to reason about did:plc identities: resolving DID documents and operation logs, submitting signed operations, deriving a new did:plc from a genesis op, and turning a DID document into the verification keys that attestation code needs. It isolates the awkward parts of the official OpenAPI client (Deno/`Request` incompatibility, JSON Lines export responses, status-code-to-error mapping) behind a small stable surface so callers such as the attestation/verification code, PDS setup, and CLI tooling never touch the generated SDK directly.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
