# Context: lib-abc-requester

Repository: `atproto-market`

This context exists so the atproto-market requester's ABC layer — the bid collection and winner-selection rules, the requester PDS surface, the contract flow's option and result bags, and the SSH session provider contract — can be specified once and depended on by the implementation, the CLI and the hermetic test fakes without any of them re-deriving the shapes. It is a pure declaration file: no I/O, no runtime globals, only the types and pure helpers that the transport layers below it must satisfy. The guest transport is iroh by default, so the address the flow waits for and hands to the SSH provider is an opaque transport address — an iroh ticket for iroh, a relay hostname for the websocket transports — and the ABC layer never assumes it is a resolvable FQDN.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:16d39bb38a118fc0fb3fe14223562247` class BidCollector (lib/abc/requester/mod.ts)
- `file:lib/abc/requester/mod.ts` file mod.ts (lib/abc/requester/mod.ts)
- `function:3c8d8d8546ff4701fb29d8fbe9795d8c` function selectWinner (lib/abc/requester/mod.ts)
- `function:3d3875fa8240403acfc320be5e313f3a` function bidPayloadNsid (lib/abc/requester/mod.ts)
- `function:66b7603e9bf193b0f4990c9418718750` function bidCost (lib/abc/requester/mod.ts)
- `interface:330c2d6e1bc25d27c1db597ccfc31a6e` interface BidCollectorOptions (lib/abc/requester/mod.ts)
- `interface:494d188099d646e00135e8028183de2b` interface PDSOptions (lib/abc/requester/mod.ts)
- `interface:6e1c7583bbdd18e7a9136c0da721214c` interface RequesterPDS (lib/abc/requester/mod.ts)
- `interface:780ccb6e208a6173bf860193cc9dc0b2` interface SshSessionProvider (lib/abc/requester/mod.ts)
- `interface:7fb903e1181ae51a3d69c0a40484e610` interface ContractFlowOptions (lib/abc/requester/mod.ts)
- `interface:91c57701082294b94623335812685327` interface ConsoleBuffer (lib/abc/requester/mod.ts)
- `interface:e7d2504efcd0625ee0843e6ca37af80e` interface ContractFlowResult (lib/abc/requester/mod.ts)
- `interface:f25a32e8c06ef59f558fa95805408414` interface CollectedBid (lib/abc/requester/mod.ts)
- `method:234812e0614aaa8d9ef21f3bf4032910` method BidCollector.add (lib/abc/requester/mod.ts)
- `method:8471dcc6f8e0b25bd63a74706b5003cd` method BidCollector.drain (lib/abc/requester/mod.ts)
- `method:8beccf740102cdc12505e185d8271765` method BidCollector.addAll (lib/abc/requester/mod.ts)
- `method:a375d27196d03a11f471e5c9e2bc799a` method BidCollector.all (lib/abc/requester/mod.ts)
- `method:cce3fb92bff243280237741351ec0705` method BidCollector.constructor (lib/abc/requester/mod.ts)
- `method:f0e93b3ced1b767ab92656b6071e05ea` method BidCollector.isFree (lib/abc/requester/mod.ts)
<!-- SPECD_MANAGED_END -->
