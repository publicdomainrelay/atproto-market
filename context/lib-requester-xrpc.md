# Context: lib-requester-xrpc

Repository: `atproto-market`

This context exists so the atproto-market requester can find who is offering a compute service, prove the bidder is discoverable through relays, stand up a requester identity/repo, and then drive an SSH-tunnelled session against the winning bidder. It holds both the discovery/verification half (relay queries, relay visibility, endpoint resolution, bidder calls) and the transport half (keypair generation, ssh args, session provider, websocat, readiness polling, program execution), because the contract flow needs them in one place to run end to end. The default guest transport is now iroh: the guest's dumbpipe listener is reached through a dumbpipe connection built from the iroh ticket the bidder publishes, and the legacy websocat-over-relay ProxyCommand remains only for the fedproxy-ssh transport. The OAuth handle and agent-application helpers exist so the same flow works when the requester authenticates through an OAuth session rather than a locally held key.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/requester-xrpc/mod.ts` file mod.ts (lib/requester-xrpc/mod.ts)
- `function:0bad0cf5b6751fd238881270b5c9c907` function verifyRelayVisibility (lib/requester-xrpc/mod.ts)
- `function:168014603ee29fdc3e33868cceca773f` function createOAuthRequester (lib/requester-xrpc/mod.ts)
- `function:38c66a944431c997d72ac28acfa2b8b3` function createRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:42545a80b62102147da3337965cc8dbf` function ensureWebsocat (lib/requester-xrpc/mod.ts)
- `function:42db31525829263a5772d28b8955d218` function tunnelWsUrl (lib/requester-xrpc/mod.ts)
- `function:45bd69796946f8a0c17d1d2ae41f0ed0` function runSession (lib/requester-xrpc/mod.ts)
- `function:4e3747d1be1fa190832df67bcf2339c1` function createSshSessionProvider (lib/requester-xrpc/mod.ts)
- `function:502aea4d73f314fbada7bdeab7d5caa7` function pollReady (lib/requester-xrpc/mod.ts)
- `function:5dc1e52cca303d506c394148228348e6` function runComputeContract (lib/requester-xrpc/mod.ts)
- `function:648c5a9b93c008d11e933bd9cc3d0499` function createRepoRecord (lib/requester-xrpc/mod.ts)
- `function:6fd5064a3cf8710797225f0e1c92ed40` function getSession (lib/requester-xrpc/mod.ts)
- `function:742fa0bee0972eced0864f0199608e68` function discoverBiddersFromRelays (lib/requester-xrpc/mod.ts)
- `function:75123cd6c2ecd9939caeaeff2ac9f403` function resolveBidderEndpoint (lib/requester-xrpc/mod.ts)
- `function:90e261d66d34a637786e137d0c260cd8` function autoDiscoverRelayUrls (lib/requester-xrpc/mod.ts)
- `function:9a664640527d9f503b7475a5528d0b31` function sshTunnelArgs (lib/requester-xrpc/mod.ts)
- `function:9a74e04d247f63426fdb4ddc23b98a81` function discoverBiddersFromRelay (lib/requester-xrpc/mod.ts)
- `function:ae343b3d98725ad4c6c44cc7d268c9a2` function createSignedRepoRecord (lib/requester-xrpc/mod.ts)
- `function:d3eb3303e0c926332a27235602c7003e` function generateKeypair (lib/requester-xrpc/mod.ts)
- `function:d85e8ad86a56d4300135fb091e4bfe65` function callBidder (lib/requester-xrpc/mod.ts)
- `function:eda58f5247bca1e7df37abfa70aa54a1` function ensureDumbpipe (lib/requester-xrpc/mod.ts)
- `function:f520f09208cdcaf8c0ef8eb1e6b3621e` function applyOAuthAgentToRequesterPDS (lib/requester-xrpc/mod.ts)
- `interface:3d2c8ff0b1f5240419f60d8a8ae71ddd` interface CreateOAuthRequesterOpts (lib/requester-xrpc/mod.ts)
- `interface:4ae0e758bc6af355e90d5d253a84727f` interface ContractState (lib/requester-xrpc/mod.ts)
- `interface:66b06e1611350a7f4fb4602342352a5f` interface RequesterPDSImpl (lib/requester-xrpc/mod.ts)
- `interface:9abcf87c406c455d60dfaf993419e8b9` interface RelayVisibilityResult (lib/requester-xrpc/mod.ts)
- `interface:b9a6655a7e162aa1dfd86220525c31f1` interface OAuthRequesterHandle (lib/requester-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
