# GOAL: README Code Block Verification Test

## What we're trying to do

Write a single integration test that:

1. **Sets up local infrastructure** — fake PLC, XRPC relay dispatcher, bidder
   (worker + VM), and gateway server. All local, no external network.

2. **Starts the gateway CLI** (`deno run -A hono-compute-contract-gateway/mod.ts`)
   as a subprocess so it exposes real HTTP endpoints at a real port.

3. **Exports env vars** that the README shell blocks reference:
   `GATEWAY_URL=http://127.0.0.1:<port>`, `BIDDER_DID=<local bidder DID>`,
   `PUBKEY=<generated ssh key>`.

4. **Parses README.md** — extracts shell code blocks by section heading
   (Quick Start, Request a VM, Request a Deno Worker).

5. **Runs each shell block via `bash -e`** with the env vars from step 3.
   Does NOT reproduce code from the blocks as TypeScript. Uses `Deno.Command`
   to invoke `bash -e -c <block>`.

6. **Asserts each block exits 0.** If a block fails, reports which section
   and block failed with stderr output.

## How to run

```sh
deno task test:readme
```

This runs: `deno test -A --config atproto-market/deno.json atproto-market/test/gateway_readme_smoke_test.ts`

## What the test must NOT do

- Copy shell commands into TypeScript strings and execute them
  programmatically. Use `bash -e` instead.
- Reproduce heredoc file contents as TypeScript template literals
- Call gateway APIs directly (use `goat xrpc procedure` via bash)

## Shell blocks that should be tested

| Section | What it does | Expected output |
|---------|-------------|-----------------|
| Quick Start | `deno run` gateway, health check | Server starts, health returns ok |
| VM §1 | `ssh-keygen` | Creates `my-vm-key` + `my-vm-key.pub` |
| VM §4 | `goat xrpc procedure requestComputeVM` | Returns receipt JSON |
| Worker L2 | `mkdir` + `cat` heredocs | Creates `my-worker/main.ts` + `deno.json` |
| Worker L2 | `goat xrpc procedure requestComputeWorkerEphemeral` | Returns receipt JSON |
| Worker L1 | `mkdir` + `cat` heredocs | Creates `my-bidder/main.ts` + `deno.json` |
| Worker L1 | `goat xrpc procedure requestComputeWorkerPersistent` | Returns receipt JSON |
