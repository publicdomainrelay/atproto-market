# Context: lib-market-bidder-compute

Repository: `atproto-market`

This context exists so that a compute provider -- a service that can actually spin up a VM -- can take part in the atproto-market bidding protocol without reimplementing the bidder state machine. The bidder dispatcher (lib-abc-market-bidder) wants callback maps keyed by NSID and lxm; the compute provider wants to expose only createBidConfig, injectAcceptBundle, provision and teardown. This module is the adapter between the two, and it also owns the parts of the lifecycle that are specific to a guest VM: refusing to provision when the accept bundle would be incomplete, tracking providerIdPromise and receipt state in the shared activeContracts map, emitting vm.onNetwork through the firehose rather than only through submitEvent, and deciding who is allowed to delete a running VM.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/market-bidder-compute/mod.ts` file mod.ts (lib/market-bidder-compute/mod.ts)
- `function:5ec21894bcf015b3164a07db128adf72` function createVmBidderCallbacks (lib/market-bidder-compute/mod.ts)
- `function:aed470efa09431ae131407c08a4b3c37` function createComputeProviderHooks (lib/market-bidder-compute/mod.ts)
- `interface:462aac25716496197891c11616e37b58` interface VmBidderDeps (lib/market-bidder-compute/mod.ts)
<!-- SPECD_MANAGED_END -->
