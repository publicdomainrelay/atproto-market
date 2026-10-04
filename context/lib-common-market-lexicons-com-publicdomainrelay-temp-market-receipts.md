# Context: lib-common-market-lexicons-com-publicdomainrelay-temp-market-receipts

Repository: `atproto-market`

Both receipt lexicons exist so a bidder's grant or payment can be verified by the requester before the resource is provisioned: the receipt is returned by AT-URI plus CID and used as the payload of the higher-level com.publicdomainrelay.temp.market.accept. The two records are deliberately identical in shape so the free path (no payment, proof of grant) and the paid path (x402, proof of payment) differ only in NSID and semantics, keeping the accept-side verification code uniform. The cid field carries a badge.blue remote attestation computed over the referenced accepts record, with the receipt's own metadata and the requester's repo DID folded in as $sig via DAG-CBOR + SHA-256 + CIDv1, which binds the receipt to one repository and makes re-binding it to a copy of the accepts record elsewhere fail verification -- badge.blue's replay-attack prevention applied to market receipts. The signatures field must carry the bidder's inline signature attached at creation, so neither the grant nor the payment proof is repudiable.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->
