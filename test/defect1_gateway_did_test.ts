import { assert, assertEquals } from "@std/assert";
import { Secp256k1Keypair } from "@atproto/crypto";
import { createComputeContractGatewayFactory } from "@publicdomainrelay/hono-factory-compute-contract-gateway-xrpc";
import { REQUEST_COMPUTE_VM_NSID, REQUEST_COMPUTE_VM_LXM } from "@publicdomainrelay/compute-contract-gateway-common";
import type { ComputeContractGateway } from "@publicdomainrelay/compute-contract-gateway-abc";

const HOSTNAME = "gateway.test";

function b64url(input: string | Uint8Array): string {
  const s = typeof input === "string" ? btoa(input) : btoa(String.fromCharCode(...input));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function mintServiceAuth(
  kp: Secp256k1Keypair,
  iss: string,
  aud: string,
  lxm: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${b64url(JSON.stringify({ typ: "JWT", alg: "ES256K" }))}.${
    b64url(JSON.stringify({ iss, aud, lxm, iat: now, exp: now + 300 }))
  }`;
  const sig = await kp.sign(new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64url(sig)}`;
}

function claimJwt(iss: string): string {
  const payload = btoa(JSON.stringify({ iss })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64url(JSON.stringify({ typ: "JWT", alg: "ES256K" }))}.${payload}.not-a-signature`;
}

Deno.test("defect1: the gateway must act on the verified token issuer, not the body payload", async () => {
  const attacker = await Secp256k1Keypair.create();
  const victim = await Secp256k1Keypair.create();

  const seen: string[] = [];
  const gateway = {
    did: `did:web:${HOSTNAME}`,
    async requestComputeVM(caller: { did: string }) {
      seen.push(caller.did);
      return { ok: true };
    },
  } as unknown as ComputeContractGateway;

  const { app } = createComputeContractGatewayFactory({
    gateway,
    hostname: HOSTNAME,
    idResolver: { did: { resolveAtprotoKey: async (did: string) => did } } as never,
  });

  const token = await mintServiceAuth(attacker, attacker.did(), `did:web:${HOSTNAME}`, REQUEST_COMPUTE_VM_LXM);
  const res = await app.request(`http://${HOSTNAME}/xrpc/${REQUEST_COMPUTE_VM_NSID}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      payload: claimJwt(victim.did()),
      computeVm: { $type: "com.publicdomainrelay.temp.compute.vm", cpus: 1, mem: "512M", disk: "10G", network: "500G" },
    }),
  });

  console.log("[defect1] status =", res.status);
  console.log("[defect1] attacker did =", attacker.did());
  console.log("[defect1] victim did   =", victim.did());
  console.log("[defect1] gateway saw  =", JSON.stringify(seen));

  assertEquals(res.status, 200);
  assertEquals(seen.length, 1);
  assertEquals(seen[0], attacker.did());
  assert(seen[0] !== victim.did());
});
