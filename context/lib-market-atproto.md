# Context: lib-market-atproto

Repository: `atproto-market`

This context exists to give the market app and the market service one tested, reusable implementation of the market's signed-record and inter-service wire protocol, so neither side re-implements record signing, remote proofs, service-auth verification or the accept-to-rfp contract walk. It is the boundary module: everything about how a bid, RFP, accept or settlement event is shaped on the wire, authenticated, signed and validated lives here, and callers configure the transport, identity resolver and signer rather than the library hard-coding them.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
