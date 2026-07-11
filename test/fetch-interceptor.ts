// Shared fetch interception for local integration tests.
// Handles plc.directory → local PLC redirect and https://*.localhost →
// http://*:dispPort downgrade. The *.localhost DNS resolution is handled
// transparently by the platform (macOS/Linux system resolver) or by
// container-backend-docker (Windows raw HTTP interceptor).

export function installFetchInterceptor(opts: {
  realFetch: typeof globalThis.fetch;
  plcDirectoryUrl: string;
  dispPort: number;
  /** Additional host suffix to intercept like localhost (e.g. container gateway IP). */
  additionalHost?: string;
}): () => void {
  const { realFetch, plcDirectoryUrl, dispPort, additionalHost } = opts;

  function isLocalHost(host: string): boolean {
    if (host.endsWith(".localhost") || host === "localhost" || host.includes(".localhost:")) return true;
    if (additionalHost && (host.endsWith("." + additionalHost) || host === additionalHost || host.includes("." + additionalHost + ":"))) return true;
    return false;
  }

  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    let url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://plc.directory/")) {
      url = plcDirectoryUrl + url.slice("https://plc.directory".length);
      return realFetch(new Request(url, input instanceof Request ? input : init));
    }
    const m = url.match(/^https:\/\/([^/]+)(\/.*)?$/);
    if (m && isLocalHost(m[1])) {
      let host = m[1];
      if (!host.includes(":")) host = `${host}:${dispPort}`;
      url = `http://${host}${m[2] ?? ""}`;
      return realFetch(new Request(url, input instanceof Request ? input : init));
    }
    return realFetch(input as string | URL | Request, init);
  }) as typeof fetch;

  return () => { globalThis.fetch = realFetch; };
}
