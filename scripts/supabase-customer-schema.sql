create extension if not exists pgcrypto;

create table if not exists public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  social_provider text not null,
  social_provider_id text not null default '',
  email text not null default '',
  display_name text not null default '',
  avatar_url text not null default '',
  account_status text not null default 'business_verification_required',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_accounts_provider_identity_unique unique (social_provider, social_provider_id)
);

create unique index if not exists customer_accounts_provider_email_unique
on public.customer_accounts (social_provider, lower(email))
where email <> '';

create index if not exists customer_accounts_email_idx on public.customer_accounts (lower(email));
create index if not exists customer_accounts_status_idx on public.customer_accounts (account_status);

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.customer_accounts(id) on delete set null,
  business_number text not null unique,
  phone text not null default '',
  contact_name text not null default '',
  title text not null default '',
  company_name text not null default '',
  company_address text not null default '',
  representative text not null default '',
  opening_date date,
  business_type text not null default '',
  business_item text not null default '',
  business_category_section text not null default '',
  verification_status text not null default 'pending',
  member_grade text not null default 'B등급',
  price_tier text not null default 'retail',
  pricing_access text not null default 'pending',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_profiles_account_id_idx on public.business_profiles (account_id);
create index if not exists business_profiles_verification_status_idx on public.business_profiles (verification_status);
create index if not exists business_profiles_company_name_idx on public.business_profiles (company_name);

create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.customer_accounts(id) on delete set null,
  business_number text not null,
  file_name text not null default '',
  file_url text not null default '',
  mime_type text not null default '',
  ocr_result jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending',
  uploaded_at timestamptz not null default now()
);

create index if not exists business_documents_account_id_idx on public.business_documents (account_id);
create index if not exists business_documents_business_number_idx on public.business_documents (business_number);
create index if not exists business_documents_review_status_idx on public.business_documents (review_status);

create table if not exists public.signup_requests (
  business_number text primary key,
  account_id uuid references public.customer_accounts(id) on delete set null,
  phone text not null default '',
  name text not null default '',
  title text not null default '',
  company_name text not null default '',
  company_address text not null default '',
  password text not null default '',
  provider text not null default '일반 회원가입',
  social_provider text not null default '',
  social_email text not null default '',
  social_provider_id text not null default '',
  social_name text not null default '',
  social_avatar_url text not null default '',
  extracted_company_name text not null default '',
  extracted_business_address text not null default '',
  representative text not null default '',
  opening_date date,
  business_type text not null default '',
  business_item text not null default '',
  business_category_section text not null default '',
  approval_status text not null default '보류',
  member_grade text not null default 'B등급',
  price_tier text not null default 'retail',
  business_file_name text not null default '',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.signup_requests
add column if not exists account_id uuid references public.customer_accounts(id) on delete set null,
add column if not exists social_provider text not null default '',
add column if not exists social_email text not null default '',
add column if not exists social_provider_id text not null default '',
add column if not exists social_name text not null default '',
add column if not exists social_avatar_url text not null default '',
add column if not exists member_grade text not null default 'B등급',
add column if not exists price_tier text not null default 'retail',
add column if not exists updated_at timestamptz not null default now();

create index if not exists signup_requests_approval_status_idx on public.signup_requests (approval_status);
create index if not exists signup_requests_company_name_idx on public.signup_requests (company_name);
create index if not exists signup_requests_account_id_idx on public.signup_requests (account_id);
create index if not exists signup_requests_social_provider_email_idx on public.signup_requests (social_provider, lower(social_email));

create table if not exists public.approval_settings (
  id text primary key,
  business_types jsonb not null default '[]'::jsonb,
  business_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  business_number text primary key,
  company_name text not null default '',
  cart_data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_order_id text,
  request_fingerprint text,
  order_number text not null unique,
  business_number text not null,
  company_name text not null default '',
  contact_name text not null default '',
  order_status text not null default '접수대기',
  item_count integer not null default 0 constraint orders_item_count_positive check (item_count > 0),
  total_quote numeric(14, 2) not null default 0 constraint orders_total_quote_positive check (total_quote > 0),
  order_note text not null default '',
  source text not null default 'cart',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
add column if not exists client_order_id text;
alter table public.orders
add column if not exists request_fingerprint text;

create unique index if not exists orders_business_client_order_unique
on public.orders (business_number, client_order_id);
create index if not exists orders_business_number_idx on public.orders (business_number);
create index if not exists orders_order_status_idx on public.orders (order_status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  line_number integer not null constraint order_items_line_number_positive check (line_number > 0),
  product_id text not null default '',
  management_code text not null default '',
  product_type text not null default '',
  product_name text not null default '',
  size text not null default '',
  finish text not null default '',
  unit text not null default '',
  qty numeric(14, 3) not null constraint order_items_qty_positive check (qty > 0),
  quote_price numeric(14, 2) not null constraint order_items_quote_price_positive check (quote_price > 0),
  line_total numeric(14, 2) not null constraint order_items_line_total_positive check (line_total > 0),
  stock_qty numeric(14, 3) not null default 0,
  image text not null default '',
  item_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.order_items
add column if not exists line_number integer;
alter table public.order_items
add column if not exists item_data jsonb not null default '{}'::jsonb;

with numbered_items as (
  select id, row_number() over (partition by order_id order by created_at, id)::integer as line_number
  from public.order_items
)
update public.order_items as target
set line_number = numbered_items.line_number
from numbered_items
where target.id = numbered_items.id
  and target.line_number is distinct from numbered_items.line_number;

alter table public.order_items alter column line_number set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass and conname = 'orders_item_count_positive'
  ) then
    alter table public.orders
      add constraint orders_item_count_positive check (item_count > 0) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass and conname = 'orders_total_quote_positive'
  ) then
    alter table public.orders
      add constraint orders_total_quote_positive check (total_quote > 0) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.order_items'::regclass and conname = 'order_items_line_number_positive'
  ) then
    alter table public.order_items
      add constraint order_items_line_number_positive check (line_number > 0) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.order_items'::regclass and conname = 'order_items_qty_positive'
  ) then
    alter table public.order_items
      add constraint order_items_qty_positive check (qty > 0) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.order_items'::regclass and conname = 'order_items_quote_price_positive'
  ) then
    alter table public.order_items
      add constraint order_items_quote_price_positive check (quote_price > 0) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.order_items'::regclass and conname = 'order_items_line_total_positive'
  ) then
    alter table public.order_items
      add constraint order_items_line_total_positive check (line_total > 0) not valid;
  end if;
