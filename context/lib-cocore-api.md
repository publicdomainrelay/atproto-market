# Context: lib-cocore-api

Repository: `atproto-market`

This context exists so that the cocore AppView's API-key management surface has one small, dependency-light client that any consumer in the repository can import instead of hand-rolling fetch calls and service-auth token minting. It fixes the wire contract (endpoint layout, authorization header, JSON bodies, error shape) once, so the AppView server side and its CLI or tests can agree on it, and it keeps the client self-contained under lib/cocore-api so it can be type-checked and versioned on its own.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:lib/cocore-api/mod.ts` file mod.ts (lib/cocore-api/mod.ts)
- `function:1fea095a0bee325bdb1aae5e86e8f6a3` function createCocoreClient (lib/cocore-api/mod.ts)
- `function:d182b9f8d24e2ca8806313b0bcd98280` function call (lib/cocore-api/mod.ts)
- `interface:09decfc0b5223bf533f41d5230769bc8` interface ListApiKeysResponse (lib/cocore-api/mod.ts)
- `interface:1bcea98b6e61d0fa858c001c956b655d` interface CreateApiKeyResponse (lib/cocore-api/mod.ts)
- `interface:6c1e6b8fec8cdfaf8c00a2c93ec26f2e` interface CocoreClient (lib/cocore-api/mod.ts)
- `interface:8ec256e4f14d893e88afbca014d72b53` interface CocoreClientOptions (lib/cocore-api/mod.ts)
- `interface:a6b944b6f1859d7bd5b304b7a2b77b3c` interface ApiKey (lib/cocore-api/mod.ts)
<!-- SPECD_MANAGED_END -->
