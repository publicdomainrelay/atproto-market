# Lexicon Workflow

## Directory structure

```
lexicons/                          # JSON Lexicon schemas (source of truth)
  com/publicdomainrelay/temp/...  # NSID path mirrors filesystem
lib/common/market-lexicons/        # Generated TypeScript types
```

## Adding a new Lexicon

1. Write JSON schema in `lexicons/<nsid-as-path>.json`
2. Validate: `goat lex parse lexicons/<path>.json`
3. Generate TS types: `deno task generate-lexicons`
4. Add NSID constant to `lib/common/market-lexicons/nsids.ts`

## Publishing Lexicons to the network

Lexicons are resolved by PDS via DNS: `https://{reversed-nsid-domain}/xrpc/com.atproto.lexicon.schema?lexiconId={nsid}`

### One-shot publish (all changed Lexicons)
```sh
goat lex publish --lexicons ./lexicons
```

### Publish a single Lexicon
```sh
goat lex publish com.publicdomainrelay.temp.auth.allowlist.rbacDid
```

### Check what needs publishing
```sh
goat lex status --lexicons ./lexicons
```

### Pull a Lexicon from the network
```sh
goat lex pull com.atproto.repo.strongRef
```

## DNS setup

Each Lexicon domain needs an A/AAAA record pointing to a server that serves
the Lexicon JSON. For `com.publicdomainrelay.temp.*`:

- DNS: `publicdomainrelay.com` → HTTP server
- Server: serves `https://publicdomainrelay.com/xrpc/com.atproto.lexicon.schema?lexiconId=<nsid>`
- Response: the Lexicon JSON document with `Content-Type: application/json`

## Lexicon schema notes

- `type: "unknown"` for dynamic-key maps (objects with arbitrary keys)
- `type: "object"` only for fixed-property objects
- Record types use `"key": "tid"` for TID-based record keys
- Inline types (embedded in other records) use `"type": "object"` not `"type": "record"`
