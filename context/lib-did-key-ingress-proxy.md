# Context: lib-did-key-ingress-proxy

Repository: `atproto-market`

This context is the ingress side of the relay: it lets an application that already has a fetch handler be reached at a public did:web host through the xrpc-relay ingress proxy without the app managing transport, TLS, or service-auth itself. It exists so that a local or in-process service (bidder, PDS agent, gateway target) can declare a small set of options and get back an IngressRef it can advertise, with the WebSocket firehose path either proxied to a local TCP target or served directly in-process. It no longer carries the guest SSH transport: the guest's SSH is the dumbpipe/iroh transport, and this package keeps only its XRPC ingress role (submitBid, submitEvent, associateConfirm and the requester/bidder market plane).

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
