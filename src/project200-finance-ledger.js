import { query } from "./db.js";

const ITEM_KINDS = new Set(["INCOME", "EXPENSE"]);
const SETTLEMENT_TYPES = new Set(["CASH", "FUTURE"]);
const SCHEDULE_MODES = new Set(["ONCE", "RECURRING", "FINITE"]);
const SCHEDULE_FREQUENCIES = new Set(["NONE", "MONTHLY", "WEEKLY", "CUSTOM"]);
const CUSTOM_MODES = new Set(["MONTHLY", "WEEKLY", "DAILY"]);

function normalizeEnum(value, allowed, label) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!allowed.has(normalized)) throw new Error(`${label} invalido.`);
  return normalized;
}

function normalizeDateOnly(value, label) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(`${label} invalida.`);
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label} invalida.`);
  }
  return raw;
}

function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeAmountCents(value) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 999999999999) {
    throw new Error("Valor invalido.");
  }
  return amount;
}

function normalizeIntegerList(values, min, max) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= min && value <= max))]
    .sort((a, b) => a - b);
}

function normalizeScheduleConfig(rawConfig, frequency, startsOn) {
  const raw = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
  const config = {};

  if (frequency === "MONTHLY") {
    config.daysOfMonth = normalizeIntegerList(raw.daysOfMonth, 1, 31);
    if (!config.daysOfMonth.length) config.daysOfMonth = [Number(startsOn.slice(8, 10))];
  }

  if (frequency === "WEEKLY") {
    config.weekdays = normalizeIntegerList(raw.weekdays, 0, 6);
    if (!config.weekdays.length) {
      const [year, month, day] = startsOn.split("-").map(Number);
      config.weekdays = [new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    }
  }

  if (frequency === "CUSTOM") {
    config.customMode = normalizeEnum(raw.customMode || "MONTHLY", CUSTOM_MODES, "Personalizacao");
    config.daysOfMonth = normalizeIntegerList(raw.daysOfMonth, 1, 31);
    config.weekdays = normalizeIntegerList(raw.weekdays, 0, 6);
    config.dates = [...new Set((Array.isArray(raw.dates) ? raw.dates : [])
      .map((value) => {
        try { return normalizeDateOnly(value, "Data personalizada"); } catch { return null; }
      })
      .filter(Boolean))].sort();

    if (config.customMode === "MONTHLY" && !config.daysOfMonth.length) {
      throw new Error("Escolha pelo menos um dia do mes.");
    }
    if (config.customMode === "WEEKLY" && !config.weekdays.length) {
      throw new Error("Escolha pelo menos um dia da semana.");
    }
    if (config.customMode === "DAILY" && !config.dates.length) {
      throw new Error("Adicione pelo menos uma data.");
    }
  }

  return config;
}

function addUtcDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function dateOnlyToUtc(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function resolveDatesForItem(item, rangeStart, rangeEnd) {
  const start = dateOnlyToUtc(item.startsOn > rangeStart ? item.startsOn : rangeStart);
  const endLimit = item.endsOn && item.endsOn < rangeEnd ? item.endsOn : rangeEnd;
  const end = dateOnlyToUtc(endLimit);
  const dates = new Set();

  if (end < start) return [];

  if (item.scheduleMode === "ONCE") {
    if (item.startsOn >= rangeStart && item.startsOn <= rangeEnd) dates.add(item.startsOn);
    return [...dates];
  }

  const config = item.scheduleConfig || {};
  const customMode = item.scheduleFrequency === "CUSTOM" ? config.customMode : "";

  if (item.scheduleFrequency === "MONTHLY" || customMode === "MONTHLY") {
    const requestedDays = normalizeIntegerList(config.daysOfMonth, 1, 31);
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const lastMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    while (cursor <= lastMonth) {
      const maxDay = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
      for (const requestedDay of requestedDays) {
        const date = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), Math.min(requestedDay, maxDay)));
        const key = date.toISOString().slice(0, 10);
        if (date >= start && date <= end) dates.add(key);
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  } else if (item.scheduleFrequency === "WEEKLY" || customMode === "WEEKLY") {
    const weekdays = new Set(normalizeIntegerList(config.weekdays, 0, 6));
    for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
      if (weekdays.has(cursor.getUTCDay())) dates.add(cursor.toISOString().slice(0, 10));
    }
  } else if (customMode === "DAILY") {
    for (const date of Array.isArray(config.dates) ? config.dates : []) {
      if (date >= rangeStart && date <= rangeEnd && date >= item.startsOn && (!item.endsOn || date <= item.endsOn)) dates.add(date);
    }
  }

  return [...dates].sort();
}

function getProject200TodayKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeItemRow(row) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    amountCents: Number(row.amount_cents || 0),
    settlementType: row.settlement_type,
    scheduleMode: row.schedule_mode,
    scheduleFrequency: row.schedule_frequency,
    scheduleConfig: row.schedule_config || {},
    startsOn: toDateOnly(row.starts_on),
    endsOn: toDateOnly(row.ends_on),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
  };
}

export async function ensureProject200FinanceLedgerSchema() {
  await query(`
    create table if not exists project200_finance_items (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      title text not null,
      kind text not null check (kind in ('INCOME', 'EXPENSE')),
      amount_cents bigint not null check (amount_cents > 0),
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
  `);
  await query("create index if not exists idx_project200_finance_items_user_dates on project200_finance_items(user_id, starts_on, ends_on) where deleted_at is null;");
  await query(`
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
  `);
  await query("create index if not exists idx_project200_finance_occurrences_user_due on project200_finance_occurrences(user_id, due_on, kind);");
}

async function insertOccurrence(userId, item, dueOn, status = "SCHEDULED") {
  await query(`
    insert into project200_finance_occurrences (user_id, item_id, due_on, kind, amount_cents, status, settled_at)
    values ($1,$2,$3::date,$4,$5,$6,case when $6 = 'SETTLED' then now() else null end)
    on conflict (item_id, due_on) do nothing
  `, [userId, item.id, dueOn, item.kind, item.amountCents, status]);
}

export async function createProject200FinanceItem(userId, payload) {
  await ensureProject200FinanceLedgerSchema();
  const kind = normalizeEnum(payload?.kind, ITEM_KINDS, "Natureza");
  const settlementType = normalizeEnum(payload?.settlementType, SETTLEMENT_TYPES, "Momento");
  const scheduleMode = settlementType === "CASH"
    ? "ONCE"
    : normalizeEnum(payload?.scheduleMode || "ONCE", SCHEDULE_MODES, "Agenda");
  const scheduleFrequency = scheduleMode === "ONCE"
    ? "NONE"
    : normalizeEnum(payload?.scheduleFrequency || "MONTHLY", SCHEDULE_FREQUENCIES, "Frequencia");
  if (scheduleMode !== "ONCE" && scheduleFrequency === "NONE") throw new Error("Escolha uma frequencia.");

  const today = new Date().toISOString().slice(0, 10);
  const startsOn = normalizeDateOnly(payload?.startsOn || payload?.dueOn || today, "Data inicial");
  const endsOn = scheduleMode === "FINITE" ? normalizeDateOnly(payload?.endsOn, "Data final") : null;
  if (endsOn && endsOn < startsOn) throw new Error("A data final precisa vir depois da inicial.");
  const scheduleConfig = normalizeScheduleConfig(payload?.scheduleConfig, scheduleFrequency, startsOn);
  const title = String(payload?.title || "").trim().slice(0, 90);
  if (title.length < 2) throw new Error("Digite uma descricao para o lancamento.");
  const amountCents = normalizeAmountCents(payload?.amountCents);

  const result = await query(`
    insert into project200_finance_items (
      user_id, title, kind, amount_cents, settlement_type, schedule_mode,
      schedule_frequency, schedule_config, starts_on, ends_on
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::date,$10::date)
    returning *
  `, [userId, title, kind, amountCents, settlementType, scheduleMode, scheduleFrequency, JSON.stringify(scheduleConfig), startsOn, endsOn]);

  const item = normalizeItemRow(result.rows[0]);
  if (scheduleMode === "ONCE") {
    await insertOccurrence(userId, item, startsOn, settlementType === "CASH" ? "SETTLED" : "SCHEDULED");
  }
  return item;
}

async function materializeRange(userId, rangeStart, rangeEnd) {
  const result = await query(`
    select * from project200_finance_items
    where user_id = $1 and deleted_at is null
      and starts_on <= $3::date
      and (ends_on is null or ends_on >= $2::date)
  `, [userId, rangeStart, rangeEnd]);
  const items = result.rows.map(normalizeItemRow);
  for (const item of items) {
    for (const dueOn of resolveDatesForItem(item, rangeStart, rangeEnd)) {
      await insertOccurrence(userId, item, dueOn, "SCHEDULED");
    }
  }
}

export async function summarizeProject200FinanceLedgerMonth(userId, month) {
  await ensureProject200FinanceLedgerSchema();
  const monthKey = String(month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error("Mes invalido.");
  const [year, monthNumber] = monthKey.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) throw new Error("Mes invalido.");
  const rangeStart = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const rangeEnd = `${year}-${String(monthNumber).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  await materializeRange(userId, rangeStart, rangeEnd);

  const occurrencesResult = await query(`
    select o.id, o.item_id, i.title, o.kind, o.amount_cents, o.due_on, o.status,
           i.settlement_type, i.schedule_mode, i.schedule_frequency
    from project200_finance_occurrences o
    join project200_finance_items i on i.id = o.item_id
    where o.user_id = $1 and o.due_on between $2::date and $3::date and o.status <> 'CANCELLED'
    order by o.due_on asc, o.created_at asc
  `, [userId, rangeStart, rangeEnd]);
  const entries = occurrencesResult.rows.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    title: row.title,
    kind: row.kind,
    amountCents: Number(row.amount_cents || 0),
    dueOn: toDateOnly(row.due_on),
    status: row.status,
    settlementType: row.settlement_type,
    scheduleMode: row.schedule_mode,
    scheduleFrequency: row.schedule_frequency
  }));
  const today = getProject200TodayKey();
  await materializeRange(userId, today, today);
  const todayResult = await query(`
    select o.id, o.item_id, i.title, o.kind, o.amount_cents, o.due_on, o.status,
           i.settlement_type, i.schedule_mode, i.schedule_frequency
    from project200_finance_occurrences o
    join project200_finance_items i on i.id = o.item_id
    where o.user_id = $1 and o.due_on = $2::date and o.status <> 'CANCELLED'
    order by o.created_at asc
  `, [userId, today]);
  const todayEntries = todayResult.rows.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    title: row.title,
    kind: row.kind,
    amountCents: Number(row.amount_cents || 0),
    dueOn: toDateOnly(row.due_on),
    status: row.status,
    settlementType: row.settlement_type,
    scheduleMode: row.schedule_mode,
    scheduleFrequency: row.schedule_frequency
  }));

  const incomeCents = entries.filter((entry) => entry.kind === "INCOME").reduce((sum, entry) => sum + entry.amountCents, 0);
  const expenseCents = entries.filter((entry) => entry.kind === "EXPENSE").reduce((sum, entry) => sum + entry.amountCents, 0);
  const balanceResult = await query(`
    select coalesce(sum(case when kind = 'INCOME' then amount_cents else -amount_cents end), 0)::bigint as balance_cents
    from project200_finance_occurrences
    where user_id = $1 and status = 'SETTLED'
  `, [userId]);
  const countResult = await query("select count(*)::integer as total from project200_finance_items where user_id = $1 and deleted_at is null", [userId]);
  return {
    month: monthKey,
    incomeCents,
    expenseCents,
    balanceCents: Number(balanceResult.rows[0]?.balance_cents || 0),
    hasAny: Number(countResult.rows[0]?.total || 0) > 0,
    todayEntries,
    entries
  };
}
