# Context: lib-requester-xrpc

Repository: `atproto-market`

This context exists so the atproto-market requester can find who is offering a compute service, prove the bidder is discoverable through relays, stand up a requester identity/repo, and then drive an SSH-tunnelled session against the winning bidder. It holds both the discovery/verification half (relay queries, relay visibility, endpoint resolution, bidder calls) and the transport half (keypair generation, ssh args, session provider, dumbpipe/websocat bootstrap, readiness polling, program execution), because the contract flow needs them in one place to run end to end. The default guest transport is iroh: the guest's dumbpipe listener is reached through a dumbpipe connection built from the iroh ticket the guest reports to this requester's own per-contract endpoint, and the legacy websocat-over-relay ProxyCommand remains only for the fedproxy-ssh and tunnel transports. The OAuth handle and agent-application helpers exist so the same flow works when the requester authenticates through an OAuth session rather than a locally held key.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/requester-xrpc/mod.ts` file mod.ts (lib/requester-xrpc/mod.ts)
- `function:0075938259a73278542af5e765fd55ef` function ensureDumbpipe (lib/requester-xrpc/mod.ts)
- `function:0a7df8a187f7018b43bd51b75248f8c4` function applyOAuthAgentToRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:0cd3438d7c2c1ad331597f64098638d9` function runComputeContract (lib/requester-xrpc/mod.ts)
- `function:1b6baeba6082cdb1da6945622efad731` function pollReady (lib/requester-xrpc/mod.ts)
- `function:2d1bf952fe291b713f61f12b557105dd` function mountOnNetworkReportHandler (lib/requester-xrpc/mod.ts)
- `function:321956a5101fb3df2e4d573079236eeb` function registerOnNetworkReport (lib/requester-xrpc/mod.ts)
- `function:342d1188d9698ec83e1f6b97c1632df1` function createOAuthRequester (lib/requester-xrpc/mod.ts)
- `function:41ceb449fbf6229506bd85f70b83f716` function discoverBiddersFromRelays (lib/requester-xrpc/mod.ts)
- `function:5c1991874788142cc2ab3d44183650ff` function unregisterOnNetworkReport (lib/requester-xrpc/mod.ts)
- `function:5c53130fbf21ecedc708f9ab61488576` function getSession (lib/requester-xrpc/mod.ts)
- `function:5ef7b6e5fbaa1ae26589ef381096b017` function autoDiscoverRelayUrls (lib/requester-xrpc/mod.ts)
- `function:61da546f6dd64105a3c8c13c29be883e` function generateKeypair (lib/requester-xrpc/mod.ts)
- `function:6884e2122e47b57e2d7fd4b7259d8f63` function ensureWebsocat (lib/requester-xrpc/mod.ts)
- `function:850281a8c7621fcd8159572baa903de8` function tunnelWsUrl (lib/requester-xrpc/mod.ts)
- `function:890b32a40a72056281ebef7a751090dd` function requesterApp (lib/requester-xrpc/mod.ts)
- `function:9d7f979c7ece35e4174afe3e194d87cb` function sshTunnelArgs (lib/requester-xrpc/mod.ts)
- `function:9f92709f904c2a37ba208467151f7989` function createSignedRepoRecord (lib/requester-xrpc/mod.ts)
- `function:9fda7d994e09cd1743f9964c4fb020af` function runSession (lib/requester-xrpc/mod.ts)
- `function:a3652fe607a5594ef8531ca61037e10c` function verifyRelayVisibility (lib/requester-xrpc/mod.ts)
- `function:bac8b585ae7cae6e2ef2ad30ef4f34a6` function sshHelperForTransport (lib/requester-xrpc/mod.ts)
- `function:d2995b9c7ebac6408049b6c847c82292` function resolveBidderEndpoint (lib/requester-xrpc/mod.ts)
- `function:d4ceaa06023f4d0879829acb87c89fd8` function createSshSessionProvider (lib/requester-xrpc/mod.ts)
- `function:e36380a79d877b9130cbd50a74c33d23` function createRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:e71d5771cfa9f72725d66b9acd2b7adc` function createRepoRecord (lib/requester-xrpc/mod.ts)
- `function:ebb3bcc33437605d2f1f749b98775956` function discoverBiddersFromRelay (lib/requester-xrpc/mod.ts)
- `function:ec400e6c809917a59282b153ebc79b78` function defaultProxyCommand (lib/requester-xrpc/mod.ts)
- `function:fb9d428cdc62ac0d0444148b55352ac7` function callBidder (lib/requester-xrpc/mod.ts)
- `interface:5a26f5975b47ddf268d06895f9a77ad3` interface RelayVisibilityResult (lib/requester-xrpc/mod.ts)
- `interface:5b9a1817619fea9896ffd7fbe8a9f7ef` interface CreateOAuthRequesterOpts (lib/requester-xrpc/mod.ts)
- `interface:66375832005ed0ce376141969e3465a8` interface OnNetworkReportEntry (lib/requester-xrpc/mod.ts)
- `interface:66b06e1611350a7f4fb4602342352a5f` interface RequesterPDSImpl (lib/requester-xrpc/mod.ts)
- `interface:9e9699b6ca8206a398ed4799007d146e` interface ContractState (lib/requester-xrpc/mod.ts)
- `interface:a5e3a9ba94638b26882eebc61acb1bff` interface OAuthRequesterHandle (lib/requester-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
