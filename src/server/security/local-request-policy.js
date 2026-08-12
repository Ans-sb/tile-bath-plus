const { hasProxyHeaders } = require("./client-address-policy");

function isLoopbackAddress(value) {
  const address = String(value || "").trim().toLowerCase();
  return address === "127.0.0.1"
    || address === "::1"
    || address === "::ffff:127.0.0.1";
}

function isProductionEnvironment({
  nodeEnvironment = process.env.NODE_ENV,
  railwayProjectId = process.env.RAILWAY_PROJECT_ID,
  railwayEnvironmentId = process.env.RAILWAY_ENVIRONMENT_ID,
  railwayEnvironmentName = process.env.RAILWAY_ENVIRONMENT_NAME
} = {}) {
  return String(nodeEnvironment || "").trim().toLowerCase() === "production"
    || Boolean(String(
      railwayProjectId || railwayEnvironmentId || railwayEnvironmentName || ""
    ).trim());
}

function isLocalRequest(request, options = {}) {
  if (isProductionEnvironment(options)) return false;
  if (hasProxyHeaders(request)) return false;
  return isLoopbackAddress(request?.socket?.remoteAddress);
}

module.exports = {
  isProductionEnvironment,
  isLocalRequest,
  isLoopbackAddress
};
