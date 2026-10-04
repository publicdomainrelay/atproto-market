# Context: lib-common-market-lexicons-com-fedproxy-temp

Repository: `atproto-market`

This context exists so the temporary fedproxy XRPC surface has one aggregation point. Rather than importing each generated method module by path, callers import the `temp/xrpc.ts` barrel and pick the namespace they need. It sits under the shared `lib/common/market-lexicons` tree alongside the other `com.fedproxy` lexicon outputs, and depends only on the sibling generated files it re-exports.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/fedproxy/temp/xrpc.ts` file xrpc.ts (lib/common/market-lexicons/com/fedproxy/temp/xrpc.ts)
<!-- SPECD_MANAGED_END -->
