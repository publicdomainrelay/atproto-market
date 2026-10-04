# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-requester

Repository: `atproto-market`

This context exists so the rest of atproto-market can call com.publicdomainrelay.temp.requester.associateConfirm with generated, type-checked request and response shapes instead of hand-written fetch code. It is the lex-client projection of a lexicon that gates the RFP flow behind an explicit requester-side CLI confirmation: the caller is identified by an inter-service auth JWT resolved through the user's PDS with the atproto-proxy header, and the procedure answers with the requester DID and an ok flag once confirmation is attempted. The barrel file exists so consumers import the procedure as a package-local default export.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/requester/associateConfirm.defs.ts` file associateConfirm.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/requester/associateConfirm.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/requester/associateConfirm.ts` file associateConfirm.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/requester/associateConfirm.ts)
- `type_alias:32f59c1292407af850d8f6ada5d5959c` type_alias $Params (lib/common/market-lexicons/com/publicdomainrelay/temp/requester/associateConfirm.defs.ts)
- `type_alias:4dbf76aa5eeb2f760aaaf03852a93725` type_alias $Input (lib/common/market-lexicons/com/publicdomainrelay/temp/requester/associateConfirm.defs.ts)
- `type_alias:6f696a9a6d16f191e192c7a8a2082268` type_alias $InputBody (lib/common/market-lexicons/com/publicdomainrelay/temp/requester/associateConfirm.defs.ts)
- `type_alias:9084d44b6d89c358d343bab398e2af81` type_alias $Output (lib/common/market-lexicons/com/publicdomainrelay/temp/requester/associateConfirm.defs.ts)
- `type_alias:cc503c95f2423ace5dd97fd68005cd2d` type_alias $OutputBody (lib/common/market-lexicons/com/publicdomainrelay/temp/requester/associateConfirm.defs.ts)
<!-- SPECD_MANAGED_END -->
