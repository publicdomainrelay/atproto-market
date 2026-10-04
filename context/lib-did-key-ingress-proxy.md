# Context: lib-did-key-ingress-proxy

Repository: `atproto-market`

This context is the ingress side of the relay: it lets an application that already has a fetch handler be reached at a public did:web host through the xrpc-relay ingress proxy without the app managing transport, TLS, or service-auth itself. It exists so that a local or in-process service (bidder, PDS agent, gateway target) can declare a small set of options and get back an IngressRef it can advertise, with the WebSocket firehose path either proxied to a local TCP target or served directly in-process. It is no longer the default guest SSH transport: the default guest SSH is the dumbpipe/iroh transport, and this package keeps its XRPC ingress role (submitBid, submitEvent, associateConfirm and the requester/bidder market plane) plus the legacy tunnel/fedproxy-ssh relay tunnel, which its callers may still select.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/did-key-ingress-proxy/mod.ts` file mod.ts (lib/did-key-ingress-proxy/mod.ts)
- `function:720938c17d8a919da0fa9510c65cc8d1` function getServiceAuthToken (lib/did-key-ingress-proxy/mod.ts)
- `function:ab0d43e74646836bd86d4b393d2cafa0` function createIngress (lib/did-key-ingress-proxy/mod.ts)
- `interface:da388f002919a2fd08b59e8f65646870` interface CreateIngressOpts (lib/did-key-ingress-proxy/mod.ts)
<!-- SPECD_MANAGED_END -->
