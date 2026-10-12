import { assertEquals, assertRejects } from "@std/assert";
import { Hono } from "@hono/hono";
import { createOpenBaoIdentityVault } from "@publicdomainrelay/market-identity-vault-openbao";

function fakeKv2(token: string) {
  const data = new Map<string, Record<string, unknown>>();
  const seen: string[] = [];
  const app = new Hono();
  app.use("*", async (c, next) => {
    seen.push(`${c.req.method} ${c.req.path}`);
    if (c.req.header("x-vault-token") !== token) return c.json({ errors: ["permission denied"] }, 403);
    await next();
  });
  app.get("/v1/:mount/data/:path{.+}", (c) => {
    const v = data.get(`${c.req.param("mount")}/${c.req.param("path")}`);
    if (!v) return c.json({ errors: [] }, 404);
    return c.json({ data: { data: v, metadata: { version: 1 } } });
  });
  app.post("/v1/:mount/data/:path{.+}", async (c) => {
    const body = await c.req.json() as { data: Record<string, unknown> };
    data.set(`${c.req.param("mount")}/${c.req.param("path")}`, body.data);
    return c.json({ data: { version: 1 } });
  });
  app.delete("/v1/:mount/metadata/:path{.+}", (c) => {
    data.delete(`${c.req.param("mount")}/${c.req.param("path")}`);
    return c.body(null, 204);
  });
  return {
    seen,
    fetch: ((input: string | URL | Request, init?: RequestInit) => app.fetch(new Request(input, init))) as typeof fetch,
  };
}

Deno.test("openbao vault: KV v2 read, write and remove under the reference's mount and path", async () => {
  const bao = fakeKv2("s.root");
  const vault = createOpenBaoIdentityVault({ address: "https://bao.test:8200", token: "s.root", fetch: bao.fetch });
  const ref = { mount: "bidder", path: "identity/self/session" };
  assertEquals(await vault.read(ref), null);
  await vault.write(ref, { accessJwt: "a", refreshJwt: "r" });
  assertEquals(await vault.read(ref), { accessJwt: "a", refreshJwt: "r" });
  await vault.remove(ref);
  assertEquals(await vault.read(ref), null);
  assertEquals(bao.seen, [
    "GET /v1/bidder/data/identity/self/session",
    "POST /v1/bidder/data/identity/self/session",
    "GET /v1/bidder/data/identity/self/session",
    "DELETE /v1/bidder/metadata/identity/self/session",
    "GET /v1/bidder/data/identity/self/session",
  ]);
});

Deno.test("openbao vault: the token is re-read from its file on every call, so a renewed token is used", async () => {
  const dir = await Deno.makeTempDir({ prefix: "bao-token-" });
  try {
    const tokenFile = `${dir}/token`;
    await Deno.writeTextFile(tokenFile, "s.old\n");
    const bao = fakeKv2("s.new");
    const vault = createOpenBaoIdentityVault({ address: "https://bao.test:8200", tokenFile, fetch: bao.fetch });
    await assertRejects(() => vault.read({ mount: "bidder", path: "k" }), Error, "403");
    await Deno.writeTextFile(tokenFile, "s.new\n");
    assertEquals(await vault.read({ mount: "bidder", path: "k" }), null);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("openbao vault: a reference that escapes its mount is refused", async () => {
  const bao = fakeKv2("t");
  const vault = createOpenBaoIdentityVault({ address: "https://bao.test:8200", token: "t", fetch: bao.fetch });
  await assertRejects(() => vault.read({ mount: "bidder", path: "../sys/seal" }), Error, "path");
  await assertRejects(() => vault.write({ mount: "", path: "x" }, {}), Error, "mount");
  assertEquals(bao.seen, []);
});
