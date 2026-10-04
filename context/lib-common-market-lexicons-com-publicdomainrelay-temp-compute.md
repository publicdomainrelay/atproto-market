# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-compute

Repository: `atproto-market`

The package exists so the market's requester and provider speak one wire format for ephemeral compute: the requester publishes a `compute.vm` request and attaches `compute.config.wif.simple` parameters so it can exchange a workload-identity token for one scoped to the provider's RBAC, while the provider publishes `compute.events.vm.*` records reporting boot (`started`), network reachability (`onNetwork`), guest identity (`registerIdentity`), and requesting teardown (`delete`). It is machine-generated from lexicons rather than authored by hand, so its purpose is to carry schema fidelity — field names, optionality, integer floors, datetime formats, and record keys — into TypeScript types and validators that the rest of the market code imports.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
