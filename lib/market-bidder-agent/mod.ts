// OAuth DPoP-backed AtprotoAgentLike implementation.
// Bridges the desktop app's OAuth session to the ATProto agent interface
// that createATProto expects. Uses DPoP-bound fetch for all PDS calls.
//
// Layering: impl (cross-concept bridge between atproto-oauth and atproto-helpers).
// Acknowledged exception: accepts createDpopProof via dependency injection
// rather than importing from atproto-oauth-fetch directly — keeps the package
// self-contained and avoids a cross-repo import cycle.

import type { AtprotoAgentLike, ATProto, CreateATProtoOpts } from "@publicdomainrelay/atproto-helpers";
import type { WriteOp, CommitEvent } from "@publicdomainrelay/atproto-repo-abc";
import type { StructuredLoggerInterface } from "@publicdomainrelay/logger";

// ---------------------------------------------------------------------------
// Minimal session shape — avoids importing from deno-macos-runner-desktop
// ---------------------------------------------------------------------------

export interface OAuthAgentSession {
  did: string;
  pds: string;
  accessJwt: string;
  dpopKeyPair: CryptoKeyPair;
  dpopPublicJwk: Record<string, string>;
}

export type DpopProofCreator = (
  keyPair: CryptoKeyPair,
  publicJwk: Record<string, string>,
  method: string,
  url: string,
  accessToken: string | null,
  nonce?: string | null,
) => Promise<string>;

export interface OAuthAgentOptions {
  createDpopProof: DpopProofCreator;
  refreshSession: () => Promise<OAuthAgentSession>;
  onSessionRefreshed?: (session: OAuthAgentSession) => void;
  /** Initial DPoP server nonce from token endpoint response. Seeded into
   * the per-endpoint nonce map so the first resource request carries it. */
  serverNonce?: string | null;
}

// ---------------------------------------------------------------------------
// OAuthAgent — AtprotoAgentLike backed by OAuth DPoP tokens
// ---------------------------------------------------------------------------

export function createOAuthAgent(
  session: OAuthAgentSession,
  signer: { did(): string; sign(bytes: Uint8Array): Promise<Uint8Array> },
  opts: OAuthAgentOptions,
): AtprotoAgentLike {
  let currentSession = session;
  let refreshPromise: Promise<void> | null = null;
  const nonces = new Map<string, string | null>();

  const { createDpopProof, refreshSession, onSessionRefreshed, serverNonce } = opts;
  if (serverNonce) nonces.set(`${session.pds}/xrpc/com.atproto.repo.applyWrites`, serverNonce);

  async function refreshLock(): Promise<void> {
    if (refreshPromise) {
      await refreshPromise;
      return;
    }
    refreshPromise = (async () => {
      try {
        currentSession = await refreshSession();
        onSessionRefreshed?.(currentSession);
      } finally {
        refreshPromise = null;
      }
    })();
    await refreshPromise;
  }

  async function dpopFetch(
    method: string,
    url: string,
    body?: Record<string, unknown>,
  ): Promise<Response> {
    const makeRequest = async (): Promise<Response> => {
      const nonce = nonces.get(url) ?? undefined;
      const proof = await createDpopProof(
        currentSession.dpopKeyPair,
        currentSession.dpopPublicJwk,
        method,
        url,
        nonce ?? undefined,
        currentSession.accessJwt,
      );
      const headers: Record<string, string> = {
        "Authorization": `DPoP ${currentSession.accessJwt}`,
        "DPoP": proof,
        "Content-Type": "application/json",
      };
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      // Track DPoP nonce from response
      const dpopNonce = res.headers.get("DPoP-Nonce");
      if (dpopNonce) nonces.set(url, dpopNonce);
      return res;
    };

    let res = await makeRequest();
    // DPoP nonce retry: match working pattern from badge-blue-keys-atproto
    if (res.status === 400 || res.status === 401) {
      const errText = await res.clone().text().catch(() => "");
      if (errText.includes("use_dpop_nonce")) {
        const dpopNonce = res.headers.get("DPoP-Nonce");
        if (dpopNonce) {
          nonces.set(url, dpopNonce);
          res = await makeRequest();
        }
      } else if (res.status === 401) {
        await refreshLock();
        res = await makeRequest();
      }
    }
    return res;
  }

  async function applyWrites(
    did: string,
    writes: WriteOp[],
  ) {
    const res = await dpopFetch(
      "POST",
      `${currentSession.pds}/xrpc/com.atproto.repo.applyWrites`,
      { repo: did, writes },
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      const dpopNonce = res.headers.get("DPoP-Nonce") || "";
      throw new Error(`applyWrites failed: ${res.status} ${err} dpop-nonce=${dpopNonce}`);
    }
    return res.json() as Promise<CommitEvent>;
  }

  async function getRecord(
    did: string,
    collection: string,
    rkey: string,
  ): Promise<{ uri: string; cid: string; value: Record<string, unknown> } | null> {
    const url = `${currentSession.pds}/xrpc/com.atproto.repo.getRecord`
      + `?repo=${encodeURIComponent(did)}`
      + `&collection=${encodeURIComponent(collection)}`
      + `&rkey=${encodeURIComponent(rkey)}`;
    const res = await dpopFetch("GET", url);
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`getRecord failed: ${res.status} ${err}`);
    }
    return res.json() as Promise<{ uri: string; cid: string; value: Record<string, unknown> }>;
  }

  async function listRecords(
    did: string,
    collection: string,
    opts?: { limit?: number },
  ): Promise<{ records: Array<{ uri: string; cid: string; value: Record<string, unknown> }> }> {
    let url = `${currentSession.pds}/xrpc/com.atproto.repo.listRecords`
      + `?repo=${encodeURIComponent(did)}`
      + `&collection=${encodeURIComponent(collection)}`;
    if (opts?.limit) url += `&limit=${opts.limit}`;
    const res = await dpopFetch("GET", url);
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`listRecords failed: ${res.status} ${err}`);
    }
    return res.json() as Promise<{ records: Array<{ uri: string; cid: string; value: Record<string, unknown> }> }>;
  }

  return {
    did: currentSession.did,
    signer,
    applyWrites,
    getRecord,
    listRecords,
  };
}

// ---------------------------------------------------------------------------
// createDesktopATProto — thin wrapper around createATProto
// ---------------------------------------------------------------------------

export async function createDesktopATProto(
  logger: StructuredLoggerInterface,
  agent: AtprotoAgentLike,
  badgeBlueSigner: CreateATProtoOpts["badgeBlueSigner"],
  idResolver: CreateATProtoOpts["plcDirectory"],
  plcClient: CreateATProtoOpts["plcDirectory"],
): Promise<ATProto> {
  const { createATProto } = await import("@publicdomainrelay/atproto-helpers");
  return createATProto({
    logger,
    badgeBlueSigner,
    plcDirectory: plcClient,
    agent,
  });
}
