function isLoopbackAddress(value) {
  const address = String(value || "").trim().toLowerCase();
  return address === "127.0.0.1"
    || address === "::1"
    || address === "::ffff:127.0.0.1";
}

function isLocalRequest(request) {
  return isLoopbackAddress(request?.socket?.remoteAddress);
}

module.exports = {
  isLocalRequest,
  isLoopbackAddress
};
