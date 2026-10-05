# Context: lib-requester-xrpc

Repository: `atproto-market`

This context exists so the buyer side of the atproto-market compute contract has one library owning everything from 'who is bidding' to 'run my job on the winner's machine', instead of scattering identity, discovery, payment-facing record writes and transport across callers. Bidder discovery is decentralized, so the library queries many relays and unions the results rather than trusting one index, and it double-checks a bidder is visible through the relays the requester considers capable before committing; autoDiscoverRelayUrls lets the requester derive its own capable relay list from its DID's PDS records. It also owns the requester's atproto identity — creating the PDS, writing records (optionally signed with the requester's key), and resolving bidders through service auth so calls are addressed to the right audience — and offers OAuth entrypoints so the flow can run from a user's session rather than a locally held key. The SSH and tunnel half lives here because the contract's data plane is a session to the bidder VM, so keypair generation, proxy-command construction, readiness polling and program execution sit side by side and callers cannot get the transport details half-right; the default transport is iroh (dumbpipe as ProxyCommand, ticket delivered outbound to a requester-mounted report route), with the websocket relay ProxyCommand retained for callers that still select the tunnel or fedproxy-ssh transport.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/requester-xrpc/mod.ts` file mod.ts (lib/requester-xrpc/mod.ts)
- `function:0d9d3d6b6d93185f761a2f4964ee49bb` function verifyRelayVisibility (lib/requester-xrpc/mod.ts)
- `function:3edc6abaa99ba63874c635545a3a747b` function resolveBidderEndpoint (lib/requester-xrpc/mod.ts)
- `function:5c795328ae22c94c452f17d6597b011c` function pollReady (lib/requester-xrpc/mod.ts)
- `function:632cbe71f0ff8722d80a0cb0ba08399b` function runComputeContract (lib/requester-xrpc/mod.ts)
- `function:665e903fcdb2818bcc588b10bbc0bd49` function runSession (lib/requester-xrpc/mod.ts)
- `function:66758a7acaf3aff0acb59280463595d4` function discoverBiddersFromRelays (lib/requester-xrpc/mod.ts)
- `function:699e5928da2f2317fac7ef49b347fa0b` function generateKeypair (lib/requester-xrpc/mod.ts)
- `function:8899d00f25d0e2a7541d1b9e3bdf09b0` function createRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:88b75a2e8ae839b07680e1007c6754b8` function sshTunnelArgs (lib/requester-xrpc/mod.ts)
- `function:ae6de0ce924190788eac3ef57766d794` function tunnelWsUrl (lib/requester-xrpc/mod.ts)
- `function:bd81a3f7b6a54346b173b7353bc4510e` function createSignedRepoRecord (lib/requester-xrpc/mod.ts)
- `function:c000b2ada91c81fc0cdb2653b35e1548` function ensureWebsocat (lib/requester-xrpc/mod.ts)
- `function:c83521ec4244377e343b411d54a0aa77` function createOAuthRequester (lib/requester-xrpc/mod.ts)
- `function:c9f7ed5b031745af2f0d25fcb06f9b81` function createRepoRecord (lib/requester-xrpc/mod.ts)
- `function:cd7954a3285c8b1864dc63da2ccaa84f` function sshProxyCommandFor (lib/requester-xrpc/mod.ts)
- `function:ce874d6b27886492ad4bf1215319a6e6` function discoverBiddersFromRelay (lib/requester-xrpc/mod.ts)
- `function:da7a334d163f38055041b38941891fcd` function getSession (lib/requester-xrpc/mod.ts)
- `function:e2b6547837672f5733f42865d032af1f` function callBidder (lib/requester-xrpc/mod.ts)
- `function:f563e99e361da2df75b7c59d7dccba84` function applyOAuthAgentToRequesterPDS (lib/requester-xrpc/mod.ts)
- `function:f65fcd9235835199fad62296c777bd71` function autoDiscoverRelayUrls (lib/requester-xrpc/mod.ts)
- `function:f6b8db6be3b8d85bcb12788730d8f363` function createSshSessionProvider (lib/requester-xrpc/mod.ts)
- `function:fcc08160f9bd73a04be4967cf1f0506f` function ensureDumbpipe (lib/requester-xrpc/mod.ts)
- `interface:0ce5b15f5e55fe40d2839fef4e2a246d` interface ContractState (lib/requester-xrpc/mod.ts)
- `interface:60249c02aff99aa2d31576de15e345fb` interface RequesterPDSImpl (lib/requester-xrpc/mod.ts)
- `interface:b886b478508ce8d19485ab101f5e9d6a` interface OAuthRequesterHandle (lib/requester-xrpc/mod.ts)
- `interface:cd44d6699a11b7bd00867a4a552ff7cd` interface RelayVisibilityResult (lib/requester-xrpc/mod.ts)
- `interface:fe92a285af713bba4d979f7e159519a5` interface CreateOAuthRequesterOpts (lib/requester-xrpc/mod.ts)
<!-- SPECD_MANAGED_END -->
