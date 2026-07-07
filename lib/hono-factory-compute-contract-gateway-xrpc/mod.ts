import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import type { IdResolver } from "@atproto/identity";
import { verifyServiceAuth } from "@publicdomainrelay/market-atproto";
import type { ComputeContractGateway } from "@publicdomainrelay/compute-contract-gateway-abc";
import {
  REQUEST_COMPUTE_VM_NSID,
  REQUEST_COMPUTE_VM_LXM,
  REQUEST_COMPUTE_WORKER_EPHEMERAL_NSID,
  REQUEST_COMPUTE_WORKER_EPHEMERAL_LXM,
  REQUEST_COMPUTE_WORKER_PERSISTENT_NSID,
  REQUEST_COMPUTE_WORKER_PERSISTENT_LXM,
  DELETE_COMPUTE_NSID,
  DELETE_COMPUTE_LXM,
  DEFAULT_GATEWAY_SERVICE_ID,
} from "@publicdomainrelay/compute-contract-gateway-common";

export interface ComputeContractGatewayFactoryOptions {
  gateway: ComputeContractGateway;
  hostname: string;
  idResolver: IdResolver;
  audienceDids?: string[];
}

export function createComputeContractGatewayFactory(
  opts: ComputeContractGatewayFactoryOptions,
): { app: Hono } {
  const { gateway, hostname, idResolver, audienceDids } = opts;

  function requireAuth(lxm: string) {
    return async (
      c: { req: { header: (n: string) => string | undefined }; json: (b: unknown, s?: number) => Response },
      next: () => Promise<void>,
    ) => {
      const host = (c.req.header("host") ?? hostname).split(":")[0];
      const authHeader = c.req.header("authorization");
      if (!authHeader) {
        return c.json({ error: "Unauthorized", message: "missing Authorization header" }, 401);
      }
      try {
        await verifyServiceAuth({
          authHeader,
          hostname: host,
          lxm,
          serviceIds: [DEFAULT_GATEWAY_SERVICE_ID],
          extraAudienceDids: audienceDids ?? [gateway.did],
          idResolver,
        });
      } catch (err) {
        return c.json({ error: "Unauthorized", message: String(err) }, 401);
      }
      await next();
    };
  }

  const app = new Hono();
  app.use("*", cors());

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/.well-known/did.json", (c) => {
    const did = `did:web:${hostname}`;
    return c.json({
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: did,
      service: [
        {
          id: `#${DEFAULT_GATEWAY_SERVICE_ID}`,
          type: "PDRComputeContractGateway",
          serviceEndpoint: `https://${hostname}`,
        },
      ],
    });
  });

  app.post(
    `/xrpc/${REQUEST_COMPUTE_VM_NSID}`,
    requireAuth(REQUEST_COMPUTE_VM_LXM),
    async (c) => {
      const body = await c.req.json();
      const authHeader = c.req.header("authorization") ?? "";
      const payload = body.payload as string;
      const issuerDid = payload
        ? JSON.parse(atob(payload.split(".")[1])).iss
        : "unknown";

      const result = await gateway.requestComputeVM(
        { did: issuerDid },
        body,
      );
      return c.json(result, result.error ? 500 : 200);
    },
  );

  app.post(
    `/xrpc/${REQUEST_COMPUTE_WORKER_EPHEMERAL_NSID}`,
    requireAuth(REQUEST_COMPUTE_WORKER_EPHEMERAL_LXM),
    async (c) => {
      const body = await c.req.json();
      const result = await gateway.requestComputeWorkerEphemeral(
        { did: "unknown" },
        body,
      );
      return c.json(result, result.error ? 500 : 200);
    },
  );

  app.post(
    `/xrpc/${REQUEST_COMPUTE_WORKER_PERSISTENT_NSID}`,
    requireAuth(REQUEST_COMPUTE_WORKER_PERSISTENT_LXM),
    async (c) => {
      const body = await c.req.json();
      const result = await gateway.requestComputeWorkerPersistent(
        { did: "unknown" },
        body,
      );
      return c.json(result, result.error ? 500 : 200);
    },
  );

  app.post(
    `/xrpc/${DELETE_COMPUTE_NSID}`,
    requireAuth(DELETE_COMPUTE_LXM),
    async (c) => {
      const body = await c.req.json();
      const receiptUri = body.receiptUri as string;
      const receiptCid = body.receiptCid as string;
      const token = body.token as string;
      const result = await gateway.deleteCompute(
        { did: "unknown" },
        receiptUri,
        receiptCid,
        token ?? "",
      );
      return c.json(result);
    },
  );

  return { app };
}
