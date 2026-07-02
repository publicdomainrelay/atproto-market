// OAuth DPoP-backed AtprotoAgentLike implementation.
// Uses the official @atproto/oauth-client dpopFetchWrapper for DPoP proof
// generation, nonce tracking, and use_dpop_nonce retry per RFC 9449.
// Our code handles Authorization header + 401 invalid_token → refresh → retry.
//
// Layering: impl (cross-concept bridge between atproto-oauth and atproto-helpers).

import type { AtprotoAgentLike, ATProto, CreateATProtoOpts } from "@publicdomainrelay/atproto-helpers";
import type { WriteOp, CommitEvent } from "@publicdomainrelay/atproto-repo-abc";
import type { StructuredLoggerInterface } from "@publicdomainrelay/logger";
import { TID } from "@atproto/common";
import { attestationFor, toStorableEntry } from "@publicdomainrelay/market-atproto";
import type { AttestationKeypair, InlineAttestation } from "@publicdomainrelay/market-atproto";
import type { StrongRef } from "@publicdomainrelay/market-common";
// dpopFetchWrapper is used internally by OAuthSession; import from the
// implementation module. This is the same DPoP engine the official client uses.
import { dpopFetchWrapper } from "@atproto/oauth-client/dist/fetch-dpop.js";
import { base64url } from "multiformats/bases/base64";
const b64url = (bytes: Uint8Array): string => base64url.baseEncode(bytes);

/** Minimal DID-doc resolver shape callService needs — not the full @atproto/identity IdResolver. */
export interface DidResolverLike {
  did: { resolve(did: string): Promise<Record<string, unknown> | null> };
}

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

export interface OAuthAgentOptions {
  refreshSession: () => Promise<OAuthAgentSession>;
  onSessionRefreshed?: (session: OAuthAgentSession) => void;
}

// ---------------------------------------------------------------------------
// OAuthAgent — AtprotoAgentLike backed by official dpopFetchWrapper + our
// token refresh logic. DPoP nonce tracking, proof generation, ath claims,
// and use_dpop_nonce retry are all handled by the official implementation.
// ---------------------------------------------------------------------------

