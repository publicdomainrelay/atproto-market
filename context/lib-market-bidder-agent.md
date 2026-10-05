# Context: lib-market-bidder-agent

Repository: `atproto-market`

This context exists so a desktop or CLI bidder agent can drive an AT Protocol repository through an OAuth session without depending on the unpublished DPoP fetch wrapper inside @atproto/oauth-client. It defines the session and options shapes the host application supplies, owns the DPoP proof, nonce and token-refresh mechanics that keep long-lived sessions working across clock skew, and exposes the record read/write and service-auth operations the atproto-helpers agent contract expects. It also provides the desktop adapter that layers market-specific record helpers and service calls onto createATProto, so the market bidder code has one narrow module to import rather than reaching into auth, identity and repo plumbing itself.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/market-bidder-agent/mod.ts` file mod.ts (lib/market-bidder-agent/mod.ts)
- `function:06cebf856c3be35de17c689a0ccaca29` function applyWrites (lib/market-bidder-agent/mod.ts)
- `function:08fbe16787fbdc5b92d51bda4c9a4519` function listRecords (lib/market-bidder-agent/mod.ts)
- `function:1b2e0f2694d705889bcfb6ed573a9d5a` function dpopFetch (lib/market-bidder-agent/mod.ts)
- `function:407e4c41cef3e86724e04659cedadfdb` function createOAuthAgent (lib/market-bidder-agent/mod.ts)
- `function:691e68a35723a4f0e774745f7efb891b` function refreshLock (lib/market-bidder-agent/mod.ts)
- `function:8f78299c9e8f2a298e0fa81860dd13d0` function createRecord (lib/market-bidder-agent/mod.ts)
- `function:96dc609775f8f9f5382312d19ec99f0e` function putRecord (lib/market-bidder-agent/mod.ts)
- `function:a690e444f084e1d7e654f05a07f22482` function getServiceAuth (lib/market-bidder-agent/mod.ts)
- `function:a9adf14c6ea59e323dcdd8a8ad87784f` function createDesktopATProto (lib/market-bidder-agent/mod.ts)
- `function:fdc54648c4f6169ee7c3ef17e76f9628` function getRecord (lib/market-bidder-agent/mod.ts)
- `interface:76dfa4cb57701d3cf137a9d79e664dfe` interface OAuthAgentSession (lib/market-bidder-agent/mod.ts)
- `interface:981804416897bc52d8c40722ea378abb` interface OAuthAgentOptions (lib/market-bidder-agent/mod.ts)
- `interface:ac5d8663ab340c835a37c121adbb2dac` interface DidResolverLike (lib/market-bidder-agent/mod.ts)
<!-- SPECD_MANAGED_END -->
