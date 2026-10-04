# Context: lib-utils-attestation-key

Repository: `atproto-market`

This context exists so that processes needing to sign AT Protocol attestations have one idempotent, deterministic place to obtain their signing key material: point it at a JWK path and it either loads the existing key or mints and persists a new one. It deliberately refuses to overwrite a file that is not a secp256k1 private JWK, guarding against clobbering an unrelated or misconfigured key store, and it returns the raw hex scalar so callers can feed it into the attestation layer without re-parsing the JWK.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
