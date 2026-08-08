const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createProposalDownloadStore } = require("../../../src/server/features/proposal/proposal-download-store");

test("proposal download tokens resolve only inside the private output root and expire", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "proposal-download-"));
  const filePath = path.join(rootDir, "proposal.pptx");
  fs.writeFileSync(filePath, "pptx");
  let currentTime = 1000;
  const store = createProposalDownloadStore({
    rootDir,
    ttlMs: 60000,
    now: () => currentTime,
    randomBytes: () => Buffer.alloc(32, 7)
  });

  const registered = store.register(filePath, "고객 제안서.pptx");
  const resolved = store.resolve(registered.token);
  assert.equal(resolved.filePath, filePath);
  assert.equal(resolved.fileName, "고객 제안서.pptx");

  currentTime += 60001;
  assert.throws(() => store.resolve(registered.token), /만료/);

  const outsidePath = path.join(path.dirname(rootDir), "outside.pptx");
  fs.writeFileSync(outsidePath, "pptx");
  assert.throws(() => store.register(outsidePath), /허용되지 않은/);
  fs.rmSync(outsidePath, { force: true });
  fs.rmSync(rootDir, { recursive: true, force: true });
});
