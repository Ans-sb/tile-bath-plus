const { createHttpError } = require("../http-errors");

function sameStringArray(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function createApprovalRulesService({
  cloneApprovalRules,
  defaultApprovalRules,
  hasSupabaseConfig,
  isMissingSupabaseTableError,
  normalizeStringArray,
  persistenceEnabled = () => true,
  requestSupabase
}) {
  return {
    async readApprovalRules() {
      if (!persistenceEnabled()) {
        return { ...cloneApprovalRules(defaultApprovalRules), source: "disabled" };
      }
      if (!hasSupabaseConfig()) {
        return { ...cloneApprovalRules(defaultApprovalRules), source: "local-default" };
      }

      let rows = [];
      try {
        const query = new URLSearchParams({
          select: "id,business_types,business_items,updated_at",
          id: "eq.default"
        });
        rows = await requestSupabase(`/rest/v1/approval_settings?${query.toString()}`);
      } catch (error) {
        if (isMissingSupabaseTableError(error, "approval_settings")) {
          return { ...cloneApprovalRules(defaultApprovalRules), source: "missing-default" };
        }
        console.warn("[approval-rules] Supabase read failed; using local defaults.", error.message);
        return { ...cloneApprovalRules(defaultApprovalRules), source: "supabase-fallback-default" };
      }
      const row = Array.isArray(rows) ? rows[0] : null;
      return {
        businessTypes: Array.isArray(row?.business_types) && row.business_types.length
          ? row.business_types
          : defaultApprovalRules.businessTypes,
        businessItems: Array.isArray(row?.business_items) && row.business_items.length
          ? row.business_items
          : defaultApprovalRules.businessItems,
        updatedAt: row?.updated_at || "",
        source: row ? "supabase" : "empty-default"
      };
    },

    async saveApprovalRules(payload) {
      if (!persistenceEnabled()) {
        throw createHttpError(503, "승인 규칙 저장은 데이터베이스 보안 마이그레이션 후 사용할 수 있습니다.");
      }
      const businessTypes = normalizeStringArray(payload?.businessTypes);
      const businessItems = normalizeStringArray(payload?.businessItems);

      if (!hasSupabaseConfig()) {
        throw createHttpError(503, "승인 규칙 저장소가 준비되지 않았습니다.");
      }

      let rows;
      try {
        rows = await requestSupabase("/rest/v1/approval_settings", {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation"
          },
          body: JSON.stringify([{
            id: "default",
            business_types: businessTypes,
            business_items: businessItems
          }])
        });
      } catch (error) {
        if (isMissingSupabaseTableError(error, "approval_settings")) {
          throw createHttpError(503, "승인 규칙 저장소가 준비되지 않았습니다.");
        }
        throw error;
      }

      const row = Array.isArray(rows) ? rows[0] : null;
      const verified = row?.id === "default"
        && sameStringArray(row.business_types, businessTypes)
        && sameStringArray(row.business_items, businessItems);
      if (!verified) {
        throw createHttpError(503, "승인 규칙 저장 결과를 확인하지 못했습니다.");
      }

      return {
        businessTypes: row.business_types,
        businessItems: row.business_items,
        updatedAt: row.updated_at || "",
        source: "supabase"
      };
    }
  };
}

module.exports = {
  createApprovalRulesService
};
