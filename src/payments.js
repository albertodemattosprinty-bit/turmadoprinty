import crypto from "node:crypto";

import { getCatalogAccessSummary, hasFullCatalogAccess } from "./access-rules.js";
import { db, query } from "./db.js";

const ACTIVE_PAYMENT_STATUSES = new Set(["PAID", "AUTHORIZED"]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "PAID", "AUTHORIZED"]);
const INACTIVE_SUBSCRIPTION_STATUSES = new Set(["CANCELED", "CANCELLED", "SUSPENDED", "EXPIRED", "OVERDUE", "DECLINED", "INACTIVE"]);
export const DEFAULT_REHEARSAL_CODE_USES = 20;

function normalizeStatus(value, fallback = "PENDING") {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized || fallback;
}

let paymentSchemaReadyPromise = null;

export async function ensurePaymentSchema() {
  if (!paymentSchemaReadyPromise) {
    paymentSchemaReadyPromise = (async () => {
      await query(`
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
      `);

      await query("create index if not exists idx_user_album_purchases_user_id on user_album_purchases(user_id);");
      await query("create index if not exists idx_user_album_purchases_product_id on user_album_purchases(product_id);");
      await query("create index if not exists idx_user_album_purchases_status on user_album_purchases(status);");

      await query(`
        create table if not exists user_album_grants (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references users(id) on delete cascade,
          product_id text not null,
          assigned_by_user_id uuid references users(id) on delete set null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (user_id, product_id)
        );
      `);
      await query("create index if not exists idx_user_album_grants_user_id on user_album_grants(user_id);");
      await query("create index if not exists idx_user_album_grants_product_id on user_album_grants(product_id);");

      await query(`
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
      `);

      await query("create index if not exists idx_user_plan_subscriptions_user_id on user_plan_subscriptions(user_id);");
      await query("create index if not exists idx_user_plan_subscriptions_plan_id on user_plan_subscriptions(plan_id);");
      await query("create index if not exists idx_user_plan_subscriptions_status on user_plan_subscriptions(status);");

      await query(`
        create table if not exists payment_webhook_events (
          id uuid primary key default gen_random_uuid(),
          event_type text,
          resource_id text,
          reference_id text,
          payload jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now()
        );
      `);

      await query("create index if not exists idx_payment_webhook_events_reference_id on payment_webhook_events(reference_id);");
      await query("create index if not exists idx_payment_webhook_events_event_type on payment_webhook_events(event_type);");

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
        create table if not exists user_album_rehearsal_codes (
          id uuid primary key default gen_random_uuid(),
          owner_user_id uuid not null references users(id) on delete cascade,
          product_id text not null,
          rehearsal_code text not null unique,
          total_uses integer not null default 20,
          remaining_uses integer not null default 20,
          active boolean not null default true,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (owner_user_id, product_id)
        );
      `);
      await query("create index if not exists idx_user_album_rehearsal_codes_owner on user_album_rehearsal_codes(owner_user_id);");
      await query("create index if not exists idx_user_album_rehearsal_codes_product on user_album_rehearsal_codes(product_id);");
      await query("create index if not exists idx_user_album_rehearsal_codes_code on user_album_rehearsal_codes(rehearsal_code);");

      await query(`
        create table if not exists user_album_rehearsal_access (
          id uuid primary key default gen_random_uuid(),
          code_id uuid not null references user_album_rehearsal_codes(id) on delete cascade,
          owner_user_id uuid not null references users(id) on delete cascade,
          user_id uuid not null references users(id) on delete cascade,
          product_id text not null,
          created_at timestamptz not null default now(),
          unique (user_id, product_id)
        );
      `);
      await query("create index if not exists idx_user_album_rehearsal_access_user on user_album_rehearsal_access(user_id);");
      await query("create index if not exists idx_user_album_rehearsal_access_owner on user_album_rehearsal_access(owner_user_id);");
      await query("create index if not exists idx_user_album_rehearsal_access_product on user_album_rehearsal_access(product_id);");
    })().catch((error) => {
      paymentSchemaReadyPromise = null;
      throw error;
    });
  }

  return paymentSchemaReadyPromise;
}

export function isActivePaymentStatus(status) {
  return ACTIVE_PAYMENT_STATUSES.has(normalizeStatus(status));
}

export function isActiveSubscriptionStatus(status) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(normalizeStatus(status));
}

export function isInactiveSubscriptionStatus(status) {
  return INACTIVE_SUBSCRIPTION_STATUSES.has(normalizeStatus(status));
}

export async function createAlbumPurchaseRecord({ userId, productId, referenceId, checkoutId, amountCents, environment, payload }) {
  const result = await query(
    `
      insert into user_album_purchases (
        user_id,
        product_id,
        reference_id,
        checkout_id,
        amount_cents,
        pagbank_environment,
        raw_payload
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
      on conflict (reference_id) do update
        set checkout_id = excluded.checkout_id,
            amount_cents = excluded.amount_cents,
            pagbank_environment = excluded.pagbank_environment,
            raw_payload = excluded.raw_payload,
            updated_at = now()
      returning *
    `,
    [userId, productId, referenceId, checkoutId, amountCents, environment, JSON.stringify(payload || {})]
  );

  return result.rows[0];
}

export async function assignAlbumGrantToUser({ userId, productId, assignedByUserId }) {
  await ensurePaymentSchema();

  const result = await query(
    `
      insert into user_album_grants (
        user_id,
        product_id,
        assigned_by_user_id,
        created_at,
        updated_at
      )
      values ($1, $2, $3, now(), now())
      on conflict (user_id, product_id) do update
        set assigned_by_user_id = excluded.assigned_by_user_id,
            updated_at = now()
      returning *
    `,
    [userId, productId, assignedByUserId || null]
  );

  return result.rows[0] || null;
}

export async function createPlanSubscriptionRecord({ userId, planId, referenceId, checkoutId, amountCents, environment, payload }) {
  const result = await query(
    `
      insert into user_plan_subscriptions (
        user_id,
        plan_id,
        reference_id,
        checkout_id,
        amount_cents,
        pagbank_environment,
        raw_payload
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
      on conflict (reference_id) do update
        set checkout_id = excluded.checkout_id,
            amount_cents = excluded.amount_cents,
            pagbank_environment = excluded.pagbank_environment,
            raw_payload = excluded.raw_payload,
            updated_at = now()
      returning *
    `,
    [userId, planId, referenceId, checkoutId, amountCents, environment, JSON.stringify(payload || {})]
  );

  return result.rows[0];
}

export async function recordPaymentWebhookEvent({ eventType, resourceId, referenceId, payload }) {
  const values = [eventType || null, resourceId || null, referenceId || null, JSON.stringify(payload || {})];

  try {
    await query(
      `
        insert into payment_webhook_events (event_type, resource_id, reference_id, payload)
        values ($1, $2, $3, $4::jsonb)
      `,
      values
    );
  } catch (error) {
    if (!String(error?.message || "").includes("payment_webhook_events")) {
      throw error;
    }

    await query(
      `
        insert into pagbank_webhook_events (event_type, resource_id, reference_id, payload)
        values ($1, $2, $3, $4::jsonb)
      `,
      values
    );
  }
}

export async function markAlbumPurchaseStatus({
  referenceId,
  status,
  orderId,
  chargeId,
  payload,
  paidAt
}) {
  await ensurePaymentSchema();

  const normalizedStatus = normalizeStatus(status);
  const result = await query(
    `
      update user_album_purchases
      set status = $2,
          order_id = coalesce($3, order_id),
          charge_id = coalesce($4, charge_id),
          raw_payload = $5::jsonb,
          updated_at = now(),
          paid_at = case
            when $6::timestamptz is not null then $6::timestamptz
            when $2 in ('PAID', 'AUTHORIZED') and paid_at is null then now()
            else paid_at
          end
      where reference_id = $1
      returning *
    `,
    [referenceId, normalizedStatus, orderId || null, chargeId || null, JSON.stringify(payload || {}), paidAt || null]
  );

  const row = result.rows[0] || null;

  if (row && isActivePaymentStatus(normalizedStatus)) {
    await assignAlbumGrantToUser({
      userId: row.user_id,
      productId: row.product_id,
      assignedByUserId: null
    });
  }

  return row;
}

export async function markPlanSubscriptionStatus({
  referenceId,
  status,
  subscriptionId,
  payload,
  activatedAt,
  canceledAt
}) {
  const normalizedStatus = normalizeStatus(status);
  const result = await query(
    `
      update user_plan_subscriptions
      set status = $2,
          subscription_id = coalesce($3, subscription_id),
          raw_payload = $4::jsonb,
          updated_at = now(),
          activated_at = case
            when $5::timestamptz is not null then $5::timestamptz
            when $2 in ('ACTIVE', 'PAID', 'AUTHORIZED') and activated_at is null then now()
            else activated_at
          end,
          canceled_at = case
            when $6::timestamptz is not null then $6::timestamptz
            when $2 in ('CANCELED', 'CANCELLED', 'SUSPENDED', 'EXPIRED', 'OVERDUE', 'DECLINED', 'INACTIVE') and canceled_at is null then now()
            else canceled_at
          end
      where reference_id = $1
      returning *
    `,
    [referenceId, normalizedStatus, subscriptionId || null, JSON.stringify(payload || {}), activatedAt || null, canceledAt || null]
  );

  const row = result.rows[0] || null;

  if (row && isActiveSubscriptionStatus(normalizedStatus)) {
    await query(
      `
        update user_plan_subscriptions
        set status = 'REPLACED',
            canceled_at = coalesce(canceled_at, now()),
            updated_at = now()
        where user_id = $1
          and reference_id <> $2
          and status in ('ACTIVE', 'PAID', 'AUTHORIZED')
      `,
      [row.user_id, referenceId]
    );
  }

  return row;
}

export async function getUserAccessState(userId) {
  const [subscriptionResult, purchasesResult, grantsResult, rehearsalResult, overrideResult] = await Promise.all([
    query(
      `
        select plan_id, status, activated_at, canceled_at, updated_at
        from user_plan_subscriptions
        where user_id = $1
        order by
          case when status in ('ACTIVE', 'PAID', 'AUTHORIZED') then 0 else 1 end,
          updated_at desc
        limit 1
      `,
      [userId]
    ),
    query(
      `
        select distinct product_id
        from user_album_purchases
        where user_id = $1
          and status in ('PAID', 'AUTHORIZED')
      `,
      [userId]
    ),
    query(
      `
        select distinct product_id
        from user_album_grants
        where user_id = $1
      `,
      [userId]
    ),
    query(
      `
        select distinct product_id
        from user_album_rehearsal_access
        where user_id = $1
      `,
      [userId]
    ),
    query(
      `
        select plan_id, updated_at
        from user_plan_overrides
        where user_id = $1
        limit 1
      `,
      [userId]
    )
  ]);

  const plan = subscriptionResult.rows[0] || null;
  const override = overrideResult.rows[0] || null;
  const purchasedAlbumIds = Array.from(
    new Set([
      ...purchasesResult.rows.map((row) => row.product_id),
      ...grantsResult.rows.map((row) => row.product_id)
    ])
  );
  const grantedAlbumIds = grantsResult.rows.map((row) => row.product_id);
  const rehearsalAlbumIds = Array.from(new Set(rehearsalResult.rows.map((row) => row.product_id)));
  const effectivePlan = override
    ? {
        id: override.plan_id,
        status: "ADMIN_ASSIGNED",
        active: override.plan_id !== "gratis",
        activatedAt: override.updated_at,
        canceledAt: null,
        updatedAt: override.updated_at
      }
    : plan
      ? {
          id: plan.plan_id,
          status: normalizeStatus(plan.status),
          active: isActiveSubscriptionStatus(plan.status),
          activatedAt: plan.activated_at,
          canceledAt: plan.canceled_at,
          updatedAt: plan.updated_at
        }
      : {
          id: "gratis",
          status: "FREE",
          active: false,
          activatedAt: null,
          canceledAt: null,
          updatedAt: null
        };

  return {
    plan: effectivePlan,
    purchasedAlbumIds,
    grantedAlbumIds,
    rehearsalAlbumIds,
    canDownloadAll: Boolean(effectivePlan && hasFullCatalogAccess(effectivePlan.id) && effectivePlan.active),
    ...getCatalogAccessSummary(effectivePlan?.id)
  };
}

function generateRehearsalCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.randomBytes(8), (value) => alphabet[value % alphabet.length]).join("");
}

function mapRehearsalCodeRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    productId: row.product_id,
    rehearsalCode: row.rehearsal_code,
    totalUses: Number(row.total_uses || 0),
    remainingUses: Number(row.remaining_uses || 0),
    active: Boolean(row.active),
    ownerUsername: row.owner_username || null,
    ownerName: row.owner_name || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export async function getAlbumRehearsalCodeForOwner({ ownerUserId, productId, createIfMissing = true }) {
  await ensurePaymentSchema();

  const existing = await query(
    `
      select codes.*, users.username as owner_username, users.name as owner_name
      from user_album_rehearsal_codes codes
      join users on users.id = codes.owner_user_id
      where codes.owner_user_id = $1
        and codes.product_id = $2
      limit 1
    `,
    [ownerUserId, productId]
  );

  if (existing.rows[0]) {
    return mapRehearsalCodeRow(existing.rows[0]);
  }

  if (!createIfMissing) {
    return null;
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const rehearsalCode = generateRehearsalCode();
    try {
      const inserted = await query(
        `
          insert into user_album_rehearsal_codes (
            owner_user_id,
            product_id,
            rehearsal_code,
            total_uses,
            remaining_uses,
            active,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $4, true, now(), now())
          on conflict (owner_user_id, product_id) do update
            set updated_at = now()
          returning *
        `,
        [ownerUserId, productId, rehearsalCode, DEFAULT_REHEARSAL_CODE_USES]
      );

      const row = inserted.rows[0] || null;
      if (!row) {
        break;
      }

      const ownerResult = await query(
        `
          select username, name
          from users
          where id = $1
          limit 1
        `,
        [ownerUserId]
      );

      return mapRehearsalCodeRow({
        ...row,
        owner_username: ownerResult.rows[0]?.username || null,
        owner_name: ownerResult.rows[0]?.name || null
      });
    } catch (error) {
      if (!String(error?.message || "").includes("user_album_rehearsal_codes_rehearsal_code_key")) {
        throw error;
      }
    }
  }

  throw new Error("Nao foi possivel gerar o codigo de ensaio.");
}

export async function redeemAlbumRehearsalCode({ userId, ownerUserId, productId, rehearsalCode }) {
  await ensurePaymentSchema();

  if (!db) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existingAccess = await client.query(
      `
        select access.id, access.created_at, codes.remaining_uses, codes.total_uses, codes.rehearsal_code
        from user_album_rehearsal_access access
        join user_album_rehearsal_codes codes on codes.id = access.code_id
        where access.user_id = $1
          and access.product_id = $2
        limit 1
      `,
      [userId, productId]
    );

    if (existingAccess.rows[0]) {
      await client.query("COMMIT");
      return {
        alreadyGranted: true,
        accessCreatedAt: existingAccess.rows[0].created_at || null,
        remainingUses: Number(existingAccess.rows[0].remaining_uses || 0),
        totalUses: Number(existingAccess.rows[0].total_uses || 0),
        rehearsalCode: existingAccess.rows[0].rehearsal_code || null
      };
    }

    const codeResult = await client.query(
      `
        select *
        from user_album_rehearsal_codes
        where owner_user_id = $1
          and product_id = $2
          and rehearsal_code = $3
          and active = true
        limit 1
        for update
      `,
      [ownerUserId, productId, String(rehearsalCode || "").trim().toUpperCase()]
    );

    const codeRow = codeResult.rows[0] || null;
    if (!codeRow) {
      throw new Error("Codigo de ensaio invalido para este album.");
    }

    if (Number(codeRow.remaining_uses || 0) <= 0) {
      throw new Error("Esse codigo de ensaio ja atingiu o limite de acessos.");
    }

    const insertAccess = await client.query(
      `
        insert into user_album_rehearsal_access (
          code_id,
          owner_user_id,
          user_id,
          product_id,
          created_at
        )
        values ($1, $2, $3, $4, now())
        on conflict (user_id, product_id) do nothing
        returning *
      `,
      [codeRow.id, ownerUserId, userId, productId]
    );

    if (!insertAccess.rows[0]) {
      const concurrentAccess = await client.query(
        `
          select access.created_at, codes.remaining_uses, codes.total_uses, codes.rehearsal_code
          from user_album_rehearsal_access access
          join user_album_rehearsal_codes codes on codes.id = access.code_id
          where access.user_id = $1
            and access.product_id = $2
          limit 1
        `,
        [userId, productId]
      );

      await client.query("COMMIT");
      return {
        alreadyGranted: true,
        accessCreatedAt: concurrentAccess.rows[0]?.created_at || null,
        remainingUses: Number(concurrentAccess.rows[0]?.remaining_uses || codeRow.remaining_uses || 0),
        totalUses: Number(concurrentAccess.rows[0]?.total_uses || codeRow.total_uses || 0),
        rehearsalCode: concurrentAccess.rows[0]?.rehearsal_code || codeRow.rehearsal_code
      };
    }

    const updateResult = await client.query(
      `
        update user_album_rehearsal_codes
        set remaining_uses = greatest(remaining_uses - 1, 0),
            updated_at = now()
        where id = $1
        returning remaining_uses, total_uses
      `,
      [codeRow.id]
    );

    await client.query("COMMIT");

    return {
      alreadyGranted: false,
      accessCreatedAt: insertAccess.rows[0].created_at || null,
      remainingUses: Number(updateResult.rows[0]?.remaining_uses || 0),
      totalUses: Number(updateResult.rows[0]?.total_uses || codeRow.total_uses || 0),
      rehearsalCode: codeRow.rehearsal_code
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // noop
    }
    throw error;
  } finally {
    client.release();
  }
}
