# Context: lib-common-market-lexicons-com-fedproxy-temp-xrpc

Repository: `atproto-market`

This context exists so the relay's wire contract — nonce issuance, the signed registration record, and the WebSocket subscription frames — is captured as inspectable, code-generated Lexicon schemas that both the relay and its subscribers share. The types are the machine-readable form of the handshake: a caller proves custody of a did:key by having the relay issue a nonce, signing it, and presenting the resulting registration when opening the subscribe socket, which the relay then binds to that key for the connection's lifetime. Reading this context tells you the exact payload shapes, error names, and frame fields that any implementation on either side of the relay must match.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
