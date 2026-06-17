import type { Agent } from "@atproto/api";
import { createSignedRecord, type RecordSigner } from "@publicdomainrelay/market-atproto";
import {
  assertSafeEgressUrl,
  type EgressOptions,
  type Logger,
  noopLogger,
  strongRef,
  type StrongRef,
  ACCEPTS_X402_NSID,
} from "@publicdomainrelay/market-common";

export interface SettleX402Options {
  agent: Agent;
  signer: RecordSigner;
  bid: StrongRef;
  bidPayload: StrongRef;
  url: string;
  egress?: EgressOptions;
  fetch?: typeof fetch;
  timeoutMs?: number;
  log?: Logger;
}

export async function settleX402Payment(opts: SettleX402Options): Promise<StrongRef> {
  const { agent, signer, bid, bidPayload, url } = opts;
  const log = opts.log ?? noopLogger;
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 30000;

  assertSafeEgressUrl(url, opts.egress);

  const acceptsX402 = await createSignedRecord(agent, ACCEPTS_X402_NSID, {
    $type: ACCEPTS_X402_NSID,
    bid,
    payload: bidPayload,
    createdAt: new Date().toISOString(),
  }, signer);

  const receiptUrl = `${url.replace(/\/+$/, "")}/${acceptsX402.uri}/${acceptsX402.cid}`;
  log("info", "settling x402 payment", { url: receiptUrl, acceptsX402: acceptsX402.uri });

  const res = await doFetch(receiptUrl, { method: "GET", signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    throw new Error(`x402 payment failed ${res.status}: ${await res.text()}`);
  }
  const body = await res.json() as { uri?: string; cid?: string };
  if (!body.uri || !body.cid) {
    throw new Error(`x402 payment endpoint returned no receipts.x402 strongRef: ${JSON.stringify(body)}`);
  }
  log("info", "x402 payment settled", { receiptsX402: body.uri });
  return strongRef(body.uri, body.cid);
}