end;
$$;

create unique index if not exists order_items_order_line_unique
on public.order_items (order_id, line_number);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_management_code_idx on public.order_items (management_code);

alter table public.approval_settings enable row level security;
revoke all on table public.approval_settings from anon, authenticated;
grant all on table public.approval_settings to service_role;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.set_generic_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customer_accounts_updated_at on public.customer_accounts;
create trigger trg_customer_accounts_updated_at
before update on public.customer_accounts
for each row
execute function public.set_generic_updated_at();

drop trigger if exists trg_business_profiles_updated_at on public.business_profiles;
create trigger trg_business_profiles_updated_at
before update on public.business_profiles
for each row
execute function public.set_generic_updated_at();

drop trigger if exists trg_signup_requests_updated_at on public.signup_requests;
create trigger trg_signup_requests_updated_at
before update on public.signup_requests
for each row
execute function public.set_generic_updated_at();

drop trigger if exists trg_approval_settings_updated_at on public.approval_settings;
create trigger trg_approval_settings_updated_at
before update on public.approval_settings
for each row
execute function public.set_generic_updated_at();

drop trigger if exists trg_carts_updated_at on public.carts;
create trigger trg_carts_updated_at
before update on public.carts
for each row
execute function public.set_generic_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_generic_updated_at();

create or replace function public.create_order_with_items(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_items jsonb;
  v_business_number text := nullif(btrim(p_order->>'business_number'), '');
  v_client_order_id text := nullif(btrim(p_order->>'client_order_id'), '');
  v_request_fingerprint text := nullif(btrim(p_order->>'request_fingerprint'), '');
  v_item_count integer := coalesce(jsonb_array_length(p_items), 0);
  v_total numeric(14, 2);
  v_replayed boolean := true;
begin
  if v_business_number is null or v_client_order_id is null or v_request_fingerprint is null then
    raise exception 'INVALID_ORDER_REQUEST' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or v_item_count < 1 then
    raise exception 'INVALID_ORDER_ITEMS' using errcode = '22023';
  end if;

  select coalesce(sum((entry->>'line_total')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) entry;
  if v_total <= 0
     or v_item_count <> coalesce((p_order->>'item_count')::integer, -1)
     or round(v_total, 2) <> round(coalesce((p_order->>'total_quote')::numeric, -1), 2) then
    raise exception 'ORDER_TOTAL_MISMATCH' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_business_number || ':' || v_client_order_id, 0));
  select * into v_order
  from public.orders
  where business_number = v_business_number and client_order_id = v_client_order_id
  for update;

  if found then
    if coalesce(v_order.request_fingerprint, '') <> v_request_fingerprint then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
    end if;
  else
    v_replayed := false;
    insert into public.orders (
      client_order_id, request_fingerprint, order_number, business_number, company_name,
      contact_name, order_status, item_count, total_quote, order_note, source
    ) values (
      v_client_order_id, v_request_fingerprint, p_order->>'order_number', v_business_number,
      coalesce(p_order->>'company_name', ''), coalesce(p_order->>'contact_name', ''),
      coalesce(p_order->>'order_status', '접수대기'), v_item_count, v_total,
      coalesce(p_order->>'order_note', ''), 'cart'
    ) returning * into v_order;

    insert into public.order_items (
      order_id, line_number, product_id, management_code, product_type, product_name,
      size, finish, unit, qty, quote_price, line_total, stock_qty, image, item_data
    )
    select
      v_order.id, x.line_number, coalesce(x.product_id, ''), coalesce(x.management_code, ''),
      coalesce(x.product_type, ''), coalesce(x.product_name, ''), coalesce(x.size, ''),
      coalesce(x.finish, ''), coalesce(x.unit, ''), x.qty, x.quote_price, x.line_total,
      coalesce(x.stock_qty, 0), coalesce(x.image, ''), coalesce(x.item_data, '{}'::jsonb)
    from jsonb_to_recordset(p_items) as x(
      line_number integer, product_id text, management_code text, product_type text,
      product_name text, size text, finish text, unit text, qty numeric,
      quote_price numeric, line_total numeric, stock_qty numeric, image text, item_data jsonb
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(oi) order by oi.line_number), '[]'::jsonb)
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  if jsonb_array_length(v_items) <> v_order.item_count then
    raise exception 'ORDER_ITEM_COUNT_MISMATCH' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', v_items,
    'replayed', v_replayed
  );
end;
$$;

revoke all on function public.create_order_with_items(jsonb, jsonb) from public;
revoke all on function public.create_order_with_items(jsonb, jsonb) from anon;
revoke all on function public.create_order_with_items(jsonb, jsonb) from authenticated;
grant execute on function public.create_order_with_items(jsonb, jsonb) to service_role;
