# Context: lib-abc-requester

Repository: `atproto-market`

This context exists to pin down the contract boundary of the requester: the types and pure helpers every requester transport, CLI and test agrees on, so that bid collection, winner selection and the option surface can change implementation without changing the modules that consume them. It is deliberately dependency-light and side-effect-free, which lets the flow implementation in lib/requester-xrpc/mod.ts and the tests under test/ be exercised against fakes; the only behavior it owns is deterministic bid bookkeeping. The SSH transport surface is now transport-neutral: the flow's target is an iroh ticket by default and a relay FQDN only for the legacy transport.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:d0e1d0e94e5fa98abad7a4bef86cd7e9` class BidCollector (lib/abc/requester/mod.ts)
- `file:lib/abc/requester/mod.ts` file mod.ts (lib/abc/requester/mod.ts)
- `function:aab4fa241c5018327a4034e6bf0e690f` function bidPayloadNsid (lib/abc/requester/mod.ts)
- `function:b652e236b155653ea2712ef7a9ee1aad` function bidCost (lib/abc/requester/mod.ts)
- `function:daac3a41e10595e1d6748a9bfaa04248` function selectWinner (lib/abc/requester/mod.ts)
- `interface:13cf3c528eda36cb6841b2dd983b53be` interface ContractFlowResult (lib/abc/requester/mod.ts)
- `interface:28d26b20f1990d47d11aeed4fba9731d` interface ConsoleBuffer (lib/abc/requester/mod.ts)
- `interface:3917ad87d46039428eaafd04a57c85ba` interface RequesterPDS (lib/abc/requester/mod.ts)
- `interface:5b2410a21ad68d7492443d9c2f4ed1b3` interface SshSessionProvider (lib/abc/requester/mod.ts)
- `interface:741a0c20adbb6bc0d938265b22ce885f` interface PDSOptions (lib/abc/requester/mod.ts)
- `interface:7fb903e1181ae51a3d69c0a40484e610` interface ContractFlowOptions (lib/abc/requester/mod.ts)
- `interface:9073696cc3ba5f419a6eb2cfc60ea8fa` interface BidCollectorOptions (lib/abc/requester/mod.ts)
- `interface:f25a32e8c06ef59f558fa95805408414` interface CollectedBid (lib/abc/requester/mod.ts)
- `method:048fbde4089370fa13db8f85fd68ec7b` method BidCollector.isFree (lib/abc/requester/mod.ts)
- `method:0ee6f18c9c4217757293e46a21ad2e53` method BidCollector.all (lib/abc/requester/mod.ts)
- `method:1955dcbb0a7ec4cad7548a90704f4dc7` method BidCollector.addAll (lib/abc/requester/mod.ts)
- `method:3ebe83ceae74fd8f138b031fc90cd91c` method BidCollector.constructor (lib/abc/requester/mod.ts)
- `method:62c0c6e164372e0419aa3bdf9c4e099c` method BidCollector.add (lib/abc/requester/mod.ts)
- `method:90e2b0d4cadd0775b029dd00b174b22c` method BidCollector.drain (lib/abc/requester/mod.ts)
<!-- SPECD_MANAGED_END -->
