# Context: lib-utils-attestation-key

Repository: `atproto-market`

The context exists so that every part of atproto-market that needs to sign with the operator's secp256k1 attestation key has one shared, predictable way to obtain it: give it the JWK path and get back the scalar in hex. It hides both the first-run bootstrap (generating and persisting a key when none exists) and the encoding differences between the on-disk JWK (base64url in d) and the form signers consume (lowercase hex), so callers never hand-roll key material handling or accidentally clobber an existing operator key. Pinning validation to kty/crv/d and swallowing only NotFound as a trigger for creation keeps permission and corruption failures loud instead of silently rotating the identity.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/utils-attestation-key/mod.ts` file mod.ts (lib/utils-attestation-key/mod.ts)
- `function:31d6822de041bbe285c919680dd5898d` function loadOrCreateAttestationKeyHex (lib/utils-attestation-key/mod.ts)
<!-- SPECD_MANAGED_END -->
