# Compute Contract Gateway

Centralized Hono service over the decentralized compute contract API. Run one
gateway, request VMs and Deno workers through it via AT Protocol XRPC.

## Start a PDS

Gateway XRPC endpoints require AT Protocol service auth. Start a local PDS,
create an account, and authenticate:

```sh
# Start PDS (test harness provides this; for manual testing:)
deno run -A hono-pds/mod.ts --port 2584 &
PDS_URL="http://127.0.0.1:2584"

# Create an account
ATP_PDS_HOST="$PDS_URL" goat account create \
  --handle alice.test --password test-password --email alice@test

# Login
ATP_PDS_HOST="$PDS_URL" goat account login \
  --username alice.test --password test-password

# Get a service auth token for gateway calls
SVC_TOKEN=$(goat account service-auth --audience "$GATEWAY_DID" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
```

Required environment variables:

```sh
export PDS_URL="${PDS_URL:-http://127.0.0.1:2584}"
export GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:2586}"
export GATEWAY_DID="${GATEWAY_DID:-did:key:zExampleGateway}"
export BIDDER_DID="${BIDDER_DID:-did:plc:xxxxxxxxxxx}"
```

## Local Test Infrastructure

For local testing you need a PLC directory, an XRPC relay dispatcher, and a
bidder. The PLC and dispatcher are started by the test harness. Start a bidder
manually:

```sh
# Start a bidder with local container compute provider
deno run -A hono-bidder/mod.ts \
  --compute-provider-local \
  --compute-provider-local-container-mode container \
  --plc-directory-url "$PLC_DIRECTORY_URL" \
  --relay-dispatcher-host "$INGRESS_PROXY_HOST" \
  --serve-port 2585 &

# Set bidder DID from bidder startup output
BIDDER_DID="did:plc:xxxxxxxxxxx"
```

Required environment variables:

```sh
export PLC_DIRECTORY_URL="http://127.0.0.1:2582"
export INGRESS_PROXY_HOST="127.0.0.1:2583"
export BIDDER_DID="did:plc:xxxxxxxxxxx"
```

## Gateway-Bidder Association

Before requesting compute, associate your gateway (requester) with a bidder.
This creates a bidirectional attestation: the gateway writes a `badgeBlueKeys`
record, and the bidder writes a `bidderAssociation` record pointing back at it.

### Gateway associates with bidder

```sh
GATEWAY_DID="did:plc:yyyyyyyyyyy"

goat record create \
  --pds-url "$GATEWAY_PDS_URL" \
  --collection com.publicdomainrelay.temp.badgeBlueKeys \
  --record '{
    "$type": "com.publicdomainrelay.temp.badgeBlueKeys",
    "keyId": "'$GATEWAY_DID'",
    "challenge": "'$BIDDER_DID'",
    "service": "bidder_associate",
    "createdAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

### Bidder acknowledges association

The bidder software automatically creates a `com.publicdomainrelay.temp.market.bidderAssociation`
record referencing the gateway's `badgeBlueKeys` record. No manual step needed.

## Quick Start

```sh
# Start the gateway server
deno run -A hono-compute-contract-gateway/mod.ts \
  --port 2586 \
  --dispatcher-host "$INGRESS_PROXY_HOST" \
  --plc-directory-url "$PLC_DIRECTORY_URL"

# Health check via goat
goat xrpc query http://127.0.0.1:2586 com.publicdomainrelay.temp.gateway.health

# Get gateway DID
goat resolve "$GATEWAY_URL"
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
  --dispatcher-host "${INGRESS_PROXY_HOST:-xrpc.fedproxy.com}" \
  --plc-directory-url "${PLC_DIRECTORY_URL:-https://plc.directory}" \
  --private-key-hex-path ~/Documents/requester-private-key.hex \
  --pds-state-path ~/Documents/requester-pds-state.db &

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:2586}"
```

### 3. Associate gateway with bidder

```sh
GATEWAY_DID="did:plc:yyyyyyyyyyy"

goat record create \
  --pds-url "$GATEWAY_PDS_URL" \
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
BIDDER_DID="${BIDDER_DID:-did:plc:xxxxxxxxxxx}"
GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:2586}"

goat xrpc procedure "$GATEWAY_URL" com.publicdomainrelay.temp.gateway.requestComputeVM \
  Authorization:"Bearer $SVC_TOKEN" \
  sshPublicKey="$PUBKEY" \
  bidWindowSec:=30 \
  computeVm:='{"$type":"com.publicdomainrelay.temp.compute.vm","cpus":1,"mem":"512M","disk":"10G","network":"500G","role":"my-vm"}' \
  extraBidderDids:='["'"$BIDDER_DID"'"]' \
  tokens:='{"submitRfp":"","submitAccept":"","createRecord":""}'
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

## Request a Deno Worker

### L2 Ephemeral Worker (Hono app, per-request execution)

