# Context: lib-abc-requester

Repository: `atproto-market`

This context exists to pin down the contract boundary of the requester: the types and pure helpers every requester transport, CLI and test agrees on, so that bid collection, winner selection and the option surface can change implementation without changing the modules that consume them. It is deliberately dependency-light and side-effect-free, which lets the flow implementation in lib/requester-xrpc/mod.ts and the tests under test/ be exercised against fakes; the only behavior it owns is deterministic bid bookkeeping. The SSH transport surface is now transport-neutral: the flow's target is an iroh ticket by default and a relay FQDN only for the legacy transport.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:b0511bdf9205af51070904ceb3cebe46` class BidCollector (lib/abc/requester/mod.ts)
- `file:lib/abc/requester/mod.ts` file mod.ts (lib/abc/requester/mod.ts)
- `function:357285344d5e1ed273ccb6b4a83e6f58` function bidPayloadNsid (lib/abc/requester/mod.ts)
- `function:7d2178c8391b536975f479eb6f18b574` function bidCost (lib/abc/requester/mod.ts)
- `function:7f9e9285bf0541c78508fac23abb0f6a` function selectWinner (lib/abc/requester/mod.ts)
- `interface:13cf3c528eda36cb6841b2dd983b53be` interface ContractFlowResult (lib/abc/requester/mod.ts)
- `interface:22b6dbdf25ff617b21276922dddd9172` interface ConsoleBuffer (lib/abc/requester/mod.ts)
- `interface:3917ad87d46039428eaafd04a57c85ba` interface RequesterPDS (lib/abc/requester/mod.ts)
- `interface:3ca1df3473768560238d9bf874a7007d` interface BidCollectorOptions (lib/abc/requester/mod.ts)
- `interface:5b2410a21ad68d7492443d9c2f4ed1b3` interface SshSessionProvider (lib/abc/requester/mod.ts)
- `interface:741a0c20adbb6bc0d938265b22ce885f` interface PDSOptions (lib/abc/requester/mod.ts)
- `interface:7fb903e1181ae51a3d69c0a40484e610` interface ContractFlowOptions (lib/abc/requester/mod.ts)
- `interface:f25a32e8c06ef59f558fa95805408414` interface CollectedBid (lib/abc/requester/mod.ts)
- `method:16f9f058b4ad22665924e3c9caad330a` method BidCollector.isFree (lib/abc/requester/mod.ts)
- `method:1b90a2bdcee27c1bcd4ebf1f441f2df6` method BidCollector.add (lib/abc/requester/mod.ts)
- `method:3a8fc16e97f5c00ee9afe0af3a6cf4ec` method BidCollector.addAll (lib/abc/requester/mod.ts)
- `method:6c9c2a66e9549e7c40c1877f02054f45` method BidCollector.constructor (lib/abc/requester/mod.ts)
- `method:b7337014e6d88bef850d60a5bc2eb6b7` method BidCollector.all (lib/abc/requester/mod.ts)
- `method:d99d03b741c7fe79db2a1d2d5830cec3` method BidCollector.drain (lib/abc/requester/mod.ts)
<!-- SPECD_MANAGED_END -->
