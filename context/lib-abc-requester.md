# Context: lib-abc-requester

Repository: `atproto-market`

This context exists so the atproto-market requester's ABC layer — the bid collection and winner-selection rules, the requester PDS surface, the contract flow's option and result bags, and the SSH session provider contract — can be specified once and depended on by the implementation, the CLI and the hermetic test fakes without any of them re-deriving the shapes. It is a pure declaration file: no I/O, no runtime globals, only the types and pure helpers that the transport layers below it must satisfy. The guest transport is iroh by default, so the address the flow waits for and hands to the SSH provider is an opaque transport address — an iroh ticket for iroh, a relay hostname for the websocket transports — and the ABC layer never assumes it is a resolvable FQDN.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:0caf82f6baf10676e7268b04ab17ca14` class BidCollector (lib/abc/requester/mod.ts)
- `file:lib/abc/requester/mod.ts` file mod.ts (lib/abc/requester/mod.ts)
- `function:20a451f4e1377ecae548f81cfe46a0cc` function bidCost (lib/abc/requester/mod.ts)
- `function:bb6fa4e319eabdb96cf1bcf9588b6e66` function bidPayloadNsid (lib/abc/requester/mod.ts)
- `function:ed8dff4b5cdb3292029aac87a83f2c1a` function selectWinner (lib/abc/requester/mod.ts)
- `interface:07656388c821ba6af3e6f01deebf7dff` interface ConsoleBuffer (lib/abc/requester/mod.ts)
- `interface:380dfb7fe1bd2c55f157a6b95bd59bd0` interface RequesterPDS (lib/abc/requester/mod.ts)
- `interface:747f4e8ee217aaf65deeda3d92575495` interface ContractFlowResult (lib/abc/requester/mod.ts)
- `interface:7701e7d56c70ba5cf00215557461ee48` interface PDSOptions (lib/abc/requester/mod.ts)
- `interface:7fb903e1181ae51a3d69c0a40484e610` interface ContractFlowOptions (lib/abc/requester/mod.ts)
- `interface:8ae67fbea354fbac2ec37b3b073691bf` interface SshSessionProvider (lib/abc/requester/mod.ts)
- `interface:df95093f1bbb4e60cba4564e259a3935` interface BidCollectorOptions (lib/abc/requester/mod.ts)
- `interface:f25a32e8c06ef59f558fa95805408414` interface CollectedBid (lib/abc/requester/mod.ts)
- `method:219a8c9f6373f86e1f1a362a713754d4` method BidCollector.isFree (lib/abc/requester/mod.ts)
- `method:5dc9e58f573cf4ead916ffb5149a57e8` method BidCollector.add (lib/abc/requester/mod.ts)
- `method:74ee8b25406d012ad5559304d9e421cd` method BidCollector.all (lib/abc/requester/mod.ts)
- `method:97628a03e71fa7a982608e85fe501ee0` method BidCollector.constructor (lib/abc/requester/mod.ts)
- `method:bbde52426d70d3594c43c0a15fc39cb6` method BidCollector.addAll (lib/abc/requester/mod.ts)
- `method:d23a7b6970e40f595af441e1ed38c910` method BidCollector.drain (lib/abc/requester/mod.ts)
<!-- SPECD_MANAGED_END -->
