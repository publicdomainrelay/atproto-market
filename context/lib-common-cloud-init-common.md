# Context: lib-common-cloud-init-common

Repository: `atproto-market`

This context exists so every consumer (requester, compute-contract gateway, guest-capability) composes guest cloud-init from one place instead of hand-writing YAML per transport: transports are registered as named modules, and callers select and layer them. The context is consumed by the requester-XRPC, compute-contract-gateway-XRPC, abc/requester and abc/guest-capability packages, so its merge semantics, precedence and module ids are a cross-package contract. The `iroh` module is the guest-side SSH transport that replaces the did-key-ingress-proxy tunnel-subscriber: it installs dumbpipe, listens on the guest's sshd, and writes the iroh ticket where the compute provider reads it.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
