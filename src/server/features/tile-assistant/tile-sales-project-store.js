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

  async function listProjects(owner, { limit = 30 } = {}) {
    const cleanOwner = normalizeOwner(owner);
    if (!cleanOwner.id) return [];
    const safeLimit = Math.min(50, Math.max(1, Math.round(Number(limit) || 30)));
    const rows = await readRows();
    return rows
      .filter((row) => isSameOwner(row.owner, cleanOwner))
      .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))
      .slice(0, safeLimit)
      .map(summarizeProjectRow);
  }

  async function createProject({ owner, site } = {}) {
    const cleanOwner = normalizeOwner(owner);
    if (!cleanOwner.id) return null;
    const cleanSite = sanitizeSite(site);

    return mutate((rows) => {
      const currentTime = now().toISOString();
      const project = createEmptyProject({
        owner: cleanOwner,
        currentTime,
        title: cleanSite.siteName || cleanSite.clientName || "새 현장 상담",
        site: cleanSite
      });
      if (cleanSite.spaceType) project.intent.space = cleanSite.spaceType;
      rows.unshift(project);
      rows.splice(500);
      return project;
    });
  }

  async function updateProject({ projectId, owner, site } = {}) {
    const cleanOwner = normalizeOwner(owner);
    const cleanProjectId = sanitizeText(projectId, 80);
    if (!cleanOwner.id || !cleanProjectId) return null;

    return mutate((rows) => {
      const project = rows.find((row) => row.id === cleanProjectId && isSameOwner(row.owner, cleanOwner));
      if (!project) return null;
      const cleanSite = sanitizeSite(site);
      project.site = cleanSite;
      project.title = cleanSite.siteName || cleanSite.clientName || project.title || "현장 타일 프로젝트";
      project.intent = sanitizeIntent({ ...project.intent, ...(cleanSite.spaceType ? { space: cleanSite.spaceType } : {}) });
      project.updatedAt = now().toISOString();
      rows.sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
      return project;
    });
  }

  async function setSelectedProduct({ projectId, owner, product, selected = true } = {}) {
    const cleanOwner = normalizeOwner(owner);
    const cleanProjectId = sanitizeText(projectId, 80);
    const cleanProduct = sanitizeRecommendations([product], 1)[0];
    if (!cleanOwner.id || !cleanProjectId || !cleanProduct?.id) return null;

    return mutate((rows) => {
      const project = rows.find((row) => row.id === cleanProjectId && isSameOwner(row.owner, cleanOwner));
      if (!project) return null;
      project.selectedProducts = sanitizeRecommendations(project.selectedProducts, 30);
      const currentIndex = project.selectedProducts.findIndex((entry) => entry.id === cleanProduct.id);
      if (selected && currentIndex < 0) project.selectedProducts.push(cleanProduct);
      if (selected && currentIndex >= 0) project.selectedProducts[currentIndex] = cleanProduct;
      if (!selected && currentIndex >= 0) project.selectedProducts.splice(currentIndex, 1);
      project.selectedProducts = project.selectedProducts.slice(0, 30);
      project.updatedAt = now().toISOString();
      rows.sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
      return project;
    });
  }

  async function saveTurn({ projectId, owner, userMessage, result }) {
    const cleanOwner = normalizeOwner(owner);
    if (!cleanOwner.id) return null;

    return mutate((rows) => {
      const currentTime = now().toISOString();
      const cleanProjectId = sanitizeText(projectId, 80);
      let project = rows.find((row) => row.id === cleanProjectId && isSameOwner(row.owner, cleanOwner));
      if (!project) {
        project = createEmptyProject({
          owner: cleanOwner,
          currentTime,
          title: buildProjectTitle(result?.intent, userMessage)
        });
        rows.unshift(project);
      }

      project.site = sanitizeSite(project.site);
      project.selectedProducts = sanitizeRecommendations(project.selectedProducts, 30);
      project.title = project.site.siteName || buildProjectTitle(result?.intent, userMessage, project.title);
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

  return { createProject, listProjects, readProject, saveTurn, setSelectedProduct, updateProject };
}

function createEmptyProject({ owner, currentTime, title, site = {} }) {
  return {
    id: crypto.randomUUID(),
    owner,
    title: sanitizeText(title, 120) || "새 현장 상담",
    status: "상담중",
    stage: "조건확인",
    site: sanitizeSite(site),
    intent: {},
    messages: [],
    recommendations: [],
    selectedProducts: [],
    quantityEstimate: null,
    createdAt: currentTime,
    updatedAt: currentTime
  };
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

function sanitizeSite(site) {
  const neededBy = sanitizeText(site?.neededBy, 20);
  return {
    clientName: sanitizeText(site?.clientName, 120),
    siteName: sanitizeText(site?.siteName, 120),
    siteAddress: sanitizeText(site?.siteAddress, 240),
    spaceType: sanitizeText(site?.spaceType, 60),
    neededBy: /^\d{4}-\d{2}-\d{2}$/.test(neededBy) ? neededBy : "",
    notes: sanitizeText(site?.notes, 1000)
  };
}

function sanitizeRecommendations(entries, limit = 10) {
  const safeLimit = Math.min(30, Math.max(1, Math.round(Number(limit) || 10)));
  return (Array.isArray(entries) ? entries : []).slice(0, safeLimit).map((entry) => ({
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

function summarizeProjectRow(project) {
  return {
    id: sanitizeText(project?.id, 80),
    title: sanitizeText(project?.title, 120) || "현장 타일 프로젝트",
    status: sanitizeText(project?.status, 40) || "상담중",
    stage: sanitizeText(project?.stage, 40) || "조건확인",
    site: sanitizeSite(project?.site),
    selectedProductCount: sanitizeRecommendations(project?.selectedProducts, 30).length,
    updatedAt: sanitizeText(project?.updatedAt, 40)
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
