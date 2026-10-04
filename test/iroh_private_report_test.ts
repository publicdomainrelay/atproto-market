// The private ticket path under the default iroh transport.
//
// (a) The requester's repo app owns POST /v1/on-network. createRequesterPDS
//     mounts it while it builds the PDS, and only then does
//     serve.app.route("/", repoApp) copy that app's routes into the app the
//     ingress actually serves; Hono throws on an app.post after a route has
//     been copied, so the route cannot be added later, and this test mounts it
//     the same way and registers the contract only after the parent has
//     already served. The handler accepts a ticket only when the posted accept
//     ref equals a live contract's current ref and that contract has not
//     reported yet; a ref that matches no live contract and a second report
//     after the wait settled each answer 409. No credential is carried: the
//     composed user_data is published in the compute.vm record.
// (b) The bidder never publishes a ticket: vm.onNetwork's address carries the
//     provider's provisioned address even when the provider exposes a
//     ticket-shaped getNodeId hook.
//
// Run: deno test -A test/iroh_private_report_test.ts

import { assert, assertEquals } from "@std/assert";
import { Hono } from "@hono/hono";
import {
  mountOnNetworkReportHandler,
  registerOnNetworkReport,
  unregisterOnNetworkReport,
} from "@publicdomainrelay/requester-xrpc";
import { createVmBidderCallbacks } from "@publicdomainrelay/market-bidder-compute";
import type { VmBidderDeps } from "@publicdomainrelay/market-bidder-compute";

const TICKET = "2n7kq3xr5vbn4mh6wqk2s7d9fz3jptc5u4ye6a2b7c8d9e0f1g2h3j4k5m";
const ACCEPT_URI = "at://did:plc:requester/com.publicdomainrelay.temp.market.accept/a1";
const ACCEPT_CID = "bafyreiaccept";

// Mirrors createRequesterPDS exactly: the report route is mounted on the repo
// app while the PDS is built, and only then is that repo app mounted under the
// parent (the serve app) with route("/", repoApp), which copies its routes into
// the app the ingress serves. No contract is registered yet -- the real
// sequence registers entries from runComputeContract long after the serve app
// has answered its first request.
function reportHarness() {
  const repoApp = new Hono();
  repoApp.get("/xrpc/com.atproto.repo.describeRepo", (c) => c.json({ did: "did:plc:requester" }));
  mountOnNetworkReportHandler(repoApp);
  const serveApp = new Hono();
  serveApp.route("/", repoApp);

  const settled: string[] = [];
  const { promise: wait, resolve: resolveWait } = Promise.withResolvers<string>();
  const entry = {
    accept: () => ({ uri: ACCEPT_URI, cid: ACCEPT_CID }),
    onTicket: (ticket: string) => {
      settled.push(ticket);
      resolveWait(ticket);
    },
  };
  return { repoApp, serveApp, entry, settled, wait };
}

