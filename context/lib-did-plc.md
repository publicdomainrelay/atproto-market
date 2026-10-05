# Context: lib-did-plc

Repository: `atproto-market`

This context exists so that services in atproto-market can talk to a PLC directory without each one re-implementing the HTTP surface: it centralises the DID-document and operation-log reads, operation submission, export/pagination and health checks behind one typed PlcClient, gives a typed error taxonomy (PlcNotFoundError, PlcTombstonedError, PlcInvalidOperationError, all carrying the HTTP status) so callers can distinguish missing, tombstoned and invalid-operation failures, derives DID verification keys from resolved documents for signing, and pins the wire format to the upstream OpenAPI document through a generated client plus a fixup step so the generated code stays usable.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:33b7d068752c38948075552d9cef40eb` class PlcNotFoundError (lib/did-plc/client.ts)
- `class:8a857a0ac52fbb0a4da6a57b447664ec` class PlcInvalidOperationError (lib/did-plc/client.ts)
- `class:9b6ece3d7112f0cf0be907735c5f3d5a` class PlcTombstonedError (lib/did-plc/client.ts)
- `class:a02218cd093a941f85749da7960298a5` class PlcError (lib/did-plc/client.ts)
- `class:ca276d9a71683fdf566bcdf5fb46e47c` class PlcClient (lib/did-plc/client.ts)
- `file:lib/did-plc/client.ts` file client.ts (lib/did-plc/client.ts)
- `file:lib/did-plc/fixup-openapi.ts` file fixup-openapi.ts (lib/did-plc/fixup-openapi.ts)
- `file:lib/did-plc/genesis.ts` file genesis.ts (lib/did-plc/genesis.ts)
- `file:lib/did-plc/keypair-state.ts` file keypair-state.ts (lib/did-plc/keypair-state.ts)
- `file:lib/did-plc/mod.ts` file mod.ts (lib/did-plc/mod.ts)
- `file:lib/did-plc/openapi-ts.config.ts` file openapi-ts.config.ts (lib/did-plc/openapi-ts.config.ts)
- `file:lib/did-plc/openapi.official.yaml` file openapi.official.yaml (lib/did-plc/openapi.official.yaml)
- `file:lib/did-plc/resolver.ts` file resolver.ts (lib/did-plc/resolver.ts)
- `file:lib/did-plc/types.ts` file types.ts (lib/did-plc/types.ts)
- `function:3a3751439dd48106c07530ecb7436c23` function plcClientAsKeyResolver (lib/did-plc/resolver.ts)
- `function:3b90763d12a0a4c3f820e3c6672dc372` function keysFromDidDocument (lib/did-plc/resolver.ts)
- `function:689a9b51d2e09d093defe4dfd3db3deb` function loadKeypairState (lib/did-plc/keypair-state.ts)
- `function:8da01723383daa387c12dc941628b9a7` function createGenesisOp (lib/did-plc/genesis.ts)
- `function:a44d36ee0dc159bf2beed768aaff1e61` function createPlcKeyResolver (lib/did-plc/resolver.ts)
- `function:c4d5a623ba103c6f42dd447f82559553` function saveKeypairState (lib/did-plc/keypair-state.ts)
- `function:e49cc4a90e023dc47d5a2d109f1d2f08` function createPlcDirectoryClient (lib/did-plc/client.ts)
- `interface:4c23cbfe2fc6db60fea7fe843a47a8f6` interface GenesisOptions (lib/did-plc/genesis.ts)
- `interface:4f51012b3df9c0dc5b7b93dc7b0249ba` interface PlcService (lib/did-plc/types.ts)
- `interface:5998a6ebd292373230c747dba056be85` interface GenesisResult (lib/did-plc/genesis.ts)
- `interface:d1adb282179ee1bc93186f577980da48` interface PlcKeyResolverOptions (lib/did-plc/resolver.ts)
- `interface:d20f19dc21ed3a83a1714e5dd722b53e` interface HealthResponse (lib/did-plc/types.ts)
- `interface:d759a391fe304d866db88c324e3e12bc` interface PlcClientOptions (lib/did-plc/client.ts)
- `interface:da65aed4a72e5d371a6f16031aa0ef83` interface ExportOptions (lib/did-plc/types.ts)
- `interface:df8391de25b80908a518669067a0216c` interface KeypairState (lib/did-plc/keypair-state.ts)
- `method:21f0cc8824e1b4f6b3504c835e87cf1d` method PlcClient.getAuditLog (lib/did-plc/client.ts)
- `method:3eb76e760f6161e2133b61ae52ba09e2` method PlcError.constructor (lib/did-plc/client.ts)
- `method:4a87ed875b87c760b18994d50d1b79d5` method PlcInvalidOperationError.constructor (lib/did-plc/client.ts)
- `method:56dc0a2c422513844c595e8ec9a9b661` method PlcNotFoundError.constructor (lib/did-plc/client.ts)
- `method:6265c2659cccf561f5f79d7c67669548` method PlcClient.submitOp (lib/did-plc/client.ts)
- `method:72c360d1837be5bb5dcfa1140fa19cc7` method PlcTombstonedError.constructor (lib/did-plc/client.ts)
- `method:72f0f2fbb2ecf38e70ef7708ae62c81b` method PlcClient.exportPages (lib/did-plc/client.ts)
- `method:7a27bfcb60ada39f3859bf8cd78c6fed` method PlcClient.getData (lib/did-plc/client.ts)
- `method:934b52fe49087234488561a3e9fa265c` method PlcClient.health (lib/did-plc/client.ts)
- `method:a608364390c07ffbcb4053df02e4f50c` method PlcClient.resolve (lib/did-plc/client.ts)
- `method:a8b2aede97428a79b7847a31740b5845` method PlcClient.export (lib/did-plc/client.ts)
- `method:acc069a9598f75909843cc79e05f199d` method PlcClient.getLastOp (lib/did-plc/client.ts)
- `method:ccfc740ff0345ec11783cafe8b0545c9` method PlcClient.constructor (lib/did-plc/client.ts)
- `method:f049cdcb1705123200f64a903d8d30bf` method PlcClient.getLog (lib/did-plc/client.ts)
- `type_alias:cda4456d40f40308bc05b5e1f3d08229` type_alias KeysForDid (lib/did-plc/resolver.ts)
<!-- SPECD_MANAGED_END -->
