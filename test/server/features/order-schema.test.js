const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("customer schema provisions durable idempotent order storage with RLS", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../../..", "scripts", "supabase-customer-schema.sql"), "utf8").toLowerCase();

  assert.match(sql, /create table if not exists public\.orders\s*\(/);
  assert.match(sql, /create table if not exists public\.order_items\s*\(/);
  assert.match(sql, /client_order_id text/);
  assert.match(sql, /create unique index if not exists orders_business_client_order_unique/);
  assert.match(sql, /alter table public\.orders enable row level security/);
  assert.match(sql, /alter table public\.order_items enable row level security/);
  assert.match(sql, /create trigger trg_orders_updated_at/);
  assert.match(sql, /check \(quote_price > 0\)/);
  assert.match(sql, /line_number integer not null/);
  assert.match(sql, /create unique index if not exists order_items_order_line_unique/);
});
