# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-market-accepts

Repository: `atproto-market`

This context exists so the temp market has a canonical, generated, machine-validatable wire definition for the requester's acceptance of a bid, split by pricing model. The requester mints one of these records after a bid wins and passes it by AT-URI plus CID to the endpoint the bid names; the bidder resolves it, checks the embedded signatures, and answers with the matching receipt record, completing the bilateral badge.blue agreement. Keeping the free and x402 variants as separate lexicons keeps the payment-specific settlement path out of the record shape while sharing bid, payload, and signature structure, and generating both through @atproto/lex means the types and runtime validators cannot drift from the published lexicons.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
