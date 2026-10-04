# Context: lib-market-bidder-agent

Repository: `atproto-market`

This context exists so the market bidder agent can run against a PDS using an OAuth client session rather than a plain credential login, while still satisfying the `AtprotoAgentLike` contract the rest of the market stack consumes. It isolates the DPoP/refresh plumbing that the upstream `@atproto/oauth-client` keeps private, and it adapts the generic `ATProto` helper surface onto that agent by supplying TID generation, strong-ref-returning create/update helpers, attestation signing, and service-proxied `callService` requests.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
