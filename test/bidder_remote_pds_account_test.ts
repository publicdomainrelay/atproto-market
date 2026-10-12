import { assert, assertEquals, assertRejects } from "@std/assert";
import { Hono } from "@hono/hono";
import { Secp256k1Keypair } from "@atproto/crypto";
import { createLogger } from "@publicdomainrelay/logger";
import { createServe } from "@publicdomainrelay/serve";
import { createRepoFactory } from "@publicdomainrelay/hono-factory-atproto-repo-deno";
import { MemoryStorage, signerFromKeypair } from "@publicdomainrelay/atproto-repo-deno";
import { createRelayFactory } from "@publicdomainrelay/hono-factory-did-key-ingress-proxy-xrpc";
import { createRequesterPDS, runComputeContract } from "@publicdomainrelay/requester-xrpc";
import type { ContainerBackend } from "@publicdomainrelay/container-backend-abc";
import { createContainerBackend } from "@publicdomainrelay/container-backend-container";
import { createDockerBackend } from "@publicdomainrelay/container-backend-docker";
import { generateLocalhostTlsCert } from "@publicdomainrelay/tls-localhost";
import { BID_NSID, OFFERING_NSID, RECEIPT_NSID } from "@publicdomainrelay/market-lexicons";
import { cliIdentityMode, findSecretMaterial } from "@publicdomainrelay/market-identity-abc";
import { createFileIdentityVault } from "@publicdomainrelay/market-identity-vault-file";
import { installFetchInterceptor } from "./fetch-interceptor.ts";
import { createFakeKcp } from "./helpers/market_identity_fixtures.ts";

const BIDDER_ENTRY = new URL("../hono-bidder/mod.ts", import.meta.url).pathname;
const MARKET_ROOT = new URL("../", import.meta.url).pathname;
const MARKER = "SSH_OK_VIA_PDS_ACCOUNT";

function serveOnPort0(
  f: (r: Request) => Response | Promise<Response>,
  ac: AbortController,
  hostname = "127.0.0.1",
  cert?: string,
  key?: string,
): Promise<number> {
  const { promise, resolve } = Promise.withResolvers<number>();
  Deno.serve(
    { port: 0, hostname, signal: ac.signal, onListen: (a) => resolve((a as Deno.NetAddr).port), ...(cert && key ? { cert, key } : {}) },
    f,
  );
  return promise;
}

function createFakePlc() {
  const ops = new Map<string, Record<string, unknown>>();
  const app = new Hono();
  app.post("/*", async (c) => {
    const did = decodeURIComponent(new URL(c.req.url).pathname.slice(1));
    ops.set(did, await c.req.json().catch(() => ({})) as Record<string, unknown>);
    return c.json({ did });
  });
  app.get("/*", (c) => {
    const did = decodeURIComponent(new URL(c.req.url).pathname.slice(1));
    const op = ops.get(did);
    if (!op) return c.json({ message: `DID not found: ${did}` }, 404);
    const vms = (op.verificationMethods ?? {}) as Record<string, string>;
    const svcs = (op.services ?? {}) as Record<string, { type: string; endpoint: string }>;
    return c.json({
      "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/multikey/v1"],
      id: did,
      alsoKnownAs: (op.alsoKnownAs ?? []) as string[],
      verificationMethod: Object.entries(vms).map(([name, didKey]) => ({
        id: `${did}#${name}`,
        type: "Multikey",
        controller: did,
        publicKeyMultibase: String(didKey).replace(/^did:key:/, ""),
      })),
      service: Object.entries(svcs).map(([name, s]) => ({ id: `#${name}`, type: s.type, serviceEndpoint: s.endpoint })),
    });
  });
  return { app, ops };
}

interface BidderProcess {
  ready: Promise<{ did: string; servePort: number }>;
  lines: Array<Record<string, unknown>>;
  exited: Promise<Deno.CommandStatus>;
  saw(message: string): boolean;
  stop(): Promise<void>;
}

