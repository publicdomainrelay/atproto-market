# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-compute-events-vm

Repository: `atproto-market`

These lexicons exist so a requester and a provider can exchange VM lifecycle facts over atproto: started says a VM began booting, onNetwork says it came up and is reachable, registerIdentity carries the guest's DID and relay FQDN, and delete asks the provider to tear the VM down when the requester observes a terminal condition the provider cannot see itself. The context is the vocabulary layer only; it defines the record shapes and their validators, and leaves all dispatch or handling to the market event callback code elsewhere in the repository.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
