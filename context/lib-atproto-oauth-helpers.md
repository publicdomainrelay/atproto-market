# Context: lib-atproto-oauth-helpers

Repository: `atproto-market`

This context exists so the two OAuth clients in the repository — the bidder agent and the requester — can share one DPoP-capable Web Crypto runtime and one pair of session/state stores instead of each vendoring its own. It is a library, not a program: it exposes only functions and one class, has no CLI surface, and is deliberately provider-free apart from the abstract Key and the store/runtime interfaces from @atproto/oauth-client and @atproto/jwk. Its scope is deliberately narrow — key generation and JWS signing, random bytes, hashing, in-memory OAuth state, JSON-file session persistence, client metadata, and the loopback redirect listener needed by an out-of-browser authorization-code flow.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:5a1bec4d77c5f5a5cde8c04bb59bca88` class WebCryptoKey (lib/atproto-oauth-helpers/key.ts)
- `file:lib/atproto-oauth-helpers/key.ts` file key.ts (lib/atproto-oauth-helpers/key.ts)
- `file:lib/atproto-oauth-helpers/mod.ts` file mod.ts (lib/atproto-oauth-helpers/mod.ts)
- `function:3cb1b51f5aea3838133b4e60f686144d` function load (lib/atproto-oauth-helpers/mod.ts)
- `function:653db074b84283be302a08bc6df60d44` function startLoopbackCallbackServer (lib/atproto-oauth-helpers/mod.ts)
- `function:7981a0b8b11bca99dd8741f34edb3e25` function memoryStateStore (lib/atproto-oauth-helpers/mod.ts)
- `function:a1f1c096bf7c6dd3ad9ba01660767894` function createWebCryptoKey (lib/atproto-oauth-helpers/key.ts)
- `function:c4b50dc71822e21c61d8462aa6849574` function webCryptoRuntime (lib/atproto-oauth-helpers/mod.ts)
- `function:d03b1bd1ba44ea92ad6b5bb772af7fe3` function oauthClientMetadata (lib/atproto-oauth-helpers/mod.ts)
- `function:d160bc8be496a8089360e4f03266343f` function jsonSessionStore (lib/atproto-oauth-helpers/mod.ts)
- `function:fdf5c99b8f6ee5d65a5a59079345a3b3` function save (lib/atproto-oauth-helpers/mod.ts)
- `method:26adc3684a97b0c5cac3325b5165757c` method WebCryptoKey.createJwt (lib/atproto-oauth-helpers/key.ts)
- `method:2c62f219629eb196fc241a82271bf951` method WebCryptoKey.constructor (lib/atproto-oauth-helpers/key.ts)
- `method:e6fca13262fb7317e7cd6ca588b27877` method WebCryptoKey.verifyJwt (lib/atproto-oauth-helpers/key.ts)
<!-- SPECD_MANAGED_END -->