const BIDDER_OPTION_ENV = /^(ATP_|OAUTH_|IDENTITY_VAULT_|MARKET_IDENTITY_|REPO_PRIVATE_KEY|PDS_STATE_PATH|ASSOCIATE_WITH|SKIP_QR|RELAY_URL|FIREHOSE_|INGRESS_PROXY_HOST|PLC_DIRECTORY_URL|SERVE_|PORT_FILE|LISTENERS_FILE|STATUS_FILE|CONTRACT_STORE_DIR|COMPUTE_PROVIDER_|CA_CERT_PEM|GUEST_TLS_PORT|CONFIG_PATH_)/;

function inheritedEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(Deno.env.toObject()).filter(([k]) => !BIDDER_OPTION_ENV.test(k)));
}

function spawnBidder(args: string[], env: Record<string, string> = {}): BidderProcess {
  const child = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", "--node-modules-dir=none", "--unstable-kv", "--unstable-worker-options", BIDDER_ENTRY, ...args],
    cwd: MARKET_ROOT,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
    clearEnv: true,
    env: { ...inheritedEnv(), ...env },
  }).spawn();
  const lines: Array<Record<string, unknown>> = [];
  const ready = Promise.withResolvers<{ did: string; servePort: number }>();
  ready.promise.catch(() => {});
  const dec = new TextDecoder();
  const pump = async (stream: ReadableStream<Uint8Array>, label: string) => {
    let buf = "";
    for await (const chunk of stream) {
      buf += dec.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        console.error(`[bidder-${label}] ${line}`);
        try {
          const o = JSON.parse(line) as Record<string, unknown>;
          lines.push(o);
          if (o.event === "bidder_ready") ready.resolve({ did: String(o.did), servePort: Number(o.servePort) });
        } catch { /* not json */ }
      }
    }
  };
  const pumps = Promise.all([pump(child.stdout, "out"), pump(child.stderr, "err")]);
  const exited = child.status.then(async (s) => {
    await pumps.catch(() => {});
    ready.reject(new Error(`bidder exited with ${s.code} before bidder_ready`));
    return s;
  });
  return {
    ready: ready.promise,
    lines,
    exited,
    saw: (message) => lines.some((l) => l.message === message || l.event === message),
    async stop() {
      try { child.kill("SIGTERM"); } catch { /* gone */ }
      await exited;
    },
  };
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${what} within ${ms}ms`)), ms); }),
  ]);
}

async function startHonoPds(plcDirectoryUrl: string, ac: AbortController, oauth = false) {
  const opts = {
    storage: new MemoryStorage(),
    signer: signerFromKeypair(await Secp256k1Keypair.create({ exportable: true })),
    plcDirectoryUrl,
    subscribeReposFormat: "json" as const,
    publicHostname: undefined as string | undefined,
    ...(oauth ? { oauthServer: { enabled: true, issuer: "http://127.0.0.1:0" } } : {}),
  };
  const pds = createRepoFactory(opts);
  const port = await serveOnPort0(pds.app.fetch, ac, "0.0.0.0");
  opts.publicHostname = `127.0.0.1:${port}`;
  const url = `http://127.0.0.1:${port}`;
  return {
    url,
    sessionInjector: pds.sessionInjector,
    async createAccount(handle: string, password: string): Promise<string> {
      const res = await fetch(`${url}/xrpc/com.atproto.server.createAccount`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle, email: `${handle}@test`, password }),
      });
      if (!res.ok) throw new Error(`createAccount ${handle}: ${res.status} ${await res.text()}`);
      return ((await res.json()) as { did: string }).did;
    },
    async getRecord(uri: string): Promise<Record<string, unknown> | null> {
      const [repo, collection, rkey] = uri.replace(/^at:\/\//, "").split("/");
      const res = await fetch(`${url}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(repo)}&collection=${collection}&rkey=${rkey}`);
      if (!res.ok) {
        await res.body?.cancel();
        return null;
      }
      return (await res.json()) as Record<string, unknown>;
    },
    async listRecords(repo: string, collection: string): Promise<Array<{ uri: string }>> {
      const res = await fetch(`${url}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(repo)}&collection=${collection}&limit=100`);
      if (!res.ok) {
        await res.body?.cancel();
        return [];
      }
      return ((await res.json()) as { records: Array<{ uri: string }> }).records;
    },
  };
}

