# Context: lib-market-settlement-x402

Repository: `atproto-market`

This context exists to specify the x402 settlement package shared between the market client and server: one module that both mints and verifies on-chain payment receipts against atproto records, and one that drives a payment from the bidder side. It is defined here so the Hono factory that mounts the receipt endpoint, and the bidder flow that settles a bid, can depend on a single contract for path parsing, record validation, remote-proof binding, egress safety and the HTTP status codes carried by X402PaymentError.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:d9cae8acb5befdb69053a678528cf3a0` class X402PaymentError (lib/market-settlement-x402/server.ts)
- `file:lib/market-settlement-x402/client.ts` file client.ts (lib/market-settlement-x402/client.ts)
- `file:lib/market-settlement-x402/mod.ts` file mod.ts (lib/market-settlement-x402/mod.ts)
- `file:lib/market-settlement-x402/server.ts` file server.ts (lib/market-settlement-x402/server.ts)
- `function:400c91a8c6a70894daf46da876572ee6` function settleX402Payment (lib/market-settlement-x402/client.ts)
- `function:72d054e2b58c2f3913d7a9482387f0b2` function mintReceiptForAccepts (lib/market-settlement-x402/server.ts)
- `function:b47d0322129cbcac24381eeb837e0eb5` function verifyX402Payment (lib/market-settlement-x402/server.ts)
- `function:bf43ae046d865cd951a7121f188a1ba0` function parseReceiptPath (lib/market-settlement-x402/server.ts)
- `interface:79bc0568c0c3d466282e33574ce3067e` interface SettleX402Options (lib/market-settlement-x402/client.ts)
- `method:164471847987d5ac0028bee41736e5ab` method X402PaymentError.constructor (lib/market-settlement-x402/server.ts)
<!-- SPECD_MANAGED_END -->
