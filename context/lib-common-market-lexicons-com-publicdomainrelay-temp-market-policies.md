# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-market-policies

Repository: `atproto-market`

These modules exist so the market's fulfillment policies can be expressed as interoperable, signed ATProto records that travel downstream through subcontracting chains, rather than as ad-hoc JSON understood only by one evaluator. Three evaluation strategies are given distinct lexicons so a consumer can tell, from the record type alone, whether policy logic is first-party (builtin), third-party bundle code requiring an explicit trust decision (denoWorker), or hosted by a remote engine (service). The generated files fix the wire shape, NSIDs, and validation surface that producers and evaluators code against; the doc comments record the security posture each type implies.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/builtin.defs.ts` file builtin.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/builtin.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/builtin.ts` file builtin.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/builtin.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/denoWorker.defs.ts` file denoWorker.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/denoWorker.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/denoWorker.ts` file denoWorker.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/denoWorker.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/service.defs.ts` file service.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/service.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/service.ts` file service.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/market/policies/service.ts)
<!-- SPECD_MANAGED_END -->
