const crypto = require("crypto");

const DEFAULT_AUTH_TTL_MS = 10 * 60 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 10 * 1000;
const NAVER_AUTH_URL = "https://nid.naver.com/oauth2.0/authorize";
const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me";
const OAUTH_COOKIE_NAME = "jajaego_naver_oauth";

function createNaverOAuthService(options = {}) {
  const clientId = String(options.clientId || "").trim();
  const clientSecret = String(options.clientSecret || "").trim();
  const configuredRedirectUri = String(options.redirectUri || "").trim();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = typeof options.now === "function" ? options.now : Date.now;
  const randomBytes = typeof options.randomBytes === "function" ? options.randomBytes : crypto.randomBytes;
  const authTtlMs = getPositiveNumber(options.authTtlMs, DEFAULT_AUTH_TTL_MS);
  const requestTimeoutMs = getPositiveNumber(options.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS);
  const signingSecret = crypto
    .createHash("sha256")
    .update(`${String(options.tokenSecret || "").trim()}\n${clientSecret}\njajaego-naver-oauth`)
    .digest();

  function isConfigured() {
    return Boolean(clientId && clientSecret);
  }

  function buildAuthorizationRequest({ mode, requestOrigin, client = "" }) {
    assertConfigured();
    const normalizedMode = normalizeMode(mode);
    const normalizedClient = normalizeClient(client);
    const redirectUri = resolveRedirectUri(configuredRedirectUri, requestOrigin);
    const nonce = randomBytes(24).toString("base64url");
    const issuedAt = now();
    const state = signPayload({
      nonce,
      mode: normalizedMode,
      client: normalizedClient,
      redirectUri,
      issuedAt,
      expiresAt: issuedAt + authTtlMs
    }, signingSecret);
    const authUrl = new URL(NAVER_AUTH_URL);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    return {
      location: authUrl.toString(),
      setCookie: serializeOAuthCookie(nonce, authTtlMs, requestOrigin)
    };
  }

  async function completeAuthorization({ requestUrl, cookieHeader, requestOrigin }) {
    assertConfigured();
    const callbackUrl = new URL(requestUrl);
    const state = verifyPayload(callbackUrl.searchParams.get("state"), signingSecret, now());
    const cookieNonce = readCookie(cookieHeader, OAUTH_COOKIE_NAME);
    if (!state || !cookieNonce || !safeEqualText(cookieNonce, state.nonce)) {
      throw createOAuthError(400, "네이버 로그인 요청을 확인하지 못했습니다. 처음부터 다시 시도해주세요.");
    }

    const providerError = callbackUrl.searchParams.get("error_description")
      || callbackUrl.searchParams.get("error")
      || "";
    if (providerError) throw createOAuthError(401, providerError);

    const code = String(callbackUrl.searchParams.get("code") || "").trim();
    if (!code) throw createOAuthError(400, "네이버 인증 코드를 확인하지 못했습니다.");

    const token = await requestNaverToken({
      clientId,
      clientSecret,
      code,
      state: String(callbackUrl.searchParams.get("state") || ""),
      redirectUri: state.redirectUri,
      fetchImpl,
      requestTimeoutMs
    });
    const profile = await requestNaverProfile({
      accessToken: token.access_token,
      fetchImpl,
      requestTimeoutMs
    });
    const accessToken = encryptProfileToken({
      provider: "naver",
      providerId: profile.providerId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      issuedAt: now(),
      expiresAt: now() + authTtlMs
    }, signingSecret, randomBytes);
    const location = buildAppRedirect({
      requestOrigin,
      mode: state.mode,
      client: state.client,
      accessToken
    });

    return {
      location,
      setCookie: clearOAuthCookie(requestOrigin)
    };
  }

  function buildErrorRedirect({ requestUrl, requestOrigin, error }) {
    const callbackUrl = new URL(requestUrl);
    const state = verifyPayload(callbackUrl.searchParams.get("state"), signingSecret, now());
    const url = createClientRedirectUrl(requestOrigin, state?.client);
    url.searchParams.set("socialProvider", "naver");
    url.searchParams.set("socialMode", normalizeMode(state?.mode));
    url.searchParams.set(
      "error_description",
      String(error?.message || "네이버 로그인 중 오류가 발생했습니다.")
    );
    return {
      location: url.toString(),
      setCookie: clearOAuthCookie(requestOrigin)
    };
  }

  function readProfileToken(token) {
    const payload = decryptProfileToken(token, signingSecret);
    if (!payload || payload.expiresAt <= now() || payload.provider !== "naver" || !payload.providerId) {
      throw createOAuthError(401, "네이버 로그인 정보가 만료됐습니다. 다시 로그인해주세요.");
    }
    return {
      ok: true,
      accountId: "",
      authUserId: "",
      email: String(payload.email || "").trim(),
      name: String(payload.name || payload.email || "네이버 회원").trim(),
      avatarUrl: String(payload.avatarUrl || "").trim(),
      provider: "naver",
      providerId: String(payload.providerId || "").trim()
    };
  }

  function isProfileToken(token) {
    return String(token || "").startsWith("naver.");
  }

  function assertConfigured() {
    if (!isConfigured()) {
      throw createOAuthError(500, "네이버 로그인 Client ID 또는 Client Secret이 설정되어 있지 않습니다.");
    }
  }

  return {
    buildAuthorizationRequest,
    buildErrorRedirect,
    completeAuthorization,
    isConfigured,
    isProfileToken,
    readProfileToken
  };
}

