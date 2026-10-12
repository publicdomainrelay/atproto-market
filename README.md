> **Frozen 2026-10-12.** The TypeScript of this repository that socialweb-computer uses now lives in
> the socialweb-computer-kcp monorepo (https://github.com/publicdomainrelay/kcp-vm), under
> `ts/atproto-market/`, with its git history. That copy is the source of truth. Do not change these
> paths here, and do not sync changes back:
>
> `hono-bidder/`, `hono-plc/`, `request-vm-ssh/`, `lexicons/`, `test/` (fixtures, helpers and the tests that type-check), `lib/` except `abc/compute-contract-gateway`, `cocore-api`, `common/compute-contract-gateway-common`, `compute-contract-gateway-xrpc`, `hono-factory-compute-contract-gateway-xrpc`, `hono-factory-market-settlement-free`, `hono-factory-market-settlement-x402`, `hono-factory-requester-xrpc`, `market-bidder-agent`, `market-settlement-free`, `market-settlement-x402`, `trust-graph-bsky-mutuals`. `hono-compute-contract-gateway/`, `compute-contract-full-flow/`, `hono-market/` and `docs/` stayed here.
>
> Make every change to them in socialweb-computer-kcp. Read its AGENTS.md first.

