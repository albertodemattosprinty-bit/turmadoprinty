import { query } from "./db.js";

import { db } from "./db.js";

const ITEM_KINDS = new Set(["INCOME", "EXPENSE"]);
const SETTLEMENT_TYPES = new Set(["CASH", "FUTURE"]);
const SCHEDULE_MODES = new Set(["ONCE", "RECURRING", "FINITE"]);
const SCHEDULE_FREQUENCIES = new Set(["NONE", "MONTHLY", "WEEKLY", "CUSTOM"]);
const CUSTOM_MODES = new Set(["MONTHLY", "WEEKLY", "DAILY"]);
const VALUE_MODES = new Set(["FIXED", "VARIABLE"]);
const LAX_DOMAIN = "@lax.com";

export function buildProject200LaxKey(username) {
  const localPart = String(username || "")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("pt-BR");
  return localPart ? `${localPart}${LAX_DOMAIN}` : "";
}

export function parseProject200LaxKey(value) {
  const normalized = String(value || "")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("pt-BR");
  if (!normalized.endsWith(LAX_DOMAIN)) return "";
  const localPart = normalized.slice(0, -LAX_DOMAIN.length).trim();
  if (!localPart || localPart.includes("@") || localPart.length > 120) return "";
  return localPart;
}

function createLaxTransferError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

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

