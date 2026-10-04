# Context: lib-hono-factory-did-plc-directory-storage

Repository: `atproto-market`

The context exists to separate the PLC directory's persistence contract from its transport: handlers depend on the PlcStore interface rather than a concrete database, so a durable backend can be swapped in without touching routing, and MemoryPlcStore supplies a zero-dependency implementation for tests and local development. It fixes the semantics each operation must satisfy — current ops exclude nullified entries, the audit log retains them, CID lookup returns null rather than throwing on a miss, nullification is a flag flip rather than a delete, and export is a globally time-ordered, optionally counted scan across every DID.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
