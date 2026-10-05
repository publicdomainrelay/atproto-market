# Context: lib-did-key-ingress-proxy

Repository: `atproto-market`

This context exists so a local XRPC app can be reached from outside without owning a routable address: createIngress bundles subscriber registration, per-method service-auth minting, WebSocket target resolution and shutdown behind one IngressRef, letting a dispatcher publish an ingress identity on an ingress proxy host and hand inbound relay requests back into its own fetch handler. The options record keeps the two signing identities separable and leaves TLS, the lazily resolved loopback target and the in-process direct subscription handler as opt-in knobs, so the same factory serves a TLS-terminated public dispatcher and a test process with an in-memory firehose source.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/did-key-ingress-proxy/mod.ts` file mod.ts (lib/did-key-ingress-proxy/mod.ts)
- `function:720938c17d8a919da0fa9510c65cc8d1` function getServiceAuthToken (lib/did-key-ingress-proxy/mod.ts)
- `function:ab0d43e74646836bd86d4b393d2cafa0` function createIngress (lib/did-key-ingress-proxy/mod.ts)
- `interface:da388f002919a2fd08b59e8f65646870` interface CreateIngressOpts (lib/did-key-ingress-proxy/mod.ts)
<!-- SPECD_MANAGED_END -->
