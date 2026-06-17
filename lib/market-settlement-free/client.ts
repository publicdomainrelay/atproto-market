import type { Agent } from "@atproto/api";
import { createRecord } from "@publicdomainrelay/market-atproto";
import {
  assertSafeEgressUrl,
  type EgressOptions,
  type Logger,
  noopLogger,
  strongRef,
  type StrongRef,
  ACCEPTS_FREE_NSID,
} from "@publicdomainrelay/market-common";

export interface SettleFreeOptions {
  agent: Agent;
  bid: StrongRef;
  bidPayload: StrongRef;
  url: string;
  egress?: EgressOptions;
  fetch?: typeof fetch;
  timeoutMs?: number;
  log?: Logger;
}

export async function settleFreeGrant(opts: SettleFreeOptions): Promise<StrongRef> {
  const { agent, bid, bidPayload, url } = opts;
  const log = opts.log ?? noopLogger;
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 30000;

  assertSafeEgressUrl(url, opts.egress);

  const acceptsFree = await createRecord(agent, ACCEPTS_FREE_NSID, {
    $type: ACCEPTS_FREE_NSID,
    bid,
    payload: bidPayload,
    createdAt: new Date().toISOString(),
  });

  const grantUrl = `${url.replace(/\/+$/, "")}/${acceptsFree.uri}/${acceptsFree.cid}`;
  log("info", "settling free grant", { url: grantUrl, acceptsFree: acceptsFree.uri });

  const res = await doFetch(grantUrl, { method: "GET", signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    throw new Error(`free grant failed ${res.status}: ${await res.text()}`);
  }
  const body = await res.json() as { uri?: string; cid?: string };
  if (!body.uri || !body.cid) {
    throw new Error(`free grant endpoint returned no receipts.free strongRef: ${JSON.stringify(body)}`);
  }
  log("info", "free grant settled", { receiptsFree: body.uri });
  return strongRef(body.uri, body.cid);
}
