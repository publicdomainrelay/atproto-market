// Market registry CLI — thin entrypoint following the ABC CLI pattern.
// Reads config, builds the factory, starts HTTP server and relay subscription.

import { Command } from "@publicdomainrelay/cli-args-env";
import { createStructuredLogger } from "@publicdomainrelay/logger";
import { Secp256k1Keypair } from "@atproto/crypto";
import { IdResolver } from "@atproto/identity";
import { PlcClient, PlcNotFoundError, createGenesisOp } from "@publicdomainrelay/did-plc";
import { createRepoFactory } from "@publicdomainrelay/hono-factory-atproto-repo-deno";
import type { Signer } from "@publicdomainrelay/atproto-repo-abc";
import { signServiceAuth, MemoryStorage } from "@publicdomainrelay/atproto-repo-deno";
import type { RecordResolver } from "@publicdomainrelay/market-abc";
import type { Resolved } from "@publicdomainrelay/market-common";
import { createRegistrationStore } from "@publicdomainrelay/market-registry-atproto";
import { createHealthChecker } from "@publicdomainrelay/market-registry-atproto";
import { createMarketRegistryFactory } from "@publicdomainrelay/hono-factory-market-registry";
import { createSubscriberFactory } from "@publicdomainrelay/hono-factory-did-key-relay-subscriber-xrpc";
import { createSubscriber } from "@publicdomainrelay/did-key-relay-subscriber-xrpc";
import cliArgsEnv from "./cli-args-env.json" with { type: "json" };

// ── config ──────────────────────────────────────────────────────────────

let runtimeConfig = null;
try {
  const mod = await import("./config.json", { with: { type: "json" } });
  runtimeConfig = mod.default;
} catch { /* optional */ }

const { options } = await new Command(
  "CONFIG_PATH_HONO_MARKET_REGISTRY",
  cliArgsEnv,
  runtimeConfig,
).resolve();

const log = createStructuredLogger("market-registry");

// ── keypair ─────────────────────────────────────────────────────────────

const keypair: Secp256k1Keypair = options.privateKeyHex
  ? await Secp256k1Keypair.import(options.privateKeyHex as string)
  : await Secp256k1Keypair.create({ exportable: true });

const signingKeyDid = keypair.did();
const atprotoPublicKeyMultibase = signingKeyDid.replace("did:key:", "");

// ── did:plc registration ───────────────────────────────────────────────

const plc = new PlcClient({ baseUrl: options.plcDirectoryUrl as string });

const { did, op } = await createGenesisOp({
  rotationKeys: [signingKeyDid],
  verificationMethods: {
    atproto: signingKeyDid,
  },
  alsoKnownAs: [
    `at://${signingKeyDid.replace(/:/g, "-").toLowerCase()}.${options.dispatcherHost}`,
  ],
  services: {
    atproto_pds: {
      type: "AtprotoPersonalDataServer",
      endpoint: `https://${signingKeyDid.replace(/:/g, "-").toLowerCase()}.${options.dispatcherHost}`,
    },
    pdr_temp_market: {
      type: "PDRTempMarket",
      endpoint: `https://${signingKeyDid.replace(/:/g, "-").toLowerCase()}.${options.dispatcherHost}`,
    },
    pdr_temp_compute_event: {
      type: "PDRTempComputeEvent",
      endpoint: `https://${signingKeyDid.replace(/:/g, "-").toLowerCase()}.${options.dispatcherHost}`,
    },
  },
  sign: (bytes: Uint8Array) => keypair.sign(bytes),
});

log.info("did_plc_registering", { did });
const alreadyExists = await plc.resolve(did).then(() => true).catch((e: unknown) => {
  if (e instanceof PlcNotFoundError) return false;
  throw e;
});
if (!alreadyExists) {
  await plc.submitOp(did, op);
  log.info("did_plc_registered", { did });
} else {
  log.info("did_plc_already_exists", { did });
}

// ── signer ──────────────────────────────────────────────────────────────

