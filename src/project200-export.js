import crypto from "node:crypto";

import { ensureActionsSchema } from "./actions.js";
import { db } from "./db.js";
import { ensurePlatformFinanceSchema } from "./platform-finance.js";
import { ensureProject200HistorySchema } from "./project200-history.js";
import { ensureProject200MusicSchema } from "./project200-music.js";
import { ensureProject200ProfilesSchema, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";
import { ensureStatsSchema } from "./stats.js";

async function clearTargetProject200Data(client, userId) {
  await client.query("delete from action_status_overrides where user_id = $1", [userId]);
  await client.query("delete from actions where user_id = $1", [userId]);
  await client.query("delete from project200_runtime_state where user_id = $1", [userId]);
  await client.query("delete from project_200_history_entries where user_id = $1", [userId]);
  await client.query("delete from project200_music_favorites where user_id = $1", [userId]);
  await client.query("delete from project200_music_task_defaults where user_id = $1", [userId]);
  await client.query("delete from project200_profiles where user_id = $1", [userId]);
  await client.query("delete from platform_daily_reports where user_id = $1", [userId]);
  await client.query("delete from platform_stats_goals where user_id = $1", [userId]);
  await client.query("delete from platform_finance_occurrences where user_id = $1", [userId]);
  await client.query("delete from platform_finance_entries where user_id = $1", [userId]);
  await client.query("delete from platform_finance_balances where user_id = $1", [userId]);
}

export async function exportProject200DataToUser({ sourceUserId, targetUserId }) {
  const fromUserId = String(sourceUserId || "").trim();
  const toUserId = String(targetUserId || "").trim();

  if (!fromUserId || !toUserId) {
    throw new Error("Usuário de origem ou destino inválido.");
  }

  if (fromUserId === toUserId) {
    throw new Error("Escolha outra conta para exportar.");
  }

  if (!db) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  await Promise.all([
    ensureActionsSchema(),
    ensurePlatformFinanceSchema(),
    ensureProject200HistorySchema(),
    ensureProject200MusicSchema(),
    ensureProject200ProfilesSchema(),
    ensureStatsSchema()
  ]);

  const client = await db.connect();
  try {
    await client.query("begin");

    const [
      sourceActionsResult,
      sourceOverridesResult,
      sourceRuntimeResult,
      sourceProfilesResult,
      sourceEntriesResult,
      sourceOccurrencesResult,
      sourceBalancesResult
    ] = await Promise.all([
      client.query("select * from actions where user_id = $1 order by created_at asc, start_at asc", [fromUserId]),
      client.query("select * from action_status_overrides where user_id = $1 order by created_at asc, updated_at asc", [fromUserId]),
      client.query("select * from project200_runtime_state where user_id = $1 limit 1", [fromUserId]),
      client.query("select * from project200_profiles where user_id = $1 and deleted_at is null order by sort_order asc, created_at asc", [fromUserId]),
      client.query("select * from platform_finance_entries where user_id = $1 order by created_at asc", [fromUserId]),
      client.query("select * from platform_finance_occurrences where user_id = $1 order by created_at asc, occurred_at asc", [fromUserId]),
      client.query("select * from platform_finance_balances where user_id = $1 limit 1", [fromUserId])
    ]);

    const actionIdMap = new Map();
    const repeatGroupMap = new Map();
    const financeEntryIdMap = new Map();

    for (const row of sourceActionsResult.rows) {
      actionIdMap.set(row.id, crypto.randomUUID());
      if (row.repeat_group_id && !repeatGroupMap.has(row.repeat_group_id)) {
        repeatGroupMap.set(row.repeat_group_id, crypto.randomUUID());
      }
    }

    for (const row of sourceEntriesResult.rows) {
      financeEntryIdMap.set(row.id, crypto.randomUUID());
    }

    await clearTargetProject200Data(client, toUserId);

    for (const row of sourceActionsResult.rows) {
      await client.query(
        `
          insert into actions (
            id,
            user_id,
            title,
            music_default_mode,
            music_station_name,
            music_track_name,
            music_track_url,
            assignee,
            category_id,
            start_at,
            end_at,
            repeat_group_id,
            repeat_rule,
            repeat_days,
            created_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10::timestamptz, $11::timestamptz, $12, $13, $14::jsonb, $15::timestamptz
          )
        `,
        [
          actionIdMap.get(row.id),
          toUserId,
          row.title,
          row.music_default_mode || "track",
          row.music_station_name || null,
          row.music_track_name || null,
          row.music_track_url || null,
          row.assignee || "Geral",
          row.category_id || "",
          row.start_at,
          row.end_at,
          row.repeat_group_id ? repeatGroupMap.get(row.repeat_group_id) : null,
          row.repeat_rule || "none",
          JSON.stringify(Array.isArray(row.repeat_days) ? row.repeat_days : []),
          row.created_at || new Date().toISOString()
        ]
      );
    }

    for (const row of sourceOverridesResult.rows) {
      const mappedActionId = actionIdMap.get(row.action_id);
      if (!mappedActionId) {
        continue;
      }
      await client.query(
        `
          insert into action_status_overrides (
            user_id,
            action_id,
            repeat_group_id,
            status,
            started_at,
            completed_at,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7::timestamptz, $8::timestamptz)
        `,
        [
          toUserId,
          mappedActionId,
          row.repeat_group_id ? repeatGroupMap.get(row.repeat_group_id) : null,
          row.status || "PENDING",
          row.started_at || null,
          row.completed_at || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || row.created_at || new Date().toISOString()
        ]
      );
    }

    if (sourceRuntimeResult.rows[0]) {
      const runtime = sourceRuntimeResult.rows[0];
      await client.query(
        `
          insert into project200_runtime_state (
            user_id,
            action_id,
            action_title,
            event_type,
            started_at,
            occurred_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7::timestamptz)
        `,
        [
          toUserId,
          runtime.action_id ? actionIdMap.get(runtime.action_id) || null : null,
          runtime.action_title || null,
          runtime.event_type || "start",
          runtime.started_at || null,
          runtime.occurred_at || runtime.updated_at || new Date().toISOString(),
          runtime.updated_at || runtime.occurred_at || new Date().toISOString()
        ]
      );
    }

    for (const row of sourceProfilesResult.rows) {
      await client.query(
        `
          insert into project200_profiles (
            id, user_id, name, avatar_preset, avatar_data_url, is_immutable, is_system, sort_order, created_at, updated_at, deleted_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, null)
        `,
        [
          crypto.randomUUID(),
          toUserId,
          row.name,
          row.avatar_preset || "default-user",
          row.avatar_data_url || "",
          Boolean(row.is_immutable),
          Boolean(row.is_system),
          Number(row.sort_order || 100),
          row.created_at || new Date().toISOString(),
          row.updated_at || row.created_at || new Date().toISOString()
        ]
      );
    }

    await client.query(
      `
        update project200_profile_links
        set assigned_profile = case
          when exists (
            select 1
            from project200_profiles
            where user_id = $1
              and deleted_at is null
              and lower(name) = lower(project200_profile_links.assigned_profile)
          ) then assigned_profile
          else $2
        end,
        updated_at = now()
        where user_id = $1
      `,
      [toUserId, PROJECT200_DEFAULT_PROFILE_NAME]
    );

    await client.query(
      `
        insert into project_200_history_entries (
          user_id, entry_type, event_type, assignee, task_title, speaker, title, body_text,
          percent, pending_count, late_start_minutes, scope_date, occurred_at, created_at
        )
        select
          $2,
          entry_type,
          event_type,
          assignee,
          task_title,
          speaker,
          title,
          body_text,
          percent,
          pending_count,
          late_start_minutes,
          scope_date,
          occurred_at,
          created_at
        from project_200_history_entries
        where user_id = $1
        order by created_at asc, occurred_at asc
      `,
      [fromUserId, toUserId]
    );

    await client.query(
      `
        insert into project200_music_favorites (
          user_id, station_name, track_name, track_url, created_at, updated_at
        )
        select $2, station_name, track_name, track_url, created_at, updated_at
        from project200_music_favorites
        where user_id = $1
        order by updated_at asc, created_at asc
      `,
      [fromUserId, toUserId]
    );

    await client.query(
      `
        insert into project200_music_task_defaults (
          user_id, task_title, default_mode, station_name, track_name, track_url, created_at, updated_at
        )
        select $2, task_title, default_mode, station_name, track_name, track_url, created_at, updated_at
        from project200_music_task_defaults
        where user_id = $1
        order by updated_at asc, created_at asc
      `,
      [fromUserId, toUserId]
    );

    await client.query(
      `
        insert into platform_stats_goals (
          user_id, daily_income_goal_cents, monthly_balance_goal_cents, recurring_income_goal_cents, updated_at
        )
        select $2, daily_income_goal_cents, monthly_balance_goal_cents, recurring_income_goal_cents, updated_at
        from platform_stats_goals
        where user_id = $1
      `,
      [fromUserId, toUserId]
    );

    await client.query(
      `
        insert into platform_daily_reports (
          user_id, report_date, payload, created_at
        )
        select $2, report_date, payload, created_at
        from platform_daily_reports
        where user_id = $1
        order by report_date asc
      `,
      [fromUserId, toUserId]
    );

    for (const row of sourceEntriesResult.rows) {
      await client.query(
        `
          insert into platform_finance_entries (
            id,
            user_id,
            name,
            kind,
            category,
            amount_cents,
            recurrence_type,
            recurrence_day_of_month,
            starts_on,
            deleted_at,
            created_at,
            updated_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9::date, $10::timestamptz, $11::timestamptz, $12::timestamptz
          )
        `,
        [
          financeEntryIdMap.get(row.id),
          toUserId,
          row.name,
          row.kind,
          row.category,
          row.amount_cents,
          row.recurrence_type,
          row.recurrence_day_of_month || null,
          row.starts_on,
          row.deleted_at || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || row.created_at || new Date().toISOString()
        ]
      );
    }

    for (const row of sourceOccurrencesResult.rows) {
      await client.query(
        `
          insert into platform_finance_occurrences (
            user_id,
            entry_id,
            name,
            kind,
            category,
            amount_cents,
            occurred_at,
            status,
            paid_at,
            created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8, $9::timestamptz, $10::timestamptz)
        `,
        [
          toUserId,
          row.entry_id ? financeEntryIdMap.get(row.entry_id) || null : null,
          row.name,
          row.kind,
          row.category,
          row.amount_cents,
          row.occurred_at,
          row.status || "POSTED",
          row.paid_at || null,
          row.created_at || new Date().toISOString()
        ]
      );
    }

    if (sourceBalancesResult.rows[0]) {
      const balance = sourceBalancesResult.rows[0];
      await client.query(
        `
          insert into platform_finance_balances (
            user_id, balance_cents, updated_at
          )
          values ($1, $2, $3::timestamptz)
        `,
        [toUserId, balance.balance_cents || 0, balance.updated_at || new Date().toISOString()]
      );
    }

    await client.query("commit");

    return {
      actions: sourceActionsResult.rows.length,
      actionStatusOverrides: sourceOverridesResult.rows.length,
      historyEntries: await client.query("select count(*)::int as count from project_200_history_entries where user_id = $1", [toUserId]).then((result) => Number(result.rows[0]?.count || 0)),
      financeEntries: sourceEntriesResult.rows.length,
      financeOccurrences: sourceOccurrencesResult.rows.length,
      hasRuntimeState: Boolean(sourceRuntimeResult.rows[0])
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
