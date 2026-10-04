# Context: lib-common-market-lexicons-com-fedproxy

Repository: `atproto-market`

This context exists so the fedproxy tunnel and relay protocol has first-class, typed lexicon bindings inside the shared market-lexicons library rather than ad-hoc JSON. The two records let a requester publish an RBAC policy and register SSH public keys for a named fedproxy service, and the `temp.ts` namespace exposes the XRPC handshake (`getRegistrationNonce`, `registration`, `subscribe`) used to bind a subscriber's did:key to a relay channel. It is a leaf, self-contained export surface: it depends only on `@atproto/lex` and the attested-signature defs, and other packages import it rather than redefining the schemas.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/fedproxy/rbac.defs.ts` file rbac.defs.ts (lib/common/market-lexicons/com/fedproxy/rbac.defs.ts)
- `file:lib/common/market-lexicons/com/fedproxy/rbac.ts` file rbac.ts (lib/common/market-lexicons/com/fedproxy/rbac.ts)
- `file:lib/common/market-lexicons/com/fedproxy/sshPublicKey.defs.ts` file sshPublicKey.defs.ts (lib/common/market-lexicons/com/fedproxy/sshPublicKey.defs.ts)
- `file:lib/common/market-lexicons/com/fedproxy/sshPublicKey.ts` file sshPublicKey.ts (lib/common/market-lexicons/com/fedproxy/sshPublicKey.ts)
- `file:lib/common/market-lexicons/com/fedproxy/temp.ts` file temp.ts (lib/common/market-lexicons/com/fedproxy/temp.ts)
<!-- SPECD_MANAGED_END -->
