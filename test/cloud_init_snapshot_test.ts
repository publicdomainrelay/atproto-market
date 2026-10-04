// Snapshot + semantics tests for cloud-init-common buildUserData.
//
// Fixtures are byte-stable outputs of the composer (generated once during the
// migration; regenerate only when intentionally changing the composed YAML):
//   test/fixtures/cloud-init/{tunnel,iroh,fedproxy-ssh,fedproxy-web-wootty}.yaml
//
// Run:
//   deno test -A test/cloud_init_snapshot_test.ts

import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  acceptBundleModule,
  buildDefaultUserData,
  buildTunnelUserData,
  buildUserData,
  getUserDataModules,
  injectJsrUrl,
  listUserDataModules,
} from "@publicdomainrelay/cloud-init-common";

const SSH = "ssh-ed25519 AAAA test@example";
const CTX = {
  vmName: "vm-test",
  didPlc: "did:plc:abc123",
  didPlcKey: "abc123",
  relayHost: "xrpc.fedproxy.com",
  xrpcRelaySubdomain: "rly-xyz",
  sshHandle: "did:plc:abc123",
  woottyDistUrl: "https://ui.fedfork.com",
  sshAuthorizedKey: SSH,
  ingressProxyHost: "relay.local:443",
  audHost: "relay.local",
  // Requester-supplied per-contract report channel: the guest posts its iroh
  // ticket here instead of publishing it in a world-readable record. No
  // credential may be carried -- this user_data is published in a record.
  irohReportUrl: "https://req-abc.relay.local/v1/on-network",
};

function fixture(name: string): Promise<string> {
  return Deno.readTextFile(
    new URL(`./fixtures/cloud-init/${name}`, import.meta.url),
  );
}

Deno.test("composer snapshots match fixtures", async () => {
  assertEquals(
    buildUserData({ ctx: CTX, modules: ["tunnel"] }),
    await fixture("tunnel.yaml"),
  );
  assertEquals(
    buildUserData({ ctx: CTX, modules: ["iroh"] }),
    await fixture("iroh.yaml"),
  );
  assertEquals(
    buildUserData({ ctx: CTX, modules: ["fedproxy-ssh"] }),
    await fixture("fedproxy-ssh.yaml"),
  );
  assertEquals(
    buildUserData({ ctx: CTX, modules: ["fedproxy-web", "wootty"] }),
    await fixture("fedproxy-web-wootty.yaml"),
  );
});

const SECRETS_CTX = {
  ...CTX,
  secretsUrl: "https://sec-abc.relay.local",
  secretsRoute: "/xrpc/com.publicdomainrelay.temp.compute.secrets.getSecrets",
  secretsAud: "api://ATProto?actx=did:plc:requester123",
  secretsAcceptPath: "/root/secrets/publicdomainrelay.com/market/accept.json",
};

Deno.test("secrets module composes with the transport", async () => {
  assertEquals(
    buildUserData({ ctx: SECRETS_CTX, modules: ["tunnel", "secrets"] }),
    await fixture("tunnel-secrets.yaml"),
  );
});

Deno.test("secrets module discovers provider paths at runtime, not build time", () => {
  const y = buildUserData({ ctx: SECRETS_CTX, modules: ["secrets"] });
  // Everything provider-specific comes out of the bidder-injected accept.json,
  // because this cloud-config is built before a bid has even been selected.
  // The bidder wraps bid_config as a strongRef ({uri, cid, value}), so the wif
  // record is under .value; the flat shape stays accepted as a fallback.
  assert(y.includes(".bid_config.value // .bid_config"), "unwraps the strongRef wrapper");
  assert(y.includes(".token_path // empty"), "token path read from accept.json");
  assert(y.includes(".url_path // empty"), "issuer base read from accept.json");
  assert(y.includes(".url_route //"), "exchange route read from accept.json");
  assert(!y.includes("/root/secrets/digitalocean.com"), "no provider path baked in");
});

