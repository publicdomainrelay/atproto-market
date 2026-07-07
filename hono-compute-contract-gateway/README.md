# Compute Contract Gateway

Centralized Hono service over the decentralized compute contract API. Run one
gateway, request VMs and Deno workers through it via `goat xrpc call`.

## Quick Start

```sh
# Start the gateway server
deno run -A hono-compute-contract-gateway/mod.ts \
  --port 2586 \
  --dispatcher-host xrpc.fedproxy.com

# Health check via goat
goat xrpc call --url http://127.0.0.1:2586 com.publicdomainrelay.temp.gateway.health

# Get gateway DID
goat resolve --url http://127.0.0.1:2586
```

## Request a VM

### Prerequisites

- Running bidder with container/VM compute provider
- Gateway DID associated with bidder (bidder policy: `only_me` or `direct_network`)
- Your own AT Protocol PDS for minting service auth tokens

### 1. Generate SSH keypair

```sh
ssh-keygen -t ed25519 -N "" -C "root@my-vm" -f ./my-vm-key
```

### 2. Start gateway

```sh
deno run -A hono-compute-contract-gateway/mod.ts \
  --port 2586 \
  --dispatcher-host xrpc.fedproxy.com \
  --private-key-hex-path ~/Documents/requester-private-key.hex \
  --pds-state-path ~/Documents/requester-pds-state.db &

GATEWAY_DID=$(goat xrpc call --url http://127.0.0.1:2586 com.publicdomainrelay.temp.gateway.did | jq -r '.id')
echo "Gateway DID: $GATEWAY_DID"
```

### 3. Associate gateway with bidder

```sh
BIDDER_DID="did:plc:5svqtrhheairglgiiyvutzik"

goat record create \
  --pds-url https://your-pds.example.com \
  --collection com.publicdomainrelay.temp.badgeBlueKeys \
  --record '{
    "$type": "com.publicdomainrelay.temp.badgeBlueKeys",
    "keyId": "'$GATEWAY_DID'",
    "challenge": "'$BIDDER_DID'",
    "service": "bidder_associate",
    "createdAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

### 4. Request a VM via goat

```sh
PUBKEY=$(cat ./my-vm-key.pub)
BIDDER_DID="did:plc:5svqtrhheairglgiiyvutzik"
GATEWAY_URL="http://127.0.0.1:2586"

goat xrpc call \
  --url "$GATEWAY_URL" \
  com.publicdomainrelay.temp.gateway.requestComputeVM \
  --data '{
    "computeVm": {
      "$type": "com.publicdomainrelay.temp.compute.vm",
      "cpus": 1,
      "mem": "512M",
      "disk": "10G",
      "network": "500G",
      "role": "my-vm"
    },
    "sshPublicKey": "'"$PUBKEY"'",
    "bidWindowSec": 30,
    "extraBidderDids": ["'"$BIDDER_DID"'"],
    "tokens": {
      "submitRfp": "",
      "submitAccept": "",
      "createRecord": ""
    }
  }'
```

### 5. Connect via SSH

Gateway returns `websocatUrl` and `vmFqdn`:

```json
{
  "receiptOk": true,
  "websocatUrl": "wss://my-vm--did-plc-paeucw23byz57hqwihjmw4o3.fedproxy.com",
  "vmFqdn": "my-vm--did-plc-paeucw23byz57hqwihjmw4o3.fedproxy.com"
}
```

```sh
ssh -o ProxyCommand='websocat --binary wss://my-vm--did-plc-paeucw23byz57hqwihjmw4o3.fedproxy.com' \
    -o IdentityFile=./my-vm-key \
    root@my-vm--did-plc-paeucw23byz57hqwihjmw4o3.fedproxy.com
```

## CLI Options

| Flag | Env | Default | Description |
|------|-----|---------|-------------|
| `--port` | `PORT` | -- | TCP port |
| `--hostname` | `HOSTNAME` | `localhost` | Public hostname |
| `--private-key-hex` | `PRIVATE_KEY_HEX` | -- | Stable DID key |
| `--private-key-hex-path` | `REPO_PRIVATE_KEY_HEX_PATH` | -- | Path to load/save private key hex |
| `--pds-state-path` | `PDS_STATE_PATH` | -- | Path for persistent PDS state (Deno.Kv SQLite) |
| `--plc-directory-url` | `PLC_DIRECTORY_URL` | `https://plc.directory` | PLC directory |
| `--dispatcher-host` | `DISPATCHER_HOST` | `xrpc.fedproxy.com` | XRPC relay |
| `--fedproxy-host` | `FEDPROXY_HOST` | `fedproxy.com` | SSH ingress |
| `--relay-urls` | `RELAY_URLS` | `https://reg.market.fedfork.com` | Bidder discovery |

## Development

### Run integration tests

```sh
# Baseline bidder test
deno test -A --config atproto-market/deno.json atproto-market/test/bidder_container_integration_test.ts

# Gateway VM provisioning test (container mode, local infrastructure)
deno test -A --config atproto-market/deno.json atproto-market/test/gateway_request_vm_integration_test.ts

# Gateway SSH test (container mode, SSH via websocat)
deno test -A --config atproto-market/deno.json atproto-market/test/gateway_ssh_integration_test.ts
```

### Requirements

- Deno >= 2
- Container runtime (macOS: `container` CLI, Linux: Docker)
- Permissions: `--allow-all`
