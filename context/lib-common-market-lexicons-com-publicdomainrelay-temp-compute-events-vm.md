# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-compute-events-vm

Repository: `atproto-market`

These lexicons exist so a requester and a provider can exchange VM lifecycle facts over atproto: started says a VM began booting, onNetwork says it came up and is reachable, registerIdentity carries the guest's DID and relay FQDN, and delete asks the provider to tear the VM down when the requester observes a terminal condition the provider cannot see itself. The context is the vocabulary layer only; it defines the record shapes and their validators, and leaves all dispatch or handling to the market event callback code elsewhere in the repository.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/delete.defs.ts` file delete.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/delete.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/delete.ts` file delete.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/delete.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/onNetwork.defs.ts` file onNetwork.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/onNetwork.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/onNetwork.ts` file onNetwork.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/onNetwork.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/registerIdentity.defs.ts` file registerIdentity.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/registerIdentity.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/registerIdentity.ts` file registerIdentity.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/registerIdentity.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/started.defs.ts` file started.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/started.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/started.ts` file started.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/compute/events/vm/started.ts)
<!-- SPECD_MANAGED_END -->
