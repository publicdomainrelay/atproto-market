import { assertEquals, assert } from "@std/assert";
import { createTrustSet } from "@publicdomainrelay/market-policy-trust-abc";
import { createTrustCache, type TrustSources } from "@publicdomainrelay/market-policy-trust-cache";
import { createBadgeBlueKeysOperatorDiscovery } from "@publicdomainrelay/operator-discovery-badge-blue-keys";
import { BADGE_BLUE_KEYS_NSID, BIDDER_ASSOCIATION_NSID } from "@publicdomainrelay/market-lexicons";
import { VOUCH_NSID } from "@publicdomainrelay/market-common";

const SELF = "did:plc:self";
const OP = "did:plc:operator";
const REQ = "did:plc:requester";

function rec(uri: string, value: Record<string, unknown>) {
  return { uri, value };
}

function vouch(uri: string) {
  return rec(`at://${SELF}/${VOUCH_NSID}/${uri}`, { $type: VOUCH_NSID, vouchee: uri });
}

Deno.test("TrustSet: self operator resolves to itself after setOperator(self, null)", () => {
  const set = createTrustSet({ selfDid: SELF });
  assertEquals(set.operatorOf(SELF), undefined);
  set.setOperator(SELF, null);
  assertEquals(set.operatorOf(SELF), SELF);
});

Deno.test("TrustSet: sameOperator needs both sides resolved", () => {
  const set = createTrustSet({ selfDid: SELF });
  set.setOperator(SELF, null);
  set.setOperator(REQ, OP);
  assertEquals(set.sameOperator(SELF, REQ), false);
  set.setOperator(SELF, OP);
  assertEquals(set.sameOperator(SELF, REQ), true);
  assertEquals(set.sameOperator(REQ, REQ), true);
  assertEquals(set.sameOperator(REQ, "did:plc:unknown"), undefined);
});

Deno.test("TrustSet: vouches", () => {
  const set = createTrustSet({ selfDid: SELF });
  set.addVouch(SELF, OP);
  assert(set.isVouched(SELF, OP));
  assertEquals(set.vouchedBy(SELF), new Set([OP]));
  set.removeVouch(SELF, OP);
  assertEquals(set.isVouched(SELF, OP), false);
});

Deno.test("TrustSet: associations", () => {
  const set = createTrustSet({ selfDid: SELF });
  set.addAssociation(OP, REQ);
  assertEquals(set.associatedWith(OP), new Set([REQ]));
  set.removeAssociation(OP, REQ);
  assertEquals(set.associatedWith(OP).size, 0);
});

Deno.test("TrustSet: applyEvent invalidates on badgeBlueKeys / vouch changes", () => {
  const set = createTrustSet({ selfDid: SELF });
  set.setOperator(REQ, OP);
  set.addVouch(SELF, OP);
  assertEquals(set.operatorOf(REQ), OP);

  set.applyEvent({ did: REQ, collection: BADGE_BLUE_KEYS_NSID, rkey: "abc", operation: "delete" });
  assertEquals(set.operatorOf(REQ), undefined, "badgeBlueKeys change invalidates operatorOf");

  set.applyEvent({ did: SELF, collection: VOUCH_NSID, rkey: OP, operation: "delete" });
  assertEquals(set.isVouched(SELF, OP), false, "vouch delete clears the vouchee");
});

// ---------------------------------------------------------------------------
// Trust cache: warm + on-demand resolution against fake sources
// ---------------------------------------------------------------------------

function sources(over: Partial<TrustSources> = {}): TrustSources {
  return {
    listOwnRecords: async () => [],
    listPublicRecords: async () => [],
    log: () => {},
    ...over,
  };
}

Deno.test("TrustCache.refresh discovers the operator and warms vouches", async () => {
  const set = createTrustSet({ selfDid: SELF });
  const cache = createTrustCache({
    set,
    sources: sources({
      listOwnRecords: async (collection) => {
        if (collection === BADGE_BLUE_KEYS_NSID) {
          return [rec(`at://${SELF}/${BADGE_BLUE_KEYS_NSID}/1`, {
            $type: BADGE_BLUE_KEYS_NSID, keyId: OP, challenge: SELF, service: "bidder_associate",
          })];
        }
        if (collection === VOUCH_NSID) {
          return [vouch("did:plc:friend")];
        }
        return [];
      },
      listPublicRecords: async (repo, collection) => {
        if (collection === VOUCH_NSID) return [vouch("did:plc:friend2")];
        return [];
      },
    }),
  });

  await cache.refresh();

  assertEquals(set.operatorOf(SELF), OP, "self resolves to discovered operator");
  assert(set.isVouched(SELF, "did:plc:friend"), "own-repo vouch warmed");
  assert(set.isVouched(OP, "did:plc:friend2"), "operator public vouch warmed");
});

Deno.test("TrustCache.refresh treats a self-owned bidder as its own operator", async () => {
  const set = createTrustSet({ selfDid: SELF });
  const cache = createTrustCache({ set, sources: sources() });
  await cache.refresh();
  assertEquals(set.operatorOf(SELF), SELF);
});

