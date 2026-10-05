# Context: lib-market-bidder-worker

Repository: `atproto-market`

This context exists to specify the bidder half of the compute-worker market: the module that turns an incoming worker-manifest RFP into a signed bid, and an accepted bid into a running worker instance plus an attested receipt and a tracked active contract. It pins down how policy evaluation, worker permission checks, callback routing, provenance attestation and provider registration must behave so a host can plug a WorkerProvider in and get a wired MarketBidderProviderRef without reimplementing any of that logic.

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
