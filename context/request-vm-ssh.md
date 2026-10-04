# Context: request-vm-ssh

Repository: `atproto-market`

This context exists so the requester CLI's external contract is pinned down: which flags and environment variables configure it and what each defaults to, how the three identity/OAuth modes differ, how association is proven or skipped, what is passed into `runComputeContract`, and how shutdown, hold mode and the `--help` smoke test behave. It is the operator-facing shell around the requester library, so that library can change without silently breaking the command people actually run. The default guest transport is the iroh module, so the CLI must ensure the dumbpipe helper is present and drive SSH through the published ticket.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:request-vm-ssh/cli-args-env.ts` file cli-args-env.ts (request-vm-ssh/cli-args-env.ts)
- `file:request-vm-ssh/cli_smoke_test.ts` file cli_smoke_test.ts (request-vm-ssh/cli_smoke_test.ts)
- `file:request-vm-ssh/mod.ts` file mod.ts (request-vm-ssh/mod.ts)
<!-- SPECD_MANAGED_END -->
