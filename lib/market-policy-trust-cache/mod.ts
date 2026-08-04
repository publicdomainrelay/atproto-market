import type { TrustSet } from "@publicdomainrelay/market-policy-trust-abc";
import { BADGE_BLUE_KEYS_NSID } from "@publicdomainrelay/market-lexicons";
import { VOUCH_NSID } from "@publicdomainrelay/market-common";

export interface ListedRecord {
  uri: string;
  value: Record<string, unknown>;
}

export interface TrustSources {
  /** Authenticated read of this process's own repo. */
  listOwnRecords(collection: string, opts?: { limit?: number }): Promise<ListedRecord[]>;
  /** Public read of any repo. */
  listPublicRecords(repo: string, collection: string): Promise<ListedRecord[]>;
  log?(level: string, msg: string, meta?: Record<string, unknown>): void;
}

export interface TrustCache {
  set: TrustSet;
  /** Warm operators + vouch sets at boot. */
  refresh(): Promise<void>;
  /** Resolve one counterparty's operator + association on a cache miss. */
  refreshFor(did: string): Promise<void>;
}

const BIDDER_ASSOCIATE = "bidder_associate";
const REQUESTER_ASSOCIATE = "requester_associate";

function voucheeFromUri(uri: string): string | null {
  const rkey = uri.split("/").pop() ?? "";
  return rkey.startsWith("did:") ? rkey : null;
}

export function createTrustCache(opts: { set: TrustSet; sources: TrustSources }): TrustCache {
  const { set, sources } = opts;
  const log = sources.log ?? (() => {});

  async function readOwn(collection: string): Promise<ListedRecord[]> {
    try {
      return await sources.listOwnRecords(collection, { limit: 200 });
    } catch (err) {
      log("warn", "trust: own repo read failed", { collection, error: String(err) });
      return [];
    }
  }

  async function readPublic(repo: string, collection: string): Promise<ListedRecord[]> {
    try {
      return await sources.listPublicRecords(repo, collection);
    } catch (err) {
      log("warn", "trust: public repo read failed", { repo, collection, error: String(err) });
      return [];
    }
  }

  function isAssociateRecord(v: Record<string, unknown>, service: string, challenge: string): string | null {
    if (v.service !== service) return null;
    if (v.challenge !== challenge) return null;
    const keyId = v.keyId;
    return typeof keyId === "string" && keyId.startsWith("did:") ? keyId : null;
  }

  function vouchDidsOf(records: ListedRecord[]): Set<string> {
    const out = new Set<string>();
    for (const r of records) {
      const v = r.value;
      if (v.kind === "denounce") continue;
      const vouchee = voucheeFromUri(r.uri);
      if (vouchee) out.add(vouchee);
    }
    return out;
  }

  return {
    set,

    async refresh() {
      // 1. Discover the bidder's own operator(s) from bidder_associate records.
      const selfDid = opts.set.selfDid;
      const ownRecords = await readOwn(BADGE_BLUE_KEYS_NSID);
      const operatorDids = new Set<string>([selfDid]);
      let firstOperator: string | null = null;
      for (const r of ownRecords) {
        const keyId = isAssociateRecord(r.value, BIDDER_ASSOCIATE, selfDid);
        if (keyId) {
          operatorDids.add(keyId);
          firstOperator ??= keyId;
        }
      }
      set.setOperator(selfDid, firstOperator); // null = self-owned bidder

      // 2. Vouch sets of every trusted operator (own repo for self, public otherwise).
      for (const op of operatorDids) {
        const records = op === selfDid ? await readOwn(VOUCH_NSID) : await readPublic(op, VOUCH_NSID);
        for (const vouchee of vouchDidsOf(records)) set.addVouch(op, vouchee);
      }

      // 3. Transitive promotion: own requester_associate records whose keyId is
      // already vouched-by-self get their challenge promoted into self's vouch set.
      for (const r of ownRecords) {
        const v = r.value;
        if (v.service === REQUESTER_ASSOCIATE && typeof v.challenge === "string") {
          const keyId = v.keyId;
          if (typeof keyId === "string" && (set.isVouched(selfDid, keyId) || operatorDids.has(keyId))) {
            set.addVouch(selfDid, v.challenge);
          }
        }
      }

      log("info", "trust cache warmed", { operatorDids: [...operatorDids], stats: set.stats() });
    },

    async refreshFor(did) {
      const selfDid = opts.set.selfDid;
      if (did === selfDid) return;

      // A counterparty's operator is the keyId of its requester_associate
      // records -- accept it when it is a trusted operator or vouched by self.
      const records = await readPublic(did, BADGE_BLUE_KEYS_NSID);
      for (const r of records) {
        const keyId = isAssociateRecord(r.value, REQUESTER_ASSOCIATE, did);
        if (!keyId) continue;
        const trusted = set.trustedOperators().has(keyId) || set.isVouched(selfDid, keyId);
        if (trusted) {
          set.setOperator(did, keyId);
          set.addAssociation(keyId, did);
          log("info", "trust: counterparty operator resolved", { did, operatorDid: keyId });
          return;
        }
      }
      log("info", "trust: counterparty operator not in trusted set", { did, checked: true });
    },
  };
}
