# Context: hono-bidder

Repository: `atproto-market`

This context exists to pin down the runnable bidder process itself: the flag/env/default surface it accepts, the precedence rules that turn those options into a concrete identity, key material, auth mode, compute providers and relays, and the boot sequence that ends in a readiness line a supervisor or test harness can key on. It matters because the bidder's behaviour is not derivable from the libraries it composes -- ordering (attestation key before PLC genesis, relay crawl registration after the offering commit, image prebuild before first provision), failure semantics (which errors are logged warnings versus fatal exits), and the local-development escape hatches are all decisions made here, in hono-bidder/mod.ts and hono-bidder/cli-args-env.ts.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:hono-bidder/cli-args-env.ts` file cli-args-env.ts (hono-bidder/cli-args-env.ts)
- `file:hono-bidder/mod.ts` file mod.ts (hono-bidder/mod.ts)
<!-- SPECD_MANAGED_END -->
