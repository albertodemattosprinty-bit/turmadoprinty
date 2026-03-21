import { query } from "./db.js";
import { buildSubscriptionPlans, findSubscriptionPlanById } from "./plans.js";

const ONLINE_WINDOW_MINUTES = 5;

function normalizePlanId(planId) {
  return String(planId || "").trim().toLowerCase();
}

export async function ensureAdminUsersSchema() {
  await query("alter table users add column if not exists last_seen_at timestamptz;");
  await query(`
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
  `);
  await query("create index if not exists idx_agenda_events_sort_order on agenda_events(sort_order);");
  await query("alter table agenda_events add column if not exists contractor_user_id uuid references users(id) on delete set null;");
  await query("create index if not exists idx_agenda_events_contractor_user_id on agenda_events(contractor_user_id);");

  await query(`
    create table if not exists user_plan_overrides (
      user_id uuid primary key references users(id) on delete cascade,
      plan_id text not null,
      assigned_by_user_id uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("create index if not exists idx_user_plan_overrides_plan_id on user_plan_overrides(plan_id);");

  await query(`
    create table if not exists user_usage_counters (
      user_id uuid primary key references users(id) on delete cascade,
      text_tokens_total bigint not null default 0,
      narration_seconds_total numeric(12,2) not null default 0,
      updated_at timestamptz not null default now()
    );
  `);

  await query(`
    create table if not exists admin_user_notes (
      user_id uuid primary key references users(id) on delete cascade,
      is_contractor boolean not null default false,
      contractor_event_id uuid references agenda_events(id) on delete set null,
      updated_at timestamptz not null default now()
    );
  `);

  await query(`
    create table if not exists admin_user_messages (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      title text not null,
      body text not null,
      sent_by_user_id uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      dismissed_at timestamptz
    );
  `);
  await query("create index if not exists idx_admin_user_messages_user_id on admin_user_messages(user_id);");
  await query("create index if not exists idx_admin_user_messages_active on admin_user_messages(user_id, dismissed_at, created_at desc);");
}

export async function touchUserPresence(userId) {
  if (!userId) {
    return;
  }

  await ensureAdminUsersSchema();
  await query(
    `
      update users
      set last_seen_at = now()
      where id = $1
    `,
    [userId]
  );
}

export async function recordTextTokenUsage(userId, totalTokens) {
  const parsedTokens = Number(totalTokens);

  if (!userId || !Number.isFinite(parsedTokens) || parsedTokens <= 0) {
    return;
  }

  await ensureAdminUsersSchema();
  await query(
    `
      insert into user_usage_counters (user_id, text_tokens_total, narration_seconds_total, updated_at)
      values ($1, $2, 0, now())
      on conflict (user_id) do update
        set text_tokens_total = user_usage_counters.text_tokens_total + excluded.text_tokens_total,
            updated_at = now()
    `,
    [userId, Math.round(parsedTokens)]
  );
}

export async function recordNarrationUsage(userId, seconds) {
  const parsedSeconds = Number(seconds);

  if (!userId || !Number.isFinite(parsedSeconds) || parsedSeconds <= 0) {
    return;
  }

  await ensureAdminUsersSchema();
  await query(
    `
      insert into user_usage_counters (user_id, text_tokens_total, narration_seconds_total, updated_at)
      values ($1, 0, $2, now())
      on conflict (user_id) do update
        set narration_seconds_total = user_usage_counters.narration_seconds_total + excluded.narration_seconds_total,
            updated_at = now()
    `,
    [userId, parsedSeconds]
  );
}

export async function listUsersWithAdminData(planPrices = {}) {
  await ensureAdminUsersSchema();

  const result = await query(
    `
      select
        u.id,
        u.name,
        u.username,
        u.created_at,
        u.last_seen_at,
        coalesce(usage.text_tokens_total, 0) as text_tokens_total,
        coalesce(usage.narration_seconds_total, 0) as narration_seconds_total,
        notes.is_contractor,
        notes.contractor_event_id,
        override.plan_id as override_plan_id,
        event.date_label as contractor_event_date_label,
        event.place as contractor_event_place,
        active_message.active_message_id,
        active_message.active_message_title,
        active_message.active_message_body,
        active_message.active_message_created_at,
        case
          when u.last_seen_at is not null and u.last_seen_at >= now() - ($1::text || ' minutes')::interval then true
          else false
        end as is_online
      from users u
      left join user_usage_counters usage on usage.user_id = u.id
      left join admin_user_notes notes on notes.user_id = u.id
      left join user_plan_overrides override on override.user_id = u.id
      left join agenda_events event on event.id = notes.contractor_event_id
      left join lateral (
        select
          id as active_message_id,
          title as active_message_title,
          body as active_message_body,
          created_at as active_message_created_at
        from admin_user_messages
        where user_id = u.id
          and dismissed_at is null
        order by created_at desc
        limit 1
      ) active_message on true
      order by
        case
          when u.last_seen_at is not null and u.last_seen_at >= now() - ($1::text || ' minutes')::interval then 0
          else 1
        end asc,
        lower(coalesce(u.name, u.username, '')) asc
    `,
    [String(ONLINE_WINDOW_MINUTES)]
  );

  const availablePlans = buildSubscriptionPlans(planPrices).filter((plan) => plan.id !== "gratis");

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    isOnline: Boolean(row.is_online),
    textTokensTotal: Number(row.text_tokens_total) || 0,
    narrationSecondsTotal: Number(row.narration_seconds_total) || 0,
    assignedPlanId: row.override_plan_id || "",
    isContractor: Boolean(row.is_contractor),
    contractorEventId: row.contractor_event_id || null,
    contractorEventLabel: row.contractor_event_date_label
      ? `${row.contractor_event_date_label} - ${row.contractor_event_place || ""}`.trim()
      : "",
    hasActiveMessage: Boolean(row.active_message_id),
    activeMessage: row.active_message_id
      ? {
          id: row.active_message_id,
          title: row.active_message_title,
          body: row.active_message_body,
          createdAt: row.active_message_created_at
        }
      : null,
    availablePlans
  }));
}

export async function setUserPlanOverride({ userId, planId, assignedByUserId }) {
  await ensureAdminUsersSchema();

  const normalizedPlanId = normalizePlanId(planId);
  const plan = findSubscriptionPlanById(normalizedPlanId);

  if (!plan || normalizedPlanId === "gratis") {
    throw new Error("Plano invalido para atribuicao manual.");
  }

  await query(
    `
      insert into user_plan_overrides (user_id, plan_id, assigned_by_user_id, created_at, updated_at)
      values ($1, $2, $3, now(), now())
      on conflict (user_id) do update
        set plan_id = excluded.plan_id,
            assigned_by_user_id = excluded.assigned_by_user_id,
            updated_at = now()
    `,
    [userId, normalizedPlanId, assignedByUserId || null]
  );
}

export async function removeUserPlanOverride(userId) {
  await ensureAdminUsersSchema();
  await query("delete from user_plan_overrides where user_id = $1", [userId]);
}

export async function deleteUserById(userId) {
  await ensureAdminUsersSchema();
  await query("delete from users where id = $1", [userId]);
}

export async function setUserContractorStatus({ userId, isContractor, contractorEventId }) {
  await ensureAdminUsersSchema();

  let previousContractorUserId = null;

  if (contractorEventId) {
    const previousContractorResult = await query(
      `
        select contractor_user_id
        from agenda_events
        where id = $1
        limit 1
      `,
      [contractorEventId]
    );

    previousContractorUserId = previousContractorResult.rows[0]?.contractor_user_id || null;
  }

  await query(
    `
      update agenda_events
      set contractor_user_id = null
      where contractor_user_id = $1
    `,
    [userId]
  );

  if (!isContractor) {
    await query(
      `
        insert into admin_user_notes (user_id, is_contractor, contractor_event_id, updated_at)
        values ($1, false, null, now())
        on conflict (user_id) do update
          set is_contractor = false,
              contractor_event_id = null,
              updated_at = now()
      `,
      [userId]
    );
    return;
  }

  if (!contractorEventId) {
    throw new Error("Escolha um evento para o contratante.");
  }

  await query(
    `
      update agenda_events
      set contractor_user_id = null
      where id = $1
    `,
    [contractorEventId]
  );

  await query(
    `
      update agenda_events
      set contractor_user_id = $2
      where id = $1
    `,
    [contractorEventId, userId]
  );

  await query(
    `
      insert into admin_user_notes (user_id, is_contractor, contractor_event_id, updated_at)
      values ($1, true, $2, now())
      on conflict (user_id) do update
        set is_contractor = true,
            contractor_event_id = excluded.contractor_event_id,
            updated_at = now()
    `,
    [userId, contractorEventId]
  );

  if (previousContractorUserId && previousContractorUserId !== userId) {
    await query(
      `
        insert into admin_user_notes (user_id, is_contractor, contractor_event_id, updated_at)
        values ($1, false, null, now())
        on conflict (user_id) do update
          set is_contractor = false,
              contractor_event_id = null,
              updated_at = now()
      `,
      [previousContractorUserId]
    );
  }
}

export async function getUserContractorState(userId) {
  if (!userId) {
    return {
      isContractor: false,
      contractorEventId: null
    };
  }

  await ensureAdminUsersSchema();

  const result = await query(
    `
      select is_contractor, contractor_event_id
      from admin_user_notes
      where user_id = $1
      limit 1
    `,
    [userId]
  );

  const row = result.rows[0] || null;

  return {
    isContractor: Boolean(row?.is_contractor),
    contractorEventId: row?.contractor_event_id || null
  };
}

function mapAdminUserMessage(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    dismissedAt: row.dismissed_at || null,
    sentByUserId: row.sent_by_user_id || null
  };
}

export async function sendAdminUserMessage({ userId, title, body, sentByUserId }) {
  await ensureAdminUsersSchema();

  const result = await query(
    `
      insert into admin_user_messages (user_id, title, body, sent_by_user_id, created_at, dismissed_at)
      values ($1, $2, $3, $4, now(), null)
      returning id, user_id, title, body, sent_by_user_id, created_at, dismissed_at
    `,
    [userId, title, body, sentByUserId || null]
  );

  return mapAdminUserMessage(result.rows[0] || null);
}

export async function getActiveAdminUserMessage(userId) {
  if (!userId) {
    return null;
  }

  await ensureAdminUsersSchema();

  const result = await query(
    `
      select id, user_id, title, body, sent_by_user_id, created_at, dismissed_at
      from admin_user_messages
      where user_id = $1
        and dismissed_at is null
      order by created_at desc
      limit 1
    `,
    [userId]
  );

  return mapAdminUserMessage(result.rows[0] || null);
}

export async function dismissAdminUserMessage({ userId, messageId }) {
  if (!userId || !messageId) {
    return null;
  }

  await ensureAdminUsersSchema();

  const result = await query(
    `
      update admin_user_messages
      set dismissed_at = now()
      where id = $1
        and user_id = $2
        and dismissed_at is null
      returning id, user_id, title, body, sent_by_user_id, created_at, dismissed_at
    `,
    [messageId, userId]
  );

  return mapAdminUserMessage(result.rows[0] || null);
}