Deno.test("secrets module echoes the provider-assigned subject", () => {
  const y = buildUserData({ ctx: SECRETS_CTX, modules: ["secrets"] });
  assert(y.includes("cut -d. -f2"), "subject read from the token payload");
  assert(y.includes("jq -r .sub"), "subject taken verbatim from sub");
  assert(!y.includes("actx:{actx}"), "no client-side subject template rendering");
});

Deno.test("secrets module fails loud", () => {
  const y = buildUserData({ ctx: SECRETS_CTX, modules: ["secrets"] });
  assert(y.includes("set -euo pipefail"), "strict shell");
  assert(!y.includes("skipping secrets"), "no best-effort skip");
  assert(y.includes("exit 1"), "non-zero exit on failure");
  assert(!/secrets fetch failed[^\n]*exit 0/.test(y), "failure must not exit 0");
});

Deno.test("secrets module writes secrets 0600 under a 0700 parent", () => {
  const y = buildUserData({ ctx: SECRETS_CTX, modules: ["secrets"] });
  assert(y.includes("install -d -m 0700 -o root -g root"), "parent dir locked down");
  assert(y.includes('chmod 0600 "${SECRET_PATH}"'), "secret file locked down");
  assert(y.includes("umask 077"), "umask before writing");
});

Deno.test("secrets module carries no secret values", () => {
  const y = buildUserData({ ctx: SECRETS_CTX, modules: ["secrets"] });
  assert(!y.includes("secret-value"), "values never enter cloud-init");
  assert(y.includes(SECRETS_CTX.secretsUrl), "only the fetch location is baked in");
});

Deno.test("bug fixes baked into fedproxy-ssh", () => {
  const y = buildUserData({ ctx: CTX, modules: ["fedproxy-ssh"] });
  assert(y.includes("ListenAddress 127.0.0.1"), "loopback-only sshd");
  assert(!y.includes("ListenAddress 0.0.0.0"), "no 0.0.0.0 exposure");
  assert(y.includes(`[ -f "\${STAMP}" ]`), "single-escaped ${STAMP}");
  assert(!y.includes("\\${STAMP}"), "no double-escape backslash");
  assert(y.startsWith("#cloud-config\n"));
});

Deno.test("tunnel has no ListenAddress (direct-TCP probe)", () => {
  const y = buildUserData({ ctx: CTX, modules: ["tunnel"] });
  assert(!y.includes("ListenAddress"));
  assert(y.includes("tunnel-subscriber.service"));
  assert(y.includes(`--target-port 22`));
});

Deno.test("iroh dumbpipe listener replaces the tunnel subscriber", () => {
  const y = buildUserData({ ctx: CTX, modules: ["iroh"] });
  assert(y.startsWith("#cloud-config\n"), "cloud-config header");
  assert(y.includes("/root/.ssh/authorized_keys"), "root key installed");
  assert(y.includes(SSH), "authorized key comes from ctx.sshAuthorizedKey");
  assert(y.includes("PermitRootLogin prohibit-password"), "key-only root login");
  assert(y.includes("PasswordAuthentication no"), "no password auth");
  assert(!y.includes("ListenAddress"), "sshd stays probe-able on :22");
  assert(y.includes("n0-computer/dumbpipe/releases/download"), "dumbpipe release archive");
  // The release archive stores its member as ./dumbpipe; naming the bare
  // `dumbpipe` fails with `tar: dumbpipe: Not found in archive` (exit 2).
  assert(y.includes("./dumbpipe"), "extracts the ./dumbpipe member");
  assert(y.includes("dumbpipe-listen.service"), "listener unit installed");
  assert(y.includes("listen-tcp --host 127.0.0.1:22"), "listener bridges to sshd");
  assert(y.includes("/root/secrets/iroh-node-id"), "ticket captured for the requester");
  assert(!y.includes("tunnel-subscriber"), "old transport not re-emitted");
});

