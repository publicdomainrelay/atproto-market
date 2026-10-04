# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-market-bids

Repository: `atproto-market`

This context exists so the market can express a bidder's offer of compute as a portable, signed atproto record. `bids.free` covers zero-cost offers such as open-source CI or promotional capacity; `bids.x402` covers paid offers, and its payment terms are the machine-readable contract a requester later settles by minting an accepts.x402 record, issuing an x402-gated GET against the advertised URL, and receiving a receipts.x402 proof-of-payment. The namespace is `temp`, marking these lexicons as provisional. The files are code-generated, so they exist to pin the wire schema and give callers typed builder/validator entry points rather than to hold hand-written logic.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids/free.defs.ts` file free.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids/free.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids/free.ts` file free.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids/free.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids/x402.defs.ts` file x402.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids/x402.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids/x402.ts` file x402.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/bids/x402.ts)
<!-- SPECD_MANAGED_END -->
