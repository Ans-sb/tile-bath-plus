function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSocialProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (provider === "google") return "google";
  if (provider === "kakao" || provider === "kakaotalk" || provider === "카카오" || provider === "카카오톡") return "kakao";
  const error = new Error("지원하지 않는 소셜 가입 방식입니다.");
  error.statusCode = 400;
  throw error;
}

function normalizeSocialProviderOptional(value) {
  const provider = String(value || "").trim();
  if (!provider) return "";
  return normalizeSocialProvider(provider);
}

function formatSocialProviderLabel(providerValue, emailValue) {
  const provider = normalizeSocialProvider(providerValue);
  const label = provider === "kakao" ? "카카오톡 가입" : "Google 가입";
  const email = normalizeEmail(emailValue);
  return email ? `${label} <${email}>` : label;
}

function normalizeSignupProvider(payload) {
  const socialEmail = normalizeEmail(payload?.socialEmail);
  const socialProvider = String(payload?.socialProvider || "").trim();
  if (socialEmail && socialProvider) return formatSocialProviderLabel(socialProvider, socialEmail);
  return String(payload?.provider || "일반 회원가입").trim();
}

function normalizeStringArray(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function cloneApprovalRules(rules) {
  return {
    businessTypes: normalizeStringArray(rules?.businessTypes),
    businessItems: normalizeStringArray(rules?.businessItems)
  };
}

function normalizeApprovalStatus(value) {
  const status = String(value || "").trim();
  if (status === "승인" || status === "가입승인" || status.toLowerCase() === "approved") return "승인";
  if (status === "보류" || status === "가입보류" || status.toLowerCase() === "pending") return "보류";
  return "보류";
}

function normalizeMemberPriceTier(value) {
  const tier = String(value || "").trim().toLowerCase();
  if (["wholesale", "dealer", "partner", "business", "도매", "사업자"].includes(tier)) return "wholesale";
  return "retail";
}

function normalizeSignupRequest(payload) {
  return {
    accountId: String(payload?.accountId || "").trim(),
    phone: String(payload?.phone || "").trim(),
    businessNumber: String(payload?.businessNumber || "").trim(),
    name: String(payload?.name || "").trim(),
    title: String(payload?.title || "").trim(),
    companyName: String(payload?.companyName || "").trim(),
    companyAddress: String(payload?.companyAddress || "").trim(),
    contactName: String(payload?.contactName || payload?.contactInfo?.name || "").trim(),
    contactTitle: String(payload?.contactTitle || payload?.contactInfo?.title || "").trim(),
    contactCompanyName: String(payload?.contactCompanyName || payload?.contactInfo?.companyName || "").trim(),
    contactPhone: String(payload?.contactPhone || payload?.contactInfo?.phone || "").trim(),
    contactEmail: normalizeEmail(payload?.contactEmail || payload?.contactInfo?.email),
    contactAddress: String(payload?.contactAddress || payload?.contactInfo?.address || "").trim(),
    password: String(payload?.password || ""),
    provider: normalizeSignupProvider(payload),
    socialProvider: normalizeSocialProviderOptional(payload?.socialProvider),
    socialEmail: normalizeEmail(payload?.socialEmail),
    socialProviderId: String(payload?.socialProviderId || "").trim(),
    socialName: String(payload?.socialName || "").trim(),
    socialAvatarUrl: String(payload?.socialAvatarUrl || "").trim(),
    extractedCompanyName: String(payload?.extractedCompanyName || "").trim(),
    extractedBusinessAddress: String(payload?.extractedBusinessAddress || "").trim(),
    representative: String(payload?.representative || "").trim(),
    openingDate: String(payload?.openingDate || "").trim(),
    businessType: String(payload?.businessType || "").trim(),
    businessItem: String(payload?.businessItem || "").trim(),
    businessCategorySection: String(payload?.businessCategorySection || "").trim(),
    approvalStatus: normalizeApprovalStatus(payload?.approvalStatus),
    memberGrade: String(payload?.memberGrade || "사업자").trim(),
    priceTier: normalizeMemberPriceTier(payload?.priceTier || "wholesale"),
    businessFileName: String(payload?.businessFileName || "").trim(),
    businessFileMime: String(payload?.businessFileMime || "").trim(),
    businessFileDataUrl: String(payload?.businessFileDataUrl || "").trim(),
    businessCardFileName: String(payload?.businessCardFileName || "").trim(),
    businessCardFileMime: String(payload?.businessCardFileMime || "").trim(),
    businessCardFileDataUrl: String(payload?.businessCardFileDataUrl || "").trim(),
    submittedAt: String(payload?.submittedAt || new Date().toISOString()).trim()
  };
}

function mapSignupRequestToSupabase(record) {
  return {
    account_id: record.accountId || null,
    phone: record.phone,
    business_number: record.businessNumber,
    name: record.name,
    title: record.title,
    company_name: record.companyName,
    company_address: record.companyAddress,
    password: record.password,
    provider: record.provider,
    social_provider: record.socialProvider,
    social_email: record.socialEmail,
    social_provider_id: record.socialProviderId,
    social_name: record.socialName,
    social_avatar_url: record.socialAvatarUrl,
    extracted_company_name: record.extractedCompanyName,
    extracted_business_address: record.extractedBusinessAddress,
    representative: record.representative,
    opening_date: record.openingDate || null,
    business_type: record.businessType,
    business_item: record.businessItem,
    business_category_section: record.businessCategorySection,
    approval_status: record.approvalStatus,
    member_grade: record.memberGrade,
    price_tier: record.priceTier,
    business_file_name: record.businessFileName,
    submitted_at: record.submittedAt || new Date().toISOString()
  };
}

function mapSupabaseSignupRequest(row) {
  return {
    accountId: String(row.account_id || "").trim(),
    phone: String(row.phone || "").trim(),
    businessNumber: String(row.business_number || "").trim(),
    name: String(row.name || "").trim(),
    title: String(row.title || "").trim(),
    companyName: String(row.company_name || "").trim(),
    companyAddress: String(row.company_address || "").trim(),
    password: String(row.password || ""),
    provider: String(row.provider || "일반 회원가입").trim(),
    socialProvider: normalizeSocialProviderOptional(row.social_provider),
    socialEmail: normalizeEmail(row.social_email),
    socialProviderId: String(row.social_provider_id || "").trim(),
    socialName: String(row.social_name || "").trim(),
    socialAvatarUrl: String(row.social_avatar_url || "").trim(),
    extractedCompanyName: String(row.extracted_company_name || "").trim(),
    extractedBusinessAddress: String(row.extracted_business_address || "").trim(),
    representative: String(row.representative || "").trim(),
    openingDate: String(row.opening_date || "").trim(),
    businessType: String(row.business_type || "").trim(),
    businessItem: String(row.business_item || "").trim(),
    businessCategorySection: String(row.business_category_section || "").trim(),
    approvalStatus: normalizeApprovalStatus(row.approval_status),
    memberGrade: String(row.member_grade || "사업자").trim(),
    priceTier: normalizeMemberPriceTier(row.price_tier || "wholesale"),
    businessFileName: String(row.business_file_name || "").trim(),
    submittedAt: String(row.submitted_at || "").trim()
  };
}

module.exports = {
  cloneApprovalRules,
  formatSocialProviderLabel,
  mapSignupRequestToSupabase,
  mapSupabaseSignupRequest,
  normalizeApprovalStatus,
  normalizeEmail,
  normalizeMemberPriceTier,
  normalizeSignupProvider,
  normalizeSignupRequest,
  normalizeSocialProviderOptional,
  normalizeStringArray
};
