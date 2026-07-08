export const CREATE_API_KEY_NSID = "dev.cocore.account.createApiKey";
export const LIST_API_KEYS_NSID = "dev.cocore.account.listApiKeys";
export const DELETE_API_KEY_NSID = "dev.cocore.account.deleteApiKey";

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyResponse {
  token: string;
  key: ApiKey;
}

export interface ListApiKeysResponse {
  keys: ApiKey[];
}

export interface CocoreClientOptions {
  /** Base URL of the cocore AppView (default: https://appview.cocore.dev) */
  appviewUrl?: string;
  /** Obtain a service-auth JWT for the given audience and lexicon method. */
  getServiceAuth: (aud: string, lxm: string) => Promise<string>;
  fetch?: typeof globalThis.fetch;
}

export interface CocoreClient {
  createApiKey(name: string): Promise<CreateApiKeyResponse>;
  listApiKeys(): Promise<ListApiKeysResponse>;
  deleteApiKey(id: string): Promise<void>;
}

export function createCocoreClient(opts: CocoreClientOptions): CocoreClient {
  const base = (opts.appviewUrl ?? "https://appview.cocore.dev").replace(/\/+$/, "");
  const aud = `did:web:${new URL(base).host}`;
  const fetchImpl = opts.fetch ?? globalThis.fetch;

  async function call(nsid: string, body?: Record<string, unknown>): Promise<unknown> {
    const token = await opts.getServiceAuth(aud, nsid);
    const res = await fetchImpl(`${base}/xrpc/${nsid}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`cocore ${nsid} failed: ${res.status} ${err}`);
    }
    return res.json();
  }

  return {
    async createApiKey(name: string): Promise<CreateApiKeyResponse> {
      return call(CREATE_API_KEY_NSID, { name }) as Promise<CreateApiKeyResponse>;
    },
    async listApiKeys(): Promise<ListApiKeysResponse> {
      return call(LIST_API_KEYS_NSID) as Promise<ListApiKeysResponse>;
    },
    async deleteApiKey(id: string): Promise<void> {
      await call(DELETE_API_KEY_NSID, { id });
    },
  };
}
