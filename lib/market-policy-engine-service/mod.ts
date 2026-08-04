import type { PolicyArgs, PolicyResult, PolicyViolation } from "@publicdomainrelay/market-policy-abc";
import { MARKET_EVALUATE_POLICY_NSID, MARKET_EVALUATE_POLICY_LXM } from "@publicdomainrelay/market-lexicons";

export interface Signer {
  did(): string;
  sign(bytes: Uint8Array): Promise<Uint8Array>;
}

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlJson(obj: Record<string, unknown>): string {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}

export async function signJwt(signer: Signer, aud: string, lxm: string): Promise<string> {
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

export function engineDidToUrl(engineDid: string): string | null {
  if (!engineDid.startsWith("did:web:")) return null;
  const host = decodeURIComponent(engineDid.slice("did:web:".length));
  const local = host.startsWith("127.0.0.1") || host.startsWith("localhost") || host.startsWith("[::1]");
  return `${local ? "http" : "https"}://${host}`;
}

export interface ServicePolicyEvalInput {
  policyName: string;
  args: PolicyArgs;
  policyEngine: string;
  perspective: "bidder" | "requester";
  selfDid: string;
  subjectDid: string;
  rootRequesterDid: string;
  counterpartyDid: string;
  policyRef?: { uri: string; cid: string };
  demand?: { rfpRef: { uri: string; cid: string }; payloadRef: { uri: string; cid: string }; payloadNsid: string; payload?: Record<string, unknown> };
  offer?: { bidRef: { uri: string; cid: string }; payloadRef: { uri: string; cid: string }; payloadNsid: string; payload?: Record<string, unknown> };
  signer?: Signer;
  log: (level: string, msg: string, meta?: Record<string, unknown>) => void;
}

export function createServicePolicyEngine() {
  return {
    async evaluate(input: ServicePolicyEvalInput): Promise<PolicyResult> {
      input.log("info", "service policy evaluate", {
        policyName: input.policyName,
        subjectDid: input.subjectDid,
        rootRequesterDid: input.rootRequesterDid,
      });

      if (!input.signer) {
        return { allow: false, violations: [{ msg: "no signer configured for service policy evaluation", policyId: "no-signer" }] };
      }

      const engineDid = input.policyEngine;
      const engineUrl = engineDidToUrl(engineDid);
      if (!engineUrl) {
        return { allow: false, violations: [{ msg: `unsupported policyEngine DID method: ${engineDid}`, policyId: engineDid }] };
      }

      try {
        const jwt = await signJwt(input.signer, engineDid, MARKET_EVALUATE_POLICY_LXM);
        const url = `${engineUrl}/xrpc/${MARKET_EVALUATE_POLICY_NSID}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` },
          body: JSON.stringify({
            name: input.policyName,
            args: input.args,
            perspective: input.perspective,
            selfDid: input.selfDid,
            subjectDid: input.subjectDid,
            rootRequesterDid: input.rootRequesterDid,
            counterpartyDid: input.counterpartyDid,
            policyRef: input.policyRef,
            demand: input.demand,
            offer: input.offer,
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
