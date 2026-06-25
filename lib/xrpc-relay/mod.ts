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
}

export function createXrpcRelay(opts: CreateXrpcRelayOpts): RelayRef {
  const { logger, dispatcherHost, signer, keypair } = opts;
  const label = opts.label ?? "bidder";
  let ws: WebSocket | null = null;

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
      });

      relay.proxyRef = handle.proxyRef;
      ws = handle.ws;

      logger.info("xrpc-relay registered", {
        subdomain: handle.subdomain,
        proxyRef: handle.proxyRef,
      });
    },

    close(): void {
      ws?.close();
    },
  };

  return relay;
}
