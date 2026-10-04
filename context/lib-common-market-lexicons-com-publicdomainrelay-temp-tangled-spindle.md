# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-tangled-spindle

Repository: `atproto-market`

Provide the generated TypeScript bindings for the `com.publicdomainrelay.temp.tangled.spindle.trigger` XRPC procedure so that callers and the spindle server share one schema: the defs file declares the NSID, the empty parameter set, the JSON input and output payload schemas, the `WorkflowResult` object shape, and the procedure's declared error names, while `trigger.ts` narrows the import surface to the single NSID module. It is a leaf lexicon package inside the `market-lexicons` tree, consumed wherever the market needs to trigger a Tangled pipeline over PDS service proxying rather than talking to the spindle directly.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/tangled/spindle/trigger.defs.ts` file trigger.defs.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/tangled/spindle/trigger.defs.ts)
- `file:lib/common/market-lexicons/com/publicdomainrelay/temp/tangled/spindle/trigger.ts` file trigger.ts (lib/common/market-lexicons/com/publicdomainrelay/temp/tangled/spindle/trigger.ts)
- `type_alias:2384d850334f4824332256cd26c0e1e0` type_alias $Input (lib/common/market-lexicons/com/publicdomainrelay/temp/tangled/spindle/trigger.defs.ts)
- `type_alias:35f9b05be484c9db3e66293938e0c7fc` type_alias $Output (lib/common/market-lexicons/com/publicdomainrelay/temp/tangled/spindle/trigger.defs.ts)
- `type_alias:5b2e55e12944df104929ddb029ab7366` type_alias $OutputBody (lib/common/market-lexicons/com/publicdomainrelay/temp/tangled/spindle/trigger.defs.ts)
- `type_alias:635b87d49390c20cc0c03a3b2717fce8` type_alias $Params (lib/common/market-lexicons/com/publicdomainrelay/temp/tangled/spindle/trigger.defs.ts)
- `type_alias:7b015485c5d41aa955d7da0515ea7cbc` type_alias $InputBody (lib/common/market-lexicons/com/publicdomainrelay/temp/tangled/spindle/trigger.defs.ts)
<!-- SPECD_MANAGED_END -->
