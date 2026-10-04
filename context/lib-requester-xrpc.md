# Context: lib-requester-xrpc

Repository: `atproto-market`

This context exists so the atproto-market requester can find who is offering a compute service, prove the bidder is discoverable through relays, stand up a requester identity/repo, and then drive an SSH-tunnelled session against the winning bidder. It holds both the discovery/verification half (relay queries, relay visibility, endpoint resolution, bidder calls) and the transport half (keypair generation, ssh args, session provider, dumbpipe/websocat bootstrap, readiness polling, program execution), because the contract flow needs them in one place to run end to end. The default guest transport is iroh: the guest's dumbpipe listener is reached through a dumbpipe connection built from the iroh ticket the bidder publishes, and the legacy websocat-over-relay ProxyCommand remains only for the fedproxy-ssh transport. The OAuth handle and agent-application helpers exist so the same flow works when the requester authenticates through an OAuth session rather than a locally held key.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