Deno.test("iroh listener keeps a stable identity and a fresh ticket", () => {
  const y = buildUserData({ ctx: CTX, modules: ["iroh"] });
  // Stable iroh identity: the secret file is created once, under umask 077, in
  // the unit that starts the listener, and read through an EnvironmentFile.
  assert(y.includes("EnvironmentFile=-/root/secrets/iroh.env"), "unit reads the secret file");
  assert(y.includes("IROH_SECRET="), "secret file carries IROH_SECRET");
  assert(
    y.includes("[ ! -s /root/secrets/iroh.env ]"),
    "secret generated only when missing or empty",
  );
  assert(y.includes("umask 077"), "secret written under umask 077");
  assert(y.includes("chmod 0600 /root/secrets/iroh.env"), "secret file locked down");
  // Freshness: the log is truncated on every start and the ticket re-extracted
  // by an ExecStartPost, so a restarted listener cannot report a stale ticket.
  assert(y.includes(": > /root/secrets/iroh-dumbpipe.log"), "log truncated on each start");
  assert(
    y.includes("ExecStartPost=-/usr/local/bin/iroh-capture-ticket.sh"),
    "ticket re-extracted on each start",
  );
  assert(y.includes("ExecStartPre=/usr/local/bin/iroh-prepare.sh"), "prepares secret + log");
  // Private report channel: the ticket goes to the requester's own endpoint,
  // never into a public record -- and the destination carries no credential,
  // because this cloud-config is published inside the compute.vm record.
  assert(y.includes(CTX.irohReportUrl), "report endpoint from ctx.irohReportUrl");
  assert(y.includes("/root/secrets/iroh-report.json"), "report destination written 0600");
  assert(
    y.includes(`{"url":"${CTX.irohReportUrl}"}`),
    "report destination carries only the url",
  );
  assert(!y.includes("Bearer"), "no credential baked into cloud-init");
  assert(y.includes("accept.uri"), "accept ref read from the injected bundle");
});

Deno.test("iroh ticket extraction matches the connect-tcp line dumbpipe prints", () => {
  const y = buildUserData({ ctx: CTX, modules: ["iroh"] });
  // `dumbpipe listen-tcp` prints `dumbpipe connect-tcp <ticket>` on stderr, so
  // the extraction must key on the subcommand that was actually printed.
  assert(y.includes("dumbpipe connect-tcp "), "extracts from the connect-tcp line");
  assert(!y.includes("dumbpipe connect [^"), "no bare `dumbpipe connect` prefix");
});

Deno.test("every module that configures an sshd installs openssh-server", () => {
  for (const id of listUserDataModules()) {
    const y = buildUserData({ ctx: CTX, modules: [id] });
    const configuresSshd = y.includes("sshd_config.d/") ||
      y.includes("systemctl enable --now ssh");
    if (!configuresSshd) continue;
    assert(
      y.includes("openssh-server"),
      `${id} configures an sshd but never installs openssh-server`,
    );
  }
  // The rule has to bite for the transports that actually own an sshd.
  for (const id of ["tunnel", "fedproxy-ssh", "iroh"]) {
    assert(
      /sshd_config\.d\//.test(buildUserData({ ctx: CTX, modules: [id] })),
      `${id} is covered by the completeness rule`,
    );
  }
});

Deno.test("wootty combo carries token handoff + hardening", () => {
  const y = buildUserData({ ctx: CTX, modules: ["fedproxy-web", "wootty"] });
  assert(y.includes("get-ttyd-password-vm-test"));
  assert(y.includes("com.fedproxy.ttydCredentials"));
  assert(y.includes("ssh_pwauth: false"));
  assert(y.includes("disable_root: false"));
  assert(y.includes("WOOTTY_AUTH_TOKEN"));
});

