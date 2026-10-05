# Context: lib-common-cloud-init-common

Repository: `atproto-market`

This context exists so every guest-provisioning flow in the monorepo composes cloud-init through one shared, ordered composer instead of hand-writing YAML per transport. It centralises the context shape, the patch/merge precedence rules that make layered modules compose predictably, and the string-id registry that lets a caller name a module instead of importing its function — so the tunnel, fedproxy-ssh, fedproxy-web, wootty, secrets, k3s and iroh flows agree on one precedence rule, one `#cloud-config` header owner and one notion of what a module may write into the guest. The iroh module is the transport a guest runs by default: it installs a pinned dumbpipe listener in front of the guest's own sshd on loopback, and it is the guest, not the host, that announces where it can be reached, by POSTing the listener's ticket outbound to the URL the caller baked into the context.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/cloud-init-common/mod.ts` file mod.ts (lib/common/cloud-init-common/mod.ts)
- `function:4b5291e8f10c0cf8f4ac044370b5d20e` function acceptBundleModule (lib/common/cloud-init-common/mod.ts)
- `function:551af720488c464d56cac19e409b8ca3` function buildTunnelUserData (lib/common/cloud-init-common/mod.ts)
- `function:a68626e26bed80b6d685682d2680efdb` function registerUserDataModule (lib/common/cloud-init-common/mod.ts)
- `function:a852acc6663f06c9724c3272a33b42a4` function listUserDataModules (lib/common/cloud-init-common/mod.ts)
- `function:b171eb2dbd8264151491ce36f02925d2` function buildUserData (lib/common/cloud-init-common/mod.ts)
- `function:b757a298771ae8dcbe1086c37860fb1e` function getUserDataModules (lib/common/cloud-init-common/mod.ts)
- `function:c42fe19fa18470a330f72a65da020d2d` function flattenLabel (lib/common/cloud-init-common/mod.ts)
- `function:c89637f348f562927cb49e741a2df2ad` function buildDefaultUserData (lib/common/cloud-init-common/mod.ts)
- `function:ef90183afd35949cd0143b7d3681b88e` function injectJsrUrl (lib/common/cloud-init-common/mod.ts)
- `interface:0bccaee64ad56c10f80842c828570d30` interface CloudInitContext (lib/common/cloud-init-common/mod.ts)
- `interface:a1ea99f0f39ad710f4f5c37a44b76b5a` interface TunnelCloudInitContext (lib/common/cloud-init-common/mod.ts)
- `interface:a70dcded359cb8e179e375b8adc0876c` interface UserDataPatch (lib/common/cloud-init-common/mod.ts)
- `interface:ce3efe5cd2d89f183f1c90bd06992a98` interface WriteFileEntry (lib/common/cloud-init-common/mod.ts)
- `type_alias:41d76c33929582b594b1d002d3176708` type_alias UserDataModule (lib/common/cloud-init-common/mod.ts)
<!-- SPECD_MANAGED_END -->