const signer: Signer = {
  did: () => did,
  sign: (bytes: Uint8Array) => keypair.sign(bytes),
};

// ── repo factory ────────────────────────────────────────────────────────

const baseOrigin = options.hostname
  ? `https://${options.hostname}`
  : `http://localhost:${options.port}`;

const { app: repoApp, api } = createRepoFactory({
  storage: new MemoryStorage(),
  signer,
  baseOrigin,
});

// ── registration store ──────────────────────────────────────────────────

const store = createRegistrationStore(api, did);

// ── health checker ──────────────────────────────────────────────────────

const healthChecker = createHealthChecker(
  store,
  (severity: string, msg: string, extra?: Record<string, unknown>) =>
    log[severity === "error" ? "error" : "info"](msg, extra ?? {}),
  {
    intervalMs: options.healthIntervalMs as number,
    staleThresholdMs: options.staleThresholdMs as number,
  },
);

// ── resolve hostname from request (for multi-tenant relay tunnels) ──────

let relaySubdomain = "";

const resolveHostname = (req?: Request): string => {
  const host = req?.headers?.get?.("host") ?? "";
  if (host) return host;
  if (relaySubdomain) return `${relaySubdomain}.${options.dispatcherHost}`;
  return options.dispatcherHost as string;
};

// ── MarketServerDeps — forwarded to registry handlers ───────────────────

const idResolver = new IdResolver();

// Stub resolve — registry handlers don't resolve strongRefs, but
// MarketServerDeps requires it. Returns unresolvable ref.
const stubResolve: RecordResolver = {
  resolve: async <T>(_ref: { uri: string; cid: string }): Promise<Resolved<T>> => {
    throw new Error("record resolution not available in market registry");
  },
};

const deps = {
  hostname: resolveHostname,
  idResolver,
  resolve: stubResolve,
  log: (severity: string, msg: string, extra?: Record<string, unknown>) =>
    log[severity === "error" ? "error" : severity === "warn" ? "warn" : "info"](msg, extra ?? {}),
};

// ── market registry factory ─────────────────────────────────────────────

const factory = createMarketRegistryFactory({
  deps,
  store,
  healthChecker,
  atprotoPublicKeyMultibase,
});

const registryApp = factory.createApp();

// ── HTTP server ─────────────────────────────────────────────────────────

const serverController = new AbortController();

if (options.unixSocket) {
  try { Deno.removeSync(options.unixSocket as string); } catch { /* stale */ }
  Deno.serve(
    { path: options.unixSocket as string, signal: serverController.signal } as Deno.ServeUnixOptions,
    registryApp.fetch,
  );
  log.info("registry_listening", { path: options.unixSocket, did });
} else {
  Deno.serve(
    { port: options.port as number, hostname: "0.0.0.0", signal: serverController.signal,
      onListen: ({ hostname, port }) => {
        log.info("registry_listening", { hostname, port, did });
      },
    },
    registryApp.fetch,
  );
}

// ── relay subscriber ────────────────────────────────────────────────────

const dispatcherDid = `did:web:${options.dispatcherHost}`;
const { handleRequest } = createSubscriberFactory({ app: { fetch: registryApp.fetch } });

const sub = await createSubscriber({
  keypair,
  getServiceAuthToken: async (nsid: string) => {
    return await signServiceAuth(signer, {
      aud: dispatcherDid,
      lxm: nsid,
    });
  },
  dispatcherHost: options.dispatcherHost as string,
  synthetic: false,
  handleRequest,
});

relaySubdomain = sub.subdomain;
log.info("relay_registered", { subdomain: sub.subdomain, proxyRef: sub.proxyRef });

// Start health checker after relay registration completes.
healthChecker.start();
log.info("health_checker_started", { intervalMs: options.healthIntervalMs });

// ── lifecycle ───────────────────────────────────────────────────────────

const shutdown = () => {
  log.info("shutting_down", {});
  healthChecker.stop();
  serverController.abort();
};

Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

log.info("registry_ready", { did });
