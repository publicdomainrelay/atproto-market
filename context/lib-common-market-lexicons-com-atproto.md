# Context: lib-common-market-lexicons-com-atproto

Repository: `atproto-market`

The context exists to give the com.atproto.repo lexicon family a stable import path inside the shared market-lexicons package. By re-exporting strongRef.ts as a namespace, it lets callers that already import the com/atproto/repo entry point pull in the strongRef lexicon definitions without knowing the on-disk file layout, and it keeps that binding distinct from the other lexicon namespaces that live alongside it. Because it is machine-generated, it is not a place for authored behavior; its only contract is that the namespace name and the target module stay in sync with what the generator produces.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/atproto/repo.ts` file repo.ts (lib/common/market-lexicons/com/atproto/repo.ts)
<!-- SPECD_MANAGED_END -->
