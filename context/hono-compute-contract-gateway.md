# Context: hono-compute-contract-gateway

Repository: `atproto-market`

This context exists so the gateway can be deployed as a process: it is the composition root that turns declarative configuration (flags, environment variables, JSON config) into a running did:web/DID-keyed XRPC service. Everything downstream — DID document serving, service-auth verification of callers, and the requestComputeVM, requestComputeWorkerEphemeral, requestComputeWorkerPersistent and deleteCompute operations — is supplied by the compute-contract-gateway-xrpc implementation and its Hono factory; this package's job is only to read the configuration surface, build those pieces in the right order, bind a listener, and tear the gateway down cleanly on a signal. GOAL.md and README.md extend that intent with a verifiable contract: the README's Quick Start, Request a VM and Request a Deno Worker shell blocks must run end to end against a locally started instance of this CLI, which is what the test:readme task in deno.json is for.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:hono-compute-contract-gateway/mod.ts` file mod.ts (hono-compute-contract-gateway/mod.ts)
<!-- SPECD_MANAGED_END -->
