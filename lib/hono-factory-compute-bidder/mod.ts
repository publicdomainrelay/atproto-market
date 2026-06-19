// Slim factory: only route wiring + state.
// No I/O, no env reads, no keypair/PLC/subscriber/compute-provider construction.
// CLI injects all dependencies pre-constructed.

import { TID } from "@atproto/common";
import type { IdResolver } from "@atproto/identity";
import { createAttestationCid, type RecordMap } from "@atiproto/atproto-attestation";
import type { RepoApi } from "@publicdomainrelay/atproto-repo-abc";
import { signServiceAuth } from "@publicdomainrelay/atproto-repo-deno";
import {
  attestationFor,
  toStorableEntry,
  createRecordResolver,
  createSubmitRfpHandler,
  createSubmitAcceptHandler,
  createSubmitEventHandler,
  type AttestationKeypair,
  type InlineAttestation,
  type SubmitRfpCallback,
  type SubmitAcceptCallback,
  type EventDispatchContext,
} from "@publicdomainrelay/market-atproto";
import { strongRef, SUBMIT_BID_LXM } from "@publicdomainrelay/market-common";
import type { ComputeProvider } from "@publicdomainrelay/compute-provider-abc";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveContract {
  providerIdPromise?: Promise<string | number | undefined>;
  acceptAuthor: string;
}

