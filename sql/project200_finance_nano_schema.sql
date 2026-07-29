-- Modelo iLife Financas Nano para Postgres.
-- Fonte operacional usada por /api/200/finance/ledger.

create table if not exists project200_finance_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('INCOME', 'EXPENSE')),
  amount_cents bigint not null check (amount_cents > 0),
  account_name text not null default 'Conta principal',
  category text not null default 'Outros',
  settlement_type text not null check (settlement_type in ('CASH', 'FUTURE')),
  schedule_mode text not null check (schedule_mode in ('ONCE', 'RECURRING', 'FINITE')),
  schedule_frequency text not null default 'NONE' check (schedule_frequency in ('NONE', 'MONTHLY', 'WEEKLY', 'CUSTOM')),
  schedule_config jsonb not null default '{}'::jsonb,
  starts_on date not null,
  ends_on date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table project200_finance_items
  add column if not exists account_name text not null default 'Conta principal';

alter table project200_finance_items
  add column if not exists category text not null default 'Outros';

create index if not exists idx_project200_finance_items_user_dates
  on project200_finance_items(user_id, starts_on, ends_on)
  where deleted_at is null;

create index if not exists idx_project200_finance_items_user_category
  on project200_finance_items(user_id, category)
  where deleted_at is null;

create table if not exists project200_finance_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  item_id uuid not null references project200_finance_items(id) on delete cascade,
  due_on date not null,
  kind text not null check (kind in ('INCOME', 'EXPENSE')),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'SETTLED', 'CANCELLED')),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (item_id, due_on)
);

create index if not exists idx_project200_finance_occurrences_user_due
  on project200_finance_occurrences(user_id, due_on, kind);

create or replace view project200_finance_nano_monthly_view as
select
  o.user_id,
  date_trunc('month', o.due_on)::date as month_on,
  i.account_name,
  i.category,
  o.kind,
  o.status,
  sum(o.amount_cents)::bigint as amount_cents,
  count(*)::integer as occurrence_count
from project200_finance_occurrences o
join project200_finance_items i on i.id = o.item_id
where i.deleted_at is null
  and o.status <> 'CANCELLED'
group by o.user_id, date_trunc('month', o.due_on)::date, i.account_name, i.category, o.kind, o.status;
