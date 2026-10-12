# New NSID checklist

Every new collection the bidder or the requester writes follows these four steps,
in this order, before any live run. Skipping one makes the write fail with
`403 ScopeMissingError` (seen 2026-10-12T01:32:39Z on `vm.terminated`). A token
refresh keeps the scopes the account signed in with, so a new scope only reaches
an account through a fresh sign-in.

Writers covered:

| Role      | Packages that write records                               | Role set in typescript-helpers |
|-----------|-----------------------------------------------------------|--------------------------------|
| bidder    | `lib/market-bidder`, `lib/market-bidder-compute`, `hono-bidder` | `BIDDER_OAUTH_SCOPE`     |
| requester | `lib/requester-xrpc`, `lib/compute-request-xrpc`          | `REQUESTER_OAUTH_SCOPE`        |

The QR client at qr.fedfork.com requests `DID_KEY_ASSOCIATOR_OAUTH_SCOPE`, the
union of both role sets plus `associateConfirm`.

## 1. Lexicon (atproto-market)

1. Add `lexicons/<nsid path>.json`.
2. Regenerate the types: `deno task generate-lexicons` (writes
   `lib/common/market-lexicons`).
3. Add the `*_NSID` constant to `lib/common/market-lexicons/nsids.ts` (and
   `lib/common/market-common/constants.ts` if callers import it from there).
4. Write the record through a `*_NSID` constant (`createRepoRecord(X_NSID, ...)`,
   `createSignedRepoRecord(X_NSID, ...)`, `createRecord(X_NSID, ...)`, or an
   `applyWrites` op with `collection: X_NSID`). The coverage test resolves
   constants exported by `market-lexicons`, `market-common`,
   `fedproxy-rbac-common` and the policy NSIDs; any other argument fails the test
   as unresolved until it is mapped.

## 2. Role-set scope (typescript-helpers)

1. In `typescript-helpers/lib/oauth-scope/mod.ts` add the NSID to `C`, its verbs
   to `COLLECTIONS`, and the NSID to the writer's role set (`BIDDER_OAUTH_SCOPE`
   and/or `REQUESTER_OAUTH_SCOPE`).
2. Check it in atproto-market:

   ```
   cd atproto-market && deno task test:protocol
   ```

   `test/role_scope_coverage_test.ts` scans every write call in the packages
   above and fails, naming `<nsid>?action=<verb> (<file>:<line>)`, for a write
   whose collection is missing from the role set.

## 3. Regenerate and deploy the QR client scope (did-key-associator)

1. Regenerate `generated/oauth-scope.js` and the client metadata:

   ```
   cd did-key-associator && deno task build:static
   ```

   The first run after a role-set change rewrites `generated/oauth-scope.js` and
   exits 1; commit the file and run it again.
2. Check there is no drift:

   ```
   cd did-key-associator && deno task test
   ```

   `test/oauth_scope_drift_test.ts` fails, listing the missing tokens, when the
   committed `generated/oauth-scope.js` differs from what the generator produces
   from the current typescript-helpers.
3. Ship the static files only (client metadata, bundle, Caddyfile):

   ```
   cd did-key-associator && scripts/deploy.sh --static-only --dry-run
   cd did-key-associator && scripts/deploy.sh --static-only
   ```

   The run backs up `/var/www/qr.fedfork.com` and the Caddyfile to
   `/root/qr-backup/<UTC ts>/`, checks the served
   `oauth-client-metadata.json` matches the build by sha256, restores the backup
   if it does not, and prints the restore command.

## 4. Every writing account signs in again

Each account that writes the new collection (every bidder account for a bidder
NSID, every requester account for a requester NSID) signs in again through the
QR at qr.fedfork.com. This step cannot be automated. A write that still fails
with `ScopeMissingError` names the missing NSID; that account has not re-signed
in since step 3.

## Worked example: `com.publicdomainrelay.temp.compute.events.vm.terminated`

| Step | Change |
|------|--------|
| 1 | atproto-market eb2aa82: `lexicons/com/publicdomainrelay/temp/compute/events/vm/terminated.json`, generated types, `COMPUTE_EVENTS_VM_TERMINATED_NSID`; written by `lib/market-bidder-compute` (`createRepoRecord(COMPUTE_EVENTS_VM_TERMINATED_NSID, ...)`) |
| 2 | typescript-helpers 5b071fe: `VM_TERMINATED` added to `BIDDER_OAUTH_SCOPE`. `role_scope_coverage_test.ts` is red at 5b071fe^ (`vm.terminated?action=create (lib/market-bidder-compute/mod.ts:192)`) and green at 5b071fe |
| 3 | did-key-associator 3cde452: `generated/oauth-scope.js` regenerated. `oauth_scope_drift_test.ts` is red with the file from 3cde452^ and green at 3cde452; static files deployed by hand 2026-10-12T01:41:55Z (backup `/root/qr-static-backup/20261012T014155Z`), the step `deploy.sh --static-only` now performs |
| 4 | Every bidder account re-signs in through the QR |

## Second NSID: `com.publicdomainrelay.temp.compute.events.vm.hostKeys`

| Step | Change |
|------|--------|
| 1 | atproto-market task/host-keys: `lexicons/com/publicdomainrelay/temp/compute/events/vm/hostKeys.json`, generated types, `COMPUTE_EVENTS_VM_HOST_KEYS_NSID`; written by `lib/market-bidder-compute` (`createRepoRecord(COMPUTE_EVENTS_VM_HOST_KEYS_NSID, ...)`). `test/vm_hostkeys_lexicon_test.ts` |
| 2 | typescript-helpers task/host-keys: `VM_HOST_KEYS` in `BIDDER_OAUTH_SCOPE`. `role_scope_coverage_test.ts` was red without it (`vm.hostKeys?action=create (lib/market-bidder-compute/mod.ts:246)`) |
| 3 | did-key-associator task/host-keys: `generated/oauth-scope.js` regenerated; `oauth_scope_drift_test.ts` red with the old file, green with the new one. The `--static-only` deploy is the lead's |
| 4 | Every bidder account re-signs in through the QR before a live bidder publishes vm.hostKeys |
