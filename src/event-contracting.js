import { query } from "./db.js";

let schemaPromise = null;

function money(cents) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents || 0) / 100);
}

function dateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function addDays(value, amount) {
  const date = new Date(`${dateOnly(value)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function mapPayment(row) {
  return {
    id: row.id,
    order: Number(row.payment_order),
    dueDate: dateOnly(row.due_at),
    amountCents: Number(row.amount_cents || 0),
    amount: money(row.amount_cents),
    status: row.status,
    userReportedAt: row.user_reported_at || null,
    adminConfirmedAt: row.admin_confirmed_at || null
  };
}

function mapLodging(row) {
  if (!row) return null;
  return {
    hotelName: row.hotel_name || "",
    phone: row.phone || "",
    address: row.address || "",
    checkIn: dateOnly(row.check_in),
    checkOut: dateOnly(row.check_out),
    notes: row.notes || "",
    status: row.status,
    submittedAt: row.submitted_at || null,
    adminConfirmedAt: row.admin_confirmed_at || null
  };
}

function mapAsset(row) {
  if (!row?.promo_video_url) return null;
  return {
    key: row.promo_video_key,
    url: row.promo_video_url,
    fileName: row.promo_video_name || "video-divulgacao",
    contentType: row.promo_video_content_type || "video/mp4",
    sizeBytes: Number(row.promo_video_size || 0),
    updatedAt: row.updated_at
  };
}

export async function ensureEventContractingSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query(`
        create table if not exists event_contract_payments (
          id uuid primary key default gen_random_uuid(),
          term_id uuid not null references "all-terms"(id) on delete cascade,
          user_id uuid not null references users(id) on delete cascade,
          payment_order smallint not null check (payment_order in (1, 2)),
          due_at date not null,
          amount_cents integer not null check (amount_cents >= 0),
          status text not null default 'PENDING' check (status in ('PENDING', 'REVIEW', 'CONFIRMED')),
          user_reported_at timestamptz,
          admin_confirmed_at timestamptz,
          admin_confirmed_by_user_id uuid references users(id) on delete set null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (term_id, payment_order)
        );
      `);
      await query(`create index if not exists idx_event_contract_payments_user on event_contract_payments(user_id, updated_at desc);`);
      await query(`
        create table if not exists event_contract_lodging (
          term_id uuid primary key references "all-terms"(id) on delete cascade,
          user_id uuid not null references users(id) on delete cascade,
          hotel_name text not null default '', phone text not null default '', address text not null default '',
          check_in date, check_out date, notes text not null default '',
          status text not null default 'PENDING' check (status in ('PENDING', 'REVIEW', 'CONFIRMED')),
          submitted_at timestamptz, admin_confirmed_at timestamptz,
          admin_confirmed_by_user_id uuid references users(id) on delete set null,
          created_at timestamptz not null default now(), updated_at timestamptz not null default now()
        );
      `);
      await query(`
        create table if not exists event_contract_assets (
          term_id uuid primary key references "all-terms"(id) on delete cascade,
          user_id uuid not null references users(id) on delete cascade,
          promo_video_key text, promo_video_url text, promo_video_name text,
          promo_video_content_type text, promo_video_size bigint,
          uploaded_by_user_id uuid references users(id) on delete set null,
          created_at timestamptz not null default now(), updated_at timestamptz not null default now()
        );
      `);
      await query(`
        create table if not exists event_admin_updates (
          id uuid primary key default gen_random_uuid(),
          term_id uuid not null references "all-terms"(id) on delete cascade,
          user_id uuid not null references users(id) on delete cascade,
          kind text not null, payload jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(), viewed_at timestamptz
        );
      `);
      await query(`create index if not exists idx_event_admin_updates_unread on event_admin_updates(user_id, created_at desc) where viewed_at is null;`);
    })().catch((error) => { schemaPromise = null; throw error; });
  }
  return schemaPromise;
}

async function ensureRows(term) {
  await ensureEventContractingSchema();
  const answers = term?.answers || {};
  const total = Math.max(0, Math.trunc(Number(answers.finalPriceCents || 0)));
  const firstAmount = Math.floor(total / 2);
  const amounts = [firstAmount, total - firstAmount];
  const chosenDue = dateOnly(answers.pagamentoVencimentoIso);
  const createdFallback = addDays(term.createdAt, 5);
  const eventDue = addDays(term.eventDate, -7);
  const dues = [chosenDue || createdFallback, eventDue || chosenDue || createdFallback];
  for (let index = 0; index < 2; index += 1) {
    await query(`
      insert into event_contract_payments (term_id, user_id, payment_order, due_at, amount_cents)
      values ($1, $2, $3, $4::date, $5)
      on conflict (term_id, payment_order) do update
        set due_at = case when event_contract_payments.status = 'PENDING' then excluded.due_at else event_contract_payments.due_at end,
            amount_cents = case when event_contract_payments.status = 'PENDING' then excluded.amount_cents else event_contract_payments.amount_cents end,
            updated_at = now()
    `, [term.id, term.userId, index + 1, dues[index], amounts[index]]);
  }
  await query(`insert into event_contract_lodging (term_id, user_id) values ($1, $2) on conflict (term_id) do nothing`, [term.id, term.userId]);
}

export async function getEventContractWorkflow(term) {
  if (!term?.id || !term?.userId) return null;
  await ensureRows(term);
  const [paymentResult, lodgingResult, assetResult] = await Promise.all([
    query(`select * from event_contract_payments where term_id = $1 order by payment_order`, [term.id]),
    query(`select * from event_contract_lodging where term_id = $1 limit 1`, [term.id]),
    query(`select * from event_contract_assets where term_id = $1 limit 1`, [term.id])
  ]);
  return {
    pixKey: "36.442.785/0001-00",
    pixLabel: "CNPJ",
    payments: paymentResult.rows.map(mapPayment),
    lodging: mapLodging(lodgingResult.rows[0]),
    promoVideo: mapAsset(assetResult.rows[0])
  };
}

async function addUpdate(termId, userId, kind, payload = {}) {
  await query(`insert into event_admin_updates (term_id, user_id, kind, payload) values ($1, $2, $3, $4::jsonb)`, [termId, userId, kind, JSON.stringify(payload)]);
}

export async function reportEventPayment(userId, paymentId) {
  await ensureEventContractingSchema();
  const result = await query(`
    update event_contract_payments set status = case when status = 'CONFIRMED' then status else 'REVIEW' end,
      user_reported_at = case when status = 'CONFIRMED' then user_reported_at else now() end, updated_at = now()
    where id = $1 and user_id = $2 returning *
  `, [paymentId, userId]);
  const row = result.rows[0];
  if (!row) throw new Error("Pagamento nao encontrado.");
  if (row.status !== "CONFIRMED") await addUpdate(row.term_id, userId, "PAYMENT_REPORTED", { paymentId: row.id, order: row.payment_order });
  return mapPayment(row);
}

export async function confirmEventPayment(adminId, userId, paymentId) {
  await ensureEventContractingSchema();
  const result = await query(`
    update event_contract_payments set status = 'CONFIRMED', admin_confirmed_at = now(),
      admin_confirmed_by_user_id = $1, updated_at = now()
    where id = $2 and user_id = $3 returning *
  `, [adminId, paymentId, userId]);
  if (!result.rows[0]) throw new Error("Pagamento nao encontrado.");
  return mapPayment(result.rows[0]);
}

export async function saveEventLodging(userId, termId, input = {}) {
  await ensureEventContractingSchema();
  const hotelName = String(input.hotelName || "").trim().slice(0, 180);
  if (!hotelName) throw new Error("Informe o nome do hotel.");
  const result = await query(`
    update event_contract_lodging set hotel_name = $1, phone = $2, address = $3,
      check_in = nullif($4, '')::date, check_out = nullif($5, '')::date, notes = $6,
      status = 'REVIEW', submitted_at = now(), admin_confirmed_at = null,
      admin_confirmed_by_user_id = null, updated_at = now()
    where term_id = $7 and user_id = $8 returning *
  `, [hotelName, String(input.phone || "").trim().slice(0, 80), String(input.address || "").trim().slice(0, 300), dateOnly(input.checkIn), dateOnly(input.checkOut), String(input.notes || "").trim().slice(0, 2000), termId, userId]);
  if (!result.rows[0]) throw new Error("Evento nao encontrado.");
  await addUpdate(termId, userId, "LODGING_SUBMITTED", { hotelName });
  return mapLodging(result.rows[0]);
}

export async function confirmEventLodging(adminId, userId, termId) {
  await ensureEventContractingSchema();
  const result = await query(`update event_contract_lodging set status = 'CONFIRMED', admin_confirmed_at = now(), admin_confirmed_by_user_id = $1, updated_at = now() where term_id = $2 and user_id = $3 returning *`, [adminId, termId, userId]);
  if (!result.rows[0]) throw new Error("Hospedagem nao encontrada.");
  return mapLodging(result.rows[0]);
}

export async function saveEventPromoVideo(adminId, userId, termId, asset) {
  await ensureEventContractingSchema();
  const result = await query(`
    insert into event_contract_assets (term_id, user_id, promo_video_key, promo_video_url, promo_video_name, promo_video_content_type, promo_video_size, uploaded_by_user_id)
    values ($1,$2,$3,$4,$5,$6,$7,$8)
    on conflict (term_id) do update set promo_video_key=excluded.promo_video_key, promo_video_url=excluded.promo_video_url,
      promo_video_name=excluded.promo_video_name, promo_video_content_type=excluded.promo_video_content_type,
      promo_video_size=excluded.promo_video_size, uploaded_by_user_id=excluded.uploaded_by_user_id, updated_at=now()
    returning *
  `, [termId, userId, asset.key, asset.url, asset.fileName, asset.contentType, asset.sizeBytes, adminId]);
  return mapAsset(result.rows[0]);
}

export async function listUnreadEventUserIds() {
  await ensureEventContractingSchema();
  const result = await query(`select distinct user_id from event_admin_updates where viewed_at is null`);
  return new Set(result.rows.map((row) => row.user_id));
}

export async function markEventUpdatesViewed(userId) {
  await ensureEventContractingSchema();
  await query(`update event_admin_updates set viewed_at = now() where user_id = $1 and viewed_at is null`, [userId]);
}
