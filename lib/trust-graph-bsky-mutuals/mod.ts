import type { VouchResolver } from "@publicdomainrelay/trust-graph-abc";

export interface BskyMutualsVouchResolverOpts {
  getFollows(actor: string): Promise<Set<string>>;
  log?(level: string, msg: string, meta?: Record<string, unknown>): void;
}

export function createBskyMutualsVouchResolver(opts: BskyMutualsVouchResolverOpts): VouchResolver {
  const { getFollows, log } = opts;
  const noopLog = () => {};
  const logFn = log ?? noopLog;

  return {
    async getVouchedDids(did: string): Promise<Set<string>> {
      try {
        return await getFollows(did);
      } catch (err) {
        logFn("warn", "bsky-mutuals follow lookup failed", { did, error: String(err) });
        return new Set();
      }
    },
  };
}
