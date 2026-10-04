# Context: lib-market-bidder-worker

Repository: `atproto-market`

This context exists to give the market bidder a reusable, dependency-injected implementation of the worker-manifest flow -- bidding on compute-worker RFPs and accepting them into running worker instances -- so that the actual relay, signer, manifest store, runner, resolver and policy engine can be supplied by whatever host process embeds it (Deno worker runtime, CLI, or test harness) rather than being hard-wired. It sits downstream of the shared market bidder ABC layer: it implements the rfpCallbacks/onAccept callback set and the MarketBidderProviderRef registration shape that the ABC bidder loop expects, while adding worker-specific policy, permission and attestation behavior.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/market-bidder-worker/mod.ts` file mod.ts (lib/market-bidder-worker/mod.ts)
- `function:0270e1f8fb0d9ba7755ac84195824cd5` function createComputeProviderDenoWorker (lib/market-bidder-worker/mod.ts)
- `function:35fb7d4b902e6ad5a4f68cf585a580df` function createWorkerBidderCallbacks (lib/market-bidder-worker/mod.ts)
- `function:a5248f76fd7c17fa0d03949153f13023` function createWorkerProviderHooks (lib/market-bidder-worker/mod.ts)
- `interface:61e8bfc9bbbe2ef113ac6821edec06fc` interface WorkerProvider (lib/market-bidder-worker/mod.ts)
- `interface:6588bb229d1d3f4b0851680b4a33303c` interface WorkerBidderDeps (lib/market-bidder-worker/mod.ts)
- `interface:7505aec1e654513bf40d42b074c9622b` interface CreateComputeProviderDenoWorkerOpts (lib/market-bidder-worker/mod.ts)
<!-- SPECD_MANAGED_END -->
