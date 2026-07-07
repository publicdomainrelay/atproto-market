import type { FulfillmentPolicy, PolicyViolation } from "@publicdomainrelay/market-policy-abc";
import { POLICIES_REMOTE_NSID, MARKET_EVALUATE_POLICY_NSID, MARKET_EVALUATE_POLICY_LXM } from "@publicdomainrelay/market-lexicons";

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlJson(obj: Record<string, unknown>): string {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}

async function signJwt(
  signer: { did(): string; sign(bytes: Uint8Array): Promise<Uint8Array> },
  aud: string,
  lxm: string,
): Promise<string> {
  const iss = signer.did();
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "ES256K" };
  const payload: Record<string, unknown> = {
    iss,
    aud,
    iat: now,
    exp: now + 60,
    jti: b64url(crypto.getRandomValues(new Uint8Array(16))),
    lxm,
  };
  const signingInput = `${b64urlJson(header)}.${b64urlJson(payload)}`;
  const sig = await signer.sign(new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64url(sig)}`;
}

export interface RemotePolicyOpts {
  signer?: { did(): string; sign(bytes: Uint8Array): Promise<Uint8Array> };
}

export function createRemotePolicy(opts?: RemotePolicyOpts): FulfillmentPolicy {
  return {
    policyNsid: POLICIES_REMOTE_NSID,
    label: "Policy-based",

    async createPolicyPayload(ctx) {
      const record: Record<string, unknown> = {
        $type: POLICIES_REMOTE_NSID,
        requesterDid: ctx.subjectDid,
        createdAt: new Date().toISOString(),
      };
      ctx.log("info", "remote policy created", { requesterDid: ctx.subjectDid });
      return { uri: `at://${ctx.subjectDid}/${POLICIES_REMOTE_NSID}/policy` as never, cid: "" as never };
    },

    async evaluate(ctx) {
      ctx.log("info", "remote policy evaluate", {
        subjectDid: ctx.subjectDid,
        rootRequesterDid: ctx.rootRequesterDid,
      });

      if (!ctx.policyRef) {
        return { allow: false, violations: [{ msg: "policyRef missing from eval context", policyId: POLICIES_REMOTE_NSID }] };
      }

      let policyRecord: Record<string, unknown>;
      try {
        policyRecord = await ctx.resolve(ctx.policyRef);
      } catch (err) {
        return { allow: false, violations: [{ msg: `failed to resolve policy record: ${err}`, policyId: ctx.policyRef }] };
      }

      const policyEngine = policyRecord.policyEngine as string | undefined;
      if (!policyEngine) {
        return { allow: false, violations: [{ msg: "policyEngine not set in policy record", policyId: ctx.policyRef }] };
      }

      if (!opts?.signer) {
        return { allow: false, violations: [{ msg: "no signer configured for remote policy evaluation", policyId: "no-signer" }] };
      }

      const engineDid = policyEngine;
      let engineUrl: string;
      if (engineDid.startsWith("did:web:")) {
        const host = decodeURIComponent(engineDid.slice("did:web:".length));
        const scheme = (host.startsWith("127.0.0.1") || host.startsWith("localhost") || host.startsWith("[::1]")) ? "http" : "https";
        engineUrl = `${scheme}://${host}`;
      } else {
        return { allow: false, violations: [{ msg: `unsupported policyEngine DID method: ${engineDid}`, policyId: engineDid }] };
      }

      try {
        const jwt = await signJwt(opts.signer, engineDid, MARKET_EVALUATE_POLICY_LXM);
        const url = `${engineUrl}/xrpc/${MARKET_EVALUATE_POLICY_NSID}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` },
          body: JSON.stringify({
            subjectDid: ctx.subjectDid,
            rootRequesterDid: ctx.rootRequesterDid,
            counterpartyDid: ctx.counterpartyDid,
            policyRef: ctx.policyRef,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return { allow: false, violations: [{ msg: `policy engine returned ${res.status}: ${text}`, policyId: engineDid }] };
        }
        const result = await res.json() as { allow: boolean; violations?: PolicyViolation[] };
        return { allow: result.allow, violations: result.violations ?? [] };
      } catch (err) {
        return { allow: false, violations: [{ msg: `policy engine request failed: ${err}`, policyId: engineDid }] };
      }
    },
  };
}
