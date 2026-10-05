# Context: lib-operator-discovery-badge-blue-keys

Repository: `atproto-market`

This context exists so that operator discovery for badgeBlueKeys associations is a pure, testable function of injected record listings rather than a component that reaches into a PDS itself. It pins the canonical association shape, distinguishing the current record form (challenge is the operator, keyId is the associated subject) from the inverted legacy form that must not be read as an association, so callers such as requester-xrpc can resolve a bidder's operators without mis-resolving self-operated bidders. It also fixes the resolution order (own repo first, public repo as fallback), the failure posture (swallow listing errors and return what was found), and the caching and logging contract.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/operator-discovery-badge-blue-keys/mod.ts` file mod.ts (lib/operator-discovery-badge-blue-keys/mod.ts)
- `function:dc1f27a14a62ce61d3668e393e355f72` function createBadgeBlueKeysOperatorDiscovery (lib/operator-discovery-badge-blue-keys/mod.ts)
- `interface:2f571f7e3c998ccd8befe1bbae9ccb85` interface BadgeBlueKeysOperatorDiscoveryOpts (lib/operator-discovery-badge-blue-keys/mod.ts)
- `interface:b712ea6968624576e21a143e7622a253` interface ListedRecord (lib/operator-discovery-badge-blue-keys/mod.ts)
<!-- SPECD_MANAGED_END -->