async function writeVaultPassword(dir: string, password: string): Promise<string> {
  const path = `${dir}/identity-vault.json`;
  await createFileIdentityVault({ path }).write({ mount: "bidder", path: "identity/bidder/keys" }, { password });
  return path;
}

function stateArgs(dir: string): string[] {
  return [
    "--private-key-hex-path", `${dir}/repo-private-key.hex`,
    "--pds-state-path", `${dir}/pds-state`,
    "--oauth-session-path", `${dir}/oauth-session.json`,
    "--port-file", `${dir}/port-bound-to`,
    "--listeners-file", `${dir}/listeners.json`,
    "--status-file", `${dir}/status.json`,
  ];
}

Deno.test("cliIdentityMode: the sign-in options map onto a MarketIdentity mode", () => {
  assertEquals(cliIdentityMode({}), "localRepo");
  assertEquals(cliIdentityMode({ handle: "bob.test" }), "localRepo");
  assertEquals(cliIdentityMode({ handle: "bob.test", password: true }), "pdsAccount");
  assertEquals(cliIdentityMode({ handle: "bob.test", vault: true }), "pdsAccount");
  assertEquals(cliIdentityMode({ handle: "bob.test", password: true, mode: "localRepo" }), "localRepo");
  assertEquals(cliIdentityMode({ oauthQr: true, handle: "bob.test", password: true }), "oauthQr");
  assertEquals(cliIdentityMode({ oauth: true, handle: "bob.test" }), "oauthBrowser");
  assertEquals(cliIdentityMode({ mode: "oauthDelegated" }), "oauthDelegated");
  let threw = false;
  try {
    cliIdentityMode({ mode: "password" });
  } catch {
    threw = true;
  }
  assert(threw, "an unknown mode is refused");
});

