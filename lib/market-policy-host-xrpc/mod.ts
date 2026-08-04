import type { PolicyHost, TrustSetSnapshot } from "@publicdomainrelay/market-policy-common";
import {
  MARKET_POLICY_HOST_RESOLVE_OPERATOR_NSID,
  MARKET_POLICY_HOST_RESOLVE_OPERATOR_LXM,
  MARKET_POLICY_HOST_GET_VOUCHED_DIDS_NSID,
  MARKET_POLICY_HOST_GET_VOUCHED_DIDS_LXM,
  MARKET_POLICY_HOST_GET_TRUST_SET_NSID,
  MARKET_POLICY_HOST_GET_TRUST_SET_LXM,
  MARKET_POLICY_HOST_GET_RECORD_NSID,
  MARKET_POLICY_HOST_GET_RECORD_LXM,
} from "@publicdomainrelay/policy-common";
import { signJwt, type Signer } from "@publicdomainrelay/market-policy-engine-service";

export interface PolicyHostXrpcOpts {
  baseUrl: string;
  audDid: string;
  signer: Signer;
}

export function createPolicyHostXrpc(opts: PolicyHostXrpcOpts): PolicyHost {
  async function call<T>(nsid: string, lxm: string, body: Record<string, unknown>): Promise<T> {
    const jwt = await signJwt(opts.signer, opts.audDid, lxm);
    const res = await fetch(`${opts.baseUrl.replace(/\/+$/, "")}/xrpc/${nsid}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`policy host ${nsid} returned ${res.status}: ${text}`);
    }
    return await res.json() as T;
  }

  return {
    resolveOperator(did) {
      return call<{ operatorDid: string | null }>(
        MARKET_POLICY_HOST_RESOLVE_OPERATOR_NSID,
        MARKET_POLICY_HOST_RESOLVE_OPERATOR_LXM,
        { did },
      ).then((r) => r.operatorDid);
    },
    getVouchedDids(did) {
      return call<{ dids: string[] }>(
        MARKET_POLICY_HOST_GET_VOUCHED_DIDS_NSID,
        MARKET_POLICY_HOST_GET_VOUCHED_DIDS_LXM,
        { did },
      ).then((r) => new Set(r.dids));
    },
    getTrustSet() {
      return call<TrustSetSnapshot>(
        MARKET_POLICY_HOST_GET_TRUST_SET_NSID,
        MARKET_POLICY_HOST_GET_TRUST_SET_LXM,
        {},
      );
    },
    getRecord(ref) {
      return call<{ value: Record<string, unknown> }>(
        MARKET_POLICY_HOST_GET_RECORD_NSID,
        MARKET_POLICY_HOST_GET_RECORD_LXM,
        { ref },
      ).then((r) => r.value);
    },
    log(_level, _msg, _meta) {
      // Fire-and-forget; the host's own log line is the record of record.
    },
  };
}
