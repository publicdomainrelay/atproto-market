# Context: lib-abc-guest-capability

Repository: `atproto-market`

This context exists so that a capability running inside a guest VM has one shared, provider-agnostic interface for the compute contract: it contributes cloud-init before the RFP is sent, is handed its authorization once a bid wins, loses it when the VM is deleted, and is disposed at the end. The derived GrantVars and the subject-key helper exist to keep the guest's presented token subject byte-identical to the subject the issuer's prove handler assembles from the provider's droplet tags, and to keep the audience baked into cloud-init (the requester's own relay DID) distinct from the subject DID (which under OAuth is the user's PDS DID, not the requester's relay DID).

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/abc/guest-capability/mod.ts` file mod.ts (lib/abc/guest-capability/mod.ts)
- `function:843034a41b996ad93e7eddbd263f3ff7` function subjectKeyOf (lib/abc/guest-capability/mod.ts)
- `function:9fc5d3416856b249927132984c52288d` function isWifSimpleConfig (lib/abc/guest-capability/mod.ts)
- `function:d4dc1e02e9dae26d725c63e37e4e73ad` function deriveGrantVars (lib/abc/guest-capability/mod.ts)
- `interface:08837ecc0b4c67d61d030acb83c87cff` interface DeriveGrantVarsInput (lib/abc/guest-capability/mod.ts)
- `interface:4a42c93f29714a7a7b77a0bc305ced37` interface GuestCapability (lib/abc/guest-capability/mod.ts)
- `interface:5f5c338392bdac0f1231e29c58ed026a` interface CapabilityPrepared (lib/abc/guest-capability/mod.ts)
- `interface:b7bf881b25d7887524eb96f3c3e767d7` interface WifSimpleConfig (lib/abc/guest-capability/mod.ts)
- `interface:e5b63e63421abe6ef6831d96f92908ca` interface PrepareContext (lib/abc/guest-capability/mod.ts)
- `interface:ef44ecde4500e20b9d199d5a1a0e1fbd` interface GrantVars (lib/abc/guest-capability/mod.ts)
<!-- SPECD_MANAGED_END -->
