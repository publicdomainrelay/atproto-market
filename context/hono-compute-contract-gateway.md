# Context: hono-compute-contract-gateway

Repository: `atproto-market`

This context exists so the compute contract gateway can be run as a real process rather than only as a library: it binds the abstract ComputeContractGateway contract (lib/abc/compute-contract-gateway) and its XRPC implementation (lib/compute-contract-gateway-xrpc) plus the Hono factory (lib/hono-factory-compute-contract-gateway-xrpc) into a deployable Deno CLI. It owns process-level concerns the libraries do not: argument and environment resolution through cli-args-env.json and config.json, key material resolution from a hex string or a file path, listener and storage wiring, DID and IdResolver setup, HTTP mounting, readiness logging, and graceful teardown on signals. It also owns the README-driven integration contract, expressed as a subprocess smoke test that proves the documented shell blocks actually work.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:hono-compute-contract-gateway/mod.ts` file mod.ts (hono-compute-contract-gateway/mod.ts)
<!-- SPECD_MANAGED_END -->
