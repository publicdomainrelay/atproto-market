# Context: lib-market-bidder-worker

Repository: `atproto-market`

This context exists to give the market bidder a reusable, dependency-injected implementation of the worker-manifest flow -- bidding on compute-worker RFPs and accepting them into running worker instances -- so that the actual relay, signer, manifest store, runner, resolver and policy engine can be supplied by whatever host process embeds it (Deno worker runtime, CLI, or test harness) rather than being hard-wired. It sits downstream of the shared market bidder ABC layer: it implements the rfpCallbacks/onAccept callback set and the MarketBidderProviderRef registration shape that the ABC bidder loop expects, while adding worker-specific policy, permission and attestation behavior.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
