const dns = require("node:dns").promises;
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const { Readable } = require("node:stream");

const { createHttpError } = require("../http-errors");

function isPrivateAddress(address) {
  const value = String(address || "").trim().toLowerCase();
  const version = net.isIP(value);
  if (version === 4) {
    const parts = value.split(".").map(Number);
    const [a, b] = parts;
    return a === 0
      || a === 10
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || a >= 224;
  }
  if (version === 6) {
    if (value.startsWith("::ffff:")) {
      const mapped = value.slice("::ffff:".length);
      if (net.isIP(mapped) === 4) return isPrivateAddress(mapped);
      const words = mapped.split(":");
      if (words.length === 2 && words.every((word) => /^[0-9a-f]{1,4}$/.test(word))) {
        const high = Number.parseInt(words[0], 16);
        const low = Number.parseInt(words[1], 16);
        return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
      }
      return true;
    }
    return value === "::"
      || value === "::1"
      || value.startsWith("fc")
      || value.startsWith("fd")
      || /^fe[89ab]/.test(value)
      || value.startsWith("ff");
  }
  return true;
}

async function assertSafeRemoteImageUrl(value, options = {}) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw createHttpError(400, "올바른 이미지 URL이 필요합니다.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw createHttpError(400, "허용되지 않는 이미지 URL입니다.");
  }
  if (["localhost", "localhost.localdomain"].includes(url.hostname.toLowerCase()) || net.isIP(url.hostname) && isPrivateAddress(url.hostname)) {
    throw createHttpError(400, "허용되지 않는 이미지 주소입니다.");
  }

  const lookup = options.lookup || dns.lookup;
  let addresses;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw createHttpError(400, "이미지 주소를 확인할 수 없습니다.");
  }
  if (!Array.isArray(addresses) || !addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw createHttpError(400, "허용되지 않는 이미지 주소입니다.");
  }
  Object.defineProperty(url, "resolvedAddresses", {
    configurable: false,
    enumerable: false,
    value: addresses.map((entry) => String(entry.address || "").trim()).filter(Boolean),
    writable: false
  });
  return url;
}

function buildPinnedRequestOptions(url) {
  const originalHostname = String(url.hostname || "").replace(/^\[|\]$/g, "");
  const resolvedAddress = Array.isArray(url.resolvedAddresses) ? url.resolvedAddresses[0] : "";
  if (!resolvedAddress || isPrivateAddress(resolvedAddress)) {
    throw createHttpError(400, "허용되지 않는 이미지 주소입니다.");
  }
  return {
    hostname: resolvedAddress,
    port: url.port || (url.protocol === "https:" ? "443" : "80"),
    path: `${url.pathname || "/"}${url.search || ""}`,
    method: "GET",
    headers: { Host: url.host },
    ...(url.protocol === "https:" && !net.isIP(originalHostname) ? { servername: originalHostname } : {})
  };
}

function requestRemoteImagePinned(url, options = {}) {
  const requestOptions = buildPinnedRequestOptions(url);
  const transport = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const request = transport.request(requestOptions, (response) => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.headers || {})) {
        if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
        else if (value !== undefined) headers.set(name, String(value));
      }
      resolve({
        ok: Number(response.statusCode) >= 200 && Number(response.statusCode) < 300,
        status: Number(response.statusCode) || 0,
        headers,
        body: Readable.toWeb(response)
      });
    });
    request.once("error", reject);
    if (options.signal) {
      if (options.signal.aborted) request.destroy(new Error("aborted"));
      else options.signal.addEventListener("abort", () => request.destroy(new Error("aborted")), { once: true });
    }
    request.end();
  });
}

async function readResponseBodyBounded(response, maxBytes, abortPromise) {
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    let completed = false;
    try {
      while (true) {
        const { done, value } = await Promise.race([reader.read(), abortPromise]);
        if (done) {
          completed = true;
          return Buffer.concat(chunks, total);
        }
        const chunk = Buffer.from(value);
        total += chunk.length;
        if (total > maxBytes) throw createHttpError(413, "이미지 파일이 너무 큽니다.");
        chunks.push(chunk);
      }
    } finally {
      if (!completed) await reader.cancel().catch(() => {});
    }
  }
  const arrayBuffer = await Promise.race([response.arrayBuffer(), abortPromise]);
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > maxBytes) throw createHttpError(413, "이미지 파일이 너무 큽니다.");
  return buffer;
}

async function readRemoteImageDataUrlSafely(value, options = {}) {
  const fetchImpl = options.fetchImpl || requestRemoteImagePinned;
  let url = await assertSafeRemoteImageUrl(value, options);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs || 5000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abortPromise = new Promise((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        reject(createHttpError(504, "이미지 요청 시간이 초과되었습니다."));
      }, { once: true });
    });
    try {
      const response = await Promise.race([
        fetchImpl(url, { redirect: "manual", signal: controller.signal }),
        abortPromise
      ]);
      if (response.status >= 300 && response.status < 400) {
        const location = String(response.headers?.get("location") || "").trim();
        if (!location || redirects === 3) {
          throw createHttpError(502, "이미지 주소의 이동 경로가 올바르지 않습니다.");
        }
        url = await assertSafeRemoteImageUrl(new URL(location, url).toString(), options);
        continue;
      }
      if (!response.ok) throw createHttpError(502, "이미지를 읽지 못했습니다.");
      const contentType = String(response.headers?.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!contentType.startsWith("image/")) throw createHttpError(415, "이미지 형식만 사용할 수 있습니다.");
      const maxBytes = Number(options.maxBytes || 5 * 1024 * 1024);
      const contentLength = Number(response.headers?.get("content-length") || 0);
      if (contentLength > maxBytes) throw createHttpError(413, "이미지 파일이 너무 큽니다.");
      const buffer = await readResponseBodyBounded(response, maxBytes, abortPromise);
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    } catch (error) {
      if (controller.signal.aborted || error?.statusCode === 504) {
        throw createHttpError(504, "이미지 요청 시간이 초과되었습니다.");
      }
      if (error?.statusCode) throw error;
      throw createHttpError(502, "이미지를 읽지 못했습니다.");
    } finally {
      clearTimeout(timer);
    }
  }
  throw createHttpError(502, "이미지를 읽지 못했습니다.");
}

module.exports = {
  assertSafeRemoteImageUrl,
  buildPinnedRequestOptions,
  isPrivateAddress,
  readRemoteImageDataUrlSafely
};
