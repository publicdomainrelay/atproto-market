# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-tangled-spindle

Repository: `atproto-market`

Provide the generated TypeScript bindings for the `com.publicdomainrelay.temp.tangled.spindle.trigger` XRPC procedure so that callers and the spindle server share one schema: the defs file declares the NSID, the empty parameter set, the JSON input and output payload schemas, the `WorkflowResult` object shape, and the procedure's declared error names, while `trigger.ts` narrows the import surface to the single NSID module. It is a leaf lexicon package inside the `market-lexicons` tree, consumed wherever the market needs to trigger a Tangled pipeline over PDS service proxying rather than talking to the spindle directly.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
