# Context: lib-market-settlement-free

Repository: `atproto-market`

This context exists to fix the contract of the free settlement path: the wire shape the client and server share, the record each side owns, and the error type that carries an HTTP status back to a transport handler. The client writes an accepts.free record naming the bid and its payload, encodes that record's uri and cid into the grant url, and reads back a receipts.free strongRef; the server parses that same path back into the accepts pair, mints the receipts.free record, and later verifies a payment reference against a bidder DID, treating an absent payment as a free settlement rather than a failure. It is deliberately separable from paid settlement so the no-payment flow can be reasoned about, tested and deployed without the payment machinery, and so a Hono factory layer can mount it by calling only parseGrantPath, mintGrantForAccepts and verifyFreeGrant.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:3827f797a6bd2d1108d56d2774b6518d` class FreeGrantError (lib/market-settlement-free/server.ts)
- `file:lib/market-settlement-free/client.ts` file client.ts (lib/market-settlement-free/client.ts)
- `file:lib/market-settlement-free/mod.ts` file mod.ts (lib/market-settlement-free/mod.ts)
- `file:lib/market-settlement-free/server.ts` file server.ts (lib/market-settlement-free/server.ts)
- `function:528e95e009f7f506a933ba541e0c4ed9` function verifyFreeGrant (lib/market-settlement-free/server.ts)
- `function:c1a42b12e47d538ba4f2c4033a018daf` function parseGrantPath (lib/market-settlement-free/server.ts)
- `function:ca138dba99fe7843a691d23448a3af85` function settleFreeGrant (lib/market-settlement-free/client.ts)
- `function:f40dd626ac80197332f89582a7964061` function mintGrantForAccepts (lib/market-settlement-free/server.ts)
- `interface:cdef64f67aa14f86753db2d82253c04c` interface SettleFreeOptions (lib/market-settlement-free/client.ts)
- `method:d2ca5a3b04fbbe08479f73baafeef096` method FreeGrantError.constructor (lib/market-settlement-free/server.ts)
<!-- SPECD_MANAGED_END -->
