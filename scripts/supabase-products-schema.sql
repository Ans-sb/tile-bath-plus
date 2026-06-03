create table if not exists public.products (
  id text primary key,
  management_code text not null default '',
  product_type text not null,
  kind text not null,
  name text not null,
  size text not null default '',
  model_name text not null default '',
  material text not null default '',
  surface text not null default '',
  pattern_category text not null default '',
  country_of_origin text not null default '',
  pcs_per_box integer,
  sqm_per_box numeric,
  color text not null default '',
  features text not null default '',
  finish text not null default '',
  maker text not null,
  unit text not null,
  option_text text not null default '',
  cost_price integer not null default 0,
  retail_price integer not null default 0,
  wholesale_price integer not null default 0,
  stock_qty integer not null default 0,
  stock_text text not null default '',
  grade_a_price integer,
  grade_b_price integer,
  grade_c_price integer,
  image text not null default '',
  image_urls jsonb not null default '[]'::jsonb,
  original_image text not null default '',
  close_image text not null default '',
  detail_image text not null default '',
  daylight_image text not null default '',
  fluorescent_image text not null default '',
  scene_image text not null default '',
  source_site text not null default '',
  source_url text not null default '',
  source_product_id text not null default '',
  source_category_code text not null default '',
  source_category_name text not null default '',
  catalog_source text not null default '',
  catalog_page integer not null default 0,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add column if not exists management_code text not null default '';

alter table public.products
add column if not exists model_name text not null default '',
add column if not exists material text not null default '',
add column if not exists surface text not null default '',
add column if not exists pattern_category text not null default '',
add column if not exists country_of_origin text not null default '',
add column if not exists pcs_per_box integer,
add column if not exists sqm_per_box numeric,
add column if not exists color text not null default '',
add column if not exists features text not null default '',
add column if not exists stock_text text not null default '',
add column if not exists grade_a_price integer,
add column if not exists grade_b_price integer,
add column if not exists grade_c_price integer,
add column if not exists image_urls jsonb not null default '[]'::jsonb,
add column if not exists source_site text not null default '',
add column if not exists source_url text not null default '',
add column if not exists source_product_id text not null default '',
add column if not exists source_category_code text not null default '',
add column if not exists source_category_name text not null default '',
add column if not exists last_synced_at timestamptz;

create index if not exists products_product_type_idx on public.products (product_type);
create index if not exists products_management_code_idx on public.products (management_code);
create index if not exists products_kind_idx on public.products (kind);
create index if not exists products_name_idx on public.products (name);
create index if not exists products_catalog_source_idx on public.products (catalog_source);
create index if not exists products_source_product_id_idx on public.products (source_product_id);
create index if not exists products_pattern_category_idx on public.products (pattern_category);

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;

create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_products_updated_at();

create table if not exists public.approval_settings (
  id text primary key,
  business_types jsonb not null default '[]'::jsonb,
  business_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.signup_requests (
  business_number text primary key,
  phone text not null default '',
  name text not null default '',
  title text not null default '',
  company_name text not null default '',
  company_address text not null default '',
  password text not null default '',
  provider text not null default '일반 회원가입',
  extracted_company_name text not null default '',
  extracted_business_address text not null default '',
  representative text not null default '',
  opening_date date,
  business_type text not null default '',
  business_item text not null default '',
  business_category_section text not null default '',
  approval_status text not null default '보류',
  business_file_name text not null default '',
  submitted_at timestamptz not null default now()
);

create index if not exists signup_requests_approval_status_idx on public.signup_requests (approval_status);
create index if not exists signup_requests_company_name_idx on public.signup_requests (company_name);

create table if not exists public.carts (
  business_number text primary key,
  company_name text not null default '',
  cart_data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_generic_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
