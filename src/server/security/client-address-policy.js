const net = require("net");

function readBooleanSetting(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function normalizeIpAddress(value) {
  let address = String(value || "").trim().replace(/^"|"$/g, "");
  if (!address) return "";

  const bracketedIpv6 = address.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketedIpv6) address = bracketedIpv6[1];

  const ipv4WithPort = address.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) address = ipv4WithPort[1];

  if (address.toLowerCase().startsWith("::ffff:")) {
    const mappedAddress = address.slice(7);
    if (net.isIP(mappedAddress) === 4) address = mappedAddress;
  }

  return net.isIP(address) ? address.toLowerCase() : "";
}

function hasProxyHeaders(request) {
  return Boolean(
    request?.headers?.["x-forwarded-for"]
    || request?.headers?.["x-real-ip"]
    || request?.headers?.forwarded
  );
}

function shouldTrustProxy({
  trustProxy = process.env.TRUST_PROXY,
  railwayEnvironmentId = process.env.RAILWAY_ENVIRONMENT_ID,
  railwayEnvironmentName = process.env.RAILWAY_ENVIRONMENT_NAME,
  railwayProjectId = process.env.RAILWAY_PROJECT_ID
} = {}) {
  const explicitSetting = readBooleanSetting(trustProxy);
  if (explicitSetting !== null) return explicitSetting;

  // Railway ingress is the known production proxy for this service. Private
  // socket addresses alone are not sufficient proof because a directly
  // reachable private-network client can forge forwarding headers.
  return Boolean(String(
    railwayProjectId || railwayEnvironmentId || railwayEnvironmentName || ""
  ).trim());
}

function readForwardedClientAddress(request) {
  // Railway documents X-Real-IP as the original client address. Prefer that
  // edge-controlled value over a possibly caller-supplied XFF chain.
  const realIpAddress = normalizeIpAddress(request?.headers?.["x-real-ip"]);
  if (realIpAddress) return realIpAddress;

  const forwardedAddresses = String(request?.headers?.["x-forwarded-for"] || "")
    .split(",")
    .map(normalizeIpAddress)
    .filter(Boolean);

  // Trust one ingress hop. A caller can prepend a forged address, while the
  // address nearest the trusted proxy remains the right-most entry.
  return forwardedAddresses.at(-1) || "";
}

function resolveClientAddress(request, options = {}) {
  const rawSocketAddress = String(request?.socket?.remoteAddress || "").trim();
  const socketAddress = normalizeIpAddress(rawSocketAddress) || rawSocketAddress || "unknown";
  if (!shouldTrustProxy(options)) return socketAddress;
  return readForwardedClientAddress(request) || socketAddress;
}

module.exports = {
  hasProxyHeaders,
  normalizeIpAddress,
  readForwardedClientAddress,
  resolveClientAddress,
  shouldTrustProxy
};
