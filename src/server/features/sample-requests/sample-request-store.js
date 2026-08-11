const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const SAMPLE_REQUEST_STATUSES = Object.freeze(["접수", "확인중", "발송준비", "배송중", "완료", "취소"]);

function createSampleRequestStore({ filePath, now = () => new Date() } = {}) {
  let writeQueue = Promise.resolve();

  async function readRows() {
    try {
      const rows = JSON.parse(await fs.readFile(filePath, "utf8"));
      return Array.isArray(rows) ? rows : [];
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

  async function createRequest(input = {}) {
    const owner = normalizeOwner(input.owner);
    const items = sanitizeItems(input.items);
    if (!owner.id) throw createStoreError("샘플 신청 회원을 확인할 수 없습니다.", 401);
    if (!input.projectId) throw createStoreError("샘플을 신청할 현장 프로젝트가 필요합니다.", 400);
    if (!items.length) throw createStoreError("신청할 샘플 상품을 선택해주세요.", 400);

    return mutate((rows) => {
      const currentTime = now().toISOString();
      const request = {
        id: crypto.randomUUID(),
        requestNumber: buildRequestNumber(rows, currentTime),
        owner,
        businessNumber: sanitizeText(input.businessNumber, 40),
        companyName: sanitizeText(input.companyName, 120),
        projectId: sanitizeText(input.projectId, 80),
        projectTitle: sanitizeText(input.projectTitle, 120) || "현장 샘플 신청",
        site: sanitizeSite(input.site),
        recipient: sanitizeRecipient(input.recipient),
        requestedDate: sanitizeDate(input.requestedDate),
        note: sanitizeText(input.note, 1000),
        status: "접수",
        tracking: { carrier: "", number: "" },
        items,
        createdAt: currentTime,
        updatedAt: currentTime
      };
      rows.unshift(request);
      rows.splice(2000);
      return sanitizeCustomerRequest(request);
    });
  }

  async function listRequests(owner, { limit = 100 } = {}) {
    const cleanOwner = normalizeOwner(owner);
    if (!cleanOwner.id) return [];
    const safeLimit = Math.min(200, Math.max(1, Math.round(Number(limit) || 100)));
    const rows = await readRows();
    return rows
      .filter((row) => isSameOwner(row.owner, cleanOwner))
      .sort(compareUpdatedAt)
      .slice(0, safeLimit)
      .map(sanitizeCustomerRequest);
  }

  async function listAllRequests({ limit = 500 } = {}) {
    const safeLimit = Math.min(2000, Math.max(1, Math.round(Number(limit) || 500)));
    return (await readRows())
      .sort(compareUpdatedAt)
      .slice(0, safeLimit)
      .map(sanitizeAdminRequest);
  }

  async function updateRequest(input = {}, reviewer = "") {
    const id = sanitizeText(input.id || input.requestId, 80);
    const status = sanitizeStatus(input.status);
    if (!id) throw createStoreError("처리할 샘플 신청을 찾을 수 없습니다.", 400);
    if (!status) throw createStoreError("올바른 샘플 처리 상태가 필요합니다.", 400);

    return mutate((rows) => {
      const row = rows.find((entry) => entry.id === id);
      if (!row) throw createStoreError("샘플 신청을 찾을 수 없습니다.", 404);
      row.status = status;
      row.tracking = {
        carrier: sanitizeText(input.carrier ?? row.tracking?.carrier, 80),
        number: sanitizeText(input.trackingNumber ?? row.tracking?.number, 120)
      };
      row.adminNote = sanitizeText(input.adminNote ?? row.adminNote, 1000);
      row.reviewedBy = sanitizeText(reviewer, 120);
      row.updatedAt = now().toISOString();
      return sanitizeAdminRequest(row);
    });
  }

  return { createRequest, listAllRequests, listRequests, updateRequest };
}

function buildRequestNumber(rows, isoTime) {
  const dateKey = String(isoTime).slice(0, 10).replace(/-/g, "");
  const count = rows.filter((row) => String(row.requestNumber || "").startsWith(`S${dateKey}`)).length + 1;
  return `S${dateKey}-${String(count).padStart(4, "0")}`;
}

function sanitizeCustomerRequest(row) {
  return {
    id: sanitizeText(row?.id, 80),
    requestNumber: sanitizeText(row?.requestNumber, 40),
    businessNumber: sanitizeText(row?.businessNumber, 40),
    companyName: sanitizeText(row?.companyName, 120),
    projectId: sanitizeText(row?.projectId, 80),
    projectTitle: sanitizeText(row?.projectTitle, 120),
    site: sanitizeSite(row?.site),
    recipient: sanitizeRecipient(row?.recipient),
    requestedDate: sanitizeDate(row?.requestedDate),
    note: sanitizeText(row?.note, 1000),
    status: sanitizeStatus(row?.status) || "접수",
    tracking: {
      carrier: sanitizeText(row?.tracking?.carrier, 80),
      number: sanitizeText(row?.tracking?.number, 120)
    },
    items: sanitizeItems(row?.items),
    createdAt: sanitizeText(row?.createdAt, 40),
    updatedAt: sanitizeText(row?.updatedAt, 40)
  };
}

function sanitizeAdminRequest(row) {
  return {
    ...sanitizeCustomerRequest(row),
    adminNote: sanitizeText(row?.adminNote, 1000),
    reviewedBy: sanitizeText(row?.reviewedBy, 120)
  };
}

function sanitizeItems(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).slice(0, 20).flatMap((item) => {
    const id = sanitizeText(item?.id, 120);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      code: sanitizeText(item?.code || item?.managementCode, 80),
      name: sanitizeText(item?.name, 240),
      size: sanitizeText(item?.size, 80),
      finish: sanitizeText(item?.finish, 80),
      color: sanitizeText(item?.color, 80),
      style: sanitizeText(item?.style || item?.patternCategory, 160),
      material: sanitizeText(item?.material, 80),
      image: sanitizeText(item?.image, 2000),
      quantity: Math.min(20, Math.max(1, Math.round(Number(item?.quantity) || 1)))
    }];
  });
}

function sanitizeSite(site) {
  return {
    clientName: sanitizeText(site?.clientName, 120),
    siteName: sanitizeText(site?.siteName, 120),
    siteAddress: sanitizeText(site?.siteAddress, 240),
    spaceType: sanitizeText(site?.spaceType, 60),
    neededBy: sanitizeDate(site?.neededBy)
  };
}

function sanitizeRecipient(recipient) {
  return {
    name: sanitizeText(recipient?.name, 80),
    contact: sanitizeText(recipient?.contact, 80),
    address: sanitizeText(recipient?.address, 240),
    addressDetail: sanitizeText(recipient?.addressDetail, 160)
  };
}

function normalizeOwner(owner) {
  return {
    type: ["member", "admin"].includes(owner?.type) ? owner.type : "member",
    id: sanitizeText(owner?.id, 160)
  };
}

function isSameOwner(left, right) {
  return String(left?.type || "") === right.type && String(left?.id || "") === right.id;
}

function sanitizeStatus(value) {
  const status = sanitizeText(value, 40);
  return SAMPLE_REQUEST_STATUSES.includes(status) ? status : "";
}

function sanitizeDate(value) {
  const date = sanitizeText(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function compareUpdatedAt(left, right) {
  return String(right?.updatedAt || right?.createdAt || "").localeCompare(String(left?.updatedAt || left?.createdAt || ""));
}

function sanitizeText(value, maxLength = 240) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function createStoreError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = { SAMPLE_REQUEST_STATUSES, createSampleRequestStore };
