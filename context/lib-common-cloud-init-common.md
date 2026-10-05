# Context: lib-common-cloud-init-common

Repository: `atproto-market`

This context exists so every guest-provisioning flow in the monorepo composes cloud-init through one shared, ordered composer instead of hand-writing YAML per transport. It centralises the context shape, the patch/merge precedence rules that make layered modules compose predictably, and the string-id registry that lets a caller name a module instead of importing its function — so the tunnel, fedproxy-ssh, fedproxy-web, wootty, secrets, k3s and iroh flows agree on one precedence rule, one `#cloud-config` header owner and one notion of what a module may write into the guest. The iroh module is the transport a guest runs by default: it installs a pinned dumbpipe listener in front of the guest's own sshd on loopback, and it is the guest, not the host, that announces where it can be reached, by POSTing the listener's ticket outbound to the URL the caller baked into the context.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/cloud-init-common/mod.ts` file mod.ts (lib/common/cloud-init-common/mod.ts)
- `function:0b425646d5c4f56b16038e9c4dba15af` function buildUserData (lib/common/cloud-init-common/mod.ts)
- `function:1ae77de0a27ff635b77ee641b100a401` function buildTunnelUserData (lib/common/cloud-init-common/mod.ts)
- `function:3a913c06b2dd78bfb3e8642f2e1f8c31` function buildDefaultUserData (lib/common/cloud-init-common/mod.ts)
- `function:5652e750fb9115e1fadb54fd2a5896ff` function acceptBundleModule (lib/common/cloud-init-common/mod.ts)
- `function:9907051b938352ee02de9174900cda83` function getUserDataModules (lib/common/cloud-init-common/mod.ts)
- `function:9a6d8bf0faabdaa51874431c3858d7b2` function injectJsrUrl (lib/common/cloud-init-common/mod.ts)
- `function:bda226a178d322d23787826edd956b36` function listUserDataModules (lib/common/cloud-init-common/mod.ts)
- `function:bf7affdf70f1bc3f8c62c8326c1440e6` function flattenLabel (lib/common/cloud-init-common/mod.ts)
- `function:ffebae3212819883df36122271ebabe6` function registerUserDataModule (lib/common/cloud-init-common/mod.ts)
- `interface:092f68e9c67b840eb4354be94b83c64f` interface TunnelCloudInitContext (lib/common/cloud-init-common/mod.ts)
- `interface:0bccaee64ad56c10f80842c828570d30` interface CloudInitContext (lib/common/cloud-init-common/mod.ts)
- `interface:37b268c30817ddb5c94b9a1a7c725935` interface WriteFileEntry (lib/common/cloud-init-common/mod.ts)
- `interface:5b7b5c412dbe3c5faa57a3a411a9255c` interface UserDataPatch (lib/common/cloud-init-common/mod.ts)
- `type_alias:fc5f675691011262bc14dfb789ee9919` type_alias UserDataModule (lib/common/cloud-init-common/mod.ts)
<!-- SPECD_MANAGED_END -->
