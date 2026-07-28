const crypto = require("crypto");
const zlib = require("zlib");

const DEFAULT_BODY_LIMIT = 80 * 1024 * 1024;
const COMPRESSION_THRESHOLD = 1024;
let rawJsonCache = null;

function readRequestBody(request, options = {}) {
  const bodyLimit = Number(options.bodyLimit || DEFAULT_BODY_LIMIT);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > bodyLimit) {
        reject(new Error("업로드 용량이 너무 큽니다."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response, status, body) {
  sendJsonPayload(response, status, JSON.stringify(body), {
    cacheControl: "no-store"
  });
}

function sendRawJson(response, status, json) {
  if (!rawJsonCache || rawJsonCache.source !== json) {
    const buffer = Buffer.from(json);
    rawJsonCache = {
      source: json,
      buffer,
      etag: `"${crypto.createHash("sha1").update(buffer).digest("base64url")}"`,
      encoded: new Map()
    };
  }

  sendJsonPayload(response, status, rawJsonCache.buffer, {
    cacheControl: "public, max-age=300, stale-while-revalidate=900",
    etag: rawJsonCache.etag,
    encodedCache: rawJsonCache.encoded
  });
}

function sendJsonPayload(response, status, value, options = {}) {
  const request = response.req;
  const payload = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const etag = options.etag || "";
  const commonHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": options.cacheControl || "no-store",
    "X-Content-Type-Options": "nosniff"
  };

  if (etag) {
    commonHeaders.ETag = etag;
    if (matchesEtag(request?.headers?.["if-none-match"], etag)) {
      response.writeHead(304, commonHeaders);
      response.end();
      return;
    }
  }

  const encoding = payload.length >= COMPRESSION_THRESHOLD
    ? selectContentEncoding(request?.headers?.["accept-encoding"])
    : "";
  if (!encoding) {
    response.writeHead(status, {
      ...commonHeaders,
      "Content-Length": payload.length
    });
    response.end(payload);
    return;
  }

  const cached = options.encodedCache?.get(encoding);
  if (cached) {
    writeCompressedResponse(response, status, cached, encoding, commonHeaders);
    return;
  }

  compressPayload(payload, encoding, (error, compressed) => {
    if (response.writableEnded) return;
    if (error) {
      response.writeHead(status, {
        ...commonHeaders,
        "Content-Length": payload.length
      });
      response.end(payload);
      return;
    }
    options.encodedCache?.set(encoding, compressed);
    writeCompressedResponse(response, status, compressed, encoding, commonHeaders);
  });
}

function selectContentEncoding(acceptEncoding = "") {
  const value = String(acceptEncoding).toLowerCase();
  if (value.includes("br")) return "br";
  if (value.includes("gzip")) return "gzip";
  return "";
}

function matchesEtag(headerValue = "", etag = "") {
  return String(headerValue)
    .split(",")
    .some((value) => value.trim() === "*" || value.trim() === etag);
}

function compressPayload(payload, encoding, callback) {
  if (encoding === "br") {
    zlib.brotliCompress(payload, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4
      }
    }, callback);
    return;
  }
  zlib.gzip(payload, { level: 6 }, callback);
}

function writeCompressedResponse(response, status, payload, encoding, headers) {
  response.writeHead(status, {
    ...headers,
    "Content-Encoding": encoding,
    "Content-Length": payload.length,
    Vary: "Accept-Encoding"
  });
  response.end(payload);
}

module.exports = {
  DEFAULT_BODY_LIMIT,
  readRequestBody,
  sendJson,
  sendRawJson
};