function normalizeShortText(value, fallback, maxLength = 80) {
  const text = String(value || "").trim().slice(0, maxLength);
  return text || fallback;
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

function getProject200AttentionEndKey(todayKey) {
  const today = dateOnlyToUtc(todayKey);
  const nextThreeDaysEnd = addUtcDays(today, 2);
  const daysUntilSunday = today.getUTCDay() === 0 ? 0 : 7 - today.getUTCDay();
  const weekEnd = addUtcDays(today, daysUntilSunday);
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  return new Date(Math.max(nextThreeDaysEnd.getTime(), weekEnd.getTime(), monthEnd.getTime()))
    .toISOString()
    .slice(0, 10);
}

function normalizeItemRow(row) {
  return {
    id: row.id,
    title: row.title,
    accountName: row.account_name || "Conta principal",
    category: row.category || "Outros",
    kind: row.kind,
    amountCents: Number(row.amount_cents || 0),
    accountName: row.account_name || "Conta principal",
    category: row.category || "Outros",
    settlementType: row.settlement_type,
    scheduleMode: row.schedule_mode,
    scheduleFrequency: row.schedule_frequency,
    scheduleConfig: row.schedule_config || {},
    startsOn: toDateOnly(row.starts_on),
    endsOn: toDateOnly(row.ends_on),
    valueMode: row.value_mode || row.schedule_config?.valueMode || "FIXED",
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
  `);
  await query("alter table project200_finance_items add column if not exists account_name text not null default 'Conta principal';");
  await query("alter table project200_finance_items add column if not exists category text not null default 'Outros';");
  await query("alter table project200_finance_items add column if not exists value_mode text not null default 'FIXED';");
  await query("create index if not exists idx_project200_finance_items_user_dates on project200_finance_items(user_id, starts_on, ends_on) where deleted_at is null;");
  await query("create index if not exists idx_project200_finance_items_user_category on project200_finance_items(user_id, category) where deleted_at is null;");
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
  await query(`
    create table if not exists project200_lax_transfers (
      id uuid primary key default gen_random_uuid(),
      sender_user_id uuid not null references users(id) on delete cascade,
      recipient_user_id uuid not null references users(id) on delete cascade,
      amount_cents bigint not null check (amount_cents > 0),
      sender_account_name text not null default 'Conta principal',
      recipient_account_name text not null default 'Conta principal',
      sender_item_id uuid not null unique references project200_finance_items(id) on delete cascade,
      recipient_item_id uuid not null unique references project200_finance_items(id) on delete cascade,
      created_at timestamptz not null default now(),
      check (sender_user_id <> recipient_user_id)
    );
  `);
  await query("create index if not exists idx_project200_lax_transfers_sender_created on project200_lax_transfers(sender_user_id, created_at desc);");
  await query("create index if not exists idx_project200_lax_transfers_recipient_created on project200_lax_transfers(recipient_user_id, created_at desc);");
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
  const accountName = normalizeShortText(payload?.accountName, "Conta principal", 80);
  const category = normalizeShortText(payload?.category, "Outros", 80);
  const valueMode = normalizeEnum(payload?.valueMode || payload?.scheduleConfig?.valueMode || "FIXED", VALUE_MODES, "Tipo de valor");

  const result = await query(`
    insert into project200_finance_items (
      user_id, title, kind, amount_cents, account_name, category, settlement_type, schedule_mode,
      schedule_frequency, schedule_config, starts_on, ends_on, value_mode
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::date,$12::date,$13)
    returning *
  `, [userId, title, kind, amountCents, accountName, category, settlementType, scheduleMode, scheduleFrequency, JSON.stringify({ ...scheduleConfig, valueMode }), startsOn, endsOn, valueMode]);

  const item = normalizeItemRow(result.rows[0]);
  if (scheduleMode === "ONCE") {
    await insertOccurrence(userId, item, startsOn, settlementType === "CASH" ? "SETTLED" : "SCHEDULED");
  }
  return item;
}

async function assertProject200FinanceItemIsEditable(userId, itemId) {
  const transfer = await query(`
    select id
      from project200_lax_transfers
     where (sender_user_id = $1 and sender_item_id = $2)
        or (recipient_user_id = $1 and recipient_item_id = $2)
     limit 1
  `, [userId, itemId]);
  if (transfer.rowCount) {
    throw createLaxTransferError("Transferencias LAX confirmadas nao podem ser editadas ou excluidas.", "LAX_TRANSFER_IMMUTABLE");
  }
}

export async function updateProject200FinanceItem(userId, itemId, payload) {
  await ensureProject200FinanceLedgerSchema();
  const id = String(itemId || "").trim();
  if (!id) throw new Error("Lancamento invalido.");
  await assertProject200FinanceItemIsEditable(userId, id);
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
  const accountName = normalizeShortText(payload?.accountName, "Conta principal", 80);
  const category = normalizeShortText(payload?.category, "Outros", 80);
  const valueMode = normalizeEnum(payload?.valueMode || payload?.scheduleConfig?.valueMode || "FIXED", VALUE_MODES, "Tipo de valor");

  const result = await query(`
    update project200_finance_items
       set title = $3,
           kind = $4,
           amount_cents = $5,
           account_name = $6,
           category = $7,
           settlement_type = $8,
           schedule_mode = $9,
           schedule_frequency = $10,
           schedule_config = $11::jsonb,
           starts_on = $12::date,
           ends_on = $13::date,
           value_mode = $14,
           updated_at = now()
     where user_id = $1 and id = $2 and deleted_at is null
     returning *
  `, [userId, id, title, kind, amountCents, accountName, category, settlementType, scheduleMode, scheduleFrequency, JSON.stringify({ ...scheduleConfig, valueMode }), startsOn, endsOn, valueMode]);
  if (!result.rowCount) throw new Error("Lancamento nao encontrado.");

  await query("delete from project200_finance_occurrences where user_id = $1 and item_id = $2", [userId, id]);
  const item = normalizeItemRow(result.rows[0]);
  if (scheduleMode === "ONCE") {
    await insertOccurrence(userId, item, startsOn, settlementType === "CASH" ? "SETTLED" : "SCHEDULED");
  }
  return item;
}

export async function settleProject200FinanceOccurrence(userId, occurrenceId, payload = {}) {
  await ensureProject200FinanceLedgerSchema();
  const id = String(occurrenceId || "").trim();
  if (!id) throw new Error("Movimentacao invalida.");
  const result = await query(`
    select o.*, i.title, i.account_name, i.category
      from project200_finance_occurrences o
      join project200_finance_items i on i.id = o.item_id
     where o.user_id = $1 and o.id = $2 and o.status = 'SCHEDULED' and i.deleted_at is null
     limit 1
  `, [userId, id]);
  const row = result.rows[0];
  if (!row) throw new Error("Movimentacao prevista nao encontrada.");
  const confirmedAmountCents = normalizeAmountCents(payload.amountCents);
  const originalAmountCents = Number(row.amount_cents || 0);
  await query(`
    update project200_finance_occurrences
       set amount_cents = $3, status = 'SETTLED', settled_at = now()
     where user_id = $1 and id = $2 and status = 'SCHEDULED'
  `, [userId, id, confirmedAmountCents]);
  const remainderCents = originalAmountCents - confirmedAmountCents;
  let remainderItem = null;
  if (remainderCents > 0 && payload.remainderDueOn) {
    const remainderDueOn = normalizeDateOnly(payload.remainderDueOn, "Data do restante");
    const title = normalizeShortText(payload.remainderTitle, String(row.title || "Lancamento") + " restante", 90);
    remainderItem = await createProject200FinanceItem(userId, {
      title,
      kind: row.kind,
      amountCents: remainderCents,
      accountName: row.account_name || "Conta principal",
      category: row.category || "Outros",
      settlementType: "FUTURE",
      valueMode: payload.valueMode || "VARIABLE",
      scheduleMode: "ONCE",
      scheduleFrequency: "NONE",
      startsOn: remainderDueOn,
      scheduleConfig: { valueMode: payload.valueMode || "VARIABLE" }
    });
  }
  return { id, confirmedAmountCents, originalAmountCents, remainderCents: Math.max(0, remainderCents), remainderItem };
}

export async function deleteProject200FinanceItem(userId, itemId) {
  await ensureProject200FinanceLedgerSchema();
  const id = String(itemId || "").trim();
  if (!id) throw new Error("Lancamento invalido.");
  await assertProject200FinanceItemIsEditable(userId, id);
  const result = await query(`
    update project200_finance_items
       set deleted_at = now(), updated_at = now()
     where user_id = $1 and id = $2 and deleted_at is null
     returning id
  `, [userId, id]);
  if (!result.rowCount) throw new Error("Lancamento nao encontrado.");
  await query("update project200_finance_occurrences set status = 'CANCELLED' where user_id = $1 and item_id = $2", [userId, id]);
  return { id };
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
    select o.id, o.item_id, i.title, i.account_name, i.category, o.kind, o.amount_cents, o.due_on, o.status,
           i.settlement_type, i.schedule_mode, i.schedule_frequency, i.schedule_config, i.value_mode,
           t.id as lax_transfer_id
    from project200_finance_occurrences o
    join project200_finance_items i on i.id = o.item_id
    left join project200_lax_transfers t on i.id = t.sender_item_id or i.id = t.recipient_item_id
    where o.user_id = $1 and o.due_on between $2::date and $3::date and o.status <> 'CANCELLED'
    order by o.due_on asc, o.created_at asc
  `, [userId, rangeStart, rangeEnd]);
  const entries = occurrencesResult.rows.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    title: row.title,
    accountName: row.account_name || "Conta principal",
    category: row.category || "Outros",
    kind: row.kind,
    amountCents: Number(row.amount_cents || 0),
    dueOn: toDateOnly(row.due_on),
    status: row.status,
    settlementType: row.settlement_type,
    scheduleMode: row.schedule_mode,
    scheduleFrequency: row.schedule_frequency,
    scheduleConfig: row.schedule_config || {},
    valueMode: row.value_mode || row.schedule_config?.valueMode || "FIXED",
    laxTransferId: row.lax_transfer_id || null
  }));
  const today = getProject200TodayKey();
  const attentionEnd = getProject200AttentionEndKey(today);
  await materializeRange(userId, today, attentionEnd);
  const attentionResult = await query(`
    select o.id, o.item_id, i.title, i.account_name, i.category, o.kind, o.amount_cents, o.due_on, o.status,
           i.settlement_type, i.schedule_mode, i.schedule_frequency, i.schedule_config, i.value_mode
    from project200_finance_occurrences o
    join project200_finance_items i on i.id = o.item_id
    where o.user_id = $1
      and o.due_on between $2::date and $3::date
      and o.status = 'SCHEDULED'
      and i.settlement_type = 'FUTURE'
    order by o.due_on asc, o.created_at asc
  `, [userId, today, attentionEnd]);
  const attentionEntries = attentionResult.rows.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    title: row.title,
    accountName: row.account_name || "Conta principal",
    category: row.category || "Outros",
    kind: row.kind,
    amountCents: Number(row.amount_cents || 0),
    dueOn: toDateOnly(row.due_on),
    status: row.status,
    settlementType: row.settlement_type,
    scheduleMode: row.schedule_mode,
    scheduleFrequency: row.schedule_frequency,
    scheduleConfig: row.schedule_config || {},
    valueMode: row.value_mode || row.schedule_config?.valueMode || "FIXED"
  }));
  const todayEntries = attentionEntries.filter((entry) => entry.dueOn === today);

  const forecastEntries = entries.filter((entry) => entry.settlementType === "FUTURE" && entry.status === "SCHEDULED");
  const incomeCents = forecastEntries.filter((entry) => entry.kind === "INCOME").reduce((sum, entry) => sum + entry.amountCents, 0);
  const expenseCents = forecastEntries.filter((entry) => entry.kind === "EXPENSE").reduce((sum, entry) => sum + entry.amountCents, 0);
  const accountBalancesResult = await query(`
    select i.account_name,
           coalesce(sum(case when o.kind = 'INCOME' then o.amount_cents else -o.amount_cents end), 0)::bigint as balance_cents
      from project200_finance_occurrences o
      join project200_finance_items i on i.id = o.item_id
     where o.user_id = $1 and o.status = 'SETTLED' and i.deleted_at is null
     group by i.account_name
  `, [userId]);
  const accountBalances = Object.fromEntries(accountBalancesResult.rows.map((row) => [
    row.account_name || "Conta principal",
    Number(row.balance_cents || 0)
  ]));
  const countResult = await query("select count(*)::integer as total from project200_finance_items where user_id = $1 and deleted_at is null", [userId]);
  return {
    month: monthKey,
    incomeCents,
    expenseCents,
    balanceCents: Object.values(accountBalances).reduce((sum, value) => sum + Number(value || 0), 0),
    accountBalances,
    hasAny: Number(countResult.rows[0]?.total || 0) > 0,
    attentionEntries,
    todayEntries,
    entries
  };
}

