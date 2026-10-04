# Context: lib-requester-xrpc

Repository: `atproto-market`

This context exists so the atproto-market requester can find who is offering a compute service, prove the bidder is discoverable through relays, stand up a requester identity/repo, and then drive an SSH-tunnelled session against the winning bidder. It holds both the discovery/verification half (relay queries, relay visibility, endpoint resolution, bidder calls) and the transport half (keypair generation, ssh args, session provider, dumbpipe/websocat bootstrap, readiness polling, program execution), because the contract flow needs them in one place to run end to end. The default guest transport is iroh: the guest's dumbpipe listener is reached through a dumbpipe connection built from the iroh ticket the guest reports to this requester's own per-contract endpoint, and the legacy websocat-over-relay ProxyCommand remains only for the fedproxy-ssh and tunnel transports. The OAuth handle and agent-application helpers exist so the same flow works when the requester authenticates through an OAuth session rather than a locally held key.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/requester-xrpc/mod.ts` file mod.ts (lib/requester-xrpc/mod.ts)
- `function:0e6067488e94711e9ab880e2e4476b4d` function getSession (lib/requester-xrpc/mod.ts)
- `function:1a27e4bd3c514b2e46780930f103d783` function defaultProxyCommand (lib/requester-xrpc/mod.ts)
- `function:222cc19853bbcc5c8364dd0045fe404d` function generateKeypair (lib/requester-xrpc/mod.ts)
- `function:37ffe4ae6cccd66c0aa2247b229cb195` function discoverBiddersFromRelays (lib/requester-xrpc/mod.ts)
- `function:41696176f7bed6e38d01de37865284bb` function runComputeContract (lib/requester-xrpc/mod.ts)
- `function:428528a07e192260e4343bfbc2f0825c` function registerOnNetworkReport (lib/requester-xrpc/mod.ts)
- `function:60489ade28c54a30e0b402c84f516db0` function ensureDumbpipe (lib/requester-xrpc/mod.ts)
- `function:645a118ca65dade01b563150f79c4f1c` function verifyRelayVisibility (lib/requester-xrpc/mod.ts)
- `function:652b6e6e3a3f60ca76738bc8a4e81d9f` function sshHelperForTransport (lib/requester-xrpc/mod.ts)
- `function:6678506da0a57fea32e638410e9241db` function createRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:8df50c647ad47ed966cd0113857e0a62` function pollReady (lib/requester-xrpc/mod.ts)
- `function:8f23f9232fd7b3e10a7daa80876608f1` function autoDiscoverRelayUrls (lib/requester-xrpc/mod.ts)
- `function:925910a9a721e285993605edc63403d3` function unregisterOnNetworkReport (lib/requester-xrpc/mod.ts)
- `function:94d31c50f3b90d6ac685ccd44787d93b` function discoverBiddersFromRelay (lib/requester-xrpc/mod.ts)
- `function:96ce7aa0d3bd68d597d4470b259710ac` function createSshSessionProvider (lib/requester-xrpc/mod.ts)
- `function:9b6bbb6a6c04557c9958f333549aa578` function createSignedRepoRecord (lib/requester-xrpc/mod.ts)
- `function:9f76009c32bcb68687c9120eaf170b92` function createRepoRecord (lib/requester-xrpc/mod.ts)
- `function:b34ec33c3d5c37092b2e048b882f896d` function createOAuthRequester (lib/requester-xrpc/mod.ts)
- `function:ba9049210dbb24c46595af3bff1e77c7` function tunnelWsUrl (lib/requester-xrpc/mod.ts)
- `function:c6dc2ce50c9ba3f3e49a087dd4a0d95e` function sshTunnelArgs (lib/requester-xrpc/mod.ts)
- `function:cc5a0cab25cd04eece1168807d82450d` function ensureWebsocat (lib/requester-xrpc/mod.ts)
- `function:cd87bb4f0b7f167d5beed9c65f7b41c8` function mountOnNetworkReportHandler (lib/requester-xrpc/mod.ts)
- `function:d95798a777303eff7760923ec8d9ca1f` function runSession (lib/requester-xrpc/mod.ts)
- `function:e74f5a09a1becd90d26cbda903c89f8f` function resolveBidderEndpoint (lib/requester-xrpc/mod.ts)
- `function:f1d87a6602f2314eae99f4b756e03d69` function callBidder (lib/requester-xrpc/mod.ts)
- `function:f6cb813eef861e20e07c2ebc5d94b8d3` function applyOAuthAgentToRequesterPDS (lib/requester-xrpc/mod.ts)
- `interface:66b06e1611350a7f4fb4602342352a5f` interface RequesterPDSImpl (lib/requester-xrpc/mod.ts)
- `interface:67624ec68624af49092967677f8abb64` interface CreateOAuthRequesterOpts (lib/requester-xrpc/mod.ts)
- `interface:6a732b7aa8df6d42f4065089513f2d9a` interface OAuthRequesterHandle (lib/requester-xrpc/mod.ts)
- `interface:6f8756b6e222ee5bc55ca93c6efe9f82` interface OnNetworkReportEntry (lib/requester-xrpc/mod.ts)
- `interface:73fc6527835ff9fd0374c64f5fd92560` interface ContractState (lib/requester-xrpc/mod.ts)
- `interface:f1991979bdf7c564cd4194b92705e667` interface RelayVisibilityResult (lib/requester-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
