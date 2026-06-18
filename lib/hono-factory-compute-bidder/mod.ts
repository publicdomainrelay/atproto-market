import type { Agent } from "@atproto/api";
import { TID } from "@atproto/common";
import { Secp256k1Keypair } from "@atproto/crypto";
import { IdResolver } from "@atproto/identity";
import { createAttestationCid, type RecordMap } from "@atiproto/atproto-attestation";
import { createRepoFactory } from "@publicdomainrelay/hono-factory-atproto-repo-deno";
import { MemoryStorage, signServiceAuth } from "@publicdomainrelay/atproto-repo-deno";
import type { Signer } from "@publicdomainrelay/atproto-repo-abc";
import { PlcClient, createGenesisOp } from "@publicdomainrelay/did-plc";
import { createSubscriber } from "@publicdomainrelay/did-key-relay-subscriber-xrpc";
import type { SubscriberOptions } from "@publicdomainrelay/did-key-relay-subscriber-abc";
import { createSubscriberFactory } from "@publicdomainrelay/hono-factory-did-key-relay-subscriber-xrpc";
import {
  loadOrGenerateKeypair,
  attestationFor,
  toStorableEntry,
  createSubmitRfpHandler,
  createSubmitAcceptHandler,
  createSubmitEventHandler,
  createRecordResolver,
  type AttestationKeypair,
  type InlineAttestation,
  type SubmitRfpCallback,
  type SubmitAcceptCallback,
  type EventDispatchContext,
} from "@publicdomainrelay/market-atproto";
import { strongRef, DEFAULT_REGISTRY_ENDPOINTS, SUBMIT_BID_LXM } from "@publicdomainrelay/market-common";
import type { ComputeProvider, ComputeProviderMode, DropletSpec, StrongRef } from "@publicdomainrelay/compute-provider-abc";
import { createLocalComputeProvider } from "@publicdomainrelay/compute-provider-local";
import { createDigitalOceanComputeProvider } from "@publicdomainrelay/compute-provider-digitalocean";
import { createOidcIssuer } from "@publicdomainrelay/oidc-issuer";

function didWebToHttps(didOrUrl: string): string {
  return didOrUrl.startsWith("did:web:") ? "https://" + didOrUrl.slice("did:web:".length) : didOrUrl;
}

export interface ComputeProviderConfig {
  mode?: ComputeProviderMode;
  token?: string;
  baseUrl?: string;
  spec?: DropletSpec;
  containerMode?: "vm" | "container";
  vmImage?: string;
  containerImage?: string;
  cacheDir?: string;
  getAgent?: () => Agent;
  getAgentDid?: () => string;
  rbacRepoRoot?: string;
  acceptPathVm?: string;
}

export interface BidderOptions {
  port?: number;
  privateKeyHex?: string;
  plcDirectoryUrl?: string;
  dispatcherHost?: string;
  label?: string;
  computeProvider?: ComputeProviderConfig;
  registryEndpoint?: string;
  heartbeatIntervalMs?: number;
}

export interface ActiveContract {
  providerIdPromise?: Promise<string | number | undefined>;
  acceptAuthor: string;
}

export interface Bidder {
  did: string;
  signer: Signer;
  keypair: Secp256k1Keypair;
  api: ReturnType<typeof createRepoFactory>["api"];
  app: ReturnType<typeof createRepoFactory>["app"];
  proxyRef: string;
  relaySubdomain: string;
  ready: Promise<{ subdomain: string; proxyRef: string }>;
  stop: () => void;
  attestationKp: AttestationKeypair;
  activeContracts: Map<string, ActiveContract>;
}

function refKey(ref: { uri: string; cid: string }): string {
  return `${ref.uri}#${ref.cid}`;
}

function parseAtUri(uri: string): { repo: string; collection: string; rkey: string } {
  const withoutProtocol = uri.replace("at://", "");
  const parts = withoutProtocol.split("/");
  return { repo: parts[0], collection: parts[1], rkey: parts.slice(2).join("/") };
}

function computeProviderModeFromEnv(): ComputeProviderMode | undefined {
  const v = Deno.env.get("COMPUTE_PROVIDER") || Deno.env.get("COMPUTE_PROVIDER_CLI");
  if (v === "local" || v === "digitalocean") return v;
  return undefined;
}

