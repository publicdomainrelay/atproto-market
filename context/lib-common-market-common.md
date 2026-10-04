# Context: lib-common-market-common

Repository: `atproto-market`

This context exists so every market package agrees on one vocabulary for strong references, market records, and logging, and so all outbound HTTP egress is filtered through a single audited guard. Without it, each settlement or market package would re-declare its own record types and each would need its own scheme/host filtering, letting an attacker-supplied endpoint reach cloud metadata services or private networks. Centralizing the types and the egress check here keeps the dependency direction one-way: consumer packages depend on market-common, never the reverse.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
