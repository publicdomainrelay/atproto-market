# Context: lib-common-market-lexicons-com-publicdomainrelay-temp

Repository: `atproto-market`

The context exists so that the generated `com.publicdomainrelay.temp` lexicon namespaces have a single describable surface: a caller that wants the market, gateway, compute, agent, auth, requester or tangled lexicons imports the corresponding top-level barrel, and a caller that wants the badge/blue key record imports `badgeBlueKeys`. It documents which namespace maps to which submodules, the record shape and field formats that `@atproto/lex` enforces at runtime, and the fact that these files are generator output rather than hand-maintained source. No business logic lives here; the requirements below fix the export structure and the record contract so regeneration and imports stay predictable.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/agent.ts` file agent.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/agent.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/auth.ts` file auth.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/auth.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/badgeBlueKeys.defs.ts` file badgeBlueKeys.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/badgeBlueKeys.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/badgeBlueKeys.ts` file badgeBlueKeys.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/badgeBlueKeys.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/compute.ts` file compute.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/compute.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/gateway.ts` file gateway.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/gateway.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market.ts` file market.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/requester.ts` file requester.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/requester.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/tangled.ts` file tangled.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/tangled.ts)
<!-- SPECD_MANAGED_END -->