async function post(app: Hono, body: unknown): Promise<Response> {
  return await app.fetch(new Request("http://requester.local/v1/on-network", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
}

Deno.test("report route mounted on the repo app settles the SSH wait", async () => {
  const { repoApp, serveApp, entry, settled, wait } = reportHarness();
  // The parent serves its first request before any contract is registered, as
  // the real serve app has by the time runComputeContract runs. A route that
  // needed to be added to an already-served app could not reach this point.
  const repo = await serveApp.fetch(
    new Request("http://requester.local/xrpc/com.atproto.repo.describeRepo"),
  );
  assertEquals(repo.status, 200, "the repo app's routes stay reachable");

  registerOnNetworkReport(repoApp, entry);
  const res = await post(serveApp, {
    acceptUri: ACCEPT_URI,
    acceptCid: ACCEPT_CID,
    address: TICKET,
  });
  assertEquals(res.status, 200, "POST reaches the handler through the ingress app");
  assertEquals(await res.json(), { ok: true });
  assertEquals(await wait, TICKET, "the wait settles with the reported ticket");
  assertEquals(settled, [TICKET]);
  unregisterOnNetworkReport(repoApp, entry);
});

Deno.test("a mismatched ref and a second report both answer 409", async () => {
  const { repoApp, serveApp, entry, settled, wait } = reportHarness();
  registerOnNetworkReport(repoApp, entry);
  const body = { acceptUri: ACCEPT_URI, acceptCid: ACCEPT_CID, address: TICKET };

  const stale = await post(serveApp, { ...body, acceptCid: "bafyreistale" });
  assertEquals(stale.status, 409, "a stale accept ref cannot resolve the wait");
  assertEquals(settled, [], "nothing settled yet");

  const ok = await post(serveApp, body);
  assertEquals(ok.status, 200);
  assertEquals(await wait, TICKET, "the wait settles once");

  const again = await post(serveApp, { ...body, address: "2notherticket" });
  assertEquals(again.status, 409, "exactly one report per contract");
  assertEquals(settled, [TICKET], "a later report never replaces the settled ticket");
  unregisterOnNetworkReport(repoApp, entry);
});

Deno.test("a report for an ended contract answers 409 and settles nothing", async () => {
  const { repoApp, serveApp, entry, settled } = reportHarness();
  registerOnNetworkReport(repoApp, entry);
  // The contract ends: its entry is dropped, so the posted ref matches no live
  // contract even though the route itself stays mounted.
  unregisterOnNetworkReport(repoApp, entry);
  const res = await post(serveApp, {
    acceptUri: ACCEPT_URI,
    acceptCid: ACCEPT_CID,
    address: TICKET,
  });
  assertEquals(res.status, 409, "no live contract matches the ref");
  assertEquals(settled, [], "the settled ticket is unchanged");
});

// -- (b) the bidder must not publish the ticket -----------------------------

const ON_NETWORK_NSID = "com.publicdomainrelay.temp.compute.events.vm.onNetwork";
const RFP_NSID = "com.publicdomainrelay.temp.market.rfp";
const BID_NSID = "com.publicdomainrelay.temp.market.bid";
const VM_NSID = "com.publicdomainrelay.temp.compute.vm";
const CFG_NSID = "com.publicdomainrelay.temp.market.bidConfig";

Deno.test("vm.onNetwork never carries the guest's iroh ticket", async () => {
  const written: Array<{ collection: string; record: Record<string, unknown> }> = [];
  const rfpUri = "at://did:plc:requester/com.publicdomainrelay.temp.market.rfp/r1";
  const vmUri = "at://did:plc:requester/com.publicdomainrelay.temp.compute.vm/v1";
  const bidUri = "at://did:plc:bidder/com.publicdomainrelay.temp.market.bid/b1";
  const cfgUri = "at://did:plc:bidder/com.publicdomainrelay.temp.market.bidConfig/c1";

  const records: Record<string, unknown> = {
    [rfpUri]: { $type: RFP_NSID, payload: { uri: vmUri, cid: "cid-vm" } },
    [vmUri]: { $type: VM_NSID, role: "vm-test", user_data: "#cloud-config\n" },
    [bidUri]: { $type: BID_NSID, bidConfig: { uri: cfgUri, cid: "cid-cfg" } },
    [cfgUri]: { $type: CFG_NSID },
  };

  const deps = {
    did: "did:plc:bidder",
    attestationKp: {} as VmBidderDeps["attestationKp"],
    signer: { did: () => "did:plc:bidder", sign: async () => new Uint8Array() },
    idResolver: {} as VmBidderDeps["idResolver"],
    relay: { ingressRef: "did:web:bidder.local", ingressUrl: "", ingressHost: "bidder.local" },
    log: () => {},
    activeContracts: new Map(),
    createRepoRecord: async (collection: string, record: Record<string, unknown>) => {
      written.push({ collection, record });
      return { uri: `at://did:plc:bidder/${collection}/x1`, cid: "cid-created" };
    },
    createSignedRepoRecord: async (
      collection: string,
      record: Record<string, unknown>,
    ) => {
      written.push({ collection, record });
      return {
        uri: `at://did:plc:bidder/${collection}/x2`,
        cid: "cid-signed",
        record,
      };
    },
    callService: async () => ({ status: 200, ok: true, body: {} }),
    resolve: {} as VmBidderDeps["resolve"],
    evaluator: { evaluatePolicies: async () => ({ allow: true, violations: [] }) },
    computeProvider: {
      injectAcceptBundle: (ud: string) => ud,
      provision: async () => ({ providerId: "p-1", metadata: { ip: "10.0.0.7" } }),
      // Optional hook on an unpinned provider branch: the pinned contract has
      // no getNodeId, and the bidder must not ask for a ticket anyway.
      getNodeId: async () => TICKET,
    } as unknown as VmBidderDeps["computeProvider"],
  } as unknown as VmBidderDeps;

  const callbacks = createVmBidderCallbacks(deps);
  await callbacks.accept({
    acceptUri: ACCEPT_URI,
    acceptCid: ACCEPT_CID,
    accept: {
      $type: "com.publicdomainrelay.temp.market.accept",
      rfp: { uri: rfpUri, cid: "cid-rfp" },
      bid: { uri: bidUri, cid: "cid-bid" },
    },
    issuerDid: "did:plc:requester",
    resolve: {
      resolve: async (ref: { uri: string }) => records[ref.uri] ?? null,
    },
    log: () => {},
    req: new Request("http://bidder.local/xrpc/submitAccept"),
  } as never);

  // The vm.onNetwork emission runs off providerIdPromise; wait for it.
  let onNetwork: Record<string, unknown> | undefined;
  for (let i = 0; i < 100 && !onNetwork; i++) {
    onNetwork = written.find((w) => w.collection === ON_NETWORK_NSID)?.record;
    if (!onNetwork) await new Promise((r) => setTimeout(r, 20));
  }
  assert(onNetwork, "vm.onNetwork record was written");
  assertEquals(onNetwork!.address, "10.0.0.7", "carries the provisioned address");
  assert(
    !JSON.stringify(onNetwork).includes(TICKET),
    "the ticket must never reach a world-readable record",
  );
  assert(
    !written.some((w) => JSON.stringify(w.record).includes(TICKET)),
    "no record of any collection carries the ticket",
  );
});
