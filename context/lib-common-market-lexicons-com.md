# Context: lib-common-market-lexicons-com

Repository: `atproto-market`

The context exists so that lexicon types for the `com.atproto`, `com.fedproxy` and `com.publicdomainrelay` authorities are importable from a single stable module path per authority, mirroring the NSID hierarchy onto the filesystem. Rather than importing deep generated paths, callers import the authority barrel and reach the sub-lexicon through the named namespace export (for example the `repo` namespace off the `com/atproto.ts` barrel). It is a pure re-export surface: no runtime logic, no hand-written types, and no state.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/atproto.ts` file atproto.ts (lib/common/market-lexicons/com/atproto.ts)
- `file:lib/common/market-lexicons/com/fedproxy.ts` file fedproxy.ts (lib/common/market-lexicons/com/fedproxy.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay.ts` file publicdomainrelay.ts (lib/common/market-lexicons/com/publicdomainrelay.ts)
<!-- SPECD_MANAGED_END -->