async function requestNaverToken({
  clientId,
  clientSecret,
  code,
  state,
  redirectUri,
  fetchImpl,
  requestTimeoutMs
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    state,
    redirect_uri: redirectUri
  });
  const response = await fetchWithTimeout(fetchImpl, NAVER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: body.toString()
  }, requestTimeoutMs);
  const payload = await readResponsePayload(response);
  if (!response.ok || !payload?.access_token) {
    const message = payload?.error_description || payload?.error || "네이버 로그인 토큰을 발급받지 못했습니다.";
    throw createOAuthError(401, message);
  }
  return payload;
}

async function requestNaverProfile({ accessToken, fetchImpl, requestTimeoutMs }) {
  const response = await fetchWithTimeout(fetchImpl, NAVER_PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  }, requestTimeoutMs);
  const payload = await readResponsePayload(response);
  const source = payload?.response || {};
  if (!response.ok || payload?.resultcode !== "00" || !source.id) {
    throw createOAuthError(401, payload?.message || "네이버 회원 정보를 확인하지 못했습니다.");
  }
  return {
    providerId: String(source.id || "").trim(),
    email: String(source.email || "").trim(),
    name: String(source.name || source.nickname || source.email || "네이버 회원").trim(),
    avatarUrl: String(source.profile_image || "").trim()
  };
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createOAuthError(504, "네이버 로그인 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function readResponsePayload(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

function buildAppRedirect({ requestOrigin, mode, client, accessToken }) {
  const url = createClientRedirectUrl(requestOrigin, client);
  url.searchParams.set("socialProvider", "naver");
  url.searchParams.set("socialMode", normalizeMode(mode));
  url.hash = new URLSearchParams({ access_token: accessToken }).toString();
  return url.toString();
}

function createClientRedirectUrl(requestOrigin, client) {
  const url = new URL(requestOrigin);
  if (normalizeClient(client) === "android") {
    url.searchParams.set("mobileClient", "android");
  }
  return url;
}

function resolveRedirectUri(configuredRedirectUri, requestOrigin) {
  if (configuredRedirectUri) {
    const configuredUrl = new URL(configuredRedirectUri);
    const originUrl = new URL(requestOrigin);
    if (configuredUrl.origin === originUrl.origin) return configuredUrl.toString();
  }
  return new URL("/api/social-auth/naver/callback", requestOrigin).toString();
}

function normalizeMode(value) {
  return String(value || "").trim().toLowerCase() === "login" ? "login" : "signup";
}

function normalizeClient(value) {
  return String(value || "").trim().toLowerCase() === "android" ? "android" : "web";
}

function serializeOAuthCookie(nonce, ttlMs, requestOrigin) {
  const secure = new URL(requestOrigin).protocol === "https:";
  const attributes = [
    `${OAUTH_COOKIE_NAME}=${encodeURIComponent(nonce)}`,
    "Path=/api/",
    `Max-Age=${Math.floor(ttlMs / 1000)}`,
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

function clearOAuthCookie(requestOrigin) {
  const secure = new URL(requestOrigin).protocol === "https:";
  const attributes = [
    `${OAUTH_COOKIE_NAME}=`,
    "Path=/api/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

function readCookie(cookieHeader, name) {
  const entries = String(cookieHeader || "").split(";");
  for (const entry of entries) {
    const index = entry.indexOf("=");
    if (index < 0) continue;
    if (entry.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(entry.slice(index + 1).trim());
  }
  return "";
}

function signPayload(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyPayload(token, secret, currentTime) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (!safeEqualText(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.expiresAt || Number(payload.expiresAt) <= currentTime) return null;
    return payload;
  } catch {
    return null;
  }
}

function encryptProfileToken(payload, secret, randomBytes) {
  const iv = randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  return [
    "naver",
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url")
  ].join(".");
}

function decryptProfileToken(token, secret) {
  const [prefix, ivText, ciphertextText, tagText] = String(token || "").split(".");
  if (prefix !== "naver" || !ivText || !ciphertextText || !tagText) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", secret, Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final()
    ]).toString("utf8");
    return JSON.parse(plaintext);
  } catch {
    return null;
  }
}

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function createOAuthError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = {
  createNaverOAuthService
};