Create a simple Hono app that responds via `self.onmessage`:

```sh
mkdir -p my-worker
cat > my-worker/main.ts << 'EOF'
// @ts-nocheck
import { Hono } from "@hono/hono";

const app = new Hono();
app.get("/health", (c) => c.json({ status: "ok" }));

let count = 0;
self.onmessage = async (e) => {
  count++;
  const msg = e.data;
  const req = new Request(`http://localhost${msg.path || "/"}`, {
    method: msg.method || "GET",
    body: msg.body ? JSON.stringify(msg.body) : undefined,
  });
  const res = await app.fetch(req);
  const body = await res.json();
  self.postMessage({ status: res.status, headers: {}, body: { ...body, count } });
};
EOF

cat > my-worker/deno.json << 'EOF'
{ "imports": { "@hono/hono": "jsr:@hono/hono@^4" } }
EOF
```

Request via gateway:

```sh
SOURCE=$(cat my-worker/main.ts)
DENO_JSON=$(cat my-worker/deno.json)

goat xrpc procedure "$GATEWAY_URL" com.publicdomainrelay.temp.gateway.requestComputeWorkerEphemeral \
  Authorization:"Bearer $SVC_TOKEN" \
  source="$SOURCE" \
  denoJson="$DENO_JSON" \
  bidWindowSec:=15 \
  extraBidderDids:='["'"$BIDDER_DID"'"]'
```

### L1 Persistent Worker (in-process compute provider)

Create a worker that hosts other workers:

```sh
mkdir -p my-bidder
cat > my-bidder/main.ts << 'EOF'
// @ts-nocheck
import { createDenoBundler, createPersistentDenoWorker } from "@publicdomainrelay/sandbox-deno";
import {
  createDenoComputeManifestStore,
  createDenoComputeInstanceStore,
  createDenoComputeInstanceRunner,
} from "@publicdomainrelay/compute-deno-atproto";

const did = "did:plc:l1";
const records = new Map();
records.set(did, new Map());
let seq = 0;

const pds = {
  async createRecord(repoDid, collection, record) {
    const rkey = "r" + (++seq).toString(16).padStart(8, "0");
    const uri = "at://" + repoDid + "/" + collection + "/" + rkey;
    const hash = new Uint8Array(await crypto.subtle.digest(
      "SHA-256", new TextEncoder().encode(JSON.stringify(record))));
    const hex = Array.from(hash.slice(0, 16),
      b => b.toString(16).padStart(2, "0")).join("");
    const cid = "bafyrei" + hex;
    if (!records.has(repoDid)) records.set(repoDid, new Map());
    records.get(repoDid).set(uri, { uri, cid, value: record });
    return { uri, cid };
  },
  async getRecord(repoDid, collection, rkey) {
    const recs = records.get(repoDid);
    if (!recs) return null;
    return recs.get("at://" + repoDid + "/" + collection + "/" + rkey) || null;
  },
};

const bundler = createDenoBundler();
const manifestStore = createDenoComputeManifestStore(pds, did);
const instanceStore = createDenoComputeInstanceStore(pds, did);
const runner = createDenoComputeInstanceRunner({
  manifestStore, instanceStore, bundler,
  createWorker: createPersistentDenoWorker,
});

self.onmessage = async (e) => {
  const msg = e.data;
  self.postMessage({ status: 200, headers: {}, body: { status: "ok", level: 1 } });
};
EOF

cat > my-bidder/deno.json << 'EOF'
{
  "imports": {
    "@publicdomainrelay/compute-deno-atproto": "jsr:@publicdomainrelay/compute-deno-atproto@^0",
    "@publicdomainrelay/compute-deno-common": "jsr:@publicdomainrelay/compute-deno-common@^0",
    "@publicdomainrelay/sandbox-deno": "jsr:@publicdomainrelay/sandbox-deno@^0"
  }
}
EOF
```

Request via gateway:

```sh
SOURCE=$(cat my-bidder/main.ts)
DENO_JSON=$(cat my-bidder/deno.json)

goat xrpc procedure "$GATEWAY_URL" com.publicdomainrelay.temp.gateway.requestComputeWorkerPersistent \
  Authorization:"Bearer $SVC_TOKEN" \
  source="$SOURCE" \
  denoJson="$DENO_JSON" \
  bidWindowSec:=15 \
  extraBidderDids:='["'"$BIDDER_DID"'"]'
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
| `--dispatcher-host` | `INGRESS_PROXY_HOST` | `xrpc.fedproxy.com` | XRPC relay |
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

# README smoke test (runs README shell blocks against local infra)
deno test -A --config atproto-market/deno.json atproto-market/test/gateway_readme_smoke_test.ts
```

### Requirements

- Deno >= 2
- Container runtime (macOS: `container` CLI, Linux: Docker)
- Permissions: `--allow-all`
