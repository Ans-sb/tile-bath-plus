const dns = require("node:dns").promises;
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const { Readable } = require("node:stream");

const { createHttpError } = require("../http-errors");

function ipv4ToInteger(address) {
  if (net.isIP(address) !== 4) return null;
  return address.split(".").reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
}

function isIpv4InRange(address, base, prefixLength) {
  const value = ipv4ToInteger(address);
  const rangeBase = ipv4ToInteger(base);
  if (value === null || rangeBase === null) return false;
  const shift = 32 - prefixLength;
  return (value >>> shift) === (rangeBase >>> shift);
}

function ipv6ToBigInt(address) {
  let value = String(address || "").toLowerCase();
  if (value.includes("%")) return null;
  const dottedMatch = value.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/);
  if (dottedMatch) {
    const ipv4 = ipv4ToInteger(dottedMatch[1]);
    if (ipv4 === null) return null;
    value = `${value.slice(0, -dottedMatch[1].length)}${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if ([...left, ...right].some((word) => !/^[0-9a-f]{1,4}$/.test(word))) return null;
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const words = [...left, ...Array(Math.max(0, missing)).fill("0"), ...right];
  if (words.length !== 8) return null;
  return words.reduce((result, word) => (result << 16n) | BigInt(Number.parseInt(word, 16)), 0n);
}

function isIpv6InRange(value, base, prefixLength) {
  const rangeBase = ipv6ToBigInt(base);
  if (value === null || rangeBase === null) return false;
  const shift = 128n - BigInt(prefixLength);
  return (value >> shift) === (rangeBase >> shift);
}

function isPrivateAddress(address) {
  const value = String(address || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  const version = net.isIP(value);
  if (version === 4) {
    return [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
      ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]
    ].some(([base, prefix]) => isIpv4InRange(value, base, prefix));
  }
  if (version === 6) {
    const parsed = ipv6ToBigInt(value);
    if (parsed === null) return true;
    if (isIpv6InRange(parsed, "::ffff:0:0", 96)) {
      const embedded = Number(parsed & 0xffffffffn) >>> 0;
      return isPrivateAddress(`${embedded >>> 24}.${(embedded >>> 16) & 255}.${(embedded >>> 8) & 255}.${embedded & 255}`);
    }
    if (isIpv6InRange(parsed, "64:ff9b::", 96)) {
      const embedded = Number(parsed & 0xffffffffn) >>> 0;
      return isPrivateAddress(`${embedded >>> 24}.${(embedded >>> 16) & 255}.${(embedded >>> 8) & 255}.${embedded & 255}`);
    }
    const globallyRoutable = isIpv6InRange(parsed, "2000::", 3);
    if (!globallyRoutable) return true;
    return [
      ["2001::", 23],
      ["2001:db8::", 32],
      ["2002::", 16],
      ["3fff::", 20]
    ].some(([base, prefix]) => isIpv6InRange(parsed, base, prefix));
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
  const hostname = String(url.hostname || "").replace(/^\[|\]$/g, "");
  if (["localhost", "localhost.localdomain"].includes(hostname.toLowerCase()) || net.isIP(hostname) && isPrivateAddress(hostname)) {
    throw createHttpError(400, "허용되지 않는 이미지 주소입니다.");
  }

  const lookup = options.lookup || dns.lookup;
  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
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
        body: Readable.toWeb(response),
        async cancel() {
          response.destroy();
          request.destroy();
        }
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

async function cancelRemoteResponse(response, abortPromise) {
  const cancellations = [];
  if (typeof response?.body?.cancel === "function") {
    cancellations.push(Promise.resolve().then(() => response.body.cancel()));
  }
  if (typeof response?.cancel === "function") {
    cancellations.push(Promise.resolve().then(() => response.cancel()));
  }
  if (cancellations.length) {
    await Promise.race([Promise.allSettled(cancellations), abortPromise]);
  }
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
        await cancelRemoteResponse(response, abortPromise);
        if (!location || redirects === 3) {
          throw createHttpError(502, "이미지 주소의 이동 경로가 올바르지 않습니다.");
        }
        url = await assertSafeRemoteImageUrl(new URL(location, url).toString(), options);
        continue;
      }
      if (!response.ok) {
        await cancelRemoteResponse(response, abortPromise);
        throw createHttpError(502, "이미지를 읽지 못했습니다.");
      }
      const contentType = String(response.headers?.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!contentType.startsWith("image/")) {
        await cancelRemoteResponse(response, abortPromise);
        throw createHttpError(415, "이미지 형식만 사용할 수 있습니다.");
      }
      const maxBytes = Number(options.maxBytes || 5 * 1024 * 1024);
      const contentLength = Number(response.headers?.get("content-length") || 0);
      if (contentLength > maxBytes) {
        await cancelRemoteResponse(response, abortPromise);
        throw createHttpError(413, "이미지 파일이 너무 큽니다.");
      }
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
