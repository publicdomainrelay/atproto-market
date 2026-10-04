// Transport selection: which binary and which ProxyCommand each guest
// transport id produces. The choice follows the transport id that ran, never
// the shape of the target string -- a dumbpipe ticket and a relay FQDN are told
// apart by the transport that produced them.
//
// Run: deno test -A test/iroh_transport_test.ts

import { assert, assertEquals } from "@std/assert";
import {
  defaultProxyCommand,
  sshHelperForTransport,
  sshTunnelArgs,
  tunnelWsUrl,
} from "@publicdomainrelay/requester-xrpc";

const TICKET = "2n7kq3xr5vbn4mh6wqk2s7d9fz3jptc5u4ye6a2b7c8d9e0f1g2h3j4k5m";
const FQDN = "my-vm--did-plc-abc.relay.localhost";
const KEY = "/tmp/id_ed25519";

function proxyOf(args: string[]): string {
  const i = args.indexOf("-o");
  const line = args.find((a) => a.startsWith("ProxyCommand="));
  assert(i >= 0 && !!line, `no ProxyCommand in ${JSON.stringify(args)}`);
  return line!.slice("ProxyCommand=".length);
}

Deno.test("iroh transport dials the ticket with dumbpipe", () => {
  assertEquals(proxyOf(sshTunnelArgs(KEY, TICKET)), `dumbpipe connect ${TICKET}`);
  // Even a hostname-shaped target under iroh is dialled as a ticket: the shape
  // of the target never decides which binary runs.
  assertEquals(
    proxyOf(sshTunnelArgs(KEY, "relay.example.com:443", undefined, "iroh")),
    "dumbpipe connect relay.example.com:443",
  );
  assertEquals(defaultProxyCommand(TICKET, "iroh"), `dumbpipe connect ${TICKET}`);
});

Deno.test("tunnel and fedproxy-ssh keep the websocat ProxyCommand", () => {
  for (const transport of ["tunnel", "fedproxy-ssh"]) {
    assertEquals(
      proxyOf(sshTunnelArgs(KEY, FQDN, undefined, transport)),
      `websocat --binary ${tunnelWsUrl(FQDN)}`,
      transport,
    );
    // A ticket-shaped target under a legacy transport still goes through
    // websocat -- the transport that produced it is what counts.
    assertEquals(
      proxyOf(sshTunnelArgs(KEY, TICKET, undefined, transport)),
      `websocat --binary ${tunnelWsUrl(TICKET)}`,
      transport,
    );
  }
});

Deno.test("explicit proxy command override replaces either default", () => {
  const override = "goteleport proxy ssh --ticket x";
  for (const transport of ["iroh", "tunnel", "fedproxy-ssh"]) {
    assertEquals(
      proxyOf(sshTunnelArgs(KEY, TICKET, override, transport)),
      override,
      transport,
    );
  }
  assertEquals(
    sshTunnelArgs(KEY, TICKET, override),
    sshTunnelArgs(KEY, FQDN, override, "fedproxy-ssh"),
    "override makes the target and transport irrelevant to the ProxyCommand",
  );
});

Deno.test("helper binary follows the transport id", () => {
  assertEquals(sshHelperForTransport("iroh"), "dumbpipe");
  assertEquals(sshHelperForTransport("tunnel"), "websocat");
  assertEquals(sshHelperForTransport("fedproxy-ssh"), "websocat");
});

Deno.test("ssh hardening is unchanged for every transport", () => {
  for (const transport of ["iroh", "tunnel", "fedproxy-ssh"]) {
    const args = sshTunnelArgs(KEY, TICKET, undefined, transport);
    assert(args.includes(`IdentityFile=${KEY}`));
    assert(args.includes("IdentitiesOnly=yes"));
    assert(args.includes("StrictHostKeyChecking=no"));
    assert(args.includes("UserKnownHostsFile=/dev/null"));
    assert(args.includes("LogLevel=ERROR"));
  }
});

Deno.test("tunnelWsUrl maps an FQDN to the relay tunnel websocket", () => {
  assertEquals(
    tunnelWsUrl("sub.fedproxy.com"),
    "wss://sub.fedproxy.com/xrpc/com.fedproxy.temp.xrpc.tunnel",
  );
  assertEquals(
    tunnelWsUrl("sub.localhost:5555"),
    "ws://sub.localhost:5555/xrpc/com.fedproxy.temp.xrpc.tunnel",
  );
});
