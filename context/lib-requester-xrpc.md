# Context: lib-requester-xrpc

Repository: `atproto-market`

This context exists so the atproto-market requester can find who is offering a compute service, prove the bidder is discoverable through relays, stand up a requester identity/repo, and then drive an SSH-tunnelled session against the winning bidder. It holds both the discovery/verification half (relay queries, relay visibility, endpoint resolution, bidder calls) and the transport half (keypair generation, ssh args, session provider, dumbpipe/websocat bootstrap, readiness polling, program execution), because the contract flow needs them in one place to run end to end. The default guest transport is iroh: the guest's dumbpipe listener is reached through a dumbpipe connection built from the iroh ticket the guest reports to this requester's own per-contract endpoint, and the legacy websocat-over-relay ProxyCommand remains only for the fedproxy-ssh and tunnel transports. The OAuth handle and agent-application helpers exist so the same flow works when the requester authenticates through an OAuth session rather than a locally held key.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/requester-xrpc/mod.ts` file mod.ts (lib/requester-xrpc/mod.ts)
- `function:04d27f9568ed8102cba9faf3289286bf` function runComputeContract (lib/requester-xrpc/mod.ts)
- `function:0905a8668f646e545d2eee135b98e164` function discoverBiddersFromRelay (lib/requester-xrpc/mod.ts)
- `function:140dadee0b873ea79f860c9afe8e1d93` function defaultProxyCommand (lib/requester-xrpc/mod.ts)
- `function:1d588c78426adb66e36d6f6c9bc27725` function getSession (lib/requester-xrpc/mod.ts)
- `function:21f56da2b9cdd75bc9ac81b308e61df1` function createSignedRepoRecord (lib/requester-xrpc/mod.ts)
- `function:23df2468906ae13b777112492d90b05b` function autoDiscoverRelayUrls (lib/requester-xrpc/mod.ts)
- `function:3447907260a0fcee0bcc8b318e2c1862` function requesterApp (lib/requester-xrpc/mod.ts)
- `function:347b5c9a9248125a1552ad56b3dab154` function applyOAuthAgentToRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:3ee0b1bf380922d6d7077efbdaa4bfd7` function verifyRelayVisibility (lib/requester-xrpc/mod.ts)
- `function:4ccb17fdbb9c3b290a196a9a7a87744a` function registerOnNetworkReport (lib/requester-xrpc/mod.ts)
- `function:6a9e95af73ab8159d2cbe22b56b26393` function mountOnNetworkReportHandler (lib/requester-xrpc/mod.ts)
- `function:6ddaad610232a09ef91019d0617337b0` function unregisterOnNetworkReport (lib/requester-xrpc/mod.ts)
- `function:784207610f82de1a689784e9deaf47e6` function sshTunnelArgs (lib/requester-xrpc/mod.ts)
- `function:92a8839f14ca40e1a2ba046f349d57b2` function pollReady (lib/requester-xrpc/mod.ts)
- `function:92de6dd67bbcc1e2f20d810f371b2b6b` function createRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:93238be8f35c6ceb0813ef4aad574d5a` function createRepoRecord (lib/requester-xrpc/mod.ts)
- `function:9bf1f659af305ad4bb6e03b09e1aa7fe` function runSession (lib/requester-xrpc/mod.ts)
- `function:9d0c13755d5ff8f03602375056c9c6c3` function callBidder (lib/requester-xrpc/mod.ts)
- `function:a3fc9a3b85143dbaa434e269dd75cf0e` function ensureWebsocat (lib/requester-xrpc/mod.ts)
- `function:a81adefb1fd1a85d613cd5bc4eab6659` function sshHelperForTransport (lib/requester-xrpc/mod.ts)
- `function:a84b4248b2a1b4d058f0f82fb1177946` function createOAuthRequester (lib/requester-xrpc/mod.ts)
- `function:c0acf6b42c1d903a69ea183c1c2bcbd5` function generateKeypair (lib/requester-xrpc/mod.ts)
- `function:ca5512b1850651446ba10067b408bf2e` function resolveBidderEndpoint (lib/requester-xrpc/mod.ts)
- `function:d7ee9b90b3b5b576e4b8f500fe4f8cde` function createSshSessionProvider (lib/requester-xrpc/mod.ts)
- `function:e5cbaf8edf9559cc75cdd46ffb76bf95` function ensureDumbpipe (lib/requester-xrpc/mod.ts)
- `function:f0041abee4623b6562227c380bcc0688` function discoverBiddersFromRelays (lib/requester-xrpc/mod.ts)
- `function:fe91374b53af51d927a4ed9843f4fb8e` function tunnelWsUrl (lib/requester-xrpc/mod.ts)
- `interface:1a4c39f163763de8ecaaec1559a031ee` interface OAuthRequesterHandle (lib/requester-xrpc/mod.ts)
- `interface:530d5e9dd0eeead3e19c4a275b85159d` interface OnNetworkReportEntry (lib/requester-xrpc/mod.ts)
- `interface:66b06e1611350a7f4fb4602342352a5f` interface RequesterPDSImpl (lib/requester-xrpc/mod.ts)
- `interface:7976e76ab81c77e90e7aa4201ff10c1d` interface ContractState (lib/requester-xrpc/mod.ts)
- `interface:8b15050751370a6014f008aea65b779c` interface CreateOAuthRequesterOpts (lib/requester-xrpc/mod.ts)
- `interface:b0fc591071d1c61b6e0c5a85ff0d4f55` interface RelayVisibilityResult (lib/requester-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
