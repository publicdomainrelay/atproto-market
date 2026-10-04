# Context: lib-market-settlement-free

Repository: `atproto-market`

This context exists so that the atproto-market can settle a bid without money: an operator advertises a free grant endpoint, a bidder writes an accepts.free record and calls that endpoint, and both sides agree on the resulting receipts.free strongRef. Splitting client and server into one package keeps the wire contract (the accepts.free record shape, the /<uri>/<cid> grant path, the receipts.free response body) in a single place, and keeps the bidder from having to know how the operator mints or signs the receipt. FreeGrantError exists so the server half can attach an HTTP status to a rejection and let the transport layer decide how to render it, instead of throwing bare Errors.

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
