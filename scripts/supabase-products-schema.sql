create table if not exists public.products (
  id text primary key,
  management_code text not null default '',
  product_type text not null,
  kind text not null,
  name text not null,
  size text not null default '',
  finish text not null default '',
  maker text not null,
  unit text not null,
  option_text text not null default '',
  cost_price integer not null default 0,
  retail_price integer not null default 0,
  wholesale_price integer not null default 0,
  stock_qty integer not null default 0,
  image text not null default '',
  original_image text not null default '',
  close_image text not null default '',
  detail_image text not null default '',
  daylight_image text not null default '',
  fluorescent_image text not null default '',
  scene_image text not null default '',
  catalog_source text not null default '',
  catalog_page integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add column if not exists management_code text not null default '';

create index if not exists products_product_type_idx on public.products (product_type);
create index if not exists products_management_code_idx on public.products (management_code);
create index if not exists products_kind_idx on public.products (kind);
create index if not exists products_name_idx on public.products (name);

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
