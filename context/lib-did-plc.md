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
- `file:lib/did-plc/generated/client.gen.ts` file client.gen.ts (lib/did-plc/generated/client.gen.ts)
- `file:lib/did-plc/generated/client/client.gen.ts` file client.gen.ts (lib/did-plc/generated/client/client.gen.ts)
- `file:lib/did-plc/generated/client/index.ts` file index.ts (lib/did-plc/generated/client/index.ts)
- `file:lib/did-plc/generated/client/types.gen.ts` file types.gen.ts (lib/did-plc/generated/client/types.gen.ts)
- `file:lib/did-plc/generated/client/utils.gen.ts` file utils.gen.ts (lib/did-plc/generated/client/utils.gen.ts)
- `file:lib/did-plc/generated/core/auth.gen.ts` file auth.gen.ts (lib/did-plc/generated/core/auth.gen.ts)
- `file:lib/did-plc/generated/core/bodySerializer.gen.ts` file bodySerializer.gen.ts (lib/did-plc/generated/core/bodySerializer.gen.ts)
- `file:lib/did-plc/generated/core/params.gen.ts` file params.gen.ts (lib/did-plc/generated/core/params.gen.ts)
- `file:lib/did-plc/generated/core/pathSerializer.gen.ts` file pathSerializer.gen.ts (lib/did-plc/generated/core/pathSerializer.gen.ts)
- `file:lib/did-plc/generated/core/queryKeySerializer.gen.ts` file queryKeySerializer.gen.ts (lib/did-plc/generated/core/queryKeySerializer.gen.ts)
- `file:lib/did-plc/generated/core/serverSentEvents.gen.ts` file serverSentEvents.gen.ts (lib/did-plc/generated/core/serverSentEvents.gen.ts)
- `file:lib/did-plc/generated/core/types.gen.ts` file types.gen.ts (lib/did-plc/generated/core/types.gen.ts)
- `file:lib/did-plc/generated/core/utils.gen.ts` file utils.gen.ts (lib/did-plc/generated/core/utils.gen.ts)
- `file:lib/did-plc/generated/index.ts` file index.ts (lib/did-plc/generated/index.ts)
- `file:lib/did-plc/generated/sdk.gen.ts` file sdk.gen.ts (lib/did-plc/generated/sdk.gen.ts)
- `file:lib/did-plc/generated/types.gen.ts` file types.gen.ts (lib/did-plc/generated/types.gen.ts)
- `file:lib/did-plc/genesis.ts` file genesis.ts (lib/did-plc/genesis.ts)
- `file:lib/did-plc/keypair-state.ts` file keypair-state.ts (lib/did-plc/keypair-state.ts)
- `file:lib/did-plc/mod.ts` file mod.ts (lib/did-plc/mod.ts)
- `file:lib/did-plc/openapi-ts.config.ts` file openapi-ts.config.ts (lib/did-plc/openapi-ts.config.ts)
- `file:lib/did-plc/openapi.official.yaml` file openapi.official.yaml (lib/did-plc/openapi.official.yaml)
- `file:lib/did-plc/resolver.ts` file resolver.ts (lib/did-plc/resolver.ts)
- `file:lib/did-plc/types.ts` file types.ts (lib/did-plc/types.ts)
- `function:0131a84b31ad85543599f7fcdc257d17` function createConfig (lib/did-plc/generated/client/utils.gen.ts)
- `function:045b120064539e4384e726f1ad3a6cfd` function mergeConfigs (lib/did-plc/generated/client/utils.gen.ts)
- `function:0eec6a8b5f95850e00b60b674c319208` function separatorArrayExplode (lib/did-plc/generated/core/pathSerializer.gen.ts)
- `function:0f780cea28411c032283f1ed477292f0` function resolveDid (lib/did-plc/generated/sdk.gen.ts)
- `function:1495d4cb8fc5849c95ebfe53032eb6d5` function createPlcOp (lib/did-plc/generated/sdk.gen.ts)
- `function:188d765b509d3931cfcc5bbfffb2b7dc` function createClient (lib/did-plc/generated/client/client.gen.ts)
- `function:2c8cda686039039edfb62906f1c7b8e4` function getLastOp (lib/did-plc/generated/sdk.gen.ts)
- `function:322f298b5f2b35c454545e9e7383ed23` function stringifyToJsonValue (lib/did-plc/generated/core/queryKeySerializer.gen.ts)
- `function:328544b37c6f5c21f27f71b2df1541fe` function createSseClient (lib/did-plc/generated/core/serverSentEvents.gen.ts)
- `function:3a3751439dd48106c07530ecb7436c23` function plcClientAsKeyResolver (lib/did-plc/resolver.ts)
- `function:3aa423aa49ce15b5c281fdf674ccea83` function serializeArrayParam (lib/did-plc/generated/core/pathSerializer.gen.ts)
- `function:3b90763d12a0a4c3f820e3c6672dc372` function keysFromDidDocument (lib/did-plc/resolver.ts)
- `function:44cf0e94fd6213ef2ce23d5c6a2d1d08` function defaultPathSerializer (lib/did-plc/generated/core/utils.gen.ts)
- `function:4d0581d5775526dc30563286eee15cf9` function export_ (lib/did-plc/generated/sdk.gen.ts)
- `function:52c78b83773379b2af971b52fe7d344b` function separatorObjectExplode (lib/did-plc/generated/core/pathSerializer.gen.ts)
- `function:5cc56f8414c5363a5723ab1d53a49283` function mergeHeaders (lib/did-plc/generated/client/utils.gen.ts)
- `function:689a9b51d2e09d093defe4dfd3db3deb` function loadKeypairState (lib/did-plc/keypair-state.ts)
- `function:6b40f3b794b4bad43b14cd20458c4211` function serializeObjectParam (lib/did-plc/generated/core/pathSerializer.gen.ts)
- `function:6da9c83dca2343cb8d6ab89b226694e3` function getValidRequestBody (lib/did-plc/generated/core/utils.gen.ts)
- `function:726d44cabe8461d0ca02ce11929e1984` function getAuthToken (lib/did-plc/generated/core/auth.gen.ts)
- `function:8197f5c8b53dd102aab15a4859eb9eff` function getPlcOpLog (lib/did-plc/generated/sdk.gen.ts)
- `function:8458ee58b9d6ddeb478f0901d8d49b7a` function getParseAs (lib/did-plc/generated/client/utils.gen.ts)
- `function:857ac81730785f9de7bbc011af2905ee` function buildClientParams (lib/did-plc/generated/core/params.gen.ts)
- `function:8a8169ef157538cd873bebae1c7e4b7c` function getUrl (lib/did-plc/generated/core/utils.gen.ts)
- `function:8b30a2691d351681cfd7042ce1e15408` function buildUrl (lib/did-plc/generated/client/utils.gen.ts)
- `function:8da01723383daa387c12dc941628b9a7` function createGenesisOp (lib/did-plc/genesis.ts)

_110 more reference(s) indexed but not listed here to stay inside the 1500-token budget._
<!-- SPECD_MANAGED_END -->
