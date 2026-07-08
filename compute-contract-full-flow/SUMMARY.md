# Compute Contract Full Flow — Summary

## Participants

| Role | DID |
|------|-----|
| Requester | `did:plc:o3stzy6qojgmdtdzjq6tynqs` |
| Bidder | `did:plc:qzuhcai2kjxqd2l7tkz73a44` |

## Result

```json
{
  "event": "compute_request_complete",
  "vmUri": "at://did:plc:o3stzy6qojgmdtdzjq6tynqs/com.publicdomainrelay.temp.compute.vm/3mq4ger7kwk23",
  "vmCid": "bafyreievqqvuqeeeyyqbdyzit7oej2eko3hipenlatfyxsxznqtud6eb4y",
  "rfpUri": "at://did:plc:o3stzy6qojgmdtdzjq6tynqs/com.publicdomainrelay.temp.market.rfp/3mq4ger7lvs23",
  "rfpCid": "bafyreiehbqq5z3qm2v3lh5xjpmhp2nanomtnifqip6qrsdkstzwpigyx4q",
  "acceptUri": "at://did:plc:o3stzy6qojgmdtdzjq6tynqs/com.publicdomainrelay.temp.market.accept/3mq4gf7k5qd23",
  "acceptCid": "bafyreiebpdz5zuya2qz5vk5dg6ue7ngvz7wdz4ephwlclxrqzpb44aweda",
  "bidUri": "at://did:plc:qzuhcai2kjxqd2l7tkz73a44/com.publicdomainrelay.temp.market.bid/3mq4gera4j323",
  "bidCid": "bafyreia43knkwqvm7robtvff24eacho2pdk45en7e3g2mg2nknvx7qg62u",
  "winnerDid": "did:plc:qzuhcai2kjxqd2l7tkz73a44",
  "receiptUri": "at://did:plc:qzuhcai2kjxqd2l7tkz73a44/com.publicdomainrelay.temp.market.receipt/3mq4gf7kjhd23",
  "receiptCid": "bafyreicxxvi7qjgxu2lovtyuqc5xpbc623fhvrscauktzamc2jl63cwxzu",
  "submitEventRef": "https://did-key-zq3shej7x8g4fgi4mkgiaa5vjv9j1juswcc9jd53ex8kt12jw.localhost",
  "receiptOk": true,
  "bids": 1,
  "sshReady": false
}
```

## Dispatcher

Host: `localhost:65118`
PLC: `http://localhost:65119`

## AT Protocol Records Created

| Collection | Count |
|------------|-------|
| `com.publicdomainrelay.temp.market.rfp` | 1 |
| `com.publicdomainrelay.temp.market.accept` | 1 |
| `com.publicdomainrelay.temp.compute.vm` | 1 |
| `com.publicdomainrelay.temp.market.offering` | 1 |
| `com.publicdomainrelay.temp.market.bid` | 1 |
| `com.publicdomainrelay.temp.market.receipt` | 1 |
| `com.publicdomainrelay.temp.auth.allowlist.rbacDid` | 1 |

## Full Record Details

See [atproto-records.json](./atproto-records.json)

## Log

See [full-flow.log](./full-flow.log)

## How to Reproduce

```bash
# From the polyrepo root:
deno run --allow-all compute-contract-full-flow/run_full_flow.ts
```

## Architecture

```
Requester                    AT Protocol (PDS/relay)              Bidder                    Guest Container
────────                     ──────────────────────              ──────                    ───────────────
runComputeContract()
  ├─ ssh-keygen ed25519
  ├─ buildDefaultUserData()  ──►  compute.vm record
  ├─ createSignedRepoRecord  ──►  market.rfp (signed)
  ├─ discoverBidders         ──►  relay index + extraBidderDids
  ├─ submitRfp XRPC          ──►  ──►  rfpCallback → bid
  │                                    ├─ onAccept → provision
  │                                    │    ├─ OIDC enrichment
  │                                    │    ├─ runContainer()
  │                                    │    └─ cloud-init: sshd + websocat
  │                                    └─ eventCallbacks
  ├─ wait bidWindowSec (15s)
  ├─ pick lowest-cost bid
  ├─ createSignedRepoRecord  ──►  market.accept
  ├─ submitAccept XRPC       ──►  ──►  provision guest
  ├─ verify receipt
  ├─ pollReady → SSH         ──►  ──►  websocat ws:// → sshd
  │  └─ exec 'hostname'
  └─ vm.delete event         ──►  ──►  destroy()
```

## SSH Tunnel Path

```
requester SSH client
  ProxyCommand websocat --binary wss://<service>--did-plc-<key>.localhost
    → dispatcher (did-key-relay, routes by SNI subdomain)
      → relay WebSocket → bidder PDS → guest container
        → websocat ws-l:127.0.0.1:8080
          → sshd 127.0.0.1:22
```

Generated: 2026-07-08T05:51:42.247Z
