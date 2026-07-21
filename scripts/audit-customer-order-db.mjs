import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] == null) process.env[match[1]] = value;
  }
}

function isBlank(value) {
  return !String(value ?? "").trim();
}

function countBy(rows, selector) {
  return rows.reduce((map, row) => {
    const key = String(selector(row) || "미분류");
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
}

function createHashLabel(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return `biz-${Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8)}`;
}

async function readSupabaseRows(table, select = "*") {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
  if (!url || !key) {
    return { table, ok: false, missingConfig: true, rows: [], error: "Supabase 환경변수가 없습니다." };
  }

  const rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const response = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + pageSize - 1}`
      }
    });
    const text = await response.text();
    if (!response.ok) {
      return { table, ok: false, rows: [], error: `${response.status} ${text.slice(0, 240)}` };
    }
    const page = text ? JSON.parse(text) : [];
    rows.push(...page);
    if (!Array.isArray(page) || page.length < pageSize) break;
    from += pageSize;
  }
  return { table, ok: true, rows };
}

function summarizeRows({ accounts, signups, profiles, documents, carts, orders, orderItems }) {
  const signupByBusinessNumber = new Map(signups.map((row) => [String(row.business_number || "").trim(), row]));
  const profileByBusinessNumber = new Map(profiles.map((row) => [String(row.business_number || "").trim(), row]));
  const documentsByBusinessNumber = documents.reduce((map, row) => {
    const key = String(row.business_number || "").trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
    return map;
  }, new Map());
  const orderIds = new Set(orders.map((row) => String(row.id || "").trim()).filter(Boolean));

  const approvedSignups = signups.filter((row) => String(row.approval_status || "").trim() === "승인");
  const pendingSignups = signups.filter((row) => String(row.approval_status || "").trim() !== "승인");

  const cartsSummary = carts.map((row) => {
    const items = Array.isArray(row.cart_data) ? row.cart_data : [];
    return {
      businessNumber: String(row.business_number || "").trim(),
      itemCount: items.length,
      totalQuote: items.reduce((sum, item) => sum + (Number(item.quotePrice || item.price || 0) * Number(item.qty || 0)), 0)
    };
  });

  return {
    counts: {
      customerAccounts: accounts.length,
      signupRequests: signups.length,
      businessProfiles: profiles.length,
      businessDocuments: documents.length,
      carts: carts.length,
      cartItems: cartsSummary.reduce((sum, row) => sum + row.itemCount, 0),
      orders: orders.length,
      orderItems: orderItems.length
    },
    distributions: {
      accountStatus: countBy(accounts, (row) => row.account_status),
      signupApproval: countBy(signups, (row) => row.approval_status),
      profileVerification: countBy(profiles, (row) => row.verification_status),
      profilePricingAccess: countBy(profiles, (row) => row.pricing_access),
      documentReview: countBy(documents, (row) => row.review_status),
      orderStatus: countBy(orders, (row) => row.order_status)
    },
    missing: {
      signupBusinessNumber: signups.filter((row) => isBlank(row.business_number)).length,
      signupCompanyName: signups.filter((row) => isBlank(row.company_name)).length,
      signupContactName: signups.filter((row) => isBlank(row.name)).length,
      signupPhone: signups.filter((row) => isBlank(row.phone)).length,
      signupBusinessFileName: signups.filter((row) => isBlank(row.business_file_name)).length,
      profileBusinessNumber: profiles.filter((row) => isBlank(row.business_number)).length,
      profileCompanyName: profiles.filter((row) => isBlank(row.company_name)).length,
      profileContactName: profiles.filter((row) => isBlank(row.contact_name)).length,
      documentFileUrl: documents.filter((row) => isBlank(row.file_url)).length,
      cartBusinessNumber: carts.filter((row) => isBlank(row.business_number)).length,
      orderBusinessNumber: orders.filter((row) => isBlank(row.business_number)).length,
      orderNumber: orders.filter((row) => isBlank(row.order_number)).length
    },
    consistency: {
      approvedSignups: approvedSignups.length,
      pendingSignups: pendingSignups.length,
      approvedWithoutProfile: approvedSignups.filter((row) => !profileByBusinessNumber.has(String(row.business_number || "").trim())).length,
      approvedWithoutPricing: approvedSignups.filter((row) => {
        const profile = profileByBusinessNumber.get(String(row.business_number || "").trim());
        return !profile || String(profile.pricing_access || "").trim() !== "approved";
      }).length,
      approvedWithoutDocument: approvedSignups.filter((row) => {
        const businessNumber = String(row.business_number || "").trim();
        return isBlank(row.business_file_name) && !(documentsByBusinessNumber.get(businessNumber) || []).length;
      }).length,
      cartsWithoutSignup: cartsSummary.filter((row) => row.businessNumber && !signupByBusinessNumber.has(row.businessNumber)).length,
      cartsWithoutProfile: cartsSummary.filter((row) => row.businessNumber && !profileByBusinessNumber.has(row.businessNumber)).length,
      emptyCarts: cartsSummary.filter((row) => row.itemCount === 0).length,
      orderItemsWithoutOrder: orderItems.filter((row) => !orderIds.has(String(row.order_id || "").trim())).length
    },
    reviewSamples: {
      approvedMembers: approvedSignups.slice(0, 5).map((row) => ({
        business: createHashLabel(row.business_number),
        profileStatus: profileByBusinessNumber.get(String(row.business_number || "").trim())?.verification_status || "NO_PROFILE",
        pricingAccess: profileByBusinessNumber.get(String(row.business_number || "").trim())?.pricing_access || "NO_PROFILE"
      })),
      orderCandidates: cartsSummary.slice(0, 5).map((row) => ({
        business: createHashLabel(row.businessNumber),
        itemCount: row.itemCount,
        totalQuote: row.totalQuote
      }))
    }
  };
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env"));
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const results = await Promise.all([
    readSupabaseRows("customer_accounts", "id,social_provider,account_status,last_login_at,created_at,updated_at"),
    readSupabaseRows("signup_requests", "business_number,account_id,phone,name,company_name,provider,social_provider,approval_status,member_grade,price_tier,business_file_name,submitted_at,updated_at"),
    readSupabaseRows("business_profiles", "account_id,business_number,contact_name,company_name,verification_status,member_grade,price_tier,pricing_access,approved_at,created_at,updated_at"),
    readSupabaseRows("business_documents", "account_id,business_number,file_name,file_url,mime_type,review_status,uploaded_at"),
    readSupabaseRows("carts", "business_number,company_name,cart_data,updated_at"),
    readSupabaseRows("orders", "id,order_number,business_number,company_name,contact_name,order_status,item_count,total_quote,order_note,created_at,updated_at"),
    readSupabaseRows("order_items", "id,order_id,product_id,management_code,product_type,product_name,qty,quote_price,line_total,created_at")
  ]);

  const [accounts, signups, profiles, documents, carts, orders, orderItems] = results;
  const schema = {
    customerAccounts: accounts.ok,
    signupRequests: signups.ok,
    businessProfiles: profiles.ok,
    businessDocuments: documents.ok,
    carts: carts.ok,
    orders: orders.ok,
    orderItems: orderItems.ok
  };
  const errors = Object.fromEntries(results.filter((result) => !result.ok).map((result) => [result.table, result.error]));
  const summary = summarizeRows({
    accounts: accounts.rows,
    signups: signups.rows,
    profiles: profiles.rows,
    documents: documents.rows,
    carts: carts.rows,
    orders: orders.rows,
    orderItems: orderItems.rows
  });

  console.log(JSON.stringify({
    ok: Object.values(schema).every(Boolean),
    checkedAt: new Date().toISOString(),
    schema,
    errors,
    ...summary
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
