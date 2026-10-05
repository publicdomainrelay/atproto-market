# Context: lib-requester-xrpc

Repository: `atproto-market`

This context exists so the atproto-market requester can find who is offering a compute service, prove the bidder is discoverable through relays, stand up a requester identity/repo, and then drive an SSH-tunnelled session against the winning bidder. It holds both the discovery/verification half (relay queries, relay visibility, endpoint resolution, bidder calls) and the transport half (keypair generation, ssh args, session provider, dumbpipe/websocat bootstrap, readiness polling, program execution), because the contract flow needs them in one place to run end to end. The default guest transport is iroh: the guest's dumbpipe listener is reached through a dumbpipe connection built from the iroh ticket the guest reports to this requester's own per-contract endpoint, and the legacy websocat-over-relay ProxyCommand remains only for the fedproxy-ssh and tunnel transports. The OAuth handle and agent-application helpers exist so the same flow works when the requester authenticates through an OAuth session rather than a locally held key.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/requester-xrpc/mod.ts` file mod.ts (lib/requester-xrpc/mod.ts)
- `function:05f1747db56cabadc5f6ab6e3449f85d` function sshHelperForTransport (lib/requester-xrpc/mod.ts)
- `function:0cfad758f2a6d57ca10bee75589464f9` function pollReady (lib/requester-xrpc/mod.ts)
- `function:0f44a3a1a18b2fcd791a7d9ef22ae305` function createSshSessionProvider (lib/requester-xrpc/mod.ts)
- `function:12eaf0ad17ff6d8bab4b52e5a66d385c` function runSession (lib/requester-xrpc/mod.ts)
- `function:157aa26c1ed858690975a5d7fdf4c914` function verifyWorkloadIdentityToken (lib/requester-xrpc/mod.ts)
- `function:18c117cef9c33be9e08c56764fb4c7c0` function sshTunnelArgs (lib/requester-xrpc/mod.ts)
- `function:1aca71352ce4a3cd55950fec61b6fd97` function getSession (lib/requester-xrpc/mod.ts)
- `function:1f57212d616c28959604941460c290e3` function registerOnNetworkReport (lib/requester-xrpc/mod.ts)
- `function:26df704dd1c608202a67c70e44f5f77d` function createRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:46417b98f98f9668b28f9917a3270f97` function defaultProxyCommand (lib/requester-xrpc/mod.ts)
- `function:5ec26f410d013dd78efb43c1d146b71a` function tunnelWsUrl (lib/requester-xrpc/mod.ts)
- `function:65479b3d9be6afd64d84388634542230` function unregisterOnNetworkReport (lib/requester-xrpc/mod.ts)
- `function:6e1a53f2a5f998ab393b6e6c7b5a1c27` function runComputeContract (lib/requester-xrpc/mod.ts)
- `function:6f04ae9505e51b674d556023926ad0f7` function createSignedRepoRecord (lib/requester-xrpc/mod.ts)
- `function:6f74d9a735faf0fd8ce7bdec66e464a9` function callBidder (lib/requester-xrpc/mod.ts)
- `function:8c1b91c6f5d9a94296bf7798a12c8875` function discoverBiddersFromRelays (lib/requester-xrpc/mod.ts)
- `function:8ed939d7ad2b60aebb38d2cbe4394220` function createRepoRecord (lib/requester-xrpc/mod.ts)
- `function:ad09ffbcefa45b14c57c5b905f9d454f` function generateKeypair (lib/requester-xrpc/mod.ts)
- `function:ae30cc2203a682953aed241849efcdb1` function verifyRelayVisibility (lib/requester-xrpc/mod.ts)
- `function:b686544d44c9229bebbe6ce959e732c7` function mountOnNetworkReportHandler (lib/requester-xrpc/mod.ts)
- `function:b72b77dd8ed942d7244b06797219a93c` function ensureDumbpipe (lib/requester-xrpc/mod.ts)
- `function:d436ee0adb5e809653ffd94fe10102b9` function resolveBidderEndpoint (lib/requester-xrpc/mod.ts)
- `function:e22c7ccbcae3589afb91df183f271e60` function createOAuthRequester (lib/requester-xrpc/mod.ts)
- `function:e637f6fe80402e111638fe1f1cd4becd` function autoDiscoverRelayUrls (lib/requester-xrpc/mod.ts)
- `function:e92e0453b17d1c801ff58eeae3be4116` function discoverBiddersFromRelay (lib/requester-xrpc/mod.ts)
- `function:ed88e0337428a63a473f550045d34de3` function applyOAuthAgentToRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:f6a15c1645c6864e0618555257500686` function ensureWebsocat (lib/requester-xrpc/mod.ts)
- `interface:14702c13c4bcbe07dcb775a82ce9ff0a` interface CreateOAuthRequesterOpts (lib/requester-xrpc/mod.ts)
- `interface:1e8bec56c87884c994d1138f1501733e` interface OAuthRequesterHandle (lib/requester-xrpc/mod.ts)
- `interface:1eb256fa9514c878ebe7f6621e88fd04` interface OnNetworkReportEntry (lib/requester-xrpc/mod.ts)
- `interface:2c60cf94f5bc84d54a207d32606eef0b` interface RelayVisibilityResult (lib/requester-xrpc/mod.ts)
- `interface:33b2e4c18cd26904063ec9333aa13b9a` interface RequesterPDSImpl (lib/requester-xrpc/mod.ts)
- `interface:4bbf57764c94584c6a1e9f7853d0fc55` interface ContractState (lib/requester-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
