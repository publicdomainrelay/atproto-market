# Context: lib-abc-market-bidder

Repository: `atproto-market`

This context exists so the bidder data shapes live in one place instead of being re-declared per implementation. Three implementations — lib/market-bidder, lib/market-bidder-compute and lib/market-bidder-worker — depend on the same guest-contract identity, active-contract state, contract lifecycle event, callback injection set, callback factory dependencies, policy execution options and provider reference. Keeping them as TypeScript interfaces rather than classes means a bidder can depend on the contract with no runtime coupling, and every consumer switches on the same closed set of contract event types and the same required identity fields rather than inferring state or reaching into bidder internals.

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
