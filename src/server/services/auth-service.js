const accountSession = require("./account-session");
const { normalizeEmail, normalizeSocialProviderOptional } = require("./account-mapper");
const { createHttpError } = require("../http-errors");

function readAdminCredentialsFromRequest(request) {
  const authorization = String(request.headers.authorization || "").trim();
  const bearerToken = authorization.replace(/^Bearer\s+/i, "").trim();
  return {
    adminUsername: String(request.headers["x-admin-username"] || "").trim(),
    adminToken: String(request.headers["x-admin-token"] || bearerToken || "").trim()
  };
}

function readMemberProductCredentialsFromRequest(request) {
  const authorization = String(request.headers.authorization || "").trim();
  const bearerToken = authorization.replace(/^Bearer\s+/i, "").trim();
  return {
    businessNumber: String(request.headers["x-business-number"] || "").trim(),
    memberToken: String(request.headers["x-member-token"] || bearerToken || "").trim()
  };
}

function assertAdminCredentials(value, token, config) {
  const clean = String(value || "").trim();
  if (!clean) throw createHttpError(403, "관리자 아이디가 필요합니다.");
  if (!config.adminPassword) throw createHttpError(503, "관리자 계정이 아직 설정되지 않았습니다.");
  if (clean !== config.adminUsername) throw createHttpError(403, "관리자 계정이 일치하지 않습니다.");
  if (!accountSession.verifyAdminToken(token, config)) throw createHttpError(403, "관리자 로그인이 다시 필요합니다.");
  return clean;
}

function readOptionalAdminContextFromRequest(request, config) {
  const credentials = readAdminCredentialsFromRequest(request);
  if (!credentials.adminUsername && !credentials.adminToken) return { isAdmin: false };
  const adminUsername = assertAdminCredentials(credentials.adminUsername, credentials.adminToken, config);
  return {
    isAdmin: true,
    adminUsername
  };
}

function loginAsConfiguredSocialAdmin(profile, config) {
  if (normalizeSocialProviderOptional(profile?.provider) !== "naver") return null;

  const allowedIdentifiers = parseAdminNaverIdentifiers(config?.adminNaverIdentifiers);
  if (!allowedIdentifiers.length) return null;

  const providerId = String(profile?.providerId || "").trim();
  const email = normalizeEmail(profile?.email);
  const matched = allowedIdentifiers.some((identifier) => (
    identifier === providerId || identifier.toLowerCase() === email
  ));
  if (!matched) return null;
  if (!config?.adminPassword) {
    throw createHttpError(503, "관리자 계정 보안키가 아직 설정되지 않았습니다.");
  }

  return {
    ok: true,
    user: {
      role: "admin",
      adminUsername: config.adminUsername,
      name: String(profile?.name || config.adminDisplayName || "내부관리자").trim(),
      companyName: config.adminDisplayName,
      provider: "네이버 로그인",
      adminToken: accountSession.createAdminToken(config)
    }
  };
}

function parseAdminNaverIdentifiers(value) {
  return [...new Set(
    String(value || "")
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

module.exports = {
  assertAdminCredentials,
  loginAsConfiguredSocialAdmin,
  parseAdminNaverIdentifiers,
  readAdminCredentialsFromRequest,
  readMemberProductCredentialsFromRequest,
  readOptionalAdminContextFromRequest
};
