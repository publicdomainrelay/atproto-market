# Context: compute-contract-full-flow

Repository: `atproto-market`

This context exists as the end-to-end smoke harness for the compute market: a single runnable file that wires a dispatcher, a fake PLC, a bidder and a requester together in one process so the whole contract flow can be exercised without any external infrastructure, and that leaves behind three committed artifacts (log, raw records, summary) proving what the run produced. It is deliberately configuration-free and ephemeral-port-only so a developer can reproduce a full round trip with one deno run command, and it depends on the market, bidder, bidder-compute, requester-xrpc, atproto-helpers, did-plc and did-key-ingress-proxy libraries for every participant it instantiates.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:compute-contract-full-flow/run_full_flow.ts` file run_full_flow.ts (compute-contract-full-flow/run_full_flow.ts)
<!-- SPECD_MANAGED_END -->
