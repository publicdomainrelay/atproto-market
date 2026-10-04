# Context: lib-abc-requester

Repository: `atproto-market`

This context exists so bid collection, winner selection and the requester option surface can change implementation without changing the modules that consume them. It pins the exact shape of a CollectedBid, the deterministic bookkeeping rules of BidCollector (uri dedupe, arrival order, single early-winner settlement, drain of in-flight policy checks), the pricing and NSID extraction helpers, and the option bags for the PDS, SSH provider, contract flow and console buffer. Because the module is side-effect-free and its imports are type-level only, the same types describe both the real requester and the fakes used in tests, which is what keeps the flow implementation and the CLI honest about what the requester actually offers.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:20ae68b35c9ef5d3df6de1653355cce6` class BidCollector (lib/abc/requester/mod.ts)
- `file:lib/abc/requester/mod.ts` file mod.ts (lib/abc/requester/mod.ts)
- `function:33b5c2e816403f09b3f485318b2e469b` function bidPayloadNsid (lib/abc/requester/mod.ts)
- `function:3bd4a06a1bf12e51f13791c8f4260f0a` function selectWinner (lib/abc/requester/mod.ts)
- `function:eae3475ff9c55dcff59876ffd59e7180` function bidCost (lib/abc/requester/mod.ts)
- `interface:3917ad87d46039428eaafd04a57c85ba` interface RequesterPDS (lib/abc/requester/mod.ts)
- `interface:741a0c20adbb6bc0d938265b22ce885f` interface PDSOptions (lib/abc/requester/mod.ts)
- `interface:7fb903e1181ae51a3d69c0a40484e610` interface ContractFlowOptions (lib/abc/requester/mod.ts)
- `interface:8bb045d75b5d86a7e1e366e90b136d9d` interface ConsoleBuffer (lib/abc/requester/mod.ts)
- `interface:921ec9daf3b0c78a0097ba04522bdb1d` interface BidCollectorOptions (lib/abc/requester/mod.ts)
- `interface:c21d6029ac9cadc0e131735b095dd761` interface ContractFlowResult (lib/abc/requester/mod.ts)
- `interface:c47103c61c7abe6bc385e3a78f2b2c00` interface SshSessionProvider (lib/abc/requester/mod.ts)
- `interface:f25a32e8c06ef59f558fa95805408414` interface CollectedBid (lib/abc/requester/mod.ts)
- `method:349483acaffab77b5e87a7e23eaec47e` method BidCollector.add (lib/abc/requester/mod.ts)
- `method:6857c5a01c5dbedc10cd28cc4c536df0` method BidCollector.drain (lib/abc/requester/mod.ts)
- `method:7b1fb0756508326e3f7716cfa00a1c04` method BidCollector.addAll (lib/abc/requester/mod.ts)
- `method:813c25c5519d8b95fb5e156324657fea` method BidCollector.constructor (lib/abc/requester/mod.ts)
- `method:d1e03d1b6ca16af4f49bb518bc48d47f` method BidCollector.all (lib/abc/requester/mod.ts)
- `method:f1d39cacc20517c679b4d0469ca17bb5` method BidCollector.isFree (lib/abc/requester/mod.ts)
<!-- SPECD_MANAGED_END -->
