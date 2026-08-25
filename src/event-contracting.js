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
    paidCents: Number(row.paid_cents || 0),
    paid: money(row.paid_cents),
    reportedAmountCents: Number(row.reported_amount_cents || 0),
    reportedAmount: money(row.reported_amount_cents),
    remainingCents: Math.max(0, Number(row.amount_cents || 0) - Number(row.paid_cents || 0)),
    remaining: money(Math.max(0, Number(row.amount_cents || 0) - Number(row.paid_cents || 0))),
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

function mapExpenseNote(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || "",
    amountCents: Number(row.amount_cents || 0),
    amount: money(row.amount_cents),
    category: row.category || "OTHER",
    otherLabel: row.other_label || "",
    fileUrl: `/api/event-expense-notes/${encodeURIComponent(row.id)}/file`,
    fileName: row.file_name || "nota-de-consumo",
    contentType: row.content_type || "application/octet-stream",
    sizeBytes: Number(row.size_bytes || 0),
    createdAt: row.created_at || null
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
      await query(`alter table event_contract_payments add column if not exists paid_cents integer not null default 0 check (paid_cents >= 0);`);
      await query(`alter table event_contract_payments add column if not exists reported_amount_cents integer not null default 0 check (reported_amount_cents >= 0);`);
      await query(`update event_contract_payments set paid_cents = amount_cents where status = 'CONFIRMED' and paid_cents = 0;`);
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
      await query(`
        create table if not exists event_contract_expense_notes (
          id uuid primary key default gen_random_uuid(),
          term_id uuid not null references "all-terms"(id) on delete cascade,
          user_id uuid not null references users(id) on delete cascade,
          title text not null,
          amount_cents integer not null check (amount_cents > 0),
          category text not null check (category in ('LODGING', 'FOOD', 'FUEL', 'TOLL', 'OTHER')),
          other_label text not null default '',
          file_key text not null,
          file_url text not null,
          file_name text not null,
          content_type text not null,
          size_bytes bigint not null check (size_bytes > 0),
          created_by_admin_user_id uuid references users(id) on delete set null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);
      await query(`create unique index if not exists idx_event_expense_notes_unique_title on event_contract_expense_notes(term_id, lower(title));`);
      await query(`create index if not exists idx_event_expense_notes_term on event_contract_expense_notes(term_id, created_at desc);`);
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
            amount_cents = case when event_contract_payments.status = 'PENDING' then greatest(event_contract_payments.paid_cents, excluded.amount_cents) else event_contract_payments.amount_cents end,
            updated_at = now()
    `, [term.id, term.userId, index + 1, dues[index], amounts[index]]);
  }
  await query(`insert into event_contract_lodging (term_id, user_id) values ($1, $2) on conflict (term_id) do nothing`, [term.id, term.userId]);
}

export async function getEventContractWorkflow(term) {
  if (!term?.id || !term?.userId) return null;
  await ensureRows(term);
  const [paymentResult, lodgingResult, assetResult, expenseNoteResult] = await Promise.all([
    query(`select * from event_contract_payments where term_id = $1 order by payment_order`, [term.id]),
    query(`select * from event_contract_lodging where term_id = $1 limit 1`, [term.id]),
    query(`select * from event_contract_assets where term_id = $1 limit 1`, [term.id]),
    query(`select * from event_contract_expense_notes where term_id = $1 order by created_at desc`, [term.id])
  ]);
  return {
    pixKey: "36.442.785/0001-00",
    pixLabel: "CNPJ",
    payments: paymentResult.rows.map(mapPayment),
    lodging: mapLodging(lodgingResult.rows[0]),
    promoVideo: mapAsset(assetResult.rows[0]),
    expenseNotes: expenseNoteResult.rows.map(mapExpenseNote)
  };
}

async function addUpdate(termId, userId, kind, payload = {}) {
  await query(`insert into event_admin_updates (term_id, user_id, kind, payload) values ($1, $2, $3, $4::jsonb)`, [termId, userId, kind, JSON.stringify(payload)]);
}

