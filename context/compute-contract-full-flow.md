# Context: compute-contract-full-flow

Repository: `atproto-market`

This context exists as an end-to-end integration harness: it is the executable proof that requester, bidder, provider, relay/dispatcher, PDS, and PLC pieces from the sibling packages actually compose into a successful compute contract (RFP -> bid -> accept -> receipt -> SSH) without any external infrastructure. The script exists to be run manually (`deno run --allow-all compute-contract-full-flow/run_full_flow.ts` from the polyrepo root) and to leave behind machine-readable evidence (`atproto-records.json`, `full-flow.log`) plus a human-readable `SUMMARY.md`, which is why those tracked outputs sit in the same directory.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:compute-contract-full-flow/run_full_flow.ts` file run_full_flow.ts (compute-contract-full-flow/run_full_flow.ts)
<!-- SPECD_MANAGED_END -->
