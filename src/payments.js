import { query } from "./db.js";
import { getCatalogAccessSummary, hasFullCatalogAccess } from "./access-rules.js";

const ACTIVE_PAYMENT_STATUSES = new Set(["PAID", "AUTHORIZED"]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "PAID", "AUTHORIZED"]);
const INACTIVE_SUBSCRIPTION_STATUSES = new Set(["CANCELED", "CANCELLED", "SUSPENDED", "EXPIRED", "OVERDUE", "DECLINED", "INACTIVE"]);

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
  const [subscriptionResult, purchasesResult, grantsResult, overrideResult] = await Promise.all([
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
    canDownloadAll: Boolean(effectivePlan && hasFullCatalogAccess(effectivePlan.id) && effectivePlan.active),
    ...getCatalogAccessSummary(effectivePlan?.id)
  };
}
