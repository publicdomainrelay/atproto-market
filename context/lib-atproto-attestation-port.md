# Context: lib-atproto-attestation-port

Repository: `atproto-market`

This context exists so that atproto-market can issue and check attestations without depending on the upstream JavaScript attestation package: a record is bound to an attestation metadata object through a deterministic DAG-CBOR CID, that CID is signed with an Ed25519/Secp256k1 did:key, and the resulting $sig entry is either embedded in the record (inline) or written to a separate attestation repository and referenced by a strongRef (remote). The port keeps the old call shapes alive in compat.ts while the rest of the repo consumes the typed functions, and its error hierarchy (errors.ts) lets callers distinguish a bad CID from an unresolvable key, a decode failure or a dangling proof instead of getting one opaque throw.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `class:0cbfdd727ed1d1ee628497b007abc14c` class MetadataMustBeObjectError (lib/atproto-attestation-port/errors.ts)
- `class:1a37e5e99c2f4686933593eaa60984ba` class AnyInput (lib/atproto-attestation-port/input.ts)
- `class:1f1db44ad3e4784846f51be597dcb97d` class DanglingProofError (lib/atproto-attestation-port/errors.ts)
- `class:28318086515aeda2b5c46589074c4e08` class JsonError (lib/atproto-attestation-port/errors.ts)
- `class:64210da3888fe20806521fd0773dd307` class RecordMustBeObjectError (lib/atproto-attestation-port/errors.ts)
- `class:6534520933c6c857cd2077cc28b5a5f0` class InvalidAttestationError (lib/atproto-attestation-port/errors.ts)
- `class:6cdd06d793526feb3cfa6807b7adabaf` class InvalidProofError (lib/atproto-attestation-port/errors.ts)
- `class:6f51439a0a9292422b2f2f4271954324` class InvalidSignatureError (lib/atproto-attestation-port/errors.ts)
- `class:6fa70196e50d7a23495de3b871e47550` class MetadataMissingFieldError (lib/atproto-attestation-port/errors.ts)
- `class:7421474df18b13f945085c0287be3349` class UnsupportedKeyTypeError (lib/atproto-attestation-port/errors.ts)
- `class:78c68037004092ea70086bb747ce8093` class Attestation (lib/atproto-attestation-port/compat.ts)
- `class:7bfc2359c105a76a440e60e99b480434` class SignatureDecodingFailedError (lib/atproto-attestation-port/errors.ts)
- `class:8c5a146784cd14ea91a95e85b9aa1495` class CidMismatchError (lib/atproto-attestation-port/errors.ts)
- `class:9f387f80617d507785b3fabd867cd0d7` class DagCborError (lib/atproto-attestation-port/errors.ts)
- `class:a20cf26f25619bd856befe573b43073e` class AnyInputError (lib/atproto-attestation-port/errors.ts)
- `class:b0fd453e73ea91c4d134eb84b58c9638` class AttestationError (lib/atproto-attestation-port/errors.ts)
- `class:c8f55e166625532f3f7830310d6b6e69` class KeyResolutionError (lib/atproto-attestation-port/errors.ts)
- `class:dfade15defe0f3ccc30c2e0ee1630bc4` class RecordResolutionError (lib/atproto-attestation-port/errors.ts)
- `file:lib/atproto-attestation-port/attestation.ts` file attestation.ts (lib/atproto-attestation-port/attestation.ts)
- `file:lib/atproto-attestation-port/cid.ts` file cid.ts (lib/atproto-attestation-port/cid.ts)
- `file:lib/atproto-attestation-port/compat.ts` file compat.ts (lib/atproto-attestation-port/compat.ts)
- `file:lib/atproto-attestation-port/errors.ts` file errors.ts (lib/atproto-attestation-port/errors.ts)
- `file:lib/atproto-attestation-port/input.ts` file input.ts (lib/atproto-attestation-port/input.ts)
- `file:lib/atproto-attestation-port/mod.ts` file mod.ts (lib/atproto-attestation-port/mod.ts)
- `file:lib/atproto-attestation-port/signature.ts` file signature.ts (lib/atproto-attestation-port/signature.ts)
- `file:lib/atproto-attestation-port/types.ts` file types.ts (lib/atproto-attestation-port/types.ts)
- `function:005bf0c2d952033654ed028e8308675e` function signBytes (lib/atproto-attestation-port/compat.ts)
- `function:03e63b4d0a85548561fea6f9162f6de3` function createDagCborCid (lib/atproto-attestation-port/cid.ts)
- `function:060cd79cf0174d1b688b0cd665ad811f` function isAttestationCidString (lib/atproto-attestation-port/compat.ts)
- `function:1b60292c7cb868bcdb52dd7a84d34a7c` function verifyRecord (lib/atproto-attestation-port/attestation.ts)
- `function:2ac9c256ee837efd842fad4895311014` function normalizeSignature (lib/atproto-attestation-port/compat.ts)
- `function:3608a744291922c8015b11ff35055a19` function parsePrivateMultibase (lib/atproto-attestation-port/compat.ts)
- `function:373c7553e6b2efc4ff0ec7fe00b4c353` function createSignature (lib/atproto-attestation-port/attestation.ts)
- `function:40424f5cff36d401b4f23beeb37acdeb` function parseDidKey (lib/atproto-attestation-port/compat.ts)
- `function:4359bf6648cbb29b659affcb66d34e5b` function validateDagCborCid (lib/atproto-attestation-port/cid.ts)
- `function:56f3586f0b1530f49d9036375ff82ebe` function verifyBytes (lib/atproto-attestation-port/compat.ts)
- `function:65d90d22f60b7e69321cabd8fddea572` function createAttestationCid (lib/atproto-attestation-port/cid.ts)
- `function:7202ad9631166c21ad22faaf1b5c8074` function verify (lib/atproto-attestation-port/compat.ts)
- `function:762dfb4e999f89f85e65a2c0b4c0839f` function formatPrivateMultibase (lib/atproto-attestation-port/compat.ts)
- `function:7b5845af2c94749bc3dc4f342f504cf6` function appendRemoteAttestation (lib/atproto-attestation-port/attestation.ts)
- `function:877a563a87f49d44fab8e99b97d02560` function appendInlineAttestation (lib/atproto-attestation-port/attestation.ts)
- `function:a3678e92d28cad3924670c536c044e80` function formatDidKey (lib/atproto-attestation-port/compat.ts)
- `function:a74e1c1c55bfcab0e180e66f01a40d81` function defaultKeyResolver (lib/atproto-attestation-port/compat.ts)
- `function:b0cd1a5e6e1cfce2bb54c88d0804a9fc` function didForKey (lib/atproto-attestation-port/attestation.ts)
- `function:e41589b91c43965e4145a8db999ccd50` function createInlineAttestation (lib/atproto-attestation-port/attestation.ts)
- `function:fd28e595b10aa4b5350b5d3a05771cad` function createRemoteAttestation (lib/atproto-attestation-port/attestation.ts)
- `interface:01516a0f8e74129f27c7dce2c73740b1` interface VerifyEntryResult (lib/atproto-attestation-port/compat.ts)
- `interface:35db749ae49ede3dbb8fdfc3de0ad143` interface LexiconType (lib/atproto-attestation-port/types.ts)
- `interface:4827b37ed0f5dca721317364d7c7041a` interface AttestationSignature (lib/atproto-attestation-port/types.ts)
- `interface:7277524e39c1b2fe5fb2f39cd9624c3c` interface InlineAttestation (lib/atproto-attestation-port/compat.ts)
- `interface:be596c493285769fb57191618da2f945` interface VerifyOptions (lib/atproto-attestation-port/compat.ts)
- `interface:c8af39ac7d15bb1ffa3d65e332c61a1f` interface CidString (lib/atproto-attestation-port/types.ts)
- `interface:d51229f6b13e3dff6b991c37add6ea5f` interface AttestationOptions (lib/atproto-attestation-port/compat.ts)

_34 more reference(s) indexed but not listed here to stay inside the 1500-token budget._
<!-- SPECD_MANAGED_END -->