async function runSubscriber(opts: {
  label: string;
  keypair: Secp256k1Keypair;
  getServiceAuthToken: (lxm: string) => Promise<string>;
  dispatcherHost: string;
  handleRequest: SubscriberOptions["handleRequest"];
  onRegistered: (info: { subdomain: string; proxyRef: string }) => void;
  onLog: (e: { severity: string; message: string }) => void;
}): Promise<{ stop: () => void }> {
  const handle = await createSubscriber({
    label: opts.label,
    keypair: opts.keypair,
    getServiceAuthToken: opts.getServiceAuthToken,
    dispatcherHost: opts.dispatcherHost,
    handleRequest: opts.handleRequest,
  });
  opts.onRegistered({ subdomain: handle.subdomain, proxyRef: handle.proxyRef });
  return { stop: () => handle.ws.close() };
}

export async function createBidder(
  opts: BidderOptions = {},
): Promise<Bidder> {
  const PRIVATE_KEY_HEX = opts.privateKeyHex ?? Deno.env.get("REPO_PRIVATE_KEY_HEX") ?? "";
  const PLC_DIRECTORY_URL = opts.plcDirectoryUrl ?? Deno.env.get("PLC_DIRECTORY_URL") ??
    "https://plc.directory";
  const DISPATCHER_HOST = opts.dispatcherHost ?? Deno.env.get("DISPATCHER_HOST") ??
    "xrpc.fedproxy.com";
  const LABEL = opts.label ?? "bidder";
  const REGISTRY_ENDPOINTS: string[] = (() => {
    if (opts.registryEndpoint) return [opts.registryEndpoint];
    const env = Deno.env.get("REGISTRY_ENDPOINT");
    if (env) return [env];
    const def = DEFAULT_REGISTRY_ENDPOINTS as string;
    if (def) return def.split(",").filter(Boolean);
    return [];
  })();
  const HEARTBEAT_INTERVAL_MS = opts.heartbeatIntervalMs ??
    parseInt(Deno.env.get("HEARTBEAT_INTERVAL_MS") ?? "60000");

  const cpCfg = opts.computeProvider;
  const mode: ComputeProviderMode | undefined = cpCfg?.mode ?? computeProviderModeFromEnv();
  const token = cpCfg?.token ?? Deno.env.get("COMPUTE_PROVIDER_TOKEN") ?? "";
  const baseUrl = cpCfg?.baseUrl ?? Deno.env.get("COMPUTE_PROVIDER_BASE_URL") ?? "";

  const logInfo = (obj: Record<string, unknown>) => console.log(JSON.stringify(obj));
  const log = (
    severity: string,
    msg: string,
    extra?: Record<string, unknown>,
  ) => logInfo({ label: LABEL, severity, message: msg, ...(extra ?? {}) });

  const keypair = PRIVATE_KEY_HEX
    ? await Secp256k1Keypair.import(PRIVATE_KEY_HEX)
    : await Secp256k1Keypair.create({ exportable: true });

  const privateKeyHex = PRIVATE_KEY_HEX ||
    Array.from(await keypair.export()).map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );

  const attestationKp = await loadOrGenerateKeypair(privateKeyHex);

  const plc = new PlcClient({ baseUrl: PLC_DIRECTORY_URL });
  const signingKeyDid = keypair.did();

  const { did, op } = await createGenesisOp({
    rotationKeys: [signingKeyDid],
    verificationMethods: {
      atproto: signingKeyDid,
      attestation: attestationKp.did(),
    },
    alsoKnownAs: [
      `at://${signingKeyDid.replace(/:/g, "-").toLowerCase()}.${DISPATCHER_HOST}`,
    ],
    services: {
      atproto_pds: {
        type: "AtprotoPersonalDataServer",
        endpoint:
          `https://${signingKeyDid.replace(/:/g, "-").toLowerCase()}.${DISPATCHER_HOST}`,
      },
      pdr_temp_market: {
        type: "PDRTempMarket",
        endpoint:
          `https://${signingKeyDid.replace(/:/g, "-").toLowerCase()}.${DISPATCHER_HOST}`,
      },
      pdr_temp_compute_event: {
        type: "PDRTempComputeEvent",
        endpoint:
          `https://${signingKeyDid.replace(/:/g, "-").toLowerCase()}.${DISPATCHER_HOST}`,
      },
    },
    sign: (bytes) => keypair.sign(bytes),
  });

  logInfo({ event: "bidder_did_plc_registering", did });
  await plc.submitOp(did, op);
  logInfo({ event: "bidder_did_plc_registered", did });

  Deno.env.set("OPERATOR_HANDLE", did);

  const signer: Signer = {
    did: () => did,
    sign: (bytes) => keypair.sign(bytes),
  };

  let relayRegistered:
    | ((info: { subdomain: string; proxyRef: string }) => void)
    | null = null;
  const relayReady = new Promise<{ subdomain: string; proxyRef: string }>((resolve) => {
    relayRegistered = resolve;
  });
  let relaySubdomain = "";
  let relayProxyRef = "";

  const activeContracts = new Map<string, ActiveContract>();

  const { app, api } = createRepoFactory({
    storage: new MemoryStorage(),
    signer,
    baseOrigin:
      `https://${keypair.did().replace(/:/g, "-").toLowerCase()}.${DISPATCHER_HOST}`,
    didWebServices: [
      { id: "pdr_temp_market", type: "PDRTempMarket" },
      { id: "pdr_temp_compute_event", type: "PDRTempComputeEvent" },
    ],
  });

  const bidder = {
    did,
    signer,
    keypair,
    api,
    app,
    proxyRef: relayProxyRef,
    relaySubdomain,
    ready: null as unknown as Promise<{ subdomain: string; proxyRef: string }>,
    stop: () => {
      stopDiscoveryUpdater();
      relayController.stop();
    },
    attestationKp,
    activeContracts,
  };

  const ready: Promise<{ subdomain: string; proxyRef: string }> = relayReady.then(
    async (info) => {
      await _cpSetupDone;
      if (mode !== "local" && mode !== "digitalocean") {
        await ensureOperatorAllowlist(api, did, baseUrl);
      }
      await ensureOffering(api, did);
      await ensureDiscoveryRecord();
      await registerWithRegistry();
      bidder.proxyRef = info.proxyRef;
      bidder.relaySubdomain = info.subdomain;
      return info;
    },
  );
  bidder.ready = ready;

  const createRecord = async (
    collection: string,
    record: Record<string, unknown>,
  ): Promise<StrongRef> => {
    const rkey = TID.next().toString();
    await api.applyWrites(did, [{ action: "create", collection, rkey, record }]);
    const rec = await api.getRecord(did, collection, rkey);
    return {
      $type: "com.atproto.repo.strongRef",
      uri: `at://${did}/${collection}/${rkey}`,
      cid: rec?.cid ?? "",
    };
  };

  const deleteRecord = async (collection: string, rkey: string): Promise<void> => {
    await api.applyWrites(did, [{ action: "delete", collection, rkey }]);
  };

  const computeProvider: ComputeProvider | null = (() => {
    if (mode === "digitalocean") {
      if (!token) {
        logInfo({
          event: "bidder_do_incomplete",
          hint: "digitalocean mode requires token",
          mode,
        });
        return null;
      }
      return createDigitalOceanComputeProvider({
        getAgentDid: cpCfg?.getAgentDid ?? (() => did),
        getIssuerUrl: () => baseUrl || "https://droplet-oidc.its1337.com",
        log: (level, msg, fields) =>
          logInfo({ label: LABEL, severity: level, message: msg, ...(fields ?? {}) }),
        parseAtUri,
        digitaloceanBaseUrl: baseUrl || "https://droplet-oidc.its1337.com",
        doToken: token,
        acceptPathVm: cpCfg.acceptPathVm ||
          "/root/secrets/publicdomainrelay.com/market/accept.json",
        createRecord,
        deleteRecord,
      });
    }
    if (mode === "local") {
      const localLog = (level: string, msg: string, fields?: Record<string, unknown>) =>
        logInfo({ label: LABEL, severity: level, message: msg, ...(fields ?? {}) });

      return createLocalComputeProvider({
        log: localLog,
        parseAtUri,
        getAgentDid: () => did,
        getIssuerUrl: () => didWebToHttps(relayProxyRef),
        acceptPathVm: cpCfg?.acceptPathVm,
        containerMode: cpCfg?.containerMode ?? "container",
        vmImage: cpCfg?.vmImage,
        containerImage: cpCfg?.containerImage,
        cacheDir: cpCfg?.cacheDir,
        createRecord,
        deleteRecord,
      });
    }
    return null;
  })();

  const _cpSetupDone = computeProvider?.setup
    ? computeProvider.setup().then(() =>
      logInfo({ event: "bidder_compute_provider_setup_done", did, mode })
    )
    : Promise.resolve();

  async function createRepoRecord(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<{ uri: string; cid: string }> {
    const rkey = TID.next().toString();
    await api.applyWrites(did, [{ action: "create", collection, rkey, record }]);
    const rec = await api.getRecord(did, collection, rkey);
    return { uri: `at://${did}/${collection}/${rkey}`, cid: rec?.cid ?? "" };
  }

  async function createSignedRepoRecord(
    collection: string,
    record: Record<string, unknown>,
    issuer?: string,
  ): Promise<{ uri: string; cid: string }> {
    const rkey = TID.next().toString();
    const att = attestationFor(attestationKp, issuer);
    const entry = await att.sign({ record, repository: did }) as InlineAttestation;
    const signed = { ...record, signatures: [toStorableEntry(entry)] };
    await api.applyWrites(did, [{ action: "create", collection, rkey, record: signed }]);
    const rec = await api.getRecord(did, collection, rkey);
    return { uri: `at://${did}/${collection}/${rkey}`, cid: rec?.cid ?? "" };
  }

  const idResolver = new IdResolver();

  async function callService(
    endpointUrl: string,
    nsid: string,
    lxm: string,
    body: Record<string, unknown>,
  ): Promise<{ status: number; ok: boolean; body: unknown }> {
    let targetBase: string;
    let audDid: string;

    if (endpointUrl.startsWith("http://") || endpointUrl.startsWith("https://")) {
      targetBase = `${endpointUrl.replace(/\/+$/, "")}/xrpc`;
      audDid = `did:web:${new URL(endpointUrl).host}`;
    } else if (endpointUrl.startsWith("did:")) {
      const didPart = endpointUrl.split("#")[0];
      const svcDoc = await idResolver.did.resolve(didPart);
      const svcId = endpointUrl.includes("#") ? endpointUrl.split("#")[1] : "pdr_temp_market";
      const svc = (svcDoc?.service ?? []).find((s: { id: string }) => s.id === `#${svcId}`);
      if (!svc) throw new Error(`service ${svcId} not found in DID doc for ${didPart}`);
      const ep = (svc as { serviceEndpoint: string }).serviceEndpoint.replace(/\/+$/, "");
      targetBase = `${ep}/xrpc`;
      audDid = `did:web:${new URL(ep).host}`;
    } else {
      throw new Error(`unresolvable endpoint: ${endpointUrl}`);
    }

    const token = await signServiceAuth(signer, { aud: audDid, lxm });
    const res = await fetch(`${targetBase}/${nsid}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    let resBody: unknown;
    try {
      resBody = await res.json();
    } catch {
      resBody = await res.text();
    }
    return { status: res.status, ok: res.ok, body: resBody };
  }

  let discoveryTimer: ReturnType<typeof setInterval> | null = null;
  let discoveryRecordRkey: string | null = null;

  async function ensureDiscoveryRecord(): Promise<void> {
    const nowIso = new Date().toISOString();
    const BIDDER_DISCOVERY_NSID = "com.publicdomainrelay.temp.market.bidderDiscovery";

    if (!discoveryRecordRkey) {
      const existing = await api.listRecords(did, BIDDER_DISCOVERY_NSID, { limit: 1 });
      if (existing?.records?.length) {
        discoveryRecordRkey = existing.records[0].uri.split("/").pop()!;
      }
    }

    if (discoveryRecordRkey) {
      const current = await api.getRecord(did, BIDDER_DISCOVERY_NSID, discoveryRecordRkey);
      const prev = (current?.value ?? {}) as Record<string, unknown>;
      const updated = {
        ...prev,
        updatedAt: nowIso,
      };
      await api.applyWrites(did, [
        {
          action: "update",
          collection: BIDDER_DISCOVERY_NSID,
          rkey: discoveryRecordRkey,
          record: updated,
        },
      ]);
    } else {
      const rkey = TID.next().toString();
      const record = {
        $type: BIDDER_DISCOVERY_NSID,
        endpointUrl: relayProxyRef || `${did}#pdr_temp_market`,
        appliesTo: ["com.publicdomainrelay.temp.compute.vm"],
        updatedAt: nowIso,
        createdAt: nowIso,
      };
      await api.applyWrites(did, [
        { action: "create", collection: BIDDER_DISCOVERY_NSID, rkey, record },
      ]);
      discoveryRecordRkey = rkey;
    }
  }

  function startDiscoveryUpdater(): void {
    if (discoveryTimer) return;
    const intervalMs = HEARTBEAT_INTERVAL_MS;
    logInfo({ event: "discovery_updater_start", intervalMs });
    discoveryTimer = setInterval(async () => {
      try {
        await ensureDiscoveryRecord();
      } catch (err) {
        logInfo({ event: "discovery_update_error", err: String(err) });
      }
    }, intervalMs);
  }

  function stopDiscoveryUpdater(): void {
    if (discoveryTimer) {
      clearInterval(discoveryTimer);
      discoveryTimer = null;
    }
  }

  async function registerWithRegistry(): Promise<void> {
    const REGISTER_BIDDER_NSID = "com.publicdomainrelay.temp.market.registerBidder";
    if (REGISTRY_ENDPOINTS.length === 0) {
      logInfo({ event: "registry_disabled", reason: "no REGISTRY_ENDPOINT configured" });
      return;
    }

    const body = {
      bidderDid: did,
      appliesTo: ["com.publicdomainrelay.temp.compute.vm"],
    };

    for (const endpoint of REGISTRY_ENDPOINTS) {
      try {
        const res = await callService(endpoint, REGISTER_BIDDER_NSID, REGISTER_BIDDER_NSID, body);
        if (res.ok) {
          logInfo({ event: "registered_with_registry", endpoint });
          startDiscoveryUpdater();
        } else {
          logInfo({
            event: "register_with_registry_error",
            endpoint,
            status: res.status,
            body: res.body,
          });
        }
      } catch (err) {
        logInfo({ event: "register_with_registry_exception", endpoint, err: String(err) });
      }
    }
  }

  const COMPUTE_VM_NSID = "com.publicdomainrelay.temp.compute.vm";
  const RFP_NSID = "com.publicdomainrelay.temp.market.rfp";
  const BID_NSID = "com.publicdomainrelay.temp.market.bid";
  const RECEIPT_NSID = "com.publicdomainrelay.temp.market.receipt";
  const OFFERING_NSID = "com.publicdomainrelay.temp.market.offering";
  const SUBMIT_RFP_NSID = "com.publicdomainrelay.temp.market.submitRfp";
  const SUBMIT_ACCEPT_NSID = "com.publicdomainrelay.temp.market.submitAccept";
  const SUBMIT_EVENT_NSID = "com.publicdomainrelay.temp.market.submitEvent";
  const SUBMIT_BID_NSID = "com.publicdomainrelay.temp.market.submitBid";
  const EVENT_NSID = "com.publicdomainrelay.temp.market.event";
  const COMPUTE_EVENTS_VM_DELETE_NSID = "com.publicdomainrelay.temp.compute.events.vm.delete";

  const onRfp: SubmitRfpCallback = async ({ rfpUri, rfpCid, rfp, issuerDid, log: cbLog }) => {
    cbLog("info", "bidder received RFP", { rfpUri, rfpCid, issuerDid });

    const nowIso = new Date().toISOString();

    let bidConfigRef: { uri: string; cid: string } | undefined;
    if (computeProvider) {
      const configRef = await computeProvider.createBidConfig(nowIso);
      bidConfigRef = { uri: configRef.uri, cid: configRef.cid };
      cbLog("info", "bidder created bid config", { configUri: configRef.uri });
    }

    const { uri: payloadUri, cid: payloadCid } = await createRepoRecord(
      "com.publicdomainrelay.temp.market.bids.free",
      { $type: "com.publicdomainrelay.temp.market.bids.free", cost: 0, createdAt: nowIso },
    );

    const bidRecord: Record<string, unknown> = {
      $type: BID_NSID,
      rfp: strongRef(rfpUri, rfpCid),
      payload: strongRef(payloadUri, payloadCid),
      submitAccept: `${did}#pdr_temp_market`,
      createdAt: nowIso,
    };
    if (bidConfigRef) {
      bidRecord.bidConfig = strongRef(bidConfigRef.uri, bidConfigRef.cid);
    }
    const { uri: bidUri, cid: bidCid } = await createSignedRepoRecord(
      BID_NSID,
      bidRecord,
      relayProxyRef,
    );

    cbLog("info", "bidder created bid", { bidUri, bidCid, payloadUri });

    const bidRkey = bidUri.split("/").pop()!;
    const signedBid = await api.getRecord(did, BID_NSID, bidRkey);
    const submitBidUrl = rfp.submitBid as string | undefined;
    if (submitBidUrl) {
      try {
        const res = await callService(submitBidUrl, SUBMIT_BID_NSID, SUBMIT_BID_LXM, {
          uri: bidUri,
          cid: bidCid,
          record: signedBid?.value ?? bidRecord,
        });
        cbLog("info", "bidder submitted bid to requester", { status: res.status, ok: res.ok });
      } catch (err) {
        cbLog("error", "bidder failed to submit bid", { error: String(err) });
      }
    }

    return { body: { ok: true, bidUri, bidCid } };
  };

  const onAccept: SubmitAcceptCallback = async (
    { acceptUri, acceptCid, accept, issuerDid, log: cbLog },
  ) => {
    cbLog("info", "bidder received accept", { acceptUri, acceptCid, issuerDid });

    const nowIso = new Date().toISOString();

    const rfpRef = accept.rfp as { uri: string; cid: string } | undefined;
    const bidRef = accept.bid as { uri: string; cid: string } | undefined;

    let providerIdPromise: Promise<string | number | undefined> = Promise.resolve(undefined);
    if (computeProvider && rfpRef) {
      providerIdPromise = (async (): Promise<string | number | undefined> => {
        const resolve = createRecordResolver(idResolver);
        const rfpResolved = await resolve.resolve({ uri: rfpRef.uri, cid: rfpRef.cid });
        const rfpRecord = rfpResolved as Record<string, unknown> | null;
        const vmRef = rfpRecord?.payload as { uri: string; cid: string } | undefined;
        if (!vmRef) return undefined;
        const vmResolved = await resolve.resolve({ uri: vmRef.uri, cid: vmRef.cid });
        const vm = vmResolved as Record<string, unknown> | null;
        if (!vm) return undefined;

        let bidConfigResolved: { uri: string; cid: string; value: unknown } | null = null;
        if (bidRef) {
          try {
            const bidResolved = await resolve.resolve({
              uri: bidRef.uri,
              cid: bidRef.cid,
            }) as Record<string, unknown> | null;
            const cfgRef = bidResolved?.bidConfig as { uri: string; cid: string } | undefined;
            if (cfgRef) {
              const cfgValue = await resolve.resolve({ uri: cfgRef.uri, cid: cfgRef.cid });
              bidConfigResolved = { uri: cfgRef.uri, cid: cfgRef.cid, value: cfgValue };
            }
          } catch (err) {
            cbLog("warn", "bidder failed to resolve bidConfig", { error: String(err) });
          }
        }

        const bundle = {
          $type: "com.publicdomainrelay.temp.market.accept",
          accept: { uri: acceptUri, cid: acceptCid },
          rfp: { uri: rfpRef.uri, cid: rfpRef.cid },
          bid: bidRef ? { uri: bidRef.uri, cid: bidRef.cid } : null,
          bid_config: bidConfigResolved,
          vm: { uri: vmRef.uri, cid: vmRef.cid, value: vm },
        };
        const vmWithBundle = {
          ...vm,
          user_data: computeProvider.injectAcceptBundle(
            (vm.user_data as string) ?? "",
            bundle,
          ),
          _uri: vmRef.uri,
          _cid: vmRef.cid,
        };
        const result = await computeProvider.provision(vmWithBundle as any, issuerDid);
        cbLog("info", "bidder provisioned compute", { providerId: result.providerId });
        return result.providerId;
      })().catch((err) => {
        cbLog("error", "bidder failed to provision", { error: String(err) });
        return undefined;
      });
    }

    const acceptBare: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(accept)) {
      if (k !== "_uri" && k !== "_cid") acceptBare[k] = v;
    }
    const receiptMetadata: Record<string, unknown> = {
      $type: RECEIPT_NSID,
      rfp: rfpRef ? strongRef(rfpRef.uri, rfpRef.cid) : null,
      bid: bidRef ? strongRef(bidRef.uri, bidRef.cid) : null,
      accept: strongRef(acceptUri, acceptCid),
      payload: null,
      submitEvent: `${did}#pdr_temp_compute_event`,
      createdAt: nowIso,
    };
    const bindCid = createAttestationCid(
      acceptBare as RecordMap,
      receiptMetadata as RecordMap,
      issuerDid,
    );
    const receiptRecord = { ...receiptMetadata, cid: bindCid.toString() };
    const { uri: receiptUri, cid: receiptCid } = await createSignedRepoRecord(
      RECEIPT_NSID,
      receiptRecord,
      relayProxyRef,
    );

    const rkey = receiptUri.split("/").pop()!;
    activeContracts.set(refKey({ uri: receiptUri, cid: receiptCid }), {
      providerIdPromise,
      acceptAuthor: issuerDid,
    });

    cbLog("info", "bidder created receipt", {
      receiptUri,
      receiptCid,
      acceptAuthor: issuerDid,
      activeCount: activeContracts.size,
    });

    return {
      body: {
        id: rkey,
        uri: receiptUri,
        cid: receiptCid,
        submitEvent: `${did}#pdr_temp_compute_event`,
      },
    };
  };

  const onVmDelete = async (
    ctx: EventDispatchContext,
  ): Promise<{ status?: number; body?: unknown } | void> => {
    const receiptRef = ctx.event.receipt as { uri: string; cid: string } | undefined;
    if (!receiptRef) {
      ctx.log("warn", "submitEvent: no receipt in event", { uri: ctx.uri });
      return {
        status: 400,
        body: { error: "InvalidRequest", message: "missing receipt in event" },
      };
    }
    const rk = refKey(receiptRef);
    ctx.log("info", "submitEvent vm.delete", { receiptKey: rk, issuerDid: ctx.issuerDid });

    if (!activeContracts.has(rk)) {
      ctx.log("warn", "submitEvent: unknown receipt", { receiptKey: rk });
      return { status: 400, body: { error: "InvalidRequest", message: "unknown receipt" } };
    }

    const contract = activeContracts.get(rk)!;
    if (contract.acceptAuthor !== ctx.issuerDid) {
      ctx.log("warn", "submitEvent: issuerDid mismatch", {
        expected: contract.acceptAuthor,
        got: ctx.issuerDid,
      });
      return { status: 403, body: { error: "Forbidden", message: "not the accept author" } };
    }

    const reason = "vm.delete event received";
    if (computeProvider) {
      const providerId = await contract.providerIdPromise;
      if (providerId !== undefined) {
        try {
          await computeProvider.destroy(providerId);
          ctx.log("info", "submitEvent: compute destroyed", { providerId, reason });
        } catch (err) {
          ctx.log("error", "submitEvent: failed to destroy compute", {
            providerId,
            error: String(err),
          });
        }
      }
      if (computeProvider?.teardown) {
        computeProvider.teardown().then(() =>
          logInfo({ event: "bidder_compute_provider_teardown_done", did, mode })
        );
      }
    }

    activeContracts.delete(rk);
    ctx.log("info", "submitEvent: vm deleted", { receiptKey: rk, remaining: activeContracts.size });
    return { body: { ok: true } };
  };

  const rfpHandler = createSubmitRfpHandler({
    deps: {
      hostname: () =>
        relaySubdomain ? `${relaySubdomain}.${DISPATCHER_HOST}` : DISPATCHER_HOST,
      idResolver,
      resolve: createRecordResolver(idResolver),
      log,
    },
    callbacks: {
      pdr_temp_market: {
        [COMPUTE_VM_NSID]: onRfp,
      },
    },
  });
  app.post(`/xrpc/${SUBMIT_RFP_NSID}`, (c) => rfpHandler(c.req.raw));

  const acceptHandler = createSubmitAcceptHandler({
    deps: {
      hostname: () =>
        relaySubdomain ? `${relaySubdomain}.${DISPATCHER_HOST}` : DISPATCHER_HOST,
      idResolver,
      resolve: createRecordResolver(idResolver),
      log,
    },
    serviceIds: ["pdr_temp_market"],
    onAccept,
  });
  app.post(`/xrpc/${SUBMIT_ACCEPT_NSID}`, (c) => acceptHandler(c.req.raw));

  const eventHandler = createSubmitEventHandler({
    deps: {
      hostname: () =>
        relaySubdomain ? `${relaySubdomain}.${DISPATCHER_HOST}` : DISPATCHER_HOST,
      idResolver,
      resolve: createRecordResolver(idResolver),
      log,
    },
    callbacks: {
      pdr_temp_compute_event: {
        [COMPUTE_EVENTS_VM_DELETE_NSID]: onVmDelete,
      },
    },
  });
  app.post(`/xrpc/${SUBMIT_EVENT_NSID}`, (c) => eventHandler(c.req.raw));

  const dispatcherDid = `did:web:${DISPATCHER_HOST}`;
  const { handleRequest } = createSubscriberFactory({ app });

  async function getServiceAuthToken(lxm: string): Promise<string> {
    return await signServiceAuth(signer, { aud: dispatcherDid, lxm });
  }

  const relayController = await runSubscriber({
    label: LABEL,
    keypair,
    getServiceAuthToken,
    dispatcherHost: DISPATCHER_HOST,
    handleRequest,
    onRegistered: (info) => {
      relaySubdomain = info.subdomain;
      relayProxyRef = info.proxyRef;
      logInfo({
        event: "bidder_relay_registered",
        subdomain: info.subdomain,
        proxyRef: info.proxyRef,
      });
      relayRegistered?.(info);
    },
    onLog: (e) =>
      logInfo({
        event: "bidder_relay",
        severity: e.severity,
        message: e.message,
      }),
  });

  // Mount OIDC issuer routes on the bidder's app (served over XRPC relay).
  // Containers call back through the relay to exchange provisioning tokens
  // for workload-identity OIDC tokens. proxyRef is the public HTTPS URL
  // returned by the relay registration.
  if (mode === "local" && computeProvider) {
    const issuerHttps = didWebToHttps(relayProxyRef);
    const oidcIssuer = createOidcIssuer({
      getIssuerUrl: () => issuerHttps,
      getDroplet: (id) => computeProvider.getDroplet?.(id),
      serviceUrl: issuerHttps,
      log: (level, msg, extra) =>
        logInfo({ label: LABEL, severity: level, message: msg, ...(extra ?? {}) }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route("/", oidcIssuer.app as any);
    logInfo({ event: "bidder_oidc_issuer_mounted", issuerUrl: issuerHttps });
  }

  logInfo({ event: "bidder_relay_connecting", dispatcherHost: DISPATCHER_HOST });

  return bidder;
}

const ALLOWLIST_NSID = "com.publicdomainrelay.temp.auth.allowlist.rbacDid";

async function ensureOperatorAllowlist(
  api: ReturnType<typeof createRepoFactory>["api"],
  operatorDid: string,
  service: string,
): Promise<void> {
  const existing = await api.listRecords(operatorDid, ALLOWLIST_NSID, { limit: 100 });
  for (const rec of existing?.records ?? []) {
    const v = rec.value as Record<string, unknown>;
    const protects = v.protects as Record<string, { service: string; scope?: string }> | undefined;
    for (const p of Object.values(protects ?? {})) {
      if (
        (p.service === service || p.service === "*") &&
        (p.scope === "account.auth" || p.scope === "*" || !p.scope)
      ) {
        console.log(JSON.stringify({ event: "bidder_allowlist_exists", uri: rec.uri }));
        return;
      }
    }
  }
  const rkey = TID.next().toString();
  await api.applyWrites(operatorDid, [
    {
      action: "create",
      collection: ALLOWLIST_NSID,
      rkey,
      record: {
        $type: ALLOWLIST_NSID,
        protects: {
          allowSelf: { service, scope: "account.auth" },
        },
        allowed: {
          allowSelf: [operatorDid],
        },
        createdAt: new Date().toISOString(),
      },
    },
  ]);
  console.log(
    JSON.stringify({
      event: "bidder_allowlist_created",
      uri: `at://${operatorDid}/${ALLOWLIST_NSID}/${rkey}`,
      service,
      operatorDid,
    }),
  );
}

async function ensureOffering(
  api: ReturnType<typeof createRepoFactory>["api"],
  did: string,
): Promise<void> {
  const OFFERING_NSID = "com.publicdomainrelay.temp.market.offering";
  const existing = await api.listRecords(did, OFFERING_NSID, { limit: 1 });
  if (existing?.records?.length) {
    console.log(JSON.stringify({ event: "bidder_offering_exists", uri: existing.records[0].uri }));
    return;
  }
  const rkey = TID.next().toString();
  await api.applyWrites(did, [
    {
      action: "create",
      collection: OFFERING_NSID,
      rkey,
      record: {
        $type: OFFERING_NSID,
        endpointUrl: `${did}#pdr_temp_market`,
        appliesTo: ["com.publicdomainrelay.temp.compute.vm"],
        createdAt: new Date().toISOString(),
      },
    },
  ]);
  console.log(
    JSON.stringify({
      event: "bidder_offering_created",
      uri: `at://${did}/${OFFERING_NSID}/${rkey}`,
    }),
  );
}
