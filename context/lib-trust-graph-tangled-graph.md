# Context: lib-trust-graph-tangled-graph

Repository: `atproto-market`

This context exists so that vouches expressed as Tangled-style records can be fed to the ABC trust graph without that graph knowing anything about atproto record listing. It fixes the seam between the two: a caller injects a listRecords callback (plus an optional logger), and createTangledGraphVouchResolver returns a VouchResolver whose getVouchedDids and isVouched derive trust from listed records. The design keeps all network and PDS access outside the module so the resolver is a pure, stubbable function of the injected reader, and it deliberately fails closed -- a lookup rejection is logged and treated as an empty vouch set rather than an exception -- so an unavailable repo never manufactures trust.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/trust-graph-tangled-graph/mod.ts` file mod.ts (lib/trust-graph-tangled-graph/mod.ts)
- `function:c548791fdd9c126249e41e29c7d44c44` function createTangledGraphVouchResolver (lib/trust-graph-tangled-graph/mod.ts)
- `interface:96c0ea570aaadab563b357e40f8b2254` interface TangledGraphVouchResolverOpts (lib/trust-graph-tangled-graph/mod.ts)
- `interface:f3b2726e5ba78287474a3382ccf87cc2` interface ListedRecord (lib/trust-graph-tangled-graph/mod.ts)
<!-- SPECD_MANAGED_END -->