export interface BidderRoutesDeps {
  app: {
    post: (path: string, handler: (c: { req: { raw: Request } }) => Response | Promise<Response>) => void;
  };
  repoApi: RepoApi;
  signer: {
    did(): string;
    sign(bytes: Uint8Array): Promise<Uint8Array>;
  };
  attestationKp: AttestationKeypair;
  computeProvider: ComputeProvider | null;
  idResolver: IdResolver;
  /** Mutable relay info — updated by CLI after WebSocket registers. */
  relay: { proxyRef: string; subdomain: string };
  did: string;
  dispatcherHost: string;
  mode?: string;
  log: (severity: string, msg: string, extra?: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function refKey(ref: { uri: string; cid: string }): string {
  return `${ref.uri}#${ref.cid}`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createBidderRoutes(deps: BidderRoutesDeps): { stop: () => void } {
  const {
    app, repoApi: api, signer, attestationKp,
    computeProvider, idResolver, relay, did, dispatcherHost,
    mode, log,
  } = deps;

  const activeContracts = new Map<string, ActiveContract>();

  // Record helpers ---------------------------------------------------------

  async function createRecord(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<{ $type: string; uri: string; cid: string }> {
    const rkey = TID.next().toString();
    await api.applyWrites(did, [{ action: "create", collection, rkey, record }]);
    const rec = await api.getRecord(did, collection, rkey);
    return {
      $type: "com.atproto.repo.strongRef",
      uri: `at://${did}/${collection}/${rkey}`,
      cid: rec?.cid ?? "",
    };
  }

  async function deleteRecord(collection: string, rkey: string): Promise<void> {
    await api.applyWrites(did, [{ action: "delete", collection, rkey }]);
  }

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
    const entry = await att.sign({ record: record as RecordMap, repository: did }) as InlineAttestation;
    const signed = { ...record, signatures: [toStorableEntry(entry)] };
    await api.applyWrites(did, [{ action: "create", collection, rkey, record: signed }]);
    const rec = await api.getRecord(did, collection, rkey);
    return { uri: `at://${did}/${collection}/${rkey}`, cid: rec?.cid ?? "" };
  }

  // Service caller --------------------------------------------------------

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
      const svc = svcDoc?.service?.find?.((s: { id: string }) => s.id === `#${svcId}`);
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

  // NSID constants --------------------------------------------------------

  const COMPUTE_VM_NSID = "com.publicdomainrelay.temp.compute.vm";
  const SUBMIT_RFP_NSID = "com.publicdomainrelay.temp.market.submitRfp";
  const SUBMIT_ACCEPT_NSID = "com.publicdomainrelay.temp.market.submitAccept";
  const SUBMIT_EVENT_NSID = "com.publicdomainrelay.temp.market.submitEvent";
  const SUBMIT_BID_NSID = "com.publicdomainrelay.temp.market.submitBid";
  const BID_NSID = "com.publicdomainrelay.temp.market.bid";
  const RECEIPT_NSID = "com.publicdomainrelay.temp.market.receipt";
  const COMPUTE_EVENTS_VM_DELETE_NSID = "com.publicdomainrelay.temp.compute.events.vm.delete";

  // Route handlers --------------------------------------------------------

  const onRfp: SubmitRfpCallback = async ({
    rfpUri, rfpCid, rfp, issuerDid, log: cbLog,
  }) => {
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
      relay.proxyRef,
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

  const onAccept: SubmitAcceptCallback = async ({
    acceptUri, acceptCid, accept, issuerDid, resolve, log: cbLog,
  }) => {
    cbLog("info", "bidder received accept", { acceptUri, acceptCid, issuerDid });

    const nowIso = new Date().toISOString();

    const rfpRef = accept.rfp as { uri: string; cid: string } | undefined;
    const bidRef = accept.bid as { uri: string; cid: string } | undefined;

    let providerIdPromise: Promise<string | number | undefined> = Promise.resolve(undefined);
    if (computeProvider && rfpRef) {
      providerIdPromise = (async (): Promise<string | number | undefined> => {
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
              uri: bidRef.uri, cid: bidRef.cid,
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
      relay.proxyRef,
    );

    const rkey = receiptUri.split("/").pop()!;
    activeContracts.set(refKey({ uri: receiptUri, cid: receiptCid }), {
      providerIdPromise,
      acceptAuthor: issuerDid,
    });

    cbLog("info", "bidder created receipt", {
      receiptUri, receiptCid, acceptAuthor: issuerDid, activeCount: activeContracts.size,
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
      return {
        status: 400,
        body: { error: "InvalidRequest", message: "unknown receipt" },
      };
    }

    const contract = activeContracts.get(rk)!;
    if (contract.acceptAuthor !== ctx.issuerDid) {
      ctx.log("warn", "submitEvent: issuerDid mismatch", {
        expected: contract.acceptAuthor, got: ctx.issuerDid,
      });
      return {
        status: 403,
        body: { error: "Forbidden", message: "not the accept author" },
      };
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
            providerId, error: String(err),
          });
        }
      }
      if (computeProvider?.teardown) {
        computeProvider.teardown().then(() =>
          log("info", "bidder_compute_provider_teardown_done", { did, mode }),
        );
      }
    }

    activeContracts.delete(rk);
    ctx.log("info", "submitEvent: vm deleted", {
      receiptKey: rk, remaining: activeContracts.size,
    });

    return { body: { ok: true } };
  };

  // Mount routes ----------------------------------------------------------

  const recordResolver = createRecordResolver(idResolver);
  const hostname = (): string =>
    relay.subdomain ? `${relay.subdomain}.${dispatcherHost}` : dispatcherHost;

  const rfpHandler = createSubmitRfpHandler({
    deps: { hostname, idResolver, resolve: recordResolver, log },
    callbacks: {
      pdr_temp_market: { [COMPUTE_VM_NSID]: onRfp },
    },
  });
  app.post(`/xrpc/${SUBMIT_RFP_NSID}`, (c) => rfpHandler(c.req.raw));

  const acceptHandler = createSubmitAcceptHandler({
    deps: { hostname, idResolver, resolve: recordResolver, log },
    serviceIds: ["pdr_temp_market"],
    onAccept,
  });
  app.post(`/xrpc/${SUBMIT_ACCEPT_NSID}`, (c) => acceptHandler(c.req.raw));

  const eventHandler = createSubmitEventHandler({
    deps: { hostname, idResolver, resolve: recordResolver, log },
    callbacks: {
      pdr_temp_compute_event: { [COMPUTE_EVENTS_VM_DELETE_NSID]: onVmDelete },
    },
  });
  app.post(`/xrpc/${SUBMIT_EVENT_NSID}`, (c) => eventHandler(c.req.raw));

  return { stop: () => activeContracts.clear() };
}
