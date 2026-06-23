import type { MarketRegistry, RegisterPdsResult } from "@publicdomainrelay/market-registry-abc";
import type { StructuredLoggerInterface } from "@publicdomainrelay/logger";

export interface AtprotoMarketRegistryOpts {
  registryUrl: string;
  log?: StructuredLoggerInterface;
}

export function createAtprotoMarketRegistry(
  opts: AtprotoMarketRegistryOpts,
): MarketRegistry {
  const base = opts.registryUrl.replace(/\/+$/, "");

  return {
    async registerPds(hostname: string): Promise<RegisterPdsResult> {
      opts.log?.info("market_registry_registering", { hostname, registry: opts.registryUrl });
      try {
        const res = await fetch(`${base}/xrpc/com.atproto.sync.requestCrawl`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hostname }),
        });
        if (res.ok) {
          opts.log?.info("market_registry_registered", { hostname });
          return { ok: true };
        }
        const text = await res.text().catch(() => "");
        opts.log?.warn("market_registry_registration_failed", {
          hostname, status: res.status, body: text.slice(0, 200),
        });
        return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      } catch (err) {
        opts.log?.warn("market_registry_registration_error", {
          hostname, error: String(err),
        });
        return { ok: false, error: String(err) };
      }
    },
  };
}
