# Context: request-vm-ssh

Repository: `atproto-market`

This context exists because request-vm-ssh is the operator-facing entrypoint that turns a requester identity plus a compute contract into a live SSH session. It owns argv and environment resolution, identity-mode selection, association-proof UX, helper installation for the chosen guest transport, and the lifecycle wiring around runComputeContract. Keeping it a single documented context makes the CLI's full configuration surface and its mutually exclusive branches explicit, so the requester, guest-capability, OAuth, secrets and event-stream libraries it depends on can be read as dependencies rather than as places this wiring is duplicated. The transport default is iroh, so an unconfigured run provisions the guest with the dumbpipe listener, reaches it by ticket, and bootstraps only the helper that transport needs; the websocket transports stay selectable and bring their own helper.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:request-vm-ssh/cli-args-env.ts` file cli-args-env.ts (request-vm-ssh/cli-args-env.ts)
- `file:request-vm-ssh/cli_smoke_test.ts` file cli_smoke_test.ts (request-vm-ssh/cli_smoke_test.ts)
- `file:request-vm-ssh/mod.ts` file mod.ts (request-vm-ssh/mod.ts)
<!-- SPECD_MANAGED_END -->
