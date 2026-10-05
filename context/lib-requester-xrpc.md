# Context: lib-requester-xrpc

Repository: `atproto-market`

This context exists so the buyer side of the atproto-market compute contract has one library owning everything from 'who is bidding' to 'run my job on the winner's machine', instead of scattering identity, discovery, payment-facing record writes and transport across callers. Bidder discovery is decentralized, so the library queries many relays and unions the results rather than trusting one index, and it double-checks a bidder is visible through the relays the requester considers capable before committing; autoDiscoverRelayUrls lets the requester derive its own capable relay list from its DID's PDS records. It also owns the requester's atproto identity — creating the PDS, writing records (optionally signed with the requester's key), and resolving bidders through service auth so calls are addressed to the right audience — and offers OAuth entrypoints so the flow can run from a user's session rather than a locally held key. The SSH and tunnel half lives here because the contract's data plane is a session to the bidder VM, so keypair generation, proxy-command construction, readiness polling and program execution sit side by side and callers cannot get the transport details half-right; the default transport is iroh (dumbpipe as ProxyCommand, ticket delivered outbound to a requester-mounted report route), with the websocket relay ProxyCommand retained for callers that still select the tunnel or fedproxy-ssh transport.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/requester-xrpc/mod.ts` file mod.ts (lib/requester-xrpc/mod.ts)
- `function:0bad0cf5b6751fd238881270b5c9c907` function verifyRelayVisibility (lib/requester-xrpc/mod.ts)
- `function:24cd5e86c9d21bc8fab0490f83ce6950` function ensureWebsocat (lib/requester-xrpc/mod.ts)
- `function:38c66a944431c997d72ac28acfa2b8b3` function createRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:504104de944999687ef7f977cf1a877e` function createSshSessionProvider (lib/requester-xrpc/mod.ts)
- `function:648c5a9b93c008d11e933bd9cc3d0499` function createRepoRecord (lib/requester-xrpc/mod.ts)
- `function:64cfc2d9d837801a774327163a75249d` function getSession (lib/requester-xrpc/mod.ts)
- `function:742fa0bee0972eced0864f0199608e68` function discoverBiddersFromRelays (lib/requester-xrpc/mod.ts)
- `function:75123cd6c2ecd9939caeaeff2ac9f403` function resolveBidderEndpoint (lib/requester-xrpc/mod.ts)
- `function:90e261d66d34a637786e137d0c260cd8` function autoDiscoverRelayUrls (lib/requester-xrpc/mod.ts)
- `function:95447d450ff2f97655147e5dd97a5f89` function createOAuthRequester (lib/requester-xrpc/mod.ts)
- `function:962522e8fb20541868ff3b3934e3b3e5` function tunnelWsUrl (lib/requester-xrpc/mod.ts)
- `function:9a74e04d247f63426fdb4ddc23b98a81` function discoverBiddersFromRelay (lib/requester-xrpc/mod.ts)
- `function:9b364db7648609d2fe412033f27b13de` function generateKeypair (lib/requester-xrpc/mod.ts)
- `function:ae343b3d98725ad4c6c44cc7d268c9a2` function createSignedRepoRecord (lib/requester-xrpc/mod.ts)
- `function:cc3275d83d779e08c41a10fded40e3d6` function sshTunnelArgs (lib/requester-xrpc/mod.ts)
- `function:d85e8ad86a56d4300135fb091e4bfe65` function callBidder (lib/requester-xrpc/mod.ts)
- `function:df478a6e7b5f0870c41a1822b1442ea5` function runComputeContract (lib/requester-xrpc/mod.ts)
- `function:ef9dc35948925beeecf54c12a5fd9ee1` function pollReady (lib/requester-xrpc/mod.ts)
- `function:f6c7b7f574083e9a9c42bbd6a843c416` function applyOAuthAgentToRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:fbac4e60f3f0951146764aaa7623d831` function runSession (lib/requester-xrpc/mod.ts)
- `interface:183e44891c1f0a54e056e43ec047be13` interface CreateOAuthRequesterOpts (lib/requester-xrpc/mod.ts)
- `interface:4ae0e758bc6af355e90d5d253a84727f` interface ContractState (lib/requester-xrpc/mod.ts)
- `interface:50f477ac838492f2bd615735976c685e` interface OAuthRequesterHandle (lib/requester-xrpc/mod.ts)
- `interface:66b06e1611350a7f4fb4602342352a5f` interface RequesterPDSImpl (lib/requester-xrpc/mod.ts)
- `interface:9abcf87c406c455d60dfaf993419e8b9` interface RelayVisibilityResult (lib/requester-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
