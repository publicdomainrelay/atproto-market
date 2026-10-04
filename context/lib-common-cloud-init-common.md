# Context: lib-common-cloud-init-common

Repository: `atproto-market`

This context exists so every consumer (requester, compute-contract gateway, guest-capability) composes guest cloud-init from one place instead of hand-writing YAML per transport: transports are registered as named modules, and callers select and layer them. The context is consumed by the requester-XRPC, compute-contract-gateway-XRPC, abc/requester and abc/guest-capability packages, so its merge semantics, precedence and module ids are a cross-package contract. The `iroh` module is the guest-side SSH transport that replaces the did-key-ingress-proxy tunnel-subscriber: it installs dumbpipe, listens on the guest's sshd, and reports its iroh ticket back to the requester over a per-contract endpoint the requester names in this cloud-config, never through a public record.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/cloud-init-common/mod.ts` file mod.ts (lib/common/cloud-init-common/mod.ts)
- `function:1e95bb6ea8915b9f5ba83dc886796445` function getUserDataModules (lib/common/cloud-init-common/mod.ts)
- `function:4a2114985299a051d4d3b765e1ceed2b` function buildDefaultUserData (lib/common/cloud-init-common/mod.ts)
- `function:5b4243197b6fc01e7613665b045a419a` function listUserDataModules (lib/common/cloud-init-common/mod.ts)
- `function:6426721042d437e4ae5164f6f8247ad2` function buildTunnelUserData (lib/common/cloud-init-common/mod.ts)
- `function:881cbcdcc63c1b71db29810965464c11` function registerUserDataModule (lib/common/cloud-init-common/mod.ts)
- `function:91109927e406bbb83931911c21d9e32a` function flattenLabel (lib/common/cloud-init-common/mod.ts)
- `function:abdc82dd14921cdce8ae29819e706996` function buildUserData (lib/common/cloud-init-common/mod.ts)
- `function:e2a3490282c22c6873b46b4989033e78` function injectJsrUrl (lib/common/cloud-init-common/mod.ts)
- `function:e30d33d17e4979ea0cda5962c97432fb` function acceptBundleModule (lib/common/cloud-init-common/mod.ts)
- `interface:0bccaee64ad56c10f80842c828570d30` interface CloudInitContext (lib/common/cloud-init-common/mod.ts)
- `interface:10a15e4341c76e7c8c9d8396df484bb7` interface TunnelCloudInitContext (lib/common/cloud-init-common/mod.ts)
- `interface:1e1823b52b02c0660cba8385871c05e9` interface WriteFileEntry (lib/common/cloud-init-common/mod.ts)
- `interface:33d4c92b2cd53743595391dae5ced5f5` interface UserDataPatch (lib/common/cloud-init-common/mod.ts)
- `type_alias:6e54dc375f73d3c3e7308fae90f1d786` type_alias UserDataModule (lib/common/cloud-init-common/mod.ts)
<!-- SPECD_MANAGED_END -->
