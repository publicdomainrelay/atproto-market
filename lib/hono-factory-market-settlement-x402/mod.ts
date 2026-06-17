import { createFactory } from "@hono/hono/factory";
import type { MiddlewareHandler } from "@hono/hono";
import type { Agent } from "@atproto/api";
import type { RecordResolver } from "@publicdomainrelay/market-abc";
import type { Logger } from "@publicdomainrelay/market-common";
import type { RecordSigner } from "@publicdomainrelay/market-atproto";
import {
  mintReceiptForAccepts,
  parseReceiptPath,
} from "@publicdomainrelay/market-settlement-x402";

export type X402SettlementEnv = {
  Variables: {
    agent: Agent;
    resolve: RecordResolver;
  };
};

export interface X402SettlementConfig {
  getAgent: () => Agent;
  resolve: RecordResolver;
  getSigner: () => RecordSigner;
  log?: Logger;
  path?: string;
  paymentMiddleware?: MiddlewareHandler;
}

const noopLog: Logger = () => {};

export function createX402SettlementFactory(config: X402SettlementConfig) {
  const {
    getAgent,
    resolve,
    getSigner,
    log = noopLog,
    path = "x402/receipt",
    paymentMiddleware,
  } = config;
  return createFactory<X402SettlementEnv>({
    initApp: (app) => {
      if (paymentMiddleware) {
        app.use(`/${path}/*`, paymentMiddleware);
      }
      app.get(`/${path}/*`, async (c) => {
        const { acceptsUri, acceptsCid } = parseReceiptPath(c.req.path, `${path}/`);
        log("info", "x402 receipt requested", { acceptsUri, acceptsCid });
        const ref = await mintReceiptForAccepts({
          agent: getAgent(),
          resolve,
          acceptsUri,
          acceptsCid,
          signer: getSigner(),
        });
        log("info", "receipts.x402 minted", { uri: ref.uri, cid: ref.cid });
        return c.json({ uri: ref.uri, cid: ref.cid });
      });
    },
  });
}
