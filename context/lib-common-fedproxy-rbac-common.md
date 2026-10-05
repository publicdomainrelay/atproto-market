# Context: lib-common-fedproxy-rbac-common

Repository: `atproto-market`

This context exists so that the shape of a fedproxy SSH-key-registration RBAC record is defined once, in a pure and dependency-free module, rather than being hand-assembled wherever a grant is issued. It gives the guest-capability/requester layers a single builder that turns a requester's DID, the actx, the issuer URI and a service name into the $type/roles/policies record the fedproxy gate accepts, and a subject renderer that both those callers and the default-template path share, so subject strings and policy names cannot drift between the issuer and the verifier.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/fedproxy-rbac-common/mod.ts` file mod.ts (lib/common/fedproxy-rbac-common/mod.ts)
- `function:a98ccef775e425fa7c13add3016e54f5` function renderSubject (lib/common/fedproxy-rbac-common/mod.ts)
- `function:aac738c94c8e2dfa2a0ff4c0e8d5c018` function buildSshKeyRbacRecord (lib/common/fedproxy-rbac-common/mod.ts)
- `function:e5377f0a379eb596837b1526cd73134c` function didPlcKey (lib/common/fedproxy-rbac-common/mod.ts)
- `interface:967a594352d4c9b86213f54d84909966` interface SshKeyRbacContext (lib/common/fedproxy-rbac-common/mod.ts)
<!-- SPECD_MANAGED_END -->
