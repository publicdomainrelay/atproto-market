# Context: lib-abc-requester

Repository: `atproto-market`

This context exists so the atproto-market requester's ABC layer — the bid collection and winner-selection rules, the requester PDS surface, the contract flow's option and result bags, and the SSH session provider contract — can be specified once and depended on by the implementation, the CLI and the hermetic test fakes without any of them re-deriving the shapes. It is a pure declaration file: no I/O, no runtime globals, only the types and pure helpers that the transport layers below it must satisfy. The guest transport is iroh by default, so the address the flow waits for and hands to the SSH provider is an opaque transport address — an iroh ticket for iroh, a relay hostname for the websocket transports — and the ABC layer never assumes it is a resolvable FQDN.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:d57e883e006876b805c05d8d04f3c70d` class BidCollector (lib/abc/requester/mod.ts)
- `file:lib/abc/requester/mod.ts` file mod.ts (lib/abc/requester/mod.ts)
- `function:24f8ac1d96de6ca5018e544cac052e84` function bidCost (lib/abc/requester/mod.ts)
- `function:69339ecd22627b6da61ee16603023f6c` function bidPayloadNsid (lib/abc/requester/mod.ts)
- `function:7daa86a6f9e8695a5c71ac805fdf133f` function selectWinner (lib/abc/requester/mod.ts)
- `interface:2bf4e4013748280889dd472657b64d28` interface ConsoleBuffer (lib/abc/requester/mod.ts)
- `interface:380dfb7fe1bd2c55f157a6b95bd59bd0` interface RequesterPDS (lib/abc/requester/mod.ts)
- `interface:7701e7d56c70ba5cf00215557461ee48` interface PDSOptions (lib/abc/requester/mod.ts)
- `interface:7fb903e1181ae51a3d69c0a40484e610` interface ContractFlowOptions (lib/abc/requester/mod.ts)
- `interface:8ae67fbea354fbac2ec37b3b073691bf` interface SshSessionProvider (lib/abc/requester/mod.ts)
- `interface:bbce0224c2c383325ab5878b13e89926` interface BidCollectorOptions (lib/abc/requester/mod.ts)
- `interface:d628e8817422a09b842f19f2d455731e` interface ContractFlowResult (lib/abc/requester/mod.ts)
- `interface:f25a32e8c06ef59f558fa95805408414` interface CollectedBid (lib/abc/requester/mod.ts)
- `method:075eb6ec1290d376ade2f43084aafaa7` method BidCollector.isFree (lib/abc/requester/mod.ts)
- `method:1d57f0d392207f772e28cf364c8221e6` method BidCollector.constructor (lib/abc/requester/mod.ts)
- `method:57342a42b93f081e405aff614b83bea6` method BidCollector.addAll (lib/abc/requester/mod.ts)
- `method:8caf134464a48ce61f8572f957c5d489` method BidCollector.add (lib/abc/requester/mod.ts)
- `method:a494d7a4e7ee0619038e9ac0caa89a66` method BidCollector.drain (lib/abc/requester/mod.ts)
- `method:be9c9383827329e0d7af9662d2f6f1de` method BidCollector.all (lib/abc/requester/mod.ts)
<!-- SPECD_MANAGED_END -->
