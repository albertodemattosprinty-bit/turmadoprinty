create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text unique,
  email text not null unique,
  password_hash text not null,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

alter table users add column if not exists email_verified boolean not null default false;
alter table users add column if not exists username text;
alter table users add column if not exists last_seen_at timestamptz;
create unique index if not exists idx_users_username on users(username);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_user_sessions_user_id on user_sessions(user_id);
create index if not exists idx_user_sessions_expires_at on user_sessions(expires_at);

create table if not exists email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  password_hash text not null,
  code_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_email_verification_codes_email on email_verification_codes(email);
create index if not exists idx_email_verification_codes_expires_at on email_verification_codes(expires_at);

create table if not exists user_album_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  product_id text not null,
  reference_id text not null unique,
  checkout_id text,
  order_id text,
  charge_id text,
  status text not null default 'PENDING',
  amount_cents integer not null default 0,
  pagbank_environment text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_user_album_purchases_user_id on user_album_purchases(user_id);
create index if not exists idx_user_album_purchases_product_id on user_album_purchases(product_id);
create index if not exists idx_user_album_purchases_status on user_album_purchases(status);

create table if not exists user_plan_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plan_id text not null,
  reference_id text not null unique,
  checkout_id text,
  subscription_id text,
  status text not null default 'PENDING',
  amount_cents integer not null default 0,
  pagbank_environment text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  canceled_at timestamptz
);

create index if not exists idx_user_plan_subscriptions_user_id on user_plan_subscriptions(user_id);
create index if not exists idx_user_plan_subscriptions_plan_id on user_plan_subscriptions(plan_id);
create index if not exists idx_user_plan_subscriptions_status on user_plan_subscriptions(status);

create table if not exists payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  resource_id text,
  reference_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_webhook_events_reference_id on payment_webhook_events(reference_id);
create index if not exists idx_payment_webhook_events_event_type on payment_webhook_events(event_type);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists agenda_events (
  id uuid primary key default gen_random_uuid(),
  month_label text not null,
  date_label text not null,
  place text not null,
  city text not null,
  time_label text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_agenda_events_sort_order on agenda_events(sort_order);

create table if not exists user_plan_overrides (
  user_id uuid primary key references users(id) on delete cascade,
  plan_id text not null,
  assigned_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_plan_overrides_plan_id on user_plan_overrides(plan_id);

create table if not exists user_usage_counters (
  user_id uuid primary key references users(id) on delete cascade,
  text_tokens_total bigint not null default 0,
  narration_seconds_total numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists admin_user_notes (
  user_id uuid primary key references users(id) on delete cascade,
  is_contractor boolean not null default false,
  contractor_event_id uuid references agenda_events(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table agenda_events add column if not exists contractor_user_id uuid references users(id) on delete set null;
create index if not exists idx_agenda_events_contractor_user_id on agenda_events(contractor_user_id);
