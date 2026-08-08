const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createHttpError } = require("../../http-errors");

function createProposalDownloadStore(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const ttlMs = Math.max(60000, Number(options.ttlMs || 15 * 60 * 1000));
  const maxEntries = Math.max(10, Number(options.maxEntries || 500));
  const now = options.now || Date.now;
  const randomBytes = options.randomBytes || crypto.randomBytes;
  const entries = new Map();

  function register(filePath, fileName) {
    cleanup();
    const resolvedPath = path.resolve(filePath);
    assertInsideRoot(resolvedPath, rootDir);
    if (!fs.existsSync(resolvedPath)) {
      throw createHttpError(500, "생성된 제안서 파일을 확인하지 못했습니다.");
    }
    while (entries.size >= maxEntries) {
      entries.delete(entries.keys().next().value);
    }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = now() + ttlMs;
    entries.set(token, {
      filePath: resolvedPath,
      fileName: sanitizeDownloadFileName(fileName || path.basename(resolvedPath)),
      expiresAt
    });
    return { token, expiresAt };
  }

  function resolve(token) {
    cleanup();
    const cleanToken = String(token || "").trim();
    const entry = entries.get(cleanToken);
    if (!entry || entry.expiresAt <= now()) {
      entries.delete(cleanToken);
      throw createHttpError(410, "제안서 다운로드 링크가 만료되었습니다. 다시 생성해주세요.");
    }
    assertInsideRoot(entry.filePath, rootDir);
    if (!fs.existsSync(entry.filePath)) {
      entries.delete(cleanToken);
      throw createHttpError(404, "제안서 파일을 찾을 수 없습니다.");
    }
    return { ...entry };
  }

  function cleanup() {
    const current = now();
    for (const [token, entry] of entries) {
      if (entry.expiresAt <= current) entries.delete(token);
    }
  }

  return { cleanup, register, resolve };
}

function assertInsideRoot(filePath, rootDir) {
  const relative = path.relative(rootDir, filePath);
  if (!relative || (!relative.startsWith("..") && !path.isAbsolute(relative))) return;
  throw createHttpError(403, "허용되지 않은 제안서 파일 경로입니다.");
}

function sanitizeDownloadFileName(value) {
  return String(value || "proposal.pptx")
    .replace(/[\r\n"]/g, "")
    .replace(/[\\/:*?<>|]/g, "-")
    .trim()
    .slice(0, 120) || "proposal.pptx";
}

module.exports = {
  createProposalDownloadStore,
  sanitizeDownloadFileName
};
