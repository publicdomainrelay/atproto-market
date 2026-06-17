import type { Agent } from "@atproto/api";
import {
  atUriAuthority,
  nsidFromUri,
  type RecordResolver,
  stripResolved,
} from "@publicdomainrelay/market-abc";
import {
  type Resolved,
  strongRef,
  type StrongRef,
  ACCEPTS_FREE_NSID,
  RECEIPTS_FREE_NSID,
} from "@publicdomainrelay/market-common";
import {
  createRemoteProofRecord,
  type RecordSigner,
  verifyRemoteProof,
} from "@publicdomainrelay/market-atproto";
import type { Main as AcceptsFree } from "../common/market-lexicons/com/publicdomainrelay/temp/market/accepts/free.defs.ts";
import type { Main as ReceiptsFree } from "../common/market-lexicons/com/publicdomainrelay/temp/market/receipts/free.defs.ts";

export class FreeGrantError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "FreeGrantError";
  }
}

export function parseGrantPath(path: string, prefix = ""): { acceptsUri: string; acceptsCid: string } {
  let p = path.replace(/^\/+/, "");
  if (prefix && p.startsWith(prefix)) p = p.slice(prefix.length);
  const lastSlash = p.lastIndexOf("/");
  if (lastSlash <= 0) throw new FreeGrantError(400, "missing cid");
  return { acceptsUri: p.slice(0, lastSlash), acceptsCid: p.slice(lastSlash + 1) };
}

export async function mintGrantForAccepts(opts: {
  agent: Agent;
  resolve: RecordResolver;
  acceptsUri: string;
  acceptsCid: string;
  signer: RecordSigner;
}): Promise<StrongRef> {
  const { agent, resolve, acceptsUri, acceptsCid, signer } = opts;
  const acceptsFree = await resolve.resolve<AcceptsFree>({ uri: acceptsUri, cid: acceptsCid });
  if (acceptsFree.$type && acceptsFree.$type !== ACCEPTS_FREE_NSID) {
    throw new FreeGrantError(400, `expected ${ACCEPTS_FREE_NSID}, got ${acceptsFree.$type}`);
  }
  return await createRemoteProofRecord(
    agent,
    RECEIPTS_FREE_NSID,
    {
      $type: RECEIPTS_FREE_NSID,
      accept: strongRef(acceptsUri, acceptsCid),
      createdAt: new Date().toISOString(),
    },
    {
      subjectRecord: stripResolved(acceptsFree) as Record<string, unknown>,
      subjectRepositoryDid: atUriAuthority(acceptsUri),
    },
    signer,
  );
}

export async function verifyFreeGrant(opts: {
  payment: StrongRef | undefined;
  resolve: RecordResolver;
  bidderDid: string;
}): Promise<Resolved<ReceiptsFree>> {
  const { payment, resolve, bidderDid } = opts;
  if (!payment) {
    throw new FreeGrantError(400, "Accept.payload (receipts.free proof-of-grant) is required");
  }
  const receipt = await resolve.resolve<ReceiptsFree & { $type?: string }>(payment);
  const nsid = receipt.$type ?? nsidFromUri(payment.uri);
  if (nsid !== RECEIPTS_FREE_NSID) {
    throw new FreeGrantError(400, `Accept.payload must be a ${RECEIPTS_FREE_NSID}, got ${nsid}`);
  }
  if (atUriAuthority(payment.uri) !== bidderDid) {
    throw new FreeGrantError(400, "Accept.payload proof-of-grant must be authored by this bidder");
  }
  if (receipt.accept?.uri && receipt.accept?.cid) {
    const acceptsFree = await resolve.resolve<AcceptsFree>({ uri: receipt.accept.uri, cid: receipt.accept.cid });
    const bound = await verifyRemoteProof({
      subjectRecord: stripResolved(acceptsFree) as Record<string, unknown>,
      subjectRepositoryDid: atUriAuthority(receipt.accept.uri),
      proofRecord: stripResolved(receipt) as Record<string, unknown>,
    });
    if (!bound) {
      throw new FreeGrantError(400, "Accept.payload proof-of-grant CID does not bind to its accepts.free");
    }
  }
  return receipt;
}