export function createOAuthAgent(
  session: OAuthAgentSession,
  signer: { did(): string; sign(bytes: Uint8Array): Promise<Uint8Array> },
  opts: OAuthAgentOptions,
): AtprotoAgentLike {
  let currentSession = session;
  let refreshPromise: Promise<void> | null = null;

  const { refreshSession, onSessionRefreshed } = opts;

  // SHA-256 returning base64url string — dpopFetchWrapper calls this with
  // the access token to compute the ath claim.
  const sha256b64 = async (input: Uint8Array | string): Promise<string> => {
    const bytes: Uint8Array<ArrayBuffer> = typeof input === "string"
      ? new TextEncoder().encode(input) as Uint8Array<ArrayBuffer>
      : input as Uint8Array<ArrayBuffer>;
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return b64url(new Uint8Array(digest));
  };

  // Nonce store keyed by origin (per RFC 9449). dpopFetchWrapper reads the
  // stored nonce for each origin and updates it from response headers.
  const nonceStore = new Map<string, string>();
  const nonces = {
    async get(key: string) { return nonceStore.get(key); },
    async set(key: string, value: string) { nonceStore.set(key, value); },
    async del(key: string) { nonceStore.delete(key); },
  };

  // Build a Key-like object for dpopFetchWrapper. Must provide bareJwk,
  // algorithms, and createJwt per the @atproto/jwk Key interface.
  const buildDpopKey = () => ({
    get bareJwk(): Record<string, string> {
      const { kty, crv, x, y } = currentSession.dpopPublicJwk;
      return { kty, crv, x, y };
    },
    algorithms: ["ES256"] as string[],
    async createJwt(
      header: Record<string, unknown>,
      payload: Record<string, unknown>,
    ): Promise<string> {
      const enc = new TextEncoder();
      const headerB64 = b64url(enc.encode(JSON.stringify(header)));
      const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
      const signingInput = `${headerB64}.${payloadB64}`;
      const sig = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        currentSession.dpopKeyPair.privateKey,
        enc.encode(signingInput),
      );
      return `${signingInput}.${b64url(new Uint8Array(sig))}`;
    },
  });

  // deno-lint-ignore no-explicit-any
  let dpopFetchFn = dpopFetchWrapper({
    key: buildDpopKey() as any,
    supportedAlgs: ["ES256"],
    nonces,
    // deno-lint-ignore no-explicit-any
    sha256: sha256b64 as any,
    isAuthServer: false,
  });

  async function refreshLock(): Promise<void> {
    if (refreshPromise) {
      await refreshPromise;
      return;
    }
    refreshPromise = (async () => {
      try {
        currentSession = await refreshSession();
        onSessionRefreshed?.(currentSession);
        // Rebuild dpopFetchFn with the new session's key material.
        // deno-lint-ignore no-explicit-any
        dpopFetchFn = dpopFetchWrapper({
          key: buildDpopKey() as any,
          supportedAlgs: ["ES256"],
          nonces,
          // deno-lint-ignore no-explicit-any
          sha256: sha256b64 as any,
          isAuthServer: false,
        });
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
      const headers: Record<string, string> = {
        "Authorization": `DPoP ${currentSession.accessJwt}`,
        "Content-Type": "application/json",
      };
      // dpopFetchWrapper reads the Authorization header, computes ath, adds
      // the DPoP proof header, and handles use_dpop_nonce retry internally.
      return dpopFetchFn(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    };

    let res = await makeRequest();
    // 401 with WWW-Authenticate: Bearer/DPoP error="invalid_token" means
    // the access token is expired. Refresh and retry up to 2 times — auth
    // server and PDS may have clock skew, so a fresh token can still fail
    // exp claim check on the first attempt.
    if (res.status === 401) {
      const wwwAuth = res.headers.get("WWW-Authenticate") ?? "";
      if (
        (wwwAuth.startsWith("Bearer ") || wwwAuth.startsWith("DPoP ")) &&
        wwwAuth.includes('error="invalid_token"')
      ) {
        for (let attempts = 0; attempts < 2; attempts++) {
          await refreshLock();
          res = await makeRequest();
          if (res.status !== 401) break;
          const wwwAuth2 = res.headers.get("WWW-Authenticate") ?? "";
          if (
            !(wwwAuth2.startsWith("Bearer ") || wwwAuth2.startsWith("DPoP ")) ||
            !wwwAuth2.includes('error="invalid_token"')
          ) break;
        }
      }
    }
    return res;
  }

  async function applyWrites(
    did: string,
    writes: WriteOp[],
  ) {
    const xrpcWrites = writes.map((w) => {
      const { record, ...rest } = w as unknown as { record?: unknown; [key: string]: unknown };
      return { ...rest, ...(record !== undefined ? { value: record } : {}) };
    });
    const res = await dpopFetch(
      "POST",
      `${currentSession.pds}/xrpc/com.atproto.repo.applyWrites`,
      { repo: did, validate: false, writes: xrpcWrites },
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`applyWrites failed: ${res.status} ${err}`);
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
      `${currentSession.pds}/xrpc/com.atproto.repo.createRecord`,
      { repo: did, collection, rkey, record, validate: false },
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`createRecord failed: ${res.status} ${err}`);
    }
    return res.json() as Promise<{ uri: string; cid: string }>;
  }

  async function putRecord(
    did: string,
    collection: string,
    rkey: string,
    record: Record<string, unknown>,
  ): Promise<{ uri: string; cid: string }> {
    const res = await dpopFetch(
      "POST",
      `${currentSession.pds}/xrpc/com.atproto.repo.putRecord`,
      { repo: did, collection, rkey, record, validate: false },
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`putRecord failed: ${res.status} ${err}`);
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
    putRecord,
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
  idResolver: DidResolverLike,
  plcClient: CreateATProtoOpts["plcDirectory"],
): Promise<ATProto> {
  const { createATProto } = await import("@publicdomainrelay/atproto-helpers");
  const atproto = await createATProto({
    logger,
    badgeBlueSigner,
    plcDirectory: plcClient,
    agent,
  });
  const rawCreateRecord = (agent as { createRecord?: (did: string, collection: string, rkey: string, record: Record<string, unknown>) => Promise<{ uri: string; cid: string }> }).createRecord;
  const rawPutRecord = (agent as { putRecord?: (did: string, collection: string, rkey: string, record: Record<string, unknown>) => Promise<{ uri: string; cid: string }> }).putRecord;
  if (rawPutRecord) {
    const did = atproto.did;
    atproto.updateRecord = async (collection: string, rkey: string, record: Record<string, unknown>) => {
      const result = await rawPutRecord(did, collection, rkey, record);
      return { $type: "com.atproto.repo.strongRef", uri: result.uri, cid: result.cid } as StrongRef;
    };
  }
  if (rawCreateRecord) {
    const did = atproto.did;
    let _clock = 0;
    const nextTid = () => {
      const ts = Date.now().toString(36).padStart(13, "0");
      const clock = (_clock++ % 2048).toString(36).padStart(2, "0");
      return (ts + clock + "0").toLowerCase();
    };
    atproto.createRecord = async (collection: string, record: Record<string, unknown>) => {
      const result = await rawCreateRecord(did, collection, nextTid(), record);
      return { $type: "com.atproto.repo.strongRef", uri: result.uri, cid: result.cid } as StrongRef;
    };
    atproto.createRepoRecord = async (collection: string, record: Record<string, unknown>) => {
      return rawCreateRecord(did, collection, nextTid(), record);
    };
    if (atproto.createSignedRepoRecord) {
      const signer = badgeBlueSigner as AttestationKeypair;
      atproto.createSignedRepoRecord = async (
        collection: string,
        record: Record<string, unknown>,
        issuer?: string,
      ) => {
        const rkey = TID.next().toString();
        const att = attestationFor(signer, issuer);
        const entry = await att.sign({ record: record as Record<string, unknown>, repository: did }) as InlineAttestation;
        const signed = { ...record, signatures: [toStorableEntry(entry)] };
        const result = await rawCreateRecord(did, collection, rkey, signed);
        return { uri: result.uri, cid: result.cid, record: signed };
      };
    }
  }

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
        const svcDoc = await idResolver.did.resolve(didPart) as { service?: Array<{ id: string; serviceEndpoint: string }> } | null;
        const svc = (svcDoc?.service ?? []).find((s) => s.id === `#${svcId}`);
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
