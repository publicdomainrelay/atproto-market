# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-auth

Repository: `atproto-market`

The context exists so the rest of the codebase, and any tooling reading the market lexicons tree, has one stable import path for the com.publicdomainrelay.temp.auth.allowlist lexicon surface. Rather than deep-importing the generated definitions file directly, consumers import this barrel and reach the deterministic record helpers through the re-exported `rbacDid` namespace. It carries no runtime policy of its own: it is a generated, non-editable projection of the lexicon schema, and the authorization semantics live in the data records that conform to that schema, not in this file.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
