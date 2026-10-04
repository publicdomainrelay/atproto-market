# Context: test-fixtures-cloud-init

Repository: `atproto-market`

These fixtures exist so the generated cloud-config for each module combination is pinned: the snapshot test renders each composition and asserts exact equality, so any accidental change to the composer's emitted YAML (escaping, unit contents, ordering, hardening flags) fails loudly. They also serve as the readable reference for what each module emits on the guest, since the composed strings are otherwise only visible at runtime. The iroh fixture pins the dumbpipe listener transport that replaced the did-key-ingress-proxy tunnel-subscriber.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
