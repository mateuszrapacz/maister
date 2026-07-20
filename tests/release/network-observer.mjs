import fs from "node:fs";

function pathClass(url) {
  if (url.hostname === "registry.npmjs.org") return "npm-runtime-dependency";
  if (/^\/repos\/mateuszrapacz\/maister\/releases\/tags\/v\d+\.\d+\.\d+$/u.test(url.pathname)) return "release-metadata";
  if (/^\/repos\/mateuszrapacz\/maister\/releases\/assets\/[1-9]\d*$/u.test(url.pathname)) return "release-asset";
  if (/^\/repos\/mateuszrapacz\/maister\/git\/ref\/tags\/v\d+\.\d+\.\d+$/u.test(url.pathname)) return "tag-ref";
  if (/^\/repos\/mateuszrapacz\/maister\/git\/tags\/[0-9a-f]{40}$/u.test(url.pathname)) return "annotated-tag";
  return "other";
}

export function observeNetworkRequest(input, init = {}, output = process.env.MAISTER_NETWORK_OBSERVATIONS) {
  if (!output) return;
  const url = new URL(input instanceof Request ? input.url : input);
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  for (const [name, value] of new Headers(init.headers).entries()) headers.set(name, value);
  fs.appendFileSync(output, `${JSON.stringify({
    schema_version: 1,
    observed_at: new Date().toISOString(),
    host: url.hostname,
    path_class: pathClass(url),
    method: String(init.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase(),
    authorization: headers.has("authorization"),
  })}\n`, { mode: 0o600 });
}

if (process.env.MAISTER_NETWORK_OBSERVATIONS && typeof globalThis.fetch === "function") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function observedFetch(input, init = {}) {
    observeNetworkRequest(input, init);
    return originalFetch(input, init);
  };
}
