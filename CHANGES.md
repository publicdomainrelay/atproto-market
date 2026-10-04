# Changes on `open-architecture/atproto-market--spec-iroh-dumbpipe-20261004141803`

The requirement-level delta against `open-architecture/atproto-market`, and what this branch realized.

## Requirements

### atproto-market

- intent: "" -> "This context exists so that the marketplace packages do not each re-implement identity, signing, PLC and record-write plumbing. createATProto centralizes how the repo obtains an agent bound to a DID and signer and how records are created and updated against arbitrary collections, while createMarketClient centralizes construction of the market XRPC client over a service. Downstream packages (bidders, gateways, market settlement, trust graph, requester) depend on these two factories rather than on raw agents or raw XRPC services."
- added `r.agent-factory` (MUST): "createATProto accepts a CreateATProtoOpts bundle of logger, badgeBlueSigner, plcDirectory and agent, and resolves to an ATProto whose DID and signer are read from the supplied agent; it constructs an IdResolver and returns record helpers bound to that agent's DID."
- added `r.attestation-signer` (SHOULD): "Attestation signing is supplied to the agent factory as an AttestationKeypair rather than as a raw key, keeping key material behind the market attestation abstraction."
- added `r.deno-workspace` (MUST): "The repository is a Deno workspace: dependencies and tasks are declared in deno.json with the resolved graph committed as deno.lock, and LEXICONS.md documents the lexicon set the packages implement."
- added `r.market-client-factory` (MUST): "createMarketClient takes an XrpcService plus an optional MarketClientOptions defaulting to an empty object and returns a MarketClient instance constructed from those two arguments, so callers never build the class directly."
- added `r.plc-directory` (SHOULD): "DID and PLC handling is injected as a PlcClient from lib/did-plc/client.ts, so the atproto helpers depend on the repository's own PLC client instead of constructing one internally."
- added `r.record-create` (MUST): "The createRecord helper mints a new rkey via TID.next().toString(), calls agent.createRecord(did, collection, rkey, record) when that method exists, and otherwise falls back to agent.applyWrites with a create action followed by agent.getRecord; both paths return a com.atproto.repo.strongRef whose uri is at://<did>/<collection>/<rkey> and whose cid falls back to the empty string when the fetched record has none."
- added `r.record-update` (MUST): "The updateRecord helper takes an existing rkey, calls agent.putRecord(did, collection, rkey, record) when that method exists, and otherwise falls back to agent.applyWrites with an update action followed by agent.getRecord; it returns the same com.atproto.repo.strongRef shape as createRecord, including the empty-string cid fallback."

## Realization

| change | direction | phase | commit | verify | acceptance |
| --- | --- | --- | --- | --- | --- |
| atproto-market-c2s-d20070c3bfb0-d20070c3bfb0 | CodeToSpec | Succeeded |  | 0 | - |
| compute-contract-full-flow-c2s-d20070c3bfb0-d20070c3bfb0 | CodeToSpec | Running |  | 0 | - |
