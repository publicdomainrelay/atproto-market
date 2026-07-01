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
import { TID } from "@atproto/common";
import { attestationFor, toStorableEntry } from "@publicdomainrelay/market-atproto";
import type { AttestationKeypair } from "@publicdomainrelay/market-atproto";

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
    // AT Protocol XRPC uses "value" for record content; internal WriteOp uses "record"
    const xrpcWrites = writes.map((w) => {
      const { record, ...rest } = w as { record?: unknown; [key: string]: unknown };
      return { ...rest, ...(record !== undefined ? { value: record } : {}) };
    });
    const res = await dpopFetch(
      "POST",
      `${currentSession.pds}/xrpc/com.atproto.repo.applyWrites?validate=false`,
      { repo: did, writes: xrpcWrites },
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      const dpopNonce = res.headers.get("DPoP-Nonce") || "";
      throw new Error(`applyWrites failed: ${res.status} ${err} dpop-nonce=${dpopNonce} body=${JSON.stringify({ repo: did, writes: xrpcWrites }).slice(0, 500)}`);
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

  async function createRecord(
    did: string,
    collection: string,
    rkey: string,
    record: Record<string, unknown>,
  ): Promise<{ uri: string; cid: string }> {
    const res = await dpopFetch(
      "POST",
      `${currentSession.pds}/xrpc/com.atproto.repo.createRecord?validate=false`,
      { repo: did, collection, rkey, record },
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`createRecord failed: ${res.status} ${err}`);
    }
    return res.json() as Promise<{ uri: string; cid: string }>;
  }

  async function getServiceAuth(aud: string, lxm?: string): Promise<string> {
    const params = new URLSearchParams({ aud });
    if (lxm) params.set("lxm", lxm);
    const url = `${currentSession.pds}/xrpc/com.atproto.server.getServiceAuth?${params}`;
    const res = await dpopFetch("GET", url);
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`getServiceAuth failed: ${res.status} ${err}`);
    }
    const data = await res.json() as { token: string };
    return data.token;
  }

  return {
    did: currentSession.did,
    signer,
    applyWrites,
    getRecord,
    listRecords,
    createRecord,
    getServiceAuth,
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
  const atproto = await createATProto({
    logger,
    badgeBlueSigner,
    plcDirectory: plcClient,
    agent,
  });
  // Override createRecord to use validate:false — bsky.social PDS rejects
  // applyWrites for Lexicons not in its local cache, but createRecord with
  // validate:false bypasses Lexicon validation.
  const rawCreateRecord = (agent as { createRecord?: (did: string, collection: string, rkey: string, record: Record<string, unknown>) => Promise<{ uri: string; cid: string }> }).createRecord;
  if (rawCreateRecord) {
    const did = atproto.did;
    let _clock = 0;
    const nextTid = () => {
      const ts = Date.now().toString(36).padStart(13, "0");
      const clock = (_clock++ % 2048).toString(36).padStart(2, "0");
      return (ts + clock + "0").toLowerCase();
    };
    atproto.createRecord = async (collection: string, record: Record<string, unknown>) => {
      return rawCreateRecord(did, collection, nextTid(), record);
    };
    atproto.createRepoRecord = async (collection: string, record: Record<string, unknown>) => {
      return rawCreateRecord(did, collection, nextTid(), record);
    };
    // Override createSignedRepoRecord: base impl calls applyWrites which bsky.social
    // PDS rejects for custom Lexicons even with validate=false. Use createRecord
    // (com.atproto.repo.createRecord) instead — same endpoint as the working
    // createRecord wrapper.
    if (atproto.createSignedRepoRecord) {
      const signer = badgeBlueSigner as AttestationKeypair;
      atproto.createSignedRepoRecord = async (
        collection: string,
        record: Record<string, unknown>,
        issuer?: string,
      ) => {
        const rkey = TID.next().toString();
        const att = attestationFor(signer, issuer);
        const entry = await att.sign({ record: record as Record<string, unknown>, repository: did });
        const signed = { ...record, signatures: [toStorableEntry(entry)] };
        const result = await rawCreateRecord(did, collection, rkey, signed);
        return { uri: result.uri, cid: result.cid, record: signed };
      };
    }
  }

  // Override callService: base impl uses signServiceAuth which signs JWTs with
  // the raw keypair (iss=did:key:...). Bsky.social PDS users cannot register
  // custom keys in their PLC DID doc, so the JWT signature doesn't verify
  // against did:plc's #atproto key. Per ATProto inter-service-auth spec, use
  // com.atproto.server.getServiceAuth — the PDS signs the JWT with the user's
  // real atproto key, producing iss=did:plc:... and a verifiable signature.
  const saAgent = agent as { getServiceAuth?: (aud: string, lxm?: string) => Promise<string> };
  if (saAgent.getServiceAuth) {
    const baseCallService = atproto.callService;
    atproto.callService = async (
      endpointUrl: string,
      nsid: string,
      lxm: string,
      body: Record<string, unknown>,
    ): Promise<{ status: number; ok: boolean; body: unknown }> => {
      let targetBase: string;
      let audDid: string;
      if (endpointUrl.startsWith("http://") || endpointUrl.startsWith("https://")) {
        targetBase = `${endpointUrl.replace(/\/+$/, "")}/xrpc`;
        audDid = `did:web:${new URL(endpointUrl).host}`;
      } else if (endpointUrl.startsWith("did:")) {
        const didPart = endpointUrl.split("#")[0];
        const svcId = endpointUrl.includes("#") ? endpointUrl.split("#")[1] : "pdr_temp_market";
        const svcDoc = await idResolver.did.resolve(didPart);
        const svc = (svcDoc?.service ?? []).find((s: { id: string }) => s.id === `#${svcId}`);
        if (!svc) throw new Error(`service ${svcId} not found in DID doc for ${didPart}`);
        const ep = (svc as { serviceEndpoint: string }).serviceEndpoint.replace(/\/+$/, "");
        targetBase = `${ep}/xrpc`;
        audDid = `did:web:${new URL(ep).host}`;
      } else {
        throw new Error(`unresolvable endpoint: ${endpointUrl}`);
      }
      const token = await saAgent.getServiceAuth!(audDid, lxm);
      const res = await fetch(`${targetBase}/${nsid}`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      let resBody: unknown;
      try { resBody = await res.json(); } catch { resBody = await res.text(); }
      return { status: res.status, ok: res.ok, body: resBody };
    };
  }

  return atproto;
}
