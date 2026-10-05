# Context: lib-hono-factory-did-plc-directory-storage

Repository: `atproto-market`

The context exists so that the surrounding PLC directory factory, its handlers, and its mod wiring depend on an abstract PlcStore port rather than on a concrete backend, and can be given an in-memory implementation (MemoryPlcStore) for tests and single-process use. Its methods back the DID resolution, log, audit, and export endpoints: getCurrentOps feeds resolution and log reads, getAuditLog feeds the audit endpoint, getOpByCid supports single-operation retrieval, insertOp and nullifyOps service writes, and exportLogs serves global log paging.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:6dc897b2ad83f3474c8cc21fa651b5f0` class MemoryPlcStore (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `file:lib/hono-factory-did-plc-directory/storage/plc-store.ts` file plc-store.ts (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `interface:86a4aca923e87a6278f374fd01ce9547` interface PlcStore (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:5effb1ba90cc09ca38b9facc67e0e5e5` method MemoryPlcStore.getAuditLog (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:8b706b26d2ae998889c6d053a48c7fe3` method MemoryPlcStore.nullifyOps (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:b7635d15869a1ecb4b58b9cef42809a8` method MemoryPlcStore.getOpByCid (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:b796dec3c2dab2f5c026e954e2799299` method MemoryPlcStore.insertOp (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:b8ee53ece42a3057f7a82bf6033b7ab5` method MemoryPlcStore.exportLogs (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
- `method:f3ed83fb406ac57043fa578dc7d44e12` method MemoryPlcStore.getCurrentOps (lib/hono-factory-did-plc-directory/storage/plc-store.ts)
<!-- SPECD_MANAGED_END -->
