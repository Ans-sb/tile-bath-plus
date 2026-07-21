const crypto = require("crypto");
const { normalizeApprovalStatus } = require("./account-mapper");

const DEFAULT_ADMIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 8;
const DEFAULT_MEMBER_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getPositiveDurationMs(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function signTokenPayload(prefix, payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${prefix}.${encoded}`).digest("base64url");
  return `${prefix}.${encoded}.${signature}`;
}

function verifySignedToken(token, prefix, secret) {
  const [tokenPrefix, encoded, signature] = String(token || "").split(".");
  if (tokenPrefix !== prefix || !encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(`${prefix}.${encoded}`).digest("base64url");
  if (!safeEqualText(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    const expiresAt = Number(payload.expiresAt || 0);
    if (!expiresAt || expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function createAdminToken({ adminUsername, adminPassword, adminDisplayName }) {
  const now = Date.now();
  const ttlMs = getPositiveDurationMs(process.env.ADMIN_TOKEN_TTL_MS, DEFAULT_ADMIN_TOKEN_TTL_MS);
  return signTokenPayload("admin", {
    adminUsername: String(adminUsername || "").trim(),
    issuedAt: now,
    expiresAt: now + ttlMs
  }, createAdminTokenSecret({ adminUsername, adminPassword, adminDisplayName }));
}

function verifyAdminToken(token, config) {
  const payload = verifySignedToken(token, "admin", createAdminTokenSecret(config));
  if (!payload) return null;
  if (String(payload.adminUsername || "").trim() !== String(config?.adminUsername || "").trim()) return null;
  return payload;
}

function createAdminTokenSecret({ adminUsername, adminPassword, adminDisplayName }) {
  return crypto
    .createHash("sha256")
    .update(`${adminUsername}\n${adminPassword}\n${adminDisplayName}`)
    .digest("hex");
}

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createMemberToken(record, memberTokenSecret) {
  const now = Date.now();
  const ttlMs = getPositiveDurationMs(process.env.MEMBER_TOKEN_TTL_MS, DEFAULT_MEMBER_TOKEN_TTL_MS);
  const payload = {
    businessNumber: String(record?.businessNumber || "").trim(),
    approvalStatus: normalizeApprovalStatus(record?.approvalStatus),
    issuedAt: now,
    expiresAt: now + ttlMs
  };
  return signTokenPayload("member", payload, memberTokenSecret);
}

function verifyMemberToken(token, memberTokenSecret) {
  return verifySignedToken(token, "member", memberTokenSecret);
}

function createUserSessionFromSignupRecord(record, memberTokenSecret) {
  const pricingApproved = record.approvalStatus === "승인";
  return {
    phone: record.phone,
    businessNumber: record.businessNumber,
    name: record.name,
    title: record.title,
    companyName: record.companyName,
    companyAddress: record.companyAddress,
    contactName: record.contactName || record.name,
    contactTitle: record.contactTitle || record.title,
    contactCompanyName: record.contactCompanyName || record.companyName,
    contactPhone: record.contactPhone || record.phone,
    contactEmail: record.contactEmail || record.socialEmail || "",
    contactAddress: record.contactAddress || record.companyAddress,
    businessCardFileName: record.businessCardFileName || "",
    contactInfo: {
      name: record.contactName || record.name,
      title: record.contactTitle || record.title,
      companyName: record.contactCompanyName || record.companyName,
      phone: record.contactPhone || record.phone,
      email: record.contactEmail || record.socialEmail || "",
      address: record.contactAddress || record.companyAddress,
      businessCardFileName: record.businessCardFileName || "",
      businessCardFileMime: record.businessCardFileMime || "",
      updatedAt: record.submittedAt || new Date().toISOString()
    },
    provider: record.provider || "일반 회원가입",
    approvalStatus: record.approvalStatus,
    pricingAccess: pricingApproved ? "approved" : "pending",
    memberGrade: record.memberGrade || "사업자",
    priceTier: record.priceTier || (pricingApproved ? "wholesale" : "retail"),
    memberToken: createMemberToken(record, memberTokenSecret)
  };
}

module.exports = {
  createAdminToken,
  createMemberToken,
  createUserSessionFromSignupRecord,
  safeEqualText,
  verifyAdminToken,
  verifyMemberToken
};
