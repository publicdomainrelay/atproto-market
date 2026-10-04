# Context: lib-abc-market-bidder

Repository: `atproto-market`

This context exists to fix the shared vocabulary of the market bidder before any transport or runtime is chosen. The ABC layering keeps the interface here, in lib/abc, so that the compute and worker bidder implementations can import the same ActiveContract, ContractEvent and CallbackSet without depending on each other, and so a host can supply its own RFP callbacks, accept callback and event callbacks without the bidder knowing how the market is spoken to. Every type here is data or a callback slot: no behavior, no transport, no environment access, which is what lets the same shapes be reused across bidder runtimes.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/abc/market-bidder/mod.ts` file mod.ts (lib/abc/market-bidder/mod.ts)
- `interface:2c4596abe13b14dd4988fbb0b94602fc` interface CallbackFactoryDeps (lib/abc/market-bidder/mod.ts)
- `interface:5609df4ae617cdffc9fce7738e5e75be` interface CallbackSet (lib/abc/market-bidder/mod.ts)
- `interface:647384108ca521aa1b24b60fbbf8e53a` interface MarketBidderProviderRef (lib/abc/market-bidder/mod.ts)
- `interface:6ec00215165ec55bc47d1c24c39bb995` interface PolicyExecOptions (lib/abc/market-bidder/mod.ts)
- `interface:7caf4582318b20bae5d3f32ec19f2169` interface ContractEvent (lib/abc/market-bidder/mod.ts)
- `interface:92e6f8d9226ce7be70eb5107af0d0b2d` interface ActiveContract (lib/abc/market-bidder/mod.ts)
- `interface:9e5d28d053bf9ead50572ed7deb21bda` interface GuestContractEntry (lib/abc/market-bidder/mod.ts)
<!-- SPECD_MANAGED_END -->
