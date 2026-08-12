const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "worker-src 'self' blob: https://cdn.jsdelivr.net",
  "frame-src 'self'",
  "media-src 'self' blob:"
].join("; ");

function applySecurityHeaders(response, { isProduction = false, requestId = "" } = {}) {
  response.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  if (isProduction) {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (requestId) response.setHeader("X-Request-Id", requestId);
}

module.exports = {
  CONTENT_SECURITY_POLICY,
  applySecurityHeaders
};
