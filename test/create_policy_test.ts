import { createPolicy } from "@publicdomainrelay/market-policy";
import { ONLY_ME, TANGLED_VOUCH, MUTUALS, DYNAMIC } from "@publicdomainrelay/market-policy-abc";

Deno.test("createPolicy — null mode returns null", () => {
  const result = createPolicy(null);
  if (result !== null) throw new Error("expected null for null mode");
});

Deno.test("createPolicy — undefined mode returns null", () => {
  const result = createPolicy(undefined);
  if (result !== null) throw new Error("expected null for undefined mode");
});

Deno.test("createPolicy — unknown mode returns null", () => {
  const result = createPolicy("invalid" as never);
  if (result !== null) throw new Error("expected null for unknown mode");
});

Deno.test("createPolicy — only-me mode returns FulfillmentPolicy", () => {
  const policy = createPolicy(ONLY_ME);
  if (!policy) throw new Error("expected FulfillmentPolicy");
  if (typeof policy.policyNsid !== "string") throw new Error("expected policyNsid string");
  if (typeof policy.evaluate !== "function") throw new Error("expected evaluate function");
  if (typeof policy.buildPolicyRecord !== "function") throw new Error("expected buildPolicyRecord function");
});

Deno.test("createPolicy — tangled-vouch mode returns FulfillmentPolicy", () => {
  const policy = createPolicy(TANGLED_VOUCH);
  if (!policy) throw new Error("expected FulfillmentPolicy");
  if (typeof policy.policyNsid !== "string") throw new Error("expected policyNsid string");
});

Deno.test("createPolicy — tangled-vouch with vouchResolver forwards it", () => {
  const resolver = { getVouchedDids: async (_did: string) => new Set<string>(), isVouched: async (_a: string, _b: string) => false };
  const policy = createPolicy(TANGLED_VOUCH, { vouchResolver: resolver });
  if (!policy) throw new Error("expected FulfillmentPolicy");
});

Deno.test("createPolicy — mutuals mode returns FulfillmentPolicy", () => {
  const policy = createPolicy(MUTUALS);
  if (!policy) throw new Error("expected FulfillmentPolicy");
  if (typeof policy.policyNsid !== "string") throw new Error("expected policyNsid string");
});

Deno.test("createPolicy — dynamic mode returns FulfillmentPolicy", () => {
  const policy = createPolicy(DYNAMIC);
  if (!policy) throw new Error("expected FulfillmentPolicy");
  if (typeof policy.policyNsid !== "string") throw new Error("expected policyNsid string");
});

Deno.test("createPolicy — dynamic mode with signer forwards it", () => {
  const signer = { did: () => "did:plc:test", sign: async (_bytes: Uint8Array) => new Uint8Array() };
  const policy = createPolicy(DYNAMIC, { signer });
  if (!policy) throw new Error("expected FulfillmentPolicy");
});

Deno.test("createPolicy — only-me buildPolicyRecord returns correct shape", () => {
  const policy = createPolicy(ONLY_ME);
  if (!policy) throw new Error("expected FulfillmentPolicy");
  const record = policy.buildPolicyRecord("did:plc:alice");
  if (record.requesterDid !== "did:plc:alice") throw new Error(`expected requesterDid, got ${record.requesterDid}`);
  if (!record.$type) throw new Error("expected $type in record");
});

Deno.test("createPolicy — all modes buildPolicyRecord returns shape with requesterDid", () => {
  const modes = [ONLY_ME, TANGLED_VOUCH, MUTUALS] as const;
  for (const mode of modes) {
    const policy = createPolicy(mode);
    if (!policy) throw new Error(`expected FulfillmentPolicy for ${mode}`);
    const record = policy.buildPolicyRecord("did:plc:alice");
    if (record.requesterDid !== "did:plc:alice") throw new Error(`${mode}: expected requesterDid, got ${record.requesterDid}`);
  }
});
