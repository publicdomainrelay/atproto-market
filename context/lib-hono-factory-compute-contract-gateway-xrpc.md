# Context: lib-hono-factory-compute-contract-gateway-xrpc

Repository: `atproto-market`

This context exists so a process can stand up an atproto-speaking HTTP surface in front of any ComputeContractGateway implementation without hand-writing the transport each time. It fixes the wire contract of the compute gateway: which XRPC NSIDs are served, what the well-known did:web document advertises, how inter-service service-auth tokens are verified per method, and how gateway results and errors map onto HTTP status codes. Callers supply only a gateway implementation, a hostname, an IdResolver and an optional audience DID list, and receive a ready Hono app.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
