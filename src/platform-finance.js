import { query } from "./db.js";

const KIND_INCOME = "INCOME";
const KIND_EXPENSE = "EXPENSE";
const RECURRENCE_SIMPLE = "SIMPLE";
const RECURRENCE_RECURRING = "RECURRING";
const MAX_TITLE_LENGTH = 90;
const OCCURRENCE_STATUS_POSTED = "POSTED";
const OCCURRENCE_STATUS_SCHEDULED = "SCHEDULED";
const OCCURRENCE_STATUS_DUE_TODAY = "DUE_TODAY";
const OCCURRENCE_STATUS_OVERDUE = "OVERDUE";
const OCCURRENCE_STATUS_PAID = "PAID";

const INCOME_CATEGORIES = new Set(["Eventos", "Inscricoes", "Apoiadores", "Site", "Venda de ativo"]);
const EXPENSE_CATEGORIES = new Set(["Alimentacao", "Aluguel", "Carro", "Eventos", "Servicos casa", "Anuncios", "Plataformas", "Lazer"]);

function toIso(value) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOnly(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseIsoDate(value, label) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${label} invalida.`);
  }
  return date;
}

function normalizeKind(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === KIND_INCOME || normalized === KIND_EXPENSE) {
    return normalized;
  }
  throw new Error("Tipo invalido.");
}

function normalizeRecurrence(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === RECURRENCE_SIMPLE || normalized === RECURRENCE_RECURRING) {
    return normalized;
  }
  throw new Error("Recorrencia invalida.");
}

function normalizeCategory(kind, value) {
  const category = String(value || "").trim();
  const allowed = kind === KIND_INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  for (const item of allowed) {
    if (item.toLowerCase() === category.toLowerCase()) {
      return item;
    }
  }
  throw new Error("Categoria invalida.");
}

function normalizeAmountCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor invalido.");
  }
  return Math.round(amount);
}

function normalizeDayOfMonth(value) {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("Dia do mes invalido.");
  }
  return day;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function resolveOccurrenceDateForMonth(year, monthIndex, requestedDay) {
  const maxDay = daysInMonth(year, monthIndex);
  return new Date(year, monthIndex, Math.min(requestedDay, maxDay));
}

function normalizeEntryRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    kind: row.kind,
    category: row.category,
    amountCents: Number(row.amount_cents || 0),
    recurrenceType: row.recurrence_type,
    recurrenceDayOfMonth: row.recurrence_day_of_month ? Number(row.recurrence_day_of_month) : null,
    startsOn: row.starts_on ? toDateOnly(row.starts_on) : null,
    deletedAt: toIso(row.deleted_at),
    createdAt: toIso(row.created_at)
  };
}

function normalizeOccurrenceRow(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    name: row.name,
    kind: row.kind,
    category: row.category,
    amountCents: Number(row.amount_cents || 0),
    occurredAt: toIso(row.occurred_at),
    status: String(row.status || "").trim().toUpperCase() || OCCURRENCE_STATUS_POSTED,
    paidAt: toIso(row.paid_at),
    source: row.source || "MATERIALIZED"
  };
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function resolveExpensePendingStatus(occurredAt) {
  const dueDate = new Date(occurredAt);
  const today = startOfToday();
  const tomorrow = addDays(today, 1);

  if (dueDate < today) {
    return OCCURRENCE_STATUS_OVERDUE;
  }

  if (dueDate >= today && dueDate < tomorrow) {
    return OCCURRENCE_STATUS_DUE_TODAY;
  }

  return OCCURRENCE_STATUS_SCHEDULED;
}

async function setPlatformBalance(userId, nextBalanceCents) {
  await query(
    `
      insert into platform_finance_balances (user_id, balance_cents)
      values ($1, $2)
      on conflict (user_id) do update
        set balance_cents = excluded.balance_cents,
            updated_at = now()
    `,
    [userId, Math.trunc(nextBalanceCents)]
  );
}

async function adjustPlatformBalance(userId, deltaCents) {
  const result = await query(
    `
      insert into platform_finance_balances (user_id, balance_cents)
      values ($1, $2)
      on conflict (user_id) do update
        set balance_cents = platform_finance_balances.balance_cents + excluded.balance_cents,
            updated_at = now()
      returning balance_cents
    `,
    [userId, Math.trunc(deltaCents)]
  );
  return Number(result.rows[0]?.balance_cents || 0);
}

export async function getPlatformBalance(userId) {
  await ensurePlatformFinanceSchema();
  const result = await query(
    `
      select balance_cents
      from platform_finance_balances
      where user_id = $1
      limit 1
    `,
    [userId]
  );
  return Number(result.rows[0]?.balance_cents || 0);
}

export async function addPlatformBalance(userId, amountCents) {
  await ensurePlatformFinanceSchema();
  const cents = normalizeAmountCents(amountCents);
  return adjustPlatformBalance(userId, cents);
}

export async function ensurePlatformFinanceSchema() {
  await query(`
    create table if not exists platform_finance_entries (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      name text not null,
      kind text not null,
      category text not null,
      amount_cents integer not null,
      recurrence_type text not null default 'SIMPLE',
      recurrence_day_of_month integer,
      starts_on date not null,
      deleted_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("create index if not exists idx_platform_finance_entries_user_start on platform_finance_entries(user_id, starts_on);");
  await query("create index if not exists idx_platform_finance_entries_user_kind on platform_finance_entries(user_id, kind);");

  await query(`
    create table if not exists platform_finance_occurrences (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      entry_id uuid references platform_finance_entries(id) on delete set null,
      name text not null,
      kind text not null,
      category text not null,
      amount_cents integer not null,
      occurred_at timestamptz not null,
      status text not null default 'POSTED',
      paid_at timestamptz,
      created_at timestamptz not null default now()
    );
  `);
  await query("alter table platform_finance_occurrences add column if not exists status text not null default 'POSTED';");
  await query("alter table platform_finance_occurrences add column if not exists paid_at timestamptz;");
  await query("create index if not exists idx_platform_finance_occurrences_user_time on platform_finance_occurrences(user_id, occurred_at);");
  await query("create index if not exists idx_platform_finance_occurrences_entry on platform_finance_occurrences(entry_id);");
  await query(`
    create table if not exists platform_finance_balances (
      user_id uuid primary key references users(id) on delete cascade,
      balance_cents bigint not null default 0,
      updated_at timestamptz not null default now()
    );
  `);
}

export async function createPlatformFinanceEntry(userId, payload) {
  await ensurePlatformFinanceSchema();

  const kind = normalizeKind(payload?.kind);
  const category = normalizeCategory(kind, payload?.category);
  const recurrenceType = normalizeRecurrence(payload?.recurrenceType);
  const day = recurrenceType === RECURRENCE_RECURRING ? normalizeDayOfMonth(payload?.recurrenceDayOfMonth) : null;
  const amountCents = normalizeAmountCents(payload?.amountCents);
  const name = String(payload?.name || "").trim().slice(0, MAX_TITLE_LENGTH);
  const startsOn = toDateOnly(payload?.baseDate || new Date());

  if (!name || name.length < 2) {
    throw new Error("Nome invalido.");
  }

  if (!startsOn) {
    throw new Error("Data invalida.");
  }

  const result = await query(
    `
      insert into platform_finance_entries (
        user_id, name, kind, category, amount_cents, recurrence_type, recurrence_day_of_month, starts_on
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8::date)
      returning *
    `,
    [userId, name, kind, category, amountCents, recurrenceType, day, startsOn]
  );

  const entry = normalizeEntryRow(result.rows[0]);

  if (recurrenceType === RECURRENCE_SIMPLE) {
    const occurrenceStatus = kind === KIND_EXPENSE ? OCCURRENCE_STATUS_PAID : OCCURRENCE_STATUS_POSTED;
    const paidAt = kind === KIND_EXPENSE ? new Date().toISOString() : null;
    await query(
      `
        insert into platform_finance_occurrences (
          user_id, entry_id, name, kind, category, amount_cents, occurred_at, status, paid_at
        )
        values ($1,$2,$3,$4,$5,$6,$7::timestamptz,$8,$9::timestamptz)
      `,
      [userId, entry.id, entry.name, entry.kind, entry.category, entry.amountCents, new Date().toISOString(), occurrenceStatus, paidAt]
    );
    if (kind === KIND_EXPENSE) {
      await adjustPlatformBalance(userId, -entry.amountCents);
    }
  }

  return entry;
}

async function materializeRecurringUntil(userId, entry, untilDate) {
  const startDate = new Date(entry.startsOn);
  const endDate = new Date(untilDate);

  if (endDate < startDate) {
    return;
  }

  const existing = await query(
    `
      select occurred_at
      from platform_finance_occurrences
      where user_id = $1
        and entry_id = $2
    `,
    [userId, entry.id]
  );
  const existingDays = new Set(existing.rows.map((row) => toDateOnly(row.occurred_at)));

  const monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (monthCursor <= lastMonth) {
    const occDate = resolveOccurrenceDateForMonth(monthCursor.getFullYear(), monthCursor.getMonth(), entry.recurrenceDayOfMonth);
    if (occDate >= startDate && occDate <= endDate) {
      const dayKey = toDateOnly(occDate);
      if (dayKey && !existingDays.has(dayKey)) {
        await query(
          `
            insert into platform_finance_occurrences (
              user_id, entry_id, name, kind, category, amount_cents, occurred_at, status
            )
            values ($1,$2,$3,$4,$5,$6,$7::timestamptz,$8)
          `,
          [
            userId,
            entry.id,
            entry.name,
            entry.kind,
            entry.category,
            entry.amountCents,
            occDate.toISOString(),
            entry.kind === KIND_EXPENSE ? resolveExpensePendingStatus(occDate) : OCCURRENCE_STATUS_POSTED
          ]
        );
      }
    }
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }
}

export async function deletePlatformFinanceEntry(userId, entryId) {
  await ensurePlatformFinanceSchema();
  const result = await query(
    `
      select *
      from platform_finance_entries
      where user_id = $1
        and id = $2
        and deleted_at is null
      limit 1
    `,
    [userId, String(entryId || "").trim()]
  );
  const row = result.rows[0];

  if (!row) {
    return { deleted: 0 };
  }

  const entry = normalizeEntryRow(row);

  if (entry.recurrenceType === RECURRENCE_RECURRING && entry.recurrenceDayOfMonth) {
    await materializeRecurringUntil(userId, entry, new Date());
  }

  await query(
    `
      update platform_finance_entries
      set deleted_at = now(),
          updated_at = now()
      where user_id = $1
        and id = $2
    `,
    [userId, entry.id]
  );

  return { deleted: 1 };
}

export async function listPlatformFinanceByRange(userId, { from, to }) {
  await ensurePlatformFinanceSchema();

  const fromDate = parseIsoDate(from, "Data inicial");
  const toDate = parseIsoDate(to, "Data final");
  if (toDate <= fromDate) {
    throw new Error("Intervalo de datas invalido.");
  }

  const recurringResult = await query(
    `
      select *
      from platform_finance_entries
      where user_id = $1
        and recurrence_type = 'RECURRING'
        and deleted_at is null
    `,
    [userId]
  );
  const recurringEntries = recurringResult.rows.map(normalizeEntryRow);
  for (const recurringEntry of recurringEntries) {
    await materializeRecurringUntil(userId, recurringEntry, toDate);
  }

  await syncDueStatuses(userId);

  const materializedResult = await query(
    `
      select id, entry_id, name, kind, category, amount_cents, occurred_at, status, paid_at, 'MATERIALIZED'::text as source
      from platform_finance_occurrences
      where user_id = $1
        and occurred_at >= $2::timestamptz
        and occurred_at < $3::timestamptz
    `,
    [userId, fromDate.toISOString(), toDate.toISOString()]
  );

  const list = materializedResult.rows.map(normalizeOccurrenceRow)
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  return list;
}

async function syncDueStatuses(userId) {
  await query(
    `
      update platform_finance_occurrences
      set status = case
        when paid_at is not null then '${OCCURRENCE_STATUS_PAID}'
        when paid_at is null and occurred_at::date < now()::date then '${OCCURRENCE_STATUS_OVERDUE}'
        when paid_at is null and occurred_at::date = now()::date then '${OCCURRENCE_STATUS_DUE_TODAY}'
        when paid_at is null and occurred_at::date > now()::date then '${OCCURRENCE_STATUS_SCHEDULED}'
        else status
      end
      where user_id = $1
    `,
    [userId]
  );
}

export async function payPlatformOccurrence(userId, occurrenceId) {
  await ensurePlatformFinanceSchema();
  await syncDueStatuses(userId);

  const result = await query(
    `
      select id, amount_cents, kind, status, paid_at
      from platform_finance_occurrences
      where user_id = $1
        and id = $2
      limit 1
    `,
    [userId, String(occurrenceId || "").trim()]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("Lançamento nao encontrado.");
  }

  if (row.paid_at || row.status === OCCURRENCE_STATUS_PAID) {
    return { ok: true, alreadyPaid: true, balanceCents: await getPlatformBalance(userId) };
  }

  await query(
    `
      update platform_finance_occurrences
      set status = $3,
          paid_at = now()
      where user_id = $1
        and id = $2
    `,
    [userId, row.id, OCCURRENCE_STATUS_PAID]
  );

  const amount = Number(row.amount_cents || 0);
  const balanceDelta = row.kind === KIND_INCOME ? amount : -amount;
  const balanceCents = await adjustPlatformBalance(userId, balanceDelta);
  return {
    ok: true,
    alreadyPaid: false,
    balanceCents
  };
}

export async function summarizePlatformFinanceMonth(userId, focusDate) {
  const focus = parseIsoDate(focusDate, "Data de referencia");
  const monthStart = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const nextMonth = new Date(focus.getFullYear(), focus.getMonth() + 1, 1);
  const items = await listPlatformFinanceByRange(userId, {
    from: monthStart.toISOString(),
    to: nextMonth.toISOString()
  });

  let incomeCents = 0;
  let expenseCents = 0;

  for (const item of items) {
    if (item.kind === KIND_INCOME) {
      incomeCents += Number(item.amountCents || 0);
    } else {
      expenseCents += Number(item.amountCents || 0);
    }
  }

  return {
    incomeCents,
    expenseCents,
    balanceCents: await getPlatformBalance(userId),
    monthStart: monthStart.toISOString(),
    monthEnd: nextMonth.toISOString(),
    entries: items
  };
}
