# Context: lib-common-secrets-common

Repository: `atproto-market`

This context exists so the guest secrets capability and the Hono secrets factory share one definition of what a secrets file and a secrets RBAC record look like, instead of each re-declaring the shapes and re-implementing the validation. It sits in lib/common because both consumers import it, it depends on nothing outside itself, and it owns the parsing and record-building logic that must stay consistent across every consumer of the secrets route.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:d2916f8a4fa70fb60b7c6a8af50dc206` class InvalidSecretsFileError (lib/common/secrets-common/mod.ts)
- `file:lib/common/secrets-common/mod.ts` file mod.ts (lib/common/secrets-common/mod.ts)
- `function:6f7a9521a0c32f2f991f030c6b149cdb` function parseSecretsFile (lib/common/secrets-common/mod.ts)
- `function:bbd14d354b9d1c3aae2765a9447d1c79` function buildSecretsRbacRecord (lib/common/secrets-common/mod.ts)
- `interface:1b0cf0f1cd64a3fb0c747b50f12fe6d0` interface SecretEntry (lib/common/secrets-common/mod.ts)
- `interface:3a4058c69bc810fa3f1d318c05426b08` interface RbacRoleShape (lib/common/secrets-common/mod.ts)
- `interface:7253e0f353e49b3a4e231426d24dc4ec` interface SecretsRbacContext (lib/common/secrets-common/mod.ts)
- `interface:9f03721d29e2b3898e0b29ad30cb348a` interface RbacPolicyShape (lib/common/secrets-common/mod.ts)
- `interface:b63e86d96de3a2cd62373c61fb39feb4` interface RbacProtectsShape (lib/common/secrets-common/mod.ts)
- `interface:ba32adcf332104a7ef22a672b35989fa` interface RbacSchemaShape (lib/common/secrets-common/mod.ts)
- `interface:fe7c741a681050cfb5430927cbdf4551` interface RbacRecordShape (lib/common/secrets-common/mod.ts)
<!-- SPECD_MANAGED_END -->
