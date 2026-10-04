# Context: lib-common-market-common

Repository: `atproto-market`

This context exists so every market package agrees on one vocabulary for strong references, market records, and logging, and so all outbound HTTP egress is filtered through a single audited guard. Without it, each settlement or market package would re-declare its own record types and each would need its own scheme/host filtering, letting an attacker-supplied endpoint reach cloud metadata services or private networks. Centralizing the types and the egress check here keeps the dependency direction one-way: consumer packages depend on market-common, never the reverse.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-common/constants.ts` file constants.ts (lib/common/market-common/constants.ts)
- `file:lib/common/market-common/egress.ts` file egress.ts (lib/common/market-common/egress.ts)
- `file:lib/common/market-common/mod.ts` file mod.ts (lib/common/market-common/mod.ts)
- `file:lib/common/market-common/types.ts` file types.ts (lib/common/market-common/types.ts)
- `function:4a9182a659c42eaf5efea613d576bf56` function assertSafeEgressUrl (lib/common/market-common/egress.ts)
- `function:98a3eb25fe3e5d71119b4776db96f280` function strongRef (lib/common/market-common/types.ts)
- `function:bdb007fdd15fa3b35d2579e3f50a9102` function noopLogger (lib/common/market-common/types.ts)
- `type_alias:094ab49db888ff112d27c2d9863156fb` type_alias StrongRef (lib/common/market-common/types.ts)
- `type_alias:0ddacc3f4f8324551fc28543224d5848` type_alias Resolved (lib/common/market-common/types.ts)
- `type_alias:1415ed8e9c4445551461c01489f8e98e` type_alias RFP (lib/common/market-common/types.ts)
- `type_alias:3b05835c22ae315ee54800118068199e` type_alias EgressOptions (lib/common/market-common/egress.ts)
- `type_alias:4a83a08396757c59cee4d1abc1ac4e96` type_alias Bid (lib/common/market-common/types.ts)
- `type_alias:5227ebb1a1c9a0e6fc64c180ba49b225` type_alias Logger (lib/common/market-common/types.ts)
- `type_alias:68f1befbdba2e558d52f81fadb208604` type_alias MarketEvent (lib/common/market-common/types.ts)
- `type_alias:a1be7c028260b060bface7fb68430980` type_alias LogLevel (lib/common/market-common/types.ts)
- `type_alias:bf97d5bc1681c49e28bb73c0ef924a28` type_alias Offering (lib/common/market-common/types.ts)
- `type_alias:cecc1b0d37ba12dc3d30a216f27c4d7d` type_alias Accept (lib/common/market-common/types.ts)
<!-- SPECD_MANAGED_END -->
