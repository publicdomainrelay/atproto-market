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
  ACCEPTS_X402_NSID,
  RECEIPTS_X402_NSID,
} from "@publicdomainrelay/market-common";
import {
  createRemoteProofRecord,
  type RecordSigner,
  verifyRemoteProof,
} from "@publicdomainrelay/market-atproto";
import type { Main as AcceptsX402 } from "../common/market-lexicons/com/publicdomainrelay/temp/market/accepts/x402.defs.ts";
import type { Main as ReceiptsX402 } from "../common/market-lexicons/com/publicdomainrelay/temp/market/receipts/x402.defs.ts";

export class X402PaymentError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "X402PaymentError";
  }
}

export function parseReceiptPath(path: string, prefix = ""): { acceptsUri: string; acceptsCid: string } {
  let p = path.replace(/^\/+/, "");
  if (prefix && p.startsWith(prefix)) p = p.slice(prefix.length);
  const lastSlash = p.lastIndexOf("/");
  if (lastSlash <= 0) throw new X402PaymentError(400, "missing cid");
  return { acceptsUri: p.slice(0, lastSlash), acceptsCid: p.slice(lastSlash + 1) };
}

export async function mintReceiptForAccepts(opts: {
  agent: Agent;
  resolve: RecordResolver;
  acceptsUri: string;
  acceptsCid: string;
  signer: RecordSigner;
}): Promise<StrongRef> {
  const { agent, resolve, acceptsUri, acceptsCid, signer } = opts;
  const acceptsX402 = await resolve.resolve<AcceptsX402>({ uri: acceptsUri, cid: acceptsCid });
  if (acceptsX402.$type && acceptsX402.$type !== ACCEPTS_X402_NSID) {
    throw new X402PaymentError(400, `expected ${ACCEPTS_X402_NSID}, got ${acceptsX402.$type}`);
  }
  return await createRemoteProofRecord(
    agent,
    RECEIPTS_X402_NSID,
    {
      $type: RECEIPTS_X402_NSID,
      accept: strongRef(acceptsUri, acceptsCid),
      createdAt: new Date().toISOString(),
    },
    {
      subjectRecord: stripResolved(acceptsX402) as Record<string, unknown>,
      subjectRepositoryDid: atUriAuthority(acceptsUri),
    },
    signer,
  );
}

export async function verifyX402Payment(opts: {
  payment: StrongRef | undefined;
  resolve: RecordResolver;
  bidderDid: string;
}): Promise<Resolved<ReceiptsX402>> {
  const { payment, resolve, bidderDid } = opts;
  if (!payment) {
    throw new X402PaymentError(402, "Accept.payload (receipts.x402 proof-of-payment) is required");
  }
  const receipt = await resolve.resolve<ReceiptsX402 & { $type?: string }>(payment);
  const nsid = receipt.$type ?? nsidFromUri(payment.uri);
  if (nsid !== RECEIPTS_X402_NSID) {
    throw new X402PaymentError(402, `Accept.payload must be a ${RECEIPTS_X402_NSID}, got ${nsid}`);
  }
  if (atUriAuthority(payment.uri) !== bidderDid) {
    throw new X402PaymentError(402, "Accept.payload proof-of-payment must be authored by this bidder");
  }
  if (receipt.accept?.uri && receipt.accept?.cid) {
    const acceptsX402 = await resolve.resolve<AcceptsX402>({ uri: receipt.accept.uri, cid: receipt.accept.cid });
    const bound = await verifyRemoteProof({
      subjectRecord: stripResolved(acceptsX402) as Record<string, unknown>,
      subjectRepositoryDid: atUriAuthority(receipt.accept.uri),
      proofRecord: stripResolved(receipt) as Record<string, unknown>,
    });
    if (!bound) {
      throw new X402PaymentError(402, "Accept.payload proof-of-payment CID does not bind to its accepts.x402");
    }
  }
  return receipt;
}
