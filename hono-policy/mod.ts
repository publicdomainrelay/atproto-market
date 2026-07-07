import { Command } from "@publicdomainrelay/cli-args-env";
import { createLogger } from "@publicdomainrelay/logger";
import { createServe } from "@publicdomainrelay/serve";
import { resolvePolicies } from "@publicdomainrelay/policy-builtin";
import { createPolicyEngineFactory } from "@publicdomainrelay/hono-factory-policy-builtin";
import cliArgsEnv from "./cli-args-env.json" with { type: "json" };

let runtimeConfig = null;
try {
  const mod = await import("./config.json", { with: { type: "json" } });
  runtimeConfig = mod.default;
} catch { /* optional */ }

const { options } = await new Command(
  "CONFIG_PATH_HONO_POLICY",
  cliArgsEnv,
  runtimeConfig,
).resolve();

const hostname = options.hostname as string;
const port = options.port as number;
const policyRaw = (options.policy as string) ?? "allow-net";
const policyNames = policyRaw.split(",").map((s) => s.trim()).filter(Boolean);
const strictAuth = options.strictAuth as boolean | undefined;

const log = createLogger({ serviceName: "hono-policy" });

const handlers = resolvePolicies(policyNames);

const factory = createPolicyEngineFactory({ hostname, handlers, strictAuth });

const serve = createServe({
  logger: log,
  tcp: { addr: hostname, port },
});
serve.app.route("/", factory.app);

function shutdown() {
  log.info("shutting down");
  serve.shutdown();
  Deno.exit(0);
}
Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

await serve.beginServe();

log.info("policy_engine_ready", { port: serve.tcpPort, hostname, policies: policyNames });