export async function reportEventPayment(userId, paymentId, amountCents) {
  await ensureEventContractingSchema();
  const requested = Math.trunc(Number(amountCents || 0));
  const current = await query(`select * from event_contract_payments where id = $1 and user_id = $2 limit 1`, [paymentId, userId]);
  const payment = current.rows[0];
  if (!payment) throw new Error("Pagamento nao encontrado.");
  if (payment.status === "REVIEW") throw new Error("Este pagamento ja esta em analise.");
  const remaining = Math.max(0, Number(payment.amount_cents || 0) - Number(payment.paid_cents || 0));
  if (remaining < 1) throw new Error("Este pagamento ja foi quitado.");
  if (!Number.isInteger(requested) || requested < 1 || requested > remaining) throw new Error(`Informe um valor entre R$ 0,01 e ${money(remaining)}.`);
  const result = await query(`
    update event_contract_payments set status = 'REVIEW', reported_amount_cents = $1,
      user_reported_at = now(), updated_at = now()
    where id = $2 and user_id = $3 returning *
  `, [requested, paymentId, userId]);
  const row = result.rows[0];
  await addUpdate(row.term_id, userId, "PAYMENT_REPORTED", { paymentId: row.id, order: row.payment_order, amountCents: requested });
  return mapPayment(row);
}

export async function confirmEventPayment(adminId, userId, paymentId) {
  await ensureEventContractingSchema();
  const result = await query(`
    update event_contract_payments
       set paid_cents = least(amount_cents, paid_cents + reported_amount_cents),
           status = case when paid_cents + reported_amount_cents >= amount_cents then 'CONFIRMED' else 'PENDING' end,
           reported_amount_cents = 0, admin_confirmed_at = now(), admin_confirmed_by_user_id = $1, updated_at = now()
     where id = $2 and user_id = $3 and status = 'REVIEW' and reported_amount_cents > 0
     returning *
  `, [adminId, paymentId, userId]);
  if (!result.rows[0]) throw new Error("Nao ha pagamento informado aguardando baixa.");
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
  const video = mapAsset(result.rows[0]);
  if (asset.generatedByContractor) {
    await addUpdate(termId, userId, "PROMO_VIDEO_GENERATED", { fileName: video?.fileName || asset.fileName });
  }
  return video;
}

export async function getEventPromoVideoFile(termId) {
  await ensureEventContractingSchema();
  const result = await query("select term_id, user_id, promo_video_key, promo_video_name, promo_video_content_type, promo_video_size from event_contract_assets where term_id = $1 and promo_video_key is not null limit 1", [termId]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    termId: row.term_id,
    userId: row.user_id,
    key: row.promo_video_key,
    fileName: row.promo_video_name || "video-divulgacao.mp4",
    contentType: row.promo_video_content_type || "video/mp4",
    sizeBytes: Number(row.promo_video_size || 0)
  };
}

export async function createEventExpenseNote(adminId, userId, termId, input = {}, asset = {}) {
  await ensureEventContractingSchema();
  const title = String(input.title || "").replace(/\s+/g, " ").trim().slice(0, 120);
  const amountCents = Math.trunc(Number(input.amountCents || 0));
  const category = String(input.category || "").trim().toUpperCase();
  const allowedCategories = new Set(["LODGING", "FOOD", "FUEL", "TOLL", "OTHER"]);
  const otherLabel = category === "OTHER"
    ? String(input.otherLabel || "").replace(/\s+/g, " ").trim().slice(0, 120)
    : "";
  if (title.length < 2) throw new Error("Informe um titulo para a nota.");
  if (!Number.isInteger(amountCents) || amountCents < 1) throw new Error("Informe um valor valido para a nota.");
  if (!allowedCategories.has(category)) throw new Error("Escolha uma categoria valida.");
  if (category === "OTHER" && !otherLabel) throw new Error("Explique o que e a categoria Outros.");
  if (!asset.key || !asset.fileName || !asset.contentType || !Number(asset.sizeBytes)) {
    throw new Error("Envie a foto ou o arquivo da nota.");
  }
  try {
    const result = await query(`
      insert into event_contract_expense_notes
        (term_id, user_id, title, amount_cents, category, other_label, file_key, file_url, file_name, content_type, size_bytes, created_by_admin_user_id)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      returning *
    `, [termId, userId, title, amountCents, category, otherLabel, asset.key, asset.url, asset.fileName, asset.contentType, asset.sizeBytes, adminId]);
    return mapExpenseNote(result.rows[0]);
  } catch (error) {
    if (String(error?.code || "") === "23505") throw new Error("Ja existe uma nota com esse titulo neste evento.");
    throw error;
  }
}

export async function getEventExpenseNoteFile(noteId) {
  await ensureEventContractingSchema();
  const result = await query(`
    select id, user_id, file_key, file_name, content_type, size_bytes
      from event_contract_expense_notes
     where id = $1
     limit 1
  `, [noteId]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    key: row.file_key,
    fileName: row.file_name || "nota-de-consumo",
    contentType: row.content_type || "application/octet-stream",
    sizeBytes: Number(row.size_bytes || 0)
  };
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
