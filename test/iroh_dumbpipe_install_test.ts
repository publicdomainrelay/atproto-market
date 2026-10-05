// Proves the dumbpipe install works against the real release archive, not a
// stub. The pinned v0.39.0 archive stores its single member as `./dumbpipe`, so
// naming the bare member `dumbpipe` fails with `tar: dumbpipe: Not found in
// archive` (exit 2) and installs nothing -- which is the defect this test
// exists to catch.
//
// The archive is taken from DUMBPIPE_ARCHIVE when that names a readable file,
// otherwise downloaded from the pinned n0-computer/dumbpipe release.
//
// Run: deno test -A test/iroh_dumbpipe_install_test.ts

import { assert, assertEquals } from "@std/assert";
import { buildUserData } from "@publicdomainrelay/cloud-init-common";

const DUMBPIPE_VERSION = "v0.39.0";
const ARCHIVE_NAME = `dumbpipe-${DUMBPIPE_VERSION}-linux-x86_64.tar.gz`;
const ARCHIVE_URL =
  `https://github.com/n0-computer/dumbpipe/releases/download/${DUMBPIPE_VERSION}/${ARCHIVE_NAME}`;

const CTX = {
  vmName: "vm-test",
  sshAuthorizedKey: "ssh-ed25519 AAAA test@example",
};

async function archivePath(): Promise<string> {
  const fromEnv = Deno.env.get("DUMBPIPE_ARCHIVE");
  if (fromEnv) {
    try {
      const stat = await Deno.stat(fromEnv);
      if (stat.isFile) return fromEnv;
    } catch { /* fall through to download */ }
  }
  const dir = await Deno.makeTempDir({ prefix: "dumbpipe-archive-" });
  const path = `${dir}/${ARCHIVE_NAME}`;
  const res = await fetch(ARCHIVE_URL);
  assert(res.ok, `download ${ARCHIVE_URL} failed: ${res.status}`);
  await Deno.writeFile(path, new Uint8Array(await res.arrayBuffer()));
  return path;
}

/** The install command the guest cloud-config runs, read out of the rendered iroh module. */
function guestInstallCommand(): string {
  const rendered = buildUserData({ ctx: CTX, modules: ["iroh"] });
  const start = rendered.indexOf("command -v dumbpipe");
  if (start < 0) throw new Error("no dumbpipe install command in the rendered cloud-config");
  const end = rendered.indexOf("dumbpipe\n", start);
  return rendered.slice(start, end > 0 ? end + "dumbpipe".length : undefined);
}

Deno.test("guest cloud-config extracts the ./dumbpipe member", async () => {
  const archive = await archivePath();
  const cmd = guestInstallCommand();
  assert(cmd.includes("./dumbpipe"), "install command names the ./dumbpipe member");
  assert(!/tar[^\n]*\s-dumbpipe\b/.test(cmd), "never the bare `dumbpipe` member");

  const member = cmd.match(/tar\s+\S+\s+-C\s+\S+\s+(\S+)/)?.[1];
  assertEquals(member, "./dumbpipe");

  const dir = await Deno.makeTempDir({ prefix: "dumbpipe-extract-" });
  const tar = new Deno.Command("tar", {
    args: ["-xvz", "-C", dir, member!],
    stdin: "piped",
    stdout: "null",
    stderr: "piped",
  });
  const child = tar.spawn();
  const file = await Deno.open(archive, { read: true });
  await file.readable.pipeTo(child.stdin);
  const { code, stderr } = await child.output();
  assertEquals(code, 0, new TextDecoder().decode(stderr));

  const bin = `${dir}/dumbpipe`;
  const stat = await Deno.stat(bin);
  assert(stat.isFile, `${bin} extracted`);
  await Deno.chmod(bin, 0o755);
  const help = await new Deno.Command(bin, { args: ["--help"] }).output();
  assertEquals(help.code, 0, "dumbpipe --help exits 0");
  const out = new TextDecoder().decode(help.stdout) + new TextDecoder().decode(help.stderr);
  assert(out.toLowerCase().includes("dumbpipe"), `usage mentions dumbpipe: ${out.slice(0, 200)}`);
});

Deno.test("the bare member name would fail (regression guard)", async () => {
  const archive = await archivePath();
  const dir = await Deno.makeTempDir({ prefix: "dumbpipe-bare-" });
  const tar = new Deno.Command("tar", {
    args: ["-xvz", "-C", dir, "dumbpipe"],
    stdin: "piped",
    stdout: "null",
    stderr: "piped",
  });
  const child = tar.spawn();
  const file = await Deno.open(archive, { read: true });
  await file.readable.pipeTo(child.stdin);
  const { code } = await child.output();
  assert(code !== 0, "naming the bare member fails, which is why the code uses ./dumbpipe");
  const exists = await Deno.stat(`${dir}/dumbpipe`).then(() => true).catch(() => false);
  assert(!exists, "bare member installs nothing");
});

Deno.test("ensureDumbpipe installs a runnable binary from the release archive", async () => {
  const which = await new Deno.Command("which", { args: ["dumbpipe"], stdout: "null", stderr: "null" })
    .output();
  if (which.code === 0) {
    // A system dumbpipe short-circuits ensureDumbpipe; the extraction above
    // still proves the member naming.
    return;
  }
  const archive = await archivePath();
  const archiveBytes = await Deno.readFile(archive);
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("n0-computer/dumbpipe/releases/download")) {
      return Promise.resolve(new Response(archiveBytes, { status: 200 }));
    }
    return realFetch(input as never);
  }) as typeof fetch;
  try {
    const { ensureDumbpipe } = await import("@publicdomainrelay/requester-xrpc");
    await ensureDumbpipe();
    const found = await new Deno.Command("which", { args: ["dumbpipe"], stdout: "piped" }).output();
    assertEquals(found.code, 0, "ensureDumbpipe put a dumbpipe binary on PATH");
    const bin = new TextDecoder().decode(found.stdout).trim().split("\n")[0];
    const help = await new Deno.Command(bin, { args: ["--help"] }).output();
    assertEquals(help.code, 0, "installed binary runs");
    const out = new TextDecoder().decode(help.stdout) + new TextDecoder().decode(help.stderr);
    assert(out.toLowerCase().includes("dumbpipe"), "installed binary is dumbpipe");
  } finally {
    globalThis.fetch = realFetch;
  }
});
