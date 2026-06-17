import { createFactory } from "@hono/hono/factory";
import type { Agent } from "@atproto/api";
import type { RecordResolver } from "@publicdomainrelay/market-abc";
import type { Logger } from "@publicdomainrelay/market-common";
import type { RecordSigner } from "@publicdomainrelay/market-atproto";
import {
  mintGrantForAccepts,
  parseGrantPath,
} from "@publicdomainrelay/market-settlement-free";

export type FreeSettlementEnv = {
  Variables: {
    agent: Agent;
    resolve: RecordResolver;
  };
};

export interface FreeSettlementConfig {
  getAgent: () => Agent;
  resolve: RecordResolver;
  getSigner: () => RecordSigner;
  log?: Logger;
  path?: string;
}

const noopLog: Logger = () => {};

export function createFreeSettlementFactory(config: FreeSettlementConfig) {
  const { getAgent, resolve, getSigner, log = noopLog, path = "free/receipt" } = config;
  return createFactory<FreeSettlementEnv>({
    initApp: (app) => {
      app.get(`/${path}/*`, async (c) => {
        const { acceptsUri, acceptsCid } = parseGrantPath(c.req.path, `${path}/`);
        log("info", "free grant receipt requested", { acceptsUri, acceptsCid });
        const ref = await mintGrantForAccepts({
          agent: getAgent(),
          resolve,
          acceptsUri,
          acceptsCid,
          signer: getSigner(),
        });
        log("info", "receipts.free minted", { uri: ref.uri, cid: ref.cid });
        return c.json({ uri: ref.uri, cid: ref.cid });
      });
    },
  });
}
