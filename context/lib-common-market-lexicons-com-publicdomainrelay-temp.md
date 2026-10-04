# Context: lib-common-market-lexicons-com-publicdomainrelay-temp

Repository: `atproto-market`

The context exists so that the generated `com.publicdomainrelay.temp` lexicon namespaces have a single describable surface: a caller that wants the market, gateway, compute, agent, auth, requester or tangled lexicons imports the corresponding top-level barrel, and a caller that wants the badge/blue key record imports `badgeBlueKeys`. It documents which namespace maps to which submodules, the record shape and field formats that `@atproto/lex` enforces at runtime, and the fact that these files are generator output rather than hand-maintained source. No business logic lives here; the requirements below fix the export structure and the record contract so regeneration and imports stay predictable.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