Deno.test("deprecated wrappers equal composer outputs", () => {
  assertEquals(buildTunnelUserData({ ingressProxyHost: CTX.ingressProxyHost, audHost: CTX.audHost, sshAuthorizedKey: SSH }), buildUserData({ ctx: CTX, modules: ["tunnel"] }));
  assertEquals(buildDefaultUserData({ vmName: CTX.vmName, didPlc: CTX.didPlc!, didPlcKey: CTX.didPlcKey!, relayHost: CTX.relayHost!, xrpcRelaySubdomain: CTX.xrpcRelaySubdomain!, sshAuthorizedKey: SSH }), buildUserData({ ctx: CTX, modules: ["fedproxy-ssh"] }));
});

Deno.test("merge semantics: base + module append, dedupe, override", () => {
  const base = `#cloud-config
packages:
  - curl
write_files:
  - path: /etc/base.conf
    content: base
runcmd:
  - echo base
`;

  const merged = buildUserData({
    ctx: CTX,
    base,
    modules: ["tunnel"],
  });
  // base preserved
  assert(merged.includes("- curl"));
  assert(merged.includes("/etc/base.conf"));
  assert(merged.includes("echo base"));
  // tunnel appended
  assert(merged.includes("tunnel-subscriber.service"));

  // module write_file path dedupes with base (later wins), base entry kept
  const withOverride = buildUserData({
    ctx: CTX,
    base: `write_files:\n  - path: /etc/systemd/system/tunnel-subscriber.service\n    content: base-unit\n`,
    modules: ["tunnel"],
  });
  assertEquals((withOverride.match(/\/etc\/systemd\/system\/tunnel-subscriber\.service/g) ?? []).length, 1, "dedupe by path");
  assert(withOverride.includes("base-unit") === false, "module wins on dup path");

  // overrides beat modules
  const overridden = buildUserData({
    ctx: CTX,
    modules: ["tunnel"],
    overrides: { ssh_pwauth: true },
  });
  assert(overridden.includes("ssh_pwauth: true"));
  assert(!overridden.includes("ssh_pwauth: false"));
});

Deno.test("runcmdPrepend ordering + acceptBundleModule", () => {
  const y = buildUserData({
    ctx: CTX,
    base: `runcmd:\n  - echo base\n`,
    modules: [acceptBundleModule("/root/accept.json", { ok: true })],
  });
  const run = y.split("runcmd:")[1];
  const installIdx = run.indexOf("install -d");
  const echoIdx = run.indexOf("echo base");
  assert(installIdx >= 0 && echoIdx >= 0 && installIdx < echoIdx, "prepend before base");
  assert(y.includes("/root/accept.json"));
});

Deno.test("unparseable / empty base -> fresh build", () => {
  const fresh = buildUserData({ ctx: CTX, modules: ["tunnel"] });
  assertEquals(buildUserData({ ctx: CTX, base: "", modules: ["tunnel"] }), fresh);
  assertEquals(buildUserData({ ctx: CTX, base: "not: [valid", modules: ["tunnel"] }), fresh);
});

Deno.test("injectJsrUrl adds JSR_URL env to tunnel unit", () => {
  const y = buildUserData({ ctx: CTX, modules: ["tunnel"] });
  const patched = injectJsrUrl(y, "jsr.local:8080");
  assert(patched.includes(`Environment="JSR_URL=jsr.local:8080"`));
});

Deno.test("registry: built-ins present, unknown id throws", () => {
  assert(listUserDataModules().includes("tunnel"));
  assert(listUserDataModules().includes("iroh"));
  assert(listUserDataModules().includes("fedproxy-ssh"));
  assert(listUserDataModules().includes("fedproxy-web"));
  assert(listUserDataModules().includes("wootty"));
  assert(listUserDataModules().includes("secrets"));
  assertEquals(getUserDataModules(["tunnel"]).length, 1);
  assertThrows(() => getUserDataModules(["nope"]));
});
