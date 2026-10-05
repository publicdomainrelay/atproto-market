# Context: lib-hono-factory-did-plc-directory

Repository: `atproto-market`

This context exists so a host can serve a did:plc style directory over HTTP without owning identity storage or cryptography: the library takes an injected PlcStore and verifySig, mounts the standard PLC route table on a Hono app, and exposes the app plus the store back to the caller. It separates the operation pipeline (structure, signature, prev-chain and rotation-key checks, CID derivation) from the transport, and keeps the DID-document projection as a pure replay of a DID's current operation log.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:6dc897b2ad83f3474c8cc21fa651b5f0` class MemoryPlcStore (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `file:lib/hono-factory-did-plc-directory/did-resolution.ts` file did-resolution.ts (lib/hono-factory-did-plc-directory/did-resolution.ts)
- `file:lib/hono-factory-did-plc-directory/factory.ts` file factory.ts (lib/hono-factory-did-plc-directory/factory.ts)
- `file:lib/hono-factory-did-plc-directory/handlers.ts` file handlers.ts (lib/hono-factory-did-plc-directory/handlers.ts)
- `file:lib/hono-factory-did-plc-directory/mod.ts` file mod.ts (lib/hono-factory-did-plc-directory/mod.ts)
- `file:lib/hono-factory-did-plc-directory/storage/plc-store.ts` file plc-store.ts (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `file:lib/hono-factory-did-plc-directory/validation.ts` file validation.ts (lib/hono-factory-did-plc-directory/validation.ts)
- `function:3179a5fa554e021c00aadca31e4500e6` function createPlcDirectoryFactory (lib/hono-factory-did-plc-directory/factory.ts)
- `function:3cdeb3d911d0b80c2f67f10b8b825205` function validateRotationKeyAuth (lib/hono-factory-did-plc-directory/validation.ts)
- `function:45efe51af646c2a859080a62330a6a54` function resolveDidDocument (lib/hono-factory-did-plc-directory/did-resolution.ts)
- `function:5503ef41dd95dd3ff95e23b6b7bd072e` function validateOperationStructure (lib/hono-factory-did-plc-directory/validation.ts)
- `function:b33678bc247c0cfd81b6157c59e5bde5` function mountHandlers (lib/hono-factory-did-plc-directory/handlers.ts)
- `function:ce60a9ce515fde8a842b8e510617e5e3` function validatePrevChain (lib/hono-factory-did-plc-directory/validation.ts)
- `function:cee54877382c117e060715b89d4affa0` function computeOperationCid (lib/hono-factory-did-plc-directory/validation.ts)
- `function:d29a8b70510a2a66739855a818989601` function verifyOperationSignature (lib/hono-factory-did-plc-directory/validation.ts)
- `interface:5a96ae66f70475a99ec34b51ef860a0b` interface PlcDirectoryOptions (lib/hono-factory-did-plc-directory/factory.ts)
- `interface:86a4aca923e87a6278f374fd01ce9547` interface PlcStore (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `interface:cc3d4161f433917a2f2ac397219b72d6` interface HandlerDeps (lib/hono-factory-did-plc-directory/handlers.ts)
- `interface:ebd7cb20d08759e13cef8d018c871479` interface PlcDirectoryFactory (lib/hono-factory-did-plc-directory/factory.ts)
- `method:5effb1ba90cc09ca38b9facc67e0e5e5` method MemoryPlcStore.getAuditLog (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:8b706b26d2ae998889c6d053a48c7fe3` method MemoryPlcStore.nullifyOps (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:b7635d15869a1ecb4b58b9cef42809a8` method MemoryPlcStore.getOpByCid (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:b796dec3c2dab2f5c026e954e2799299` method MemoryPlcStore.insertOp (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:b8ee53ece42a3057f7a82bf6033b7ab5` method MemoryPlcStore.exportLogs (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:f3ed83fb406ac57043fa578dc7d44e12` method MemoryPlcStore.getCurrentOps (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
<!-- SPECD_MANAGED_END -->
