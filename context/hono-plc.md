# Context: hono-plc

Repository: `atproto-market`

This context exists so the did:plc directory server can be launched as a process: it is the composition root that turns declarative configuration plus an injected store into a listening HTTP service. It owns exactly the wiring that no library layer may own, namely option resolution from cli-args-env.json and config.json, store and factory construction, address and TLS binding, port-file publication, app mounting, signal handling, and process lifecycle, while the actual PLC directory semantics stay in the lib/hono-factory-did-plc-directory dependency it declares. Anything below it stays independently testable because the entrypoint holds no protocol logic of its own.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:hono-plc/mod.ts` file mod.ts (hono-plc/mod.ts)
<!-- SPECD_MANAGED_END -->
