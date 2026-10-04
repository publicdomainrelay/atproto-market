# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-requester

Repository: `atproto-market`

This context exists so the rest of atproto-market can call com.publicdomainrelay.temp.requester.associateConfirm with generated, type-checked request and response shapes instead of hand-written fetch code. It is the lex-client projection of a lexicon that gates the RFP flow behind an explicit requester-side CLI confirmation: the caller is identified by an inter-service auth JWT resolved through the user's PDS with the atproto-proxy header, and the procedure answers with the requester DID and an ok flag once confirmation is attempted. The barrel file exists so consumers import the procedure as a package-local default export.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
