# Context: hono-plc

Repository: `atproto-market`

This context exists so the did:plc directory server can be launched as a standalone process from a declarative, layer-respecting Deno entrypoint. It carries the process-level wiring only: how the CLI's configuration surface (flags, environment variables, defaults, and the optional config.json override) becomes a bound TCP listener, which Hono app is mounted at the root path, and how the process terminates on signal. The PLC operation storage and directory semantics themselves belong to the hono-factory-did-plc-directory package it depends on; hono-plc's job is composition and lifecycle.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:hono-plc/mod.ts` file mod.ts (hono-plc/mod.ts)
<!-- SPECD_MANAGED_END -->
