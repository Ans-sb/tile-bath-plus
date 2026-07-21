function createApprovalRulesService({
  cloneApprovalRules,
  defaultApprovalRules,
  hasSupabaseConfig,
  isMissingSupabaseTableError,
  normalizeStringArray,
  requestSupabase
}) {
  return {
    async readApprovalRules() {
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
      const businessTypes = normalizeStringArray(payload?.businessTypes);
      const businessItems = normalizeStringArray(payload?.businessItems);

      if (hasSupabaseConfig()) {
        try {
          await requestSupabase("/rest/v1/approval_settings", {
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
          if (!isMissingSupabaseTableError(error, "approval_settings")) throw error;
          return { businessTypes, businessItems, source: "missing" };
        }
      }

      return {
        businessTypes,
        businessItems,
        source: hasSupabaseConfig() ? "supabase" : "local"
      };
    }
  };
}

module.exports = {
  createApprovalRulesService
};
