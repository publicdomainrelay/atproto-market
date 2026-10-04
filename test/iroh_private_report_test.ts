// The private ticket path under the default iroh transport.
//
// (a) The requester's POST /v1/on-network accepts a ticket only from the
//     contract whose bearer token matches and whose posted accept ref equals
//     that contract's current accept ref; a successful post settles the
//     contract's SSH wait with the address. Wrong token (401), missing token
//     (401) and a mismatched accept ref (409) leave the wait unsettled.
// (b) The bidder never publishes a ticket: vm.onNetwork's address carries the
//     provider's provisioned address even when the provider exposes a
//     ticket-shaped getNodeId hook.
//
// Run: deno test -A test/iroh_private_report_test.ts

import { assert, assertEquals } from "@std/assert";
import { Hono } from "@hono/hono";
import {
  registerOnNetworkReport,
  unregisterOnNetworkReport,
} from "@publicdomainrelay/requester-xrpc";
import { createVmBidderCallbacks } from "@publicdomainrelay/market-bidder-compute";
import type { VmBidderDeps } from "@publicdomainrelay/market-bidder-compute";

const TICKET = "2n7kq3xr5vbn4mh6wqk2s7d9fz3jptc5u4ye6a2b7c8d9e0f1g2h3j4k5m";
const ACCEPT_URI = "at://did:plc:requester/com.publicdomainrelay.temp.market.accept/a1";
const ACCEPT_CID = "bafyreiaccept";

function reportApp(token: string, acceptUri: string, acceptCid: string) {
  const app = new Hono();
  const settled: string[] = [];
  const { promise: wait, resolve: resolveWait } = Promise.withResolvers<string>();
  registerOnNetworkReport(app, token, {
    accept: () => ({ uri: acceptUri, cid: acceptCid }),
    onTicket: (ticket) => {
      settled.push(ticket);
      resolveWait(ticket);
    },
  });
  return { app, settled, wait };
}

async function post(app: Hono, body: unknown, token?: string): Promise<Response> {
  return await app.fetch(new Request("http://requester.local/v1/on-network", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }));
}

Deno.test("report endpoint settles the SSH wait with the posted ticket", async () => {
  const { app, settled, wait } = reportApp("tok-contract", ACCEPT_URI, ACCEPT_CID);
  const res = await post(app, {
    acceptUri: ACCEPT_URI,
    acceptCid: ACCEPT_CID,
    address: TICKET,
  }, "tok-contract");
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true });
  assertEquals(await wait, TICKET, "the wait settles with the reported ticket");
  assertEquals(settled, [TICKET]);
  unregisterOnNetworkReport(app, "tok-contract");
});

Deno.test("missing or wrong token answers 401 and never settles the wait", async () => {
  const { app, settled, wait } = reportApp("tok-contract", ACCEPT_URI, ACCEPT_CID);
  const body = { acceptUri: ACCEPT_URI, acceptCid: ACCEPT_CID, address: TICKET };

  assertEquals((await post(app, body)).status, 401, "missing token");
  assertEquals((await post(app, body, "tok-other")).status, 401, "wrong token");
  assertEquals(settled, [], "no ticket recorded");

  // The wait is still open: a later, correctly authenticated report settles it.
  const ok = await post(app, body, "tok-contract");
  assertEquals(ok.status, 200);
  assertEquals(await wait, TICKET);
});

Deno.test("mismatched accept ref answers 409 and never settles the wait", async () => {
  const { app, settled, wait } = reportApp("tok-contract", ACCEPT_URI, ACCEPT_CID);
  const res = await post(app, {
    acceptUri: ACCEPT_URI,
    acceptCid: "bafyreistale",
    address: TICKET,
  }, "tok-contract");
  assertEquals(res.status, 409);
  assertEquals(settled, [], "a stale accept ref cannot resolve the wait");

  const ok = await post(app, {
    acceptUri: ACCEPT_URI,
    acceptCid: ACCEPT_CID,
    address: TICKET,
  }, "tok-contract");
  assertEquals(ok.status, 200);
  assertEquals(await wait, TICKET);
});

Deno.test("an invalidated token stops accepting reports", async () => {
  const { app } = reportApp("tok-contract", ACCEPT_URI, ACCEPT_CID);
  unregisterOnNetworkReport(app, "tok-contract");
  const res = await post(app, {
    acceptUri: ACCEPT_URI,
    acceptCid: ACCEPT_CID,
    address: TICKET,
  }, "tok-contract");
  assertEquals(res.status, 401, "contract ended, token invalidated");
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
