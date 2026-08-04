/**
 * Pure trust state for policy evaluation. Zero I/O -- all record fetching happens
 * in the trust-cache implementation and lands here as setter calls. Query
 * methods are sync and cache-only: undefined means "unknown, needs a refresh",
 * never a hard decision.
 */
export interface TrustRecordEvent {
  did: string;
  collection: string;
  rkey: string;
  operation: "create" | "update" | "delete";
}

export interface TrustQuery {
  /**
   * The operator DID for a bidder or requester, or the DID itself when it is
   * self-owned. undefined = not in cache / stale = abstain.
   */
  operatorOf(did: string): string | undefined;
  /** undefined = cannot decide from cache alone. */
  sameOperator(a: string, b: string): boolean | undefined;
  isVouched(voucher: string, vouchee: string): boolean;
  /** The direct vouch set of one DID. */
  vouchedBy(voucher: string): ReadonlySet<string>;
  trustedOperators(): ReadonlySet<string>;
  associatedWith(operatorDid: string): ReadonlySet<string>;
}

export interface TrustEventSink {
  /** Firehose event -> invalidate the affected cache keys. */
  applyEvent(e: TrustRecordEvent): void;
}

export interface TrustSet extends TrustQuery, TrustEventSink {
  readonly selfDid: string;
  /** Record that did resolves to operator op; null = did is its own operator. */
  setOperator(did: string, op: string | null): void;
  addAssociation(operatorDid: string, counterpartyDid: string): void;
  addVouch(voucher: string, vouchee: string): void;
  removeAssociation(operatorDid: string, counterpartyDid: string): void;
  removeVouch(voucher: string, vouchee: string): void;
  stats(): { operators: number; associations: number; vouches: number; operatorOf: number };
}

export interface TrustSetOpts {
  selfDid: string;
  /** TTL for negative operator resolutions. Default 30s. */
  negativeTtlMs?: number;
}

const MISS = Symbol("miss");

export function createTrustSet(opts: TrustSetOpts): TrustSet {
  const { selfDid } = opts;
  const negativeTtlMs = opts.negativeTtlMs ?? 30_000;

  const operators = new Set<string>([selfDid]);
  const associations = new Map<string, Set<string>>();
  const vouches = new Map<string, Set<string>>();
  const operatorOf = new Map<string, { op: string; at: number }>();

  function setOf(map: Map<string, Set<string>>, key: string): Set<string> {
    let s = map.get(key);
    if (!s) {
      s = new Set();
      map.set(key, s);
    }
    return s;
  }

  function entryOperator(did: string): string | typeof MISS {
    const entry = operatorOf.get(did);
    if (!entry) return MISS;
    if (entry.at + negativeTtlMs < Date.now()) {
      operatorOf.delete(did);
      return MISS;
    }
    return entry.op;
  }

  return {
    selfDid,

    operatorOf(did) {
      const op = entryOperator(did);
      return op === MISS ? undefined : op;
    },

    sameOperator(a, b) {
      if (a === b) return true;
      const oa = entryOperator(a);
      const ob = entryOperator(b);
      if (oa === MISS || ob === MISS) return undefined;
      return oa === ob;
    },

    isVouched(voucher, vouchee) {
      return vouches.get(voucher)?.has(vouchee) ?? false;
    },

    vouchedBy(voucher) {
      return vouches.get(voucher) ?? new Set<string>();
    },

    trustedOperators() {
      return operators;
    },

    associatedWith(operatorDid) {
      return associations.get(operatorDid) ?? new Set<string>();
    },

    setOperator(did, op) {
      operatorOf.set(did, { op: op ?? did, at: Date.now() });
    },

    addAssociation(operatorDid, counterpartyDid) {
      setOf(associations, operatorDid).add(counterpartyDid);
    },

    addVouch(voucher, vouchee) {
      setOf(vouches, voucher).add(vouchee);
    },

    removeAssociation(operatorDid, counterpartyDid) {
      associations.get(operatorDid)?.delete(counterpartyDid);
    },

    removeVouch(voucher, vouchee) {
      vouches.get(voucher)?.delete(vouchee);
    },

    applyEvent(e) {
      // A delete (or update re-create) of a record can change resolution.
      if (e.collection.endsWith(".vouch") || e.collection.endsWith("graph.vouch")) {
        // rkey is the vouchee
        vouches.get(e.did)?.delete(e.rkey);
        return;
      }
      if (e.collection.endsWith("badgeBlueKeys")) {
        // A badgeBlueKeys event for the SELF DID is an echo of this process's
        // own declared operator association (minted at boot by the QR flow or
        // --associate-with). The boot-time refresh already resolved it into
        // operatorOf(self); clearing it here would make only-me fall back to
        // "self-owned" until restart. Self's association only changes through
        // this process's own writes, which refresh() re-reads at boot -- so skip
        // self-DID events and keep the boot-resolved operator.
        if (e.did === selfDid) return;
        for (const op of operators) associations.get(op)?.delete(e.did);
        operatorOf.delete(e.did);
        return;
      }
      // Any other self-DID record echo must not clear operatorOf(self) either:
      // the self's operator is resolved from its own badgeBlueKeys association
      // at boot, and no firehose echo of this process's own records is a change
      // the process didn't already account for.
      if (e.did !== selfDid) operatorOf.delete(e.did);
    },

    stats() {
      let associationsCount = 0;
      for (const s of associations.values()) associationsCount += s.size;
      let vouchesCount = 0;
      for (const s of vouches.values()) vouchesCount += s.size;
      return {
        operators: operators.size,
        associations: associationsCount,
        vouches: vouchesCount,
        operatorOf: operatorOf.size,
      };
    },
  };
}
