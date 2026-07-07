import { Command } from "@publicdomainrelay/cli-args-env";
import { createLogger } from "@publicdomainrelay/logger";
import { createServe } from "@publicdomainrelay/serve";
import { IdResolver } from "@atproto/identity";
import { createComputeContractGateway } from "@publicdomainrelay/compute-contract-gateway-xrpc";
import { createComputeContractGatewayFactory } from "@publicdomainrelay/hono-factory-compute-contract-gateway-xrpc";
import cliArgsEnv from "./cli-args-env.json" with { type: "json" };

let runtimeConfig = null;
try {
  const mod = await import("./config.json", { with: { type: "json" } });
  runtimeConfig = mod.default;
} catch { /* optional */ }

const { options } = await new Command(
  "CONFIG_PATH_HONO_COMPUTE_CONTRACT_GATEWAY",
  cliArgsEnv,
  runtimeConfig,
).resolve();

const logger = createLogger({ serviceName: "compute-contract-gateway" });

const serve = createServe({
  logger,
  tcp: options.port
    ? { port: options.port as number, addr: (options.hostname as string) ?? "0.0.0.0" }
    : undefined,
});

// Resolve private key: --private-key-hex takes priority, then --private-key-hex-path
let privateKeyHex: string | undefined = options.privateKeyHex as string | undefined;
const keyPath = options.privateKeyHexPath as string | undefined;
if (!privateKeyHex && keyPath) {
  try {
    privateKeyHex = (await Deno.readTextFile(keyPath)).trim();
    logger.info("key_loaded_from_path", { path: keyPath, len: privateKeyHex.length });
  } catch { /* file doesn't exist yet — will be generated */ }
}

const storagePath = (options.pdsStatePath as string | undefined) ??
  (options.storagePath as string | undefined);

const relayUrlsStr = options.relayUrls as string | undefined;

const gateway = createComputeContractGateway({
  logger,
  serve,
  privateKeyHex,
  plcDirectoryUrl: options.plcDirectoryUrl as string | undefined,
  dispatcherHost: options.dispatcherHost as string | undefined,
  fedproxyHost: options.fedproxyHost as string | undefined,
  label: "compute-contract-gateway",
  storagePath,
  relayUrls: relayUrlsStr
    ? relayUrlsStr.split(",").map((s: string) => s.trim())
    : [],
});

await gateway.beginServe();

const idResolver = new IdResolver({
  plcUrl: (options.plcDirectoryUrl as string) ?? "https://plc.directory",
});

const { app } = createComputeContractGatewayFactory({
  gateway,
  hostname: (options.hostname as string) ?? "localhost",
  idResolver,
  audienceDids: [gateway.did],
});

serve.app.route("/", app);
await serve.beginServe();

logger.info("gateway_cli_ready", { did: gateway.did });

Deno.addSignalListener("SIGINT", async () => {
  logger.info("gateway_shutting_down", {});
  await gateway.dispose();
  Deno.exit(0);
});
Deno.addSignalListener("SIGTERM", async () => {
  logger.info("gateway_shutting_down", {});
  await gateway.dispose();
  Deno.exit(0);
});
