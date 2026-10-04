# Context: lib-abc-market

Repository: `atproto-market`

This context exists so that market logic can be written and tested once against interfaces, and then bound to whatever transport or credential backend a deployment uses. A market implementation depends on this package instead of on a concrete server, which lets pushes over an XRPC endpoint and self-discovered firehose records share the same handlers, and lets settlement be either an x402 paid flow or a free one behind the same Settlement interface. Everything here is types, small pure helpers, and error classes; the host supplies the resolver, logger, signer, and agent.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:9828d35cfd8b58a1cd6a8a7f61cbd771` class RecordVersionError (lib/abc/market/resolve.ts)
- `class:d2f9b5d5998f84730325047d9db1340d` class ContractGraphError (lib/abc/market/contract.ts)
- `file:lib/abc/market/attestation.ts` file attestation.ts (lib/abc/market/attestation.ts)
- `file:lib/abc/market/callbacks.ts` file callbacks.ts (lib/abc/market/callbacks.ts)
- `file:lib/abc/market/contract.ts` file contract.ts (lib/abc/market/contract.ts)
- `file:lib/abc/market/mod.ts` file mod.ts (lib/abc/market/mod.ts)
- `file:lib/abc/market/resolve.ts` file resolve.ts (lib/abc/market/resolve.ts)
- `file:lib/abc/market/settlement.ts` file settlement.ts (lib/abc/market/settlement.ts)
- `function:0b5e12ce3c1c857f2c95548a731c5193` function parseAtUri (lib/abc/market/resolve.ts)
- `function:43e20fb2680803ef7ecfd166aff58966` function atUriAuthority (lib/abc/market/resolve.ts)
- `function:4c0fc8eba95ff6940c69d8c957e19f82` function resolvedRef (lib/abc/market/resolve.ts)
- `function:6098bf13a256d45b83e56dba75b170ba` function refsEqual (lib/abc/market/resolve.ts)
- `function:a0b78ea629d02463b11bee34bbee99c3` function stripResolved (lib/abc/market/resolve.ts)
- `function:e01a0614b1d05394405331fc4f91dd7a` function refKey (lib/abc/market/resolve.ts)
- `function:e1b677a59c449d5b3a8df99e8c065aaa` function nsidFromUri (lib/abc/market/resolve.ts)
- `function:ff7b2b644f6f0a994b9f5492fe767eb8` function receiptUrlFor (lib/abc/market/settlement.ts)
- `interface:1a01cd0adebae6ece66a71a28e7e34ca` interface RecordRef (lib/abc/market/resolve.ts)
- `interface:2e006fab2ae9f1b1265f8f1d98886565` interface SubmitAcceptContext (lib/abc/market/callbacks.ts)
- `interface:30de74b08ca0dfbe29306bb852e2c2f5` interface ContractGraph (lib/abc/market/contract.ts)
- `interface:463898e97d88180ba985082bf1910898` interface SettlementCtx (lib/abc/market/settlement.ts)
- `interface:46637b41730d998d7409bb094a199fbe` interface RecordResolver (lib/abc/market/resolve.ts)
- `interface:50e55cd486d00a6d88fbbbc9513ea0be` interface AtUriParts (lib/abc/market/resolve.ts)
- `interface:534292774b0efca0f35c954e05c1c3e0` interface Settlement (lib/abc/market/settlement.ts)
- `interface:783b2e7264d1c2455e923a183aa08af2` interface EventDispatchContext (lib/abc/market/callbacks.ts)
- `interface:7c4ceebaecd03e6d27746999a54821d2` interface AttestationKeypair (lib/abc/market/attestation.ts)
- `interface:9be2bacad9b50e4fe402adc03562b2fb` interface SubmitBidContext (lib/abc/market/callbacks.ts)
- `interface:ff0c27330e697df5114c8bef0c21e380` interface SubmitRfpContext (lib/abc/market/callbacks.ts)
- `method:9bca3b5354a39ba5e5a08834053af403` method ContractGraphError.constructor (lib/abc/market/contract.ts)
- `method:cb5ff5f27df8f18f6f47ed0cb0207572` method RecordVersionError.constructor (lib/abc/market/resolve.ts)
- `type_alias:072e38723584e04ddf9824fe73b8ae8d` type_alias SubmitAcceptCallback (lib/abc/market/callbacks.ts)
- `type_alias:15b66e1486bb1129d9a6b3136080517b` type_alias SettlementMode (lib/abc/market/settlement.ts)
- `type_alias:32fcebe14317b9d1b49d3b48bcb3ca40` type_alias SubmitRfpCallback (lib/abc/market/callbacks.ts)
- `type_alias:5c297d7e51972b79b3f90a4857f9f822` type_alias EventCallback (lib/abc/market/callbacks.ts)
- `type_alias:5f2c2806cdf4c52f0324b4d29875f620` type_alias SubmitBidCallback (lib/abc/market/callbacks.ts)
- `type_alias:a5fad144b700800ee41170bd530c2038` type_alias EventCallbacks (lib/abc/market/callbacks.ts)
- `type_alias:c2e697175930be3ef1c6b21a7b6e1472` type_alias HandlerResult (lib/abc/market/callbacks.ts)
- `type_alias:caeab7a15e595c198b75e96251bfe5d8` type_alias RfpCallbacks (lib/abc/market/callbacks.ts)
<!-- SPECD_MANAGED_END -->
