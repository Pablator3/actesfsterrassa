import { EnvHttpProxyAgent, fetch as undiciFetch } from "undici";

const FCF_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ca-ES,ca;q=0.9,es;q=0.8,en;q=0.7",
  Referer: "https://www.fcf.cat/",
  Origin: "https://www.fcf.cat",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
};

let proxyAgent;

function getProxyAgent() {
  if (proxyAgent === undefined) {
    proxyAgent = process.env.HTTPS_PROXY || process.env.https_proxy
      ? new EnvHttpProxyAgent()
      : null;
  }
  return proxyAgent;
}

export function fcfFetch(url, options = {}) {
  const agent = getProxyAgent();
  const request = { ...options, headers: FCF_HEADERS };
  return agent
    ? undiciFetch(url, { ...request, dispatcher: agent })
    : fetch(url, request);
}

export function jsonError(message, status) {
  return Response.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}