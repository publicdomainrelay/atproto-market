// Hono factory for requester — wires createSubmitBidHandler into a Hono app.
// Composed, not subclassed. Takes pre-built deps from the impl/CLI layer.

import { IdResolver } from "@atproto/identity";
import {
  createSubmitBidHandler,
  createRecordResolver,
} from "@publicdomainrelay/market-atproto";
import type { SubmitBidCallback } from "@publicdomainrelay/market-atproto";
import { SUBMIT_BID_NSID } from "@publicdomainrelay/market-common";
import type { Logger } from "@publicdomainrelay/market-common";
import type { LoggerInterface } from "@publicdomainrelay/logger";

// deno-lint-ignore no-explicit-any
type HonoContext = any;

export interface RequesterFactoryOptions {
  /** Hono app (or any object with a .post() method). */
  app: { post(path: string, handler: (c: HonoContext) => Response | Promise<Response>): void };
  /** DID resolver for service-auth audience verification. */
  idResolver: IdResolver;
  /** DID of this requester (the did:plc). */
  did: string;
  /** Hostname extractor for auth verification. */
  hostname?: (req: Request) => string;
  /** Extra audience DIDs for inbound service-auth tokens. */
  audienceDids?: string[];
  /** Service IDs for submitBid routing. */
  serviceIds?: string[];
  /** Callback when a bid is received — pushes to pendingBids map. */
  onBid: SubmitBidCallback;
  /** Logger (callable Logger type, for compatibility with market-atproto handlers). */
  log?: Logger | LoggerInterface;
}

/**
 * Bridges LoggerInterface (`.info()`, etc.) to the callable Logger `(level, msg, fields?) => void`
 * expected by market-atproto handler factories.
 */
function toCallableLogger(log: Logger | LoggerInterface): Logger {
  if (typeof log === "function") return log;
  // deno-lint-ignore no-explicit-any
  return (level: string, msg: string, fields?: Record<string, unknown>) => {
    const fn = (log as any)[level] as ((m: string, f?: Record<string, unknown>) => void) | undefined;
    if (fn) fn.call(log, msg, fields);
  };
}

/**
 * Create the requester's route factory.
 *
 * Wraps `createSubmitBidHandler` from market-atproto with an `onBid` callback
 * (typically pushes to the requester's `pendingBids` map). Registers the
 * `com.publicdomainrelay.temp.market.submitBid` XRPC procedure route on the app.
 */
// deno-lint-ignore require-await
export async function createRequesterFactory(
  opts: RequesterFactoryOptions,
): Promise<{ stop: () => void }> {
  const idResolver = opts.idResolver;
  const did = opts.did;
  const serviceIds = opts.serviceIds ?? ["pdr_temp_market"];
  const audienceDids = opts.audienceDids ? [did, ...opts.audienceDids] : [did];
  const log = opts.log ? toCallableLogger(opts.log) : undefined;
  const hostname = opts.hostname ??
    ((req: Request) => {
      const host = req.headers.get("host") ?? "";
      return host.split(":")[0];
    });

  const handler = createSubmitBidHandler({
    deps: {
      hostname,
      idResolver,
      resolve: createRecordResolver(idResolver),
      audienceDids,
      log,
    },
    serviceIds,
    onBid: opts.onBid,
  });

  opts.app.post(`/xrpc/${SUBMIT_BID_NSID}`, (c: HonoContext) => handler(c.req.raw));

  return { stop: () => {} };
}
