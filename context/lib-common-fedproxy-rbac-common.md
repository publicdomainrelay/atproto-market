# Context: lib-common-fedproxy-rbac-common

Repository: `atproto-market`

This context exists so the wire shape of the fedproxy RBAC record and the placeholder semantics it shares with the guest-capability grant derivation are specified in one place, independent of any transport or deployment. It pins down the contract that callers rely on: which fields a context must carry, how a DID is reduced to its PLC key, how a subject template is interpolated, what the default subject template is, and exactly which role, policy, audience, issuer and JSON schema the emitted record must contain. Because both the fedproxy RBAC path and lib/abc/guest-capability's deriveGrantVars must produce matching subjects and audiences for a token to be accepted, the rules here are the single source of truth the two sides are checked against.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/fedproxy-rbac-common/mod.ts` file mod.ts (lib/common/fedproxy-rbac-common/mod.ts)
- `function:a98ccef775e425fa7c13add3016e54f5` function renderSubject (lib/common/fedproxy-rbac-common/mod.ts)
- `function:aac738c94c8e2dfa2a0ff4c0e8d5c018` function buildSshKeyRbacRecord (lib/common/fedproxy-rbac-common/mod.ts)
- `function:e5377f0a379eb596837b1526cd73134c` function didPlcKey (lib/common/fedproxy-rbac-common/mod.ts)
- `interface:967a594352d4c9b86213f54d84909966` interface SshKeyRbacContext (lib/common/fedproxy-rbac-common/mod.ts)
<!-- SPECD_MANAGED_END -->