export async function transferProject200LaxBalance(senderUserId, payload = {}) {
  await ensureProject200FinanceLedgerSchema();
  if (!db) throw new Error("DATABASE_URL nao configurada.");

  const recipientUsername = parseProject200LaxKey(payload.laxKey);
  if (!recipientUsername) {
    throw createLaxTransferError("Digite uma chave LAX valida, como usuario@lax.com.", "INVALID_LAX_KEY");
  }
  const amountCents = normalizeAmountCents(payload.amountCents);
  const senderAccountName = normalizeShortText(payload.accountName, "Conta principal", 80);
  const recipientAccountName = "Conta principal";
  const client = await db.connect();

  try {
    await client.query("begin");
    const usersResult = await client.query(`
      select id, username, name
       from users
       where id = $1
          or username = $2
       order by id
       for update
    `, [senderUserId, recipientUsername]);
    const sender = usersResult.rows.find((row) => String(row.id) === String(senderUserId));
    const recipient = usersResult.rows.find((row) => String(row.id) !== String(senderUserId)
      && String(row.username || "").trim().toLocaleLowerCase("pt-BR") === recipientUsername);
    if (!sender) throw createLaxTransferError("Conta de origem nao encontrada.", "LAX_SENDER_NOT_FOUND");
    if (!recipient) {
      if (buildProject200LaxKey(sender.username) === `${recipientUsername}${LAX_DOMAIN}`) {
        throw createLaxTransferError("Voce nao pode transferir para a propria chave LAX.", "LAX_SELF_TRANSFER");
      }
      throw createLaxTransferError("Chave LAX nao encontrada.", "LAX_KEY_NOT_FOUND");
    }

    const balanceResult = await client.query(`
      select coalesce(sum(case when o.kind = 'INCOME' then o.amount_cents else -o.amount_cents end), 0)::bigint as balance_cents
        from project200_finance_occurrences o
        join project200_finance_items i on i.id = o.item_id
       where o.user_id = $1
         and o.status = 'SETTLED'
         and i.deleted_at is null
         and i.account_name = $2
    `, [senderUserId, senderAccountName]);
    const balanceCents = Number(balanceResult.rows[0]?.balance_cents || 0);
    if (balanceCents < amountCents) {
      throw createLaxTransferError("Saldo insuficiente para esta transferencia.", "INSUFFICIENT_BALANCE");
    }

    const today = getProject200TodayKey();
    const senderTitle = `Transferencia LAX para ${buildProject200LaxKey(recipient.username)}`.slice(0, 90);
    const recipientTitle = `Transferencia LAX de ${buildProject200LaxKey(sender.username)}`.slice(0, 90);
    const scheduleConfig = JSON.stringify({ valueMode: "FIXED", laxTransfer: true });
    const senderItemResult = await client.query(`
      insert into project200_finance_items (
        user_id, title, kind, amount_cents, account_name, category, settlement_type, schedule_mode,
        schedule_frequency, schedule_config, starts_on, value_mode
      ) values ($1,$2,'EXPENSE',$3,$4,'Transferencias LAX','CASH','ONCE','NONE',$5::jsonb,$6::date,'FIXED')
      returning id
    `, [senderUserId, senderTitle, amountCents, senderAccountName, scheduleConfig, today]);
    const recipientItemResult = await client.query(`
      insert into project200_finance_items (
        user_id, title, kind, amount_cents, account_name, category, settlement_type, schedule_mode,
        schedule_frequency, schedule_config, starts_on, value_mode
      ) values ($1,$2,'INCOME',$3,$4,'Transferencias LAX','CASH','ONCE','NONE',$5::jsonb,$6::date,'FIXED')
      returning id
    `, [recipient.id, recipientTitle, amountCents, recipientAccountName, scheduleConfig, today]);
    const senderItemId = senderItemResult.rows[0].id;
    const recipientItemId = recipientItemResult.rows[0].id;
    await client.query(`
      insert into project200_finance_occurrences (user_id, item_id, due_on, kind, amount_cents, status, settled_at)
      values ($1,$2,$3::date,'EXPENSE',$4,'SETTLED',now()),
             ($5,$6,$3::date,'INCOME',$4,'SETTLED',now())
    `, [senderUserId, senderItemId, today, amountCents, recipient.id, recipientItemId]);
    const transferResult = await client.query(`
      insert into project200_lax_transfers (
        sender_user_id, recipient_user_id, amount_cents, sender_account_name, recipient_account_name,
        sender_item_id, recipient_item_id
      ) values ($1,$2,$3,$4,$5,$6,$7)
      returning id, created_at
    `, [senderUserId, recipient.id, amountCents, senderAccountName, recipientAccountName, senderItemId, recipientItemId]);
    await client.query("commit");

    return {
      id: transferResult.rows[0].id,
      amountCents,
      senderLaxKey: buildProject200LaxKey(sender.username),
      recipientLaxKey: buildProject200LaxKey(recipient.username),
      recipientName: recipient.name || recipient.username,
      senderBalanceCents: balanceCents - amountCents,
      createdAt: new Date(transferResult.rows[0].created_at).toISOString()
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

