import type { StructuredLoggerInterface } from "@publicdomainrelay/logger";
import { hostnameOnly, hostnameToDid } from "@publicdomainrelay/hostname-helpers";
import { signServiceAuth } from "@publicdomainrelay/atproto-repo-deno";
import { createSubscriber } from "@publicdomainrelay/did-key-relay-subscriber-xrpc";
import { createSubscriberFactory } from "@publicdomainrelay/hono-factory-did-key-relay-subscriber-xrpc";
import type { RelayRef } from "@publicdomainrelay/serve";

export interface CreateXrpcRelayOpts {
  logger: StructuredLoggerInterface;
  dispatcherHost: string;
  signer: { did(): string; sign(bytes: Uint8Array): Promise<Uint8Array> };
  keypair: { did(): string; sign(data: Uint8Array): Promise<Uint8Array> };
  label?: string;
  /**
   * Lazily resolves the local serve's TCP address so inbound relay WS
   * subscriptions (e.g. com.atproto.sync.subscribeRepos from a crawling relay)
   * are forwarded to the local app's firehose. Read lazily because the port is
   * assigned when the serve starts listening.
   */
  localWsTarget?: () => { hostname: string; port: number } | undefined;
}

export function createXrpcRelay(opts: CreateXrpcRelayOpts): RelayRef {
  const { logger, dispatcherHost, signer, keypair } = opts;
  const label = opts.label ?? "bidder";
  let subscriber: { close(): void } | null = null;

  const relay: RelayRef = {
    proxyRef: "",

    async onServe(fetch: (req: Request) => Promise<Response>): Promise<void> {
      const { handleRequest } = createSubscriberFactory({ app: { fetch } });

      async function getServiceAuthToken(lxm: string): Promise<string> {
        const aud = hostnameToDid(dispatcherHost);
        return await signServiceAuth(signer, { aud, lxm });
      }

      const host = hostnameOnly(dispatcherHost);

      logger.info("xrpc-relay connecting", { dispatcherHost });

      const handle = await createSubscriber({
        label,
        keypair,
        getServiceAuthToken,
        dispatcherHost,
        handleRequest,
        wsTarget: opts.localWsTarget,
      });

      relay.proxyRef = handle.proxyRef;
      subscriber = handle;

      logger.info("xrpc-relay registered", {
        subdomain: handle.subdomain,
        proxyRef: handle.proxyRef,
      });
    },

    close(): void {
      subscriber?.close();
    },
  };

  return relay;
}
