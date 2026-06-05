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
  member_grade text not null default '사업자',
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
  member_grade text not null default '사업자',
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
add column if not exists member_grade text not null default '사업자',
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
