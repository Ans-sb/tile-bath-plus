const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

function createTileSalesProjectStore({ filePath, now = () => new Date() } = {}) {
  let writeQueue = Promise.resolve();

  async function readRows() {
    try {
      const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async function saveRows(rows) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    await fs.rename(temporaryPath, filePath);
  }

  function mutate(mutator) {
    const operation = writeQueue.then(async () => {
      const rows = await readRows();
      const result = await mutator(rows);
      await saveRows(rows);
      return result;
    });
    writeQueue = operation.catch(() => {});
    return operation;
  }

  async function readProject(projectId, owner) {
    const cleanProjectId = sanitizeText(projectId, 80);
    const cleanOwner = normalizeOwner(owner);
    if (!cleanProjectId || !cleanOwner.id) return null;
    const rows = await readRows();
    const project = rows.find((row) => row.id === cleanProjectId);
    if (!project || !isSameOwner(project.owner, cleanOwner)) return null;
    return project;
  }

  async function saveTurn({ projectId, owner, userMessage, result }) {
    const cleanOwner = normalizeOwner(owner);
    if (!cleanOwner.id) return null;

    return mutate((rows) => {
      const currentTime = now().toISOString();
      const cleanProjectId = sanitizeText(projectId, 80);
      let project = rows.find((row) => row.id === cleanProjectId && isSameOwner(row.owner, cleanOwner));
      if (!project) {
        project = {
          id: crypto.randomUUID(),
          owner: cleanOwner,
          title: buildProjectTitle(result?.intent, userMessage),
          status: "상담중",
          stage: "조건확인",
          intent: {},
          messages: [],
          recommendations: [],
          quantityEstimate: null,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        rows.unshift(project);
      }

      project.title = buildProjectTitle(result?.intent, userMessage, project.title);
      project.stage = sanitizeText(result?.stage, 40) || project.stage;
      project.intent = sanitizeIntent(result?.intent);
      project.recommendations = sanitizeRecommendations(result?.recommendations);
      project.quantityEstimate = sanitizeQuantityEstimate(result?.quantityEstimate);
      project.updatedAt = currentTime;
      project.messages = Array.isArray(project.messages) ? project.messages : [];
      project.messages.push({ role: "user", content: sanitizeText(userMessage, 2000), createdAt: currentTime });
      project.messages.push({ role: "assistant", content: sanitizeText(result?.message, 6000), createdAt: currentTime });
      project.messages = project.messages.slice(-100);

      rows.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
      rows.splice(500);
      return project;
    });
  }

  return { readProject, saveTurn };
}

function normalizeOwner(owner) {
  const type = ["admin", "member", "guest"].includes(owner?.type) ? owner.type : "guest";
  return { type, id: sanitizeText(owner?.id, 160) };
}

function isSameOwner(left, right) {
  return String(left?.type || "") === right.type && String(left?.id || "") === right.id;
}

function buildProjectTitle(intent, userMessage, fallback = "") {
  const parts = [intent?.space, intent?.application].map((value) => sanitizeText(value, 40)).filter(Boolean);
  if (parts.length) return `${parts.join(" ")} 타일 프로젝트`;
  return sanitizeText(fallback, 120) || `${sanitizeText(userMessage, 28) || "새 현장"} 프로젝트`;
}

function sanitizeIntent(intent) {
  const safe = {};
  for (const key of ["space", "application", "size", "finish", "color", "style", "material", "areaSqm", "lossRate", "sizeUnknown"]) {
    if (intent?.[key] !== undefined && intent?.[key] !== null && intent?.[key] !== "") safe[key] = intent[key];
  }
  return safe;
}

function sanitizeRecommendations(entries) {
  return (Array.isArray(entries) ? entries : []).slice(0, 10).map((entry) => ({
    id: sanitizeText(entry?.id, 120),
    name: sanitizeText(entry?.name, 240),
    size: sanitizeText(entry?.size, 80),
    finish: sanitizeText(entry?.finish, 80),
    color: sanitizeText(entry?.color, 80),
    style: sanitizeText(entry?.style, 160),
    material: sanitizeText(entry?.material, 80),
    image: sanitizeText(entry?.image, 2000),
    reasons: (Array.isArray(entry?.reasons) ? entry.reasons : []).slice(0, 6).map((reason) => sanitizeText(reason, 80))
  }));
}

function sanitizeQuantityEstimate(value) {
  if (!value || typeof value !== "object") return null;
  return {
    areaSqm: toSafeNumber(value.areaSqm),
    lossRate: toSafeNumber(value.lossRate),
    orderAreaSqm: toSafeNumber(value.orderAreaSqm),
    boxCount: Math.max(0, Math.round(toSafeNumber(value.boxCount))),
    tileCount: Math.max(0, Math.round(toSafeNumber(value.tileCount)))
  };
}

function toSafeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sanitizeText(value, maxLength = 240) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

module.exports = { createTileSalesProjectStore };
