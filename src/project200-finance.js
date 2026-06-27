import { query } from "./db.js";
import { ensurePlatformFinanceSchema, getPlatformBalance, listPlatformFinanceByRange } from "./platform-finance.js";

const NOTE_MAX_LENGTH = 12000;

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatMonthLabel(monthIndex) {
  return [
    "Janeiro",
    "Fevereiro",
    "Marco",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ][monthIndex] || "Mes";
}

function resolveRange(periodKey, now = new Date()) {
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const normalized = String(periodKey || "total").trim().toLowerCase();

  if (normalized === "today") {
    return {
      key: "today",
      label: "Hoje",
      from: todayStart.toISOString(),
      to: tomorrowStart.toISOString()
    };
  }

  if (normalized === "week") {
    const weekday = todayStart.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const weekStart = addDays(todayStart, mondayOffset);
    return {
      key: "week",
      label: "Esta semana",
      from: weekStart.toISOString(),
      to: tomorrowStart.toISOString()
    };
  }

  if (normalized === "last15") {
    return {
      key: "last15",
      label: "Ultimos 15 dias",
      from: addDays(todayStart, -14).toISOString(),
      to: tomorrowStart.toISOString()
    };
  }

  if (normalized === "last30") {
    return {
      key: "last30",
      label: "Ultimos 30 dias",
      from: addDays(todayStart, -29).toISOString(),
      to: tomorrowStart.toISOString()
    };
  }

  const monthMatch = normalized.match(/^month-(\d{2})$/);
  if (monthMatch) {
    const monthIndex = Math.max(0, Math.min(11, Number(monthMatch[1]) - 1));
    const year = now.getFullYear();
    const monthStart = new Date(year, monthIndex, 1);
    const nextMonth = new Date(year, monthIndex + 1, 1);
    return {
      key: normalized,
      label: formatMonthLabel(monthIndex),
      from: monthStart.toISOString(),
      to: nextMonth.toISOString()
    };
  }

  return {
    key: "total",
    label: "Total",
    from: new Date(2000, 0, 1).toISOString(),
    to: tomorrowStart.toISOString()
  };
}

export async function ensureProject200FinanceNotesSchema() {
  await query(`
    create table if not exists project200_finance_notes (
      user_id uuid primary key references users(id) on delete cascade,
      notes text not null default '',
      updated_at timestamptz not null default now()
    );
  `);
}

export async function getProject200FinanceNotes(userId) {
  await ensureProject200FinanceNotesSchema();
  const result = await query(
    `
      select notes, updated_at
      from project200_finance_notes
      where user_id = $1
      limit 1
    `,
    [userId]
  );
  return {
    notes: String(result.rows[0]?.notes || ""),
    updatedAt: result.rows[0]?.updated_at ? new Date(result.rows[0].updated_at).toISOString() : null
  };
}

export async function saveProject200FinanceNotes(userId, notes) {
  await ensureProject200FinanceNotesSchema();
  const normalizedNotes = String(notes || "").trim().slice(0, NOTE_MAX_LENGTH);
  const result = await query(
    `
      insert into project200_finance_notes (user_id, notes, updated_at)
      values ($1, $2, now())
      on conflict (user_id) do update
        set notes = excluded.notes,
            updated_at = now()
      returning notes, updated_at
    `,
    [userId, normalizedNotes]
  );
  return {
    notes: String(result.rows[0]?.notes || ""),
    updatedAt: result.rows[0]?.updated_at ? new Date(result.rows[0].updated_at).toISOString() : null
  };
}

export async function summarizeProject200PersonalFinance(userId, periodKey = "total") {
  await ensurePlatformFinanceSchema();
  const range = resolveRange(periodKey);
  const entries = await listPlatformFinanceByRange(userId, {
    from: range.from,
    to: range.to
  });

  let incomeCents = 0;
  let expenseCents = 0;
  let paidIncomeCents = 0;
  let paidExpenseCents = 0;
  let pendingCount = 0;

  for (const entry of entries) {
    const amountCents = Number(entry?.amountCents || 0);
    const kind = String(entry?.kind || "").trim().toUpperCase();
    const paidAt = entry?.paidAt ? new Date(entry.paidAt).toISOString() : null;
    if (kind === "INCOME") {
      incomeCents += amountCents;
      if (paidAt) {
        paidIncomeCents += amountCents;
      }
    } else {
      expenseCents += amountCents;
      if (paidAt) {
        paidExpenseCents += amountCents;
      }
    }
    if (!paidAt) {
      pendingCount += 1;
    }
  }

  return {
    periodKey: range.key,
    periodLabel: range.label,
    from: range.from,
    to: range.to,
    totalEntries: entries.length,
    pendingCount,
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    realizedNetCents: paidIncomeCents - paidExpenseCents,
    balanceCents: await getPlatformBalance(userId)
  };
}
