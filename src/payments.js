import { query } from "./db.js";

const ACTIVE_PAYMENT_STATUSES = new Set(["PAID", "AUTHORIZED"]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "PAID", "AUTHORIZED"]);
const INACTIVE_SUBSCRIPTION_STATUSES = new Set(["CANCELED", "CANCELLED", "SUSPENDED", "EXPIRED", "OVERDUE", "DECLINED", "INACTIVE"]);

function normalizeStatus(value, fallback = "PENDING") {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized || fallback;
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

export async function recordPagBankWebhookEvent({ eventType, resourceId, referenceId, payload }) {
  await query(
    `
      insert into pagbank_webhook_events (event_type, resource_id, reference_id, payload)
      values ($1, $2, $3, $4::jsonb)
    `,
    [eventType || null, resourceId || null, referenceId || null, JSON.stringify(payload || {})]
  );
}

export async function markAlbumPurchaseStatus({
  referenceId,
  status,
  orderId,
  chargeId,
  payload,
  paidAt
}) {
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

  return result.rows[0] || null;
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
  const [subscriptionResult, purchasesResult] = await Promise.all([
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
    )
  ]);

  const plan = subscriptionResult.rows[0] || null;
  const purchasedAlbumIds = purchasesResult.rows.map((row) => row.product_id);

  return {
    plan: plan
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
        },
    purchasedAlbumIds,
    canDownloadAll: Boolean(plan && isActiveSubscriptionStatus(plan.status))
  };
}