Deno.test("TrustCache.refreshFor resolves a requester associated with a trusted operator", async () => {
  const set = createTrustSet({ selfDid: SELF });
  set.setOperator(SELF, null);
  const cache = createTrustCache({
    set,
    sources: sources({
      listPublicRecords: async (repo, collection) => {
        if (repo === REQ && collection === BADGE_BLUE_KEYS_NSID) {
          return [rec(`at://${REQ}/${BADGE_BLUE_KEYS_NSID}/1`, {
            $type: BADGE_BLUE_KEYS_NSID, keyId: SELF, challenge: REQ, service: "requester_associate",
          })];
        }
        return [];
      },
    }),
  });

  await cache.refreshFor(REQ);
  assertEquals(set.operatorOf(REQ), SELF, "requester associated with self");
  assert(set.associatedWith(SELF).has(REQ));
});

Deno.test("TrustCache.refreshFor resolves an operator not in the trusted set", async () => {
  const set = createTrustSet({ selfDid: SELF });
  set.setOperator(SELF, null);
  const cache = createTrustCache({
    set,
    sources: sources({
      listPublicRecords: async (repo, collection) => {
        if (repo === REQ && collection === BADGE_BLUE_KEYS_NSID) {
          return [rec(`at://${REQ}/${BADGE_BLUE_KEYS_NSID}/1`, {
            $type: BADGE_BLUE_KEYS_NSID, keyId: "did:plc:stranger", challenge: REQ, service: "requester_associate",
          })];
        }
        return [];
      },
    }),
  });

  await cache.refreshFor(REQ);
  assertEquals(set.operatorOf(REQ), undefined, "stranger operator stays unresolved (negative not cached)");
});

Deno.test("TrustCache.refreshFor applies transitive promotion", async () => {
  const set = createTrustSet({ selfDid: SELF });
  set.addVouch(SELF, OP); // operator already vouched by self
  const cache = createTrustCache({
    set,
    sources: sources({
      listOwnRecords: async (collection) => {
        if (collection === BADGE_BLUE_KEYS_NSID) {
          return [rec(`at://${SELF}/${BADGE_BLUE_KEYS_NSID}/1`, {
            $type: BADGE_BLUE_KEYS_NSID, keyId: OP, challenge: REQ, service: "requester_associate",
          })];
        }
        return [];
      },
    }),
  });

  await cache.refresh();
  assert(set.isVouched(SELF, REQ), "challenge promoted into self vouch set when keyId is vouched");
});

// ---------------------------------------------------------------------------
// BadgeBlueKeys operator discovery: resolves BOTH a bidder's operator (from its
// bidder_associate) and a requester's operator (from its requester_associate).
// The requester side is what lets only-me compare operator(bidder) ===
// operator(requester) when both sides share one ATProto account.
// ---------------------------------------------------------------------------

function badgeBlueKeysRec(challenge: string, keyId: string, service: string) {
  return {
    uri: `at://${challenge}/${BADGE_BLUE_KEYS_NSID}/1`,
    value: { $type: BADGE_BLUE_KEYS_NSID, keyId, challenge, service },
  };
}

Deno.test("operator discovery resolves a bidder's operator from bidder_associate", async () => {
  const discovery = createBadgeBlueKeysOperatorDiscovery({
    listRecordsOwn: async () => [badgeBlueKeysRec(REQ, OP, "bidder_associate")],
    listRecordsPublic: async () => [],
  });
  assertEquals(await discovery.discoverOperatorDids(REQ), [OP]);
});

Deno.test("operator discovery resolves a requester's operator from requester_associate", async () => {
  // The requester's own requester_associate record (challenge=self, keyId=the
  // shared account) is what the requester-side resolveOperatorDid needs to map
  // the requester's ephemeral DID to the shared operator.
  const discovery = createBadgeBlueKeysOperatorDiscovery({
    listRecordsOwn: async () => [badgeBlueKeysRec(REQ, OP, "requester_associate")],
    listRecordsPublic: async () => [],
  });
  assertEquals(await discovery.discoverOperatorDids(REQ), [OP]);
});

Deno.test("operator discovery falls back to the public repo when own records carry no association", async () => {
  const discovery = createBadgeBlueKeysOperatorDiscovery({
    listRecordsOwn: async () => [],
    listRecordsPublic: async (repo) =>
      repo === REQ ? [badgeBlueKeysRec(REQ, OP, "requester_associate")] : [],
  });
  assertEquals(await discovery.discoverOperatorDids(REQ), [OP]);
});

Deno.test("operator discovery ignores records whose challenge is another DID", async () => {
  const discovery = createBadgeBlueKeysOperatorDiscovery({
    listRecordsOwn: async () => [badgeBlueKeysRec(SELF, REQ, "requester_associate")],
    listRecordsPublic: async () => [],
  });
  assertEquals(await discovery.discoverOperatorDids(REQ), []);
});

Deno.test("TrustCache applies firehose events after a warm", async () => {
  const set = createTrustSet({ selfDid: SELF });
  set.setOperator(REQ, OP);
  set.applyEvent({ did: REQ, collection: BADGE_BLUE_KEYS_NSID, rkey: "abc", operation: "create" });
  assertEquals(set.operatorOf(REQ), undefined);

  const cache = createTrustCache({ set, sources: sources() });
  await cache.refreshFor(REQ);
  assertEquals(set.operatorOf(REQ), undefined, "re-check stays unresolved until a trusted association lands");
});