Deno.test("file identity vault: 0600, round trip, refuses a file others can read", async () => {
  const dir = await Deno.makeTempDir({ prefix: "vault-file-" });
  try {
    const path = `${dir}/v.json`;
    const vault = createFileIdentityVault({ path });
    const ref = { mount: "bidder", path: "identity/bidder/keys" };
    assertEquals(await vault.read(ref), null);
    await vault.write(ref, { password: "pw" });
    assertEquals((await Deno.stat(path)).mode! & 0o777, 0o600);
    assertEquals(await vault.read(ref), { password: "pw" });
    await vault.remove(ref);
    assertEquals(await vault.read(ref), null);
    await vault.write(ref, { password: "pw" });
    await Deno.chmod(path, 0o644);
    await assertRejects(() => vault.read(ref));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test({
  name: "pdsAccount: --atproto-pds-url is honoured and a wrong PDS is a startup failure, not a local repo",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const ac = new AbortController();
  const dir = await Deno.makeTempDir({ prefix: "bidder-wrong-pds-" });
  try {
    const plc = createFakePlc();
    const plcUrl = `http://localhost:${await serveOnPort0(plc.app.fetch, ac)}`;
    const pds = await startHonoPds(plcUrl, ac);
    await pds.createAccount("bidder.test", "right-password");
    const wrong = await startHonoPds(plcUrl, ac);
    const vaultFile = await writeVaultPassword(dir, "right-password");
    const bidder = spawnBidder([
      "--atproto-handle", "bidder.test",
      "--atproto-pds-url", wrong.url,
      "--identity-vault-file", vaultFile,
      "--plc-directory-url", plcUrl,
      "--ingress-proxy-host", "relay.localhost:9",
      "--skip-qr", "--firehose-mode", "off", "--no-ingress-proxy", "--offering-refresh-sec", "0",
      "--serve-addr", "127.0.0.1", "--serve-port", "0",
      ...stateArgs(dir),
    ]);
    const status = await withTimeout(bidder.exited, 60_000, "the bidder should give up on a PDS that has no such account");
    assert(!status.success, "signing in at a PDS without the account must fail");
    assert(!bidder.saw("bidder_ready"), "no bidder_ready without a sign-in");
    assert(!bidder.saw("localPDS plc registering"), "a failed account sign-in must not fall back to an in-process repo");
  } finally {
    ac.abort();
    await Deno.remove(dir, { recursive: true }).catch(() => {});
  }
});

Deno.test({
  name: "localRepo: explicit --atproto-identity-mode localRepo keeps the in-process repo even with a handle and password",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const ac = new AbortController();
  const dir = await Deno.makeTempDir({ prefix: "bidder-local-repo-" });
  const dispatcherApp = createRelayFactory({ hostname: "relay.localhost" }).createApp();
  try {
    const plc = createFakePlc();
    const plcUrl = `http://localhost:${await serveOnPort0(plc.app.fetch, ac)}`;
    const dispPort = await serveOnPort0(dispatcherApp.fetch, ac, "127.0.0.1");
    const restoreFetch = installFetchInterceptor({ realFetch: globalThis.fetch, plcDirectoryUrl: plcUrl, dispPort });
    ac.signal.addEventListener("abort", restoreFetch, { once: true });
    const pds = await startHonoPds(plcUrl, ac);
    const accountDid = await pds.createAccount("bidder.test", "pw");
    const bidder = spawnBidder([
      "--atproto-identity-mode", "localRepo",
      "--atproto-handle", "bidder.test",
      "--atproto-password", "pw",
      "--atproto-pds-url", pds.url,
      "--plc-directory-url", plcUrl,
      "--ingress-proxy-host", `relay.localhost:${dispPort}`,
      "--skip-qr", "--firehose-mode", "off", "--no-ingress-proxy", "--offering-refresh-sec", "0",
      "--serve-addr", "127.0.0.1", "--serve-port", "0",
      ...stateArgs(dir),
    ]);
    try {
      const { did, servePort } = await withTimeout(bidder.ready, 60_000, "bidder_ready");
      assert(did !== accountDid, "localRepo mode must not sign in to the account");
      const status = JSON.parse(await Deno.readTextFile(`${dir}/status.json`)) as { did: string; servePort: number };
      assertEquals(status.did, did, "the status file names the bidder's DID");
      assertEquals(status.servePort, servePort, "the status file names the bound serve port");
      const reported = JSON.parse(await Deno.readTextFile(`${dir}/listeners.json`)) as { listeners: Array<{ kind: string; address: string }> };
      assert(
        reported.listeners.some((l) => l.kind === "tcp" && l.address.endsWith(`:${servePort}`)),
        `the listeners file reports the bound tcp port, got ${JSON.stringify(reported)}`,
      );
      assert(bidder.saw("localPDS plc registering"), "localRepo mode builds the in-process repo");
      assertEquals(await pds.listRecords(accountDid, OFFERING_NSID), [], "nothing may be written to the account's PDS");
      const doc = await (await fetch(`${plcUrl}/${did}`)).json() as { service: Array<{ id: string; serviceEndpoint: string }> };
      const pdsEndpoint = doc.service.find((s) => s.id === "#atproto_pds")?.serviceEndpoint ?? "";
      assert(pdsEndpoint.endsWith(".relay.localhost"), `the in-process repo is served through the relay, got ${pdsEndpoint}`);
    } finally {
      await bidder.stop();
    }
  } finally {
    ac.abort();
    await Deno.remove(dir, { recursive: true }).catch(() => {});
  }
});

Deno.test({
  name: "kcp MarketIdentity: an OAuth session handed over through the vault signs the bidder in; its offering lands in that PDS",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const ac = new AbortController();
  const dir = await Deno.makeTempDir({ prefix: "bidder-kcp-identity-" });
  try {
    const plc = createFakePlc();
    const plcUrl = `http://localhost:${await serveOnPort0(plc.app.fetch, ac)}`;
    const pds = await startHonoPds(plcUrl, ac, true);
    const accountDid = await pds.createAccount("bidder.test", crypto.randomUUID());
    const { sessionData } = await pds.sessionInjector!.injectSession({ userDid: accountDid, handle: "bidder.test" });
    const vaultFile = `${dir}/identity-vault.json`;
    const sessionRef = { mount: "bidder", path: "identity/bidder/session" };
    await createFileIdentityVault({ path: vaultFile }).write(sessionRef, { ...sessionData, pds: pds.url } as unknown as Record<string, unknown>);

    const dispatcherApp = createRelayFactory({ hostname: "relay.localhost" }).createApp();
    const dispPort = await serveOnPort0(dispatcherApp.fetch, ac, "127.0.0.1");
    const restoreFetch = installFetchInterceptor({ realFetch: globalThis.fetch, plcDirectoryUrl: plcUrl, dispPort });
    ac.signal.addEventListener("abort", restoreFetch, { once: true });

    const kcp = createFakeKcp("root:bob");
    kcp.put({ apiVersion: "socialweb.computer/v1alpha1", kind: "MarketIdentity", metadata: { name: "bidder" }, spec: { mode: "oauthDelegated", sessionRef } });
    const kcpPort = await serveOnPort0((r) => kcp.fetch(r), ac);

    const bidder = spawnBidder([
      "--market-identity-kcp-server", `http://127.0.0.1:${kcpPort}`,
      "--market-identity-kcp-workspace", "root:bob",
      "--identity-vault-file", vaultFile,
      "--plc-directory-url", plcUrl,
      "--ingress-proxy-host", `relay.localhost:${dispPort}`,
      "--skip-qr", "--firehose-mode", "off", "--no-ingress-proxy", "--offering-refresh-sec", "0",
      "--serve-addr", "127.0.0.1", "--serve-port", "0",
      ...stateArgs(dir),
    ]);
    try {
      const { did } = await withTimeout(bidder.ready, 60_000, "bidder_ready");
      assertEquals(did, accountDid, "the bidder signs in as the delegated account");
      assertEquals(kcp.read("bidder")?.status?.phase, "Ready");
      assert(!bidder.saw("localPDS plc registering"), "an OAuth identity serves no repo of its own");
      assert((await pds.listRecords(accountDid, OFFERING_NSID)).length > 0, "the offering is written through the OAuth session");
      const leaked = kcp.writes.flatMap((w) => findSecretMaterial(JSON.parse(w.body || "null")));
      assertEquals(leaked, [], "no kcp write carries a token, key or password");
    } finally {
      await bidder.stop();
    }
  } finally {
    ac.abort();
    await Deno.remove(dir, { recursive: true }).catch(() => {});
  }
});

Deno.test({
  name: "[acceptance] pdsAccount: hono-bidder signs in to its PDS account; offering, bid and receipt live in that repo; a guest is rented and released",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const backend: ContainerBackend = Deno.build.os === "darwin" ? createContainerBackend() : createDockerBackend();
  if (!(await backend.ensureRunning())) {
    console.log(`[SKIP] container backend not available (${Deno.build.os})`);
    return;
  }
  const gateway = await backend.defaultGateway();

  const logEvents: Array<{ event: string; data: Record<string, unknown> }> = [];
  const baseLogger = createLogger({ serviceName: "pds-account-acceptance" });
  const logger = new Proxy(baseLogger, {
    get(target, prop, receiver) {
      if (prop === "info") {
        return (event: string, data?: Record<string, unknown>) => {
          logEvents.push({ event, data: data ?? {} });
          (target as unknown as { info(e: string, d?: Record<string, unknown>): void }).info(event, data);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as typeof baseLogger;

  const ac = new AbortController();
  const cleanups: Array<() => void | Promise<void>> = [() => ac.abort()];
  const dir = await Deno.makeTempDir({ prefix: "bidder-pds-account-" });
  cleanups.push(() => Deno.remove(dir, { recursive: true }).catch(() => {}));

  const { caCertPem, serverCertPem, serverKeyPem } = await generateLocalhostTlsCert({
    extraDnsSans: ["relay.localhost", "*.relay.localhost"],
  });
  const dispatcherApp = createRelayFactory({ hostname: "relay.localhost", additionalHosts: [gateway] }).createApp();
  const dispPort = await serveOnPort0(dispatcherApp.fetch, ac, "0.0.0.0");
  const dispTlsPort = await serveOnPort0(dispatcherApp.fetch, ac, "0.0.0.0", serverCertPem, serverKeyPem);
  const ingressProxyHost = `relay.localhost:${dispPort}`;

  const plc = createFakePlc();
  const plcDirectoryUrl = `http://localhost:${await serveOnPort0(plc.app.fetch, ac)}`;
  cleanups.push(installFetchInterceptor({ realFetch: globalThis.fetch, plcDirectoryUrl, dispPort: dispTlsPort, caCertPem }));

  try {
    const pds = await startHonoPds(plcDirectoryUrl, ac);
    const password = crypto.randomUUID();
    const accountDid = await pds.createAccount("bidder.test", password);
    const vaultFile = await writeVaultPassword(dir, password);

    const bidder = spawnBidder([
      "--atproto-handle", "bidder.test",
      "--atproto-pds-url", pds.url,
      "--identity-vault-file", vaultFile,
      "--plc-directory-url", plcDirectoryUrl,
      "--ingress-proxy-host", ingressProxyHost,
      "--skip-qr", "--policy", "open", "--firehose-mode", "off", "--offering-refresh-sec", "0",
      "--compute-provider-local", "--compute-provider-local-mode", "container",
      "--guest-tls-port", String(dispTlsPort),
      "--serve-addr", "127.0.0.1", "--serve-port", "0",
      ...stateArgs(dir),
    ], { CA_CERT_PEM: caCertPem });
    cleanups.push(() => bidder.stop());

    const ready = await withTimeout(bidder.ready, 120_000, "bidder_ready");
    assertEquals(ready.did, accountDid, "the bidder's DID is the PDS account's DID");
    assert(!bidder.saw("localPDS plc registering"), "a pdsAccount bidder serves no repo of its own");
    const repoProbe = await fetch(`http://127.0.0.1:${ready.servePort}/xrpc/com.atproto.repo.listRecords?repo=${accountDid}&collection=${OFFERING_NSID}`);
    await repoProbe.body?.cancel();
    assert(repoProbe.status === 404, `the bidder's own serve must not answer repo reads, got ${repoProbe.status}`);
    const offerings = await pds.listRecords(accountDid, OFFERING_NSID);
    assert(offerings.length > 0, "the offering is listed by the account's PDS");

    const requesterServe = createServe({ logger, tcp: { addr: "127.0.0.1", port: 0 } });
    const requester = await createRequesterPDS({ logger, serve: requesterServe, plcDirectoryUrl, ingressProxyHost, label: "requester" });
    cleanups.push(() => requesterServe.shutdown());
    await requester.beginServe();

    const result = await runComputeContract(requester, {
      logger,
      ingressProxyHost,
      skipSsh: false,
      keepVm: false,
      policy: { name: "open", args: { bidWindowSec: 20 } },
      vmReadyTimeoutSec: 300,
      execProgram: `echo ${MARKER}`,
      extraBidderDids: [accountDid],
      denyBidderDids: ["did:plc:centraldefaultbidder000000"],
    });

    assertEquals(result.winnerDid, accountDid, "the account bidder wins");
    assert(result.receiptOk === true, `receipt verification should pass, got ${JSON.stringify(result)}`);
    assert(result.bidUri?.startsWith(`at://${accountDid}/${BID_NSID}/`), `bid lives in the account repo: ${result.bidUri}`);
    assert(result.receiptUri?.startsWith(`at://${accountDid}/${RECEIPT_NSID}/`), `receipt lives in the account repo: ${result.receiptUri}`);
    assert(await pds.getRecord(result.bidUri!), "the bid is readable with com.atproto.repo.getRecord on the account's PDS");
    assert(await pds.getRecord(result.receiptUri!), "the receipt is readable with com.atproto.repo.getRecord on the account's PDS");

    assert(logEvents.some((e) => e.event === "vm_fqdn_discovered"), "the guest reported onNetwork");
    assert(result.sshReady === true && result.sshExitCode === 0, `the rented guest answered: ${JSON.stringify(result)}`);
    assert(result.sshOutput?.includes(MARKER), `guest output: ${result.sshOutput}`);

    const released = await withTimeout((async () => {
      while (!bidder.saw("submitEvent: VM destroyed")) await new Promise((r) => setTimeout(r, 1000));
      return true;
    })(), 120_000, "the bidder should destroy the guest on vm.delete");
    assert(released);
  } finally {
    for (const c of cleanups.reverse()) {
      try { await c(); } catch { /* best effort */ }
    }
  }
});
