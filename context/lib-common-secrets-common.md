# Context: lib-common-secrets-common

Repository: `atproto-market`

This context exists so the guest secrets capability and the Hono secrets factory share one definition of what a secrets file and a secrets RBAC record look like, instead of each re-declaring the shapes and re-implementing the validation. It sits in lib/common because both consumers import it, it depends on nothing outside itself, and it owns the parsing and record-building logic that must stay consistent across every consumer of the secrets route.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
