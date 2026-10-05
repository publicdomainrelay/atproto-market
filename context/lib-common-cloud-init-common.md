# Context: lib-common-cloud-init-common

Repository: `atproto-market`

This context exists so every consumer (requester, compute-contract gateway, guest-capability) composes guest cloud-init from one place instead of hand-writing YAML per transport: transports are registered as named modules, and callers select and layer them. The context is consumed by the requester-XRPC, compute-contract-gateway-XRPC, abc/requester and abc/guest-capability packages, so its merge semantics, precedence and module ids are a cross-package contract. The `iroh` module is the guest-side SSH transport that replaces the did-key-ingress-proxy tunnel-subscriber: it installs dumbpipe, listens on the guest's sshd, and reports its iroh ticket back to the requester over a per-contract endpoint the requester names in this cloud-config, never through a public record.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/cloud-init-common/mod.ts` file mod.ts (lib/common/cloud-init-common/mod.ts)
- `function:01307f3439d4b76f5bfc174dde2583a9` function flattenLabel (lib/common/cloud-init-common/mod.ts)
- `function:0e368f0b0439ab6ea272f375c267a4f5` function acceptBundleModule (lib/common/cloud-init-common/mod.ts)
- `function:1796ee277ea051578f5da6a5844f5ccc` function listUserDataModules (lib/common/cloud-init-common/mod.ts)
- `function:3f68e24ba719a41c1948c008335e110e` function getUserDataModules (lib/common/cloud-init-common/mod.ts)
- `function:4c9364a2eba6051041a3e329e3673cd2` function injectJsrUrl (lib/common/cloud-init-common/mod.ts)
- `function:53f5bb0040b7d369029fd8bca511a0db` function registerUserDataModule (lib/common/cloud-init-common/mod.ts)
- `function:60926b54e4c29025add7657a3bd604f5` function buildUserData (lib/common/cloud-init-common/mod.ts)
- `function:df307b28fafe7f6eb4d4f9086935dc3c` function buildDefaultUserData (lib/common/cloud-init-common/mod.ts)
- `function:e0207a5f28173eb255c10961e9fb528b` function buildTunnelUserData (lib/common/cloud-init-common/mod.ts)
- `interface:0bccaee64ad56c10f80842c828570d30` interface CloudInitContext (lib/common/cloud-init-common/mod.ts)
- `interface:1428c9f2922b1657bb39eef71dd7aa5d` interface UserDataPatch (lib/common/cloud-init-common/mod.ts)
- `interface:4dd396d02d0395bd6db6013daf5b7e39` interface TunnelCloudInitContext (lib/common/cloud-init-common/mod.ts)
- `interface:b91c269f41d7e3d696ce538f83ee9305` interface WriteFileEntry (lib/common/cloud-init-common/mod.ts)
- `type_alias:1c122be13d716b6fba19e6a5ec2e8f11` type_alias UserDataModule (lib/common/cloud-init-common/mod.ts)
<!-- SPECD_MANAGED_END -->
