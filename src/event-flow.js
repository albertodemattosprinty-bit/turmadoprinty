import { query } from "./db.js";

export const EVENT_PRESENTATIONS = Object.freeze([
  Object.freeze({ key: "teatro-fantoches", name: "Teatro Fantoches", unitPriceCents: 180000 }),
  Object.freeze({ key: "teatro-palco", name: "Teatro de Palco", unitPriceCents: 260000 }),
  Object.freeze({ key: "congresso-infantil", name: "Congresso Infantil", unitPriceCents: 340000, featured: true }),
  Object.freeze({ key: "parques-arenas", name: "Parques e Arenas", unitPriceCents: 450000 }),
  Object.freeze({ key: "show-completo-2h", name: "Show Completo 2h", unitPriceCents: 600000 })
]);

let eventFlowSchemaPromise = null;

export function formatEventMoney(cents) {
  const safeCents = Math.max(0, Math.trunc(Number(cents || 0) || 0));
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(safeCents / 100);
}

function normalizeCouponCode(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 40);
}

export function normalizeEventPageSlug(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function resolvePresentation(key) {
  const normalizedKey = String(key || "").trim().toLowerCase();
  return EVENT_PRESENTATIONS.find((item) => item.key === normalizedKey) || null;
}

function normalizeEventCount(value) {
  const eventCount = Math.trunc(Number(value || 0));
  if (!Number.isInteger(eventCount) || eventCount < 1 || eventCount > 20) {
    throw new Error("Informe uma quantidade de eventos entre 1 e 20.");
  }
  return eventCount;
}

function normalizeTransport(input = {}) {
  const requestedAmountCents = Math.max(0, Math.trunc(Number(input.transportAmountCents || 0) || 0));
  const freeTransport = Boolean(input.freeTransport) || requestedAmountCents === 0;
  const amountCents = freeTransport ? 0 : requestedAmountCents;
  const tripType = String(input.transportTripType || "ONE_WAY").toUpperCase() === "ROUND_TRIP" ? "ROUND_TRIP" : "ONE_WAY";
  return { freeTransport, amountCents, tripType, cityA: String(input.transportCityA || "").trim().slice(0, 120), cityB: String(input.transportCityB || "").trim().slice(0, 120) };
}

function transportDescription({ freeTransport, transportAmountCents, transportTripType, transportCityA, transportCityB } = {}) {
  if (freeTransport) return "Transporte livre de cobranca.";
  if (!transportAmountCents) return "";
  const route = transportCityA && transportCityB ? (transportTripType === "ROUND_TRIP" ? `ida de ${transportCityA} para ${transportCityB} e volta para ${transportCityA}` : `trecho de ${transportCityA} para ${transportCityB}`) : "trajeto informado";
  return `O transporte ficou definido em ${formatEventMoney(transportAmountCents)} para ${route}.`;
}

function mapCouponRow(row) {
  if (!row) return null;
  const pageSlug = normalizeEventPageSlug(row.code);
  return {
    id: row.id,
    code: row.code,
    pageSlug,
    pagePath: pageSlug ? `/${pageSlug}` : "",
    discountCents: Number(row.discount_cents || 0),
    presentationKey: row.presentation_key,
    presentationName: resolvePresentation(row.presentation_key)?.name || row.presentation_key,
    eventCount: Number(row.event_count || 1),
    freeTransport: Boolean(row.free_transport),
    freeLodging: Boolean(row.free_lodging),
    active: Boolean(row.active),
    createdAt: row.created_at,
    transportAmountCents: Number(row.transport_amount_cents || 0),
    transportTripType: row.transport_trip_type || "ONE_WAY",
    transportCityA: row.transport_city_a || "",
    transportCityB: row.transport_city_b || "",
    transportDescription: transportDescription({ freeTransport: row.free_transport, transportAmountCents: row.transport_amount_cents, transportTripType: row.transport_trip_type, transportCityA: row.transport_city_a, transportCityB: row.transport_city_b }),
    updatedAt: row.updated_at
  };
}

export async function ensureEventFlowSchema() {
  if (!eventFlowSchemaPromise) {
    eventFlowSchemaPromise = (async () => {
      await query(`
        create table if not exists event_proposal_visits (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references users(id) on delete cascade,
          opened_at timestamptz not null default now(),
          last_seen_at timestamptz not null default now()
        );
      `);
      await query(`create index if not exists idx_event_proposal_visits_user on event_proposal_visits(user_id, opened_at desc);`);

      await query(`
        create table if not exists event_proposal_activity_sessions (
          id uuid primary key default gen_random_uuid(),
          visit_id uuid not null references event_proposal_visits(id) on delete cascade,
          user_id uuid not null references users(id) on delete cascade,
          started_at timestamptz not null default now(),
          last_seen_at timestamptz not null default now(),
          ended_at timestamptz
        );
      `);
      await query(`create index if not exists idx_event_proposal_activity_user on event_proposal_activity_sessions(user_id, started_at desc);`);
      await query(`create index if not exists idx_event_proposal_activity_visit on event_proposal_activity_sessions(visit_id, started_at asc);`);

      await query(`
        create table if not exists event_flow_state (
          user_id uuid primary key references users(id) on delete cascade,
          first_term_at timestamptz not null default now(),
          last_term_at timestamptz not null default now(),
          contractor_panel_at timestamptz,
          updated_at timestamptz not null default now()
        );
      `);

      await query(`
        create table if not exists event_discount_coupons (
          id uuid primary key default gen_random_uuid(),
          code text not null unique,
          discount_cents integer not null check (discount_cents >= 0),
          presentation_key text not null,
          event_count smallint not null check (event_count between 1 and 20),
          free_transport boolean not null default false,
          free_lodging boolean not null default false,
          active boolean not null default true,
          created_by_user_id uuid references users(id) on delete set null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);
      await query(`alter table event_flow_state add column if not exists deleted_at timestamptz;`);
      await query(`create index if not exists idx_event_flow_state_deleted_at on event_flow_state(deleted_at);`);
      await query(`create index if not exists idx_event_discount_coupons_active on event_discount_coupons(active, updated_at desc);`);
      await query(`alter table event_discount_coupons add column if not exists transport_amount_cents integer not null default 0 check (transport_amount_cents >= 0);`);
      await query(`alter table event_discount_coupons add column if not exists transport_trip_type text not null default 'ONE_WAY' check (transport_trip_type in ('ONE_WAY', 'ROUND_TRIP'));`);
      await query(`alter table event_discount_coupons add column if not exists transport_city_a text not null default '';`);
      await query(`alter table event_discount_coupons add column if not exists transport_city_b text not null default '';`);
    })().catch((error) => {
      eventFlowSchemaPromise = null;
      throw error;
    });
  }
  return eventFlowSchemaPromise;
}

export async function recordProposalVisit(userId) {
  await ensureEventFlowSchema();
  const visitResult = await query(
    `insert into event_proposal_visits (user_id) values ($1) returning id, opened_at`,
    [userId]
  );
  const visit = visitResult.rows[0];
  const sessionResult = await query(
    `insert into event_proposal_activity_sessions (visit_id, user_id) values ($1, $2) returning id, started_at`,
    [visit.id, userId]
  );
  await query(
    `insert into event_flow_state (user_id)
     values ($1)
     on conflict (user_id) do update
       set last_term_at = now(), deleted_at = null, updated_at = now()`,
    [userId]
  );
  return {
    visitId: visit.id,
    sessionId: sessionResult.rows[0].id,
    startedAt: sessionResult.rows[0].started_at
  };
}

export async function recordProposalActivity(userId, payload = {}) {
  await ensureEventFlowSchema();
  const action = String(payload.action || "").trim().toLowerCase();
  const visitId = String(payload.visitId || "").trim();
  const sessionId = String(payload.sessionId || "").trim();

  if (!visitId) throw new Error("Visita da proposta nao informada.");

  const visitResult = await query(
    `select id from event_proposal_visits where id = $1 and user_id = $2 limit 1`,
    [visitId, userId]
  );
  if (!visitResult.rows[0]) throw new Error("Visita da proposta nao encontrada.");

  if (action === "resume") {
    const result = await query(
      `insert into event_proposal_activity_sessions (visit_id, user_id)
       values ($1, $2)
       returning id, started_at`,
      [visitId, userId]
    );
    await query(`update event_proposal_visits set last_seen_at = now() where id = $1`, [visitId]);
    return { sessionId: result.rows[0].id, startedAt: result.rows[0].started_at };
  }

  if (!sessionId) throw new Error("Sessao ativa da proposta nao informada.");
  if (action === "heartbeat") {
    const result = await query(
      `update event_proposal_activity_sessions
          set last_seen_at = now()
        where id = $1 and visit_id = $2 and user_id = $3 and ended_at is null
        returning id, last_seen_at`,
      [sessionId, visitId, userId]
    );
    if (!result.rows[0]) throw new Error("Sessao ativa da proposta nao encontrada.");
    await query(`update event_proposal_visits set last_seen_at = now() where id = $1`, [visitId]);
    return { sessionId: result.rows[0].id, lastSeenAt: result.rows[0].last_seen_at };
  }

  if (action === "pause") {
    const result = await query(
      `update event_proposal_activity_sessions
          set last_seen_at = now(), ended_at = now()
        where id = $1 and visit_id = $2 and user_id = $3 and ended_at is null
        returning id, ended_at`,
      [sessionId, visitId, userId]
    );
    await query(`update event_proposal_visits set last_seen_at = now() where id = $1`, [visitId]);
    return { sessionId, endedAt: result.rows[0]?.ended_at || null };
  }

  throw new Error("Acao de atividade invalida.");
}

export async function markContractorPanelReached(userId) {
  await ensureEventFlowSchema();
  await query(
    `insert into event_flow_state (user_id, contractor_panel_at)
     values ($1, now())
     on conflict (user_id) do update
       set contractor_panel_at = coalesce(event_flow_state.contractor_panel_at, now()),
           deleted_at = null,
           updated_at = now()`,
    [userId]
  );
}

export async function listEventCoupons({ includeInactive = false } = {}) {
  await ensureEventFlowSchema();
  const result = await query(
    `select id, code, discount_cents, presentation_key, event_count,
            free_transport, transport_amount_cents, transport_trip_type, transport_city_a, transport_city_b,
            free_lodging, active, created_at, updated_at
       from event_discount_coupons
      where ($1::boolean = true or active = true)
      order by active desc, updated_at desc, code asc`,
    [Boolean(includeInactive)]
  );
  return result.rows.map(mapCouponRow);
}

export async function getEventPageBySlug(slug, { includeInactive = false } = {}) {
  await ensureEventFlowSchema();
  const pageSlug = normalizeEventPageSlug(slug);
  if (!pageSlug || pageSlug.length < 3) return null;
  const result = await query(
    `select id, code, discount_cents, presentation_key, event_count,
            free_transport, transport_amount_cents, transport_trip_type, transport_city_a, transport_city_b,
            free_lodging, active, created_at, updated_at
       from event_discount_coupons
      where code = $1 and ($2::boolean = true or active = true)
      limit 1`,
    [normalizeCouponCode(pageSlug), Boolean(includeInactive)]
  );
  return mapCouponRow(result.rows[0]);
}

export async function resolveEventPage(slug) {
  const page = await getEventPageBySlug(slug);
  if (!page) return null;
  const pricing = await resolveEventPricing({
    presentationKey: page.presentationKey,
    eventCount: page.eventCount,
    couponCode: page.code
  });
  return {
    slug: page.pageSlug,
    path: page.pagePath,
    pricing
  };
}

export async function createEventCoupon(adminUserId, input = {}) {
  await ensureEventFlowSchema();
  const pageSlug = normalizeEventPageSlug(input.pageSlug ?? input.code);
  const code = normalizeCouponCode(pageSlug);
  const discountCents = Math.max(0, Math.trunc(Number(input.discountCents || 0) || 0));
  const presentation = resolvePresentation(input.presentationKey);
  const eventCount = normalizeEventCount(input.eventCount);
  const transport = normalizeTransport(input);
  if (!pageSlug || pageSlug.length < 3) throw new Error("O endereco da pagina precisa ter pelo menos 3 caracteres.");
  if (!presentation) throw new Error("Escolha uma apresentacao valida para a pagina.");
  if (discountCents < 1) throw new Error("Informe um valor de desconto maior que zero.");

  const result = await query(
    `insert into event_discount_coupons
       (code, discount_cents, presentation_key, event_count, free_transport, transport_amount_cents, transport_trip_type, transport_city_a, transport_city_b, free_lodging, active, created_by_user_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
     returning id, code, discount_cents, presentation_key, event_count,
               free_transport, transport_amount_cents, transport_trip_type, transport_city_a, transport_city_b, free_lodging, active, created_at, updated_at`,
    [code, discountCents, presentation.key, eventCount, transport.freeTransport, transport.amountCents, transport.tripType, transport.cityA, transport.cityB, Boolean(input.freeLodging), adminUserId]
  );
  return mapCouponRow(result.rows[0]);
}

export async function updateEventCoupon(couponId, input = {}) {
  await ensureEventFlowSchema();
  const editing = input.discountCents !== undefined || input.presentationKey !== undefined || input.transportAmountCents !== undefined;
  const transport = editing ? normalizeTransport(input) : null;
  const presentation = editing ? resolvePresentation(input.presentationKey) : null;
  const eventCount = editing ? normalizeEventCount(input.eventCount) : null;
  const discountCents = editing ? Math.max(0, Math.trunc(Number(input.discountCents || 0) || 0)) : null;
  if (editing && (!presentation || discountCents < 1)) throw new Error("Confira os dados da pagina personalizada.");
  const result = await query(
    `update event_discount_coupons
        set active = coalesce($2::boolean, active), discount_cents = coalesce($3::integer, discount_cents),
            presentation_key = coalesce($4::text, presentation_key), event_count = coalesce($5::smallint, event_count),
            free_transport = coalesce($6::boolean, free_transport), transport_amount_cents = coalesce($7::integer, transport_amount_cents),
            transport_trip_type = coalesce($8::text, transport_trip_type), transport_city_a = coalesce($9::text, transport_city_a),
            transport_city_b = coalesce($10::text, transport_city_b), free_lodging = coalesce($11::boolean, free_lodging), updated_at = now()
      where id = $1
      returning id, code, discount_cents, presentation_key, event_count,
                free_transport, transport_amount_cents, transport_trip_type, transport_city_a, transport_city_b, free_lodging, active, created_at, updated_at`,
    [couponId, typeof input.active === "boolean" ? input.active : null, discountCents, presentation?.key || null, eventCount, transport?.freeTransport ?? null, transport?.amountCents ?? null, transport?.tripType || null, transport?.cityA ?? null, transport?.cityB ?? null, editing ? Boolean(input.freeLodging) : null]
  );
  if (!result.rows[0]) throw new Error("Pagina personalizada nao encontrada.");
  return mapCouponRow(result.rows[0]);
}

export async function deleteEventCoupon(couponId) {
  await ensureEventFlowSchema();
  const result = await query(
    `delete from event_discount_coupons
      where id = $1
      returning id, code, discount_cents, presentation_key, event_count,
                free_transport, transport_amount_cents, transport_trip_type, transport_city_a, transport_city_b,
                free_lodging, active, created_at, updated_at`,
    [String(couponId || "").trim()]
  );
  if (!result.rows[0]) throw new Error("Pagina personalizada nao encontrada.");
  return mapCouponRow(result.rows[0]);
}

export async function archiveAdminEventFlow(userId) {
  await ensureEventFlowSchema();
  const safeUserId = String(userId || "").trim();
  const result = await query(
    `insert into event_flow_state (user_id, deleted_at, updated_at)
     values ($1, now(), now())
     on conflict (user_id) do update
       set deleted_at = now(), updated_at = now()
     returning user_id, deleted_at`,
    [safeUserId]
  );
  return {
    userId: result.rows[0]?.user_id || safeUserId,
    deletedAt: result.rows[0]?.deleted_at || null
  };
}

export async function resolveEventPricing(input = {}) {
  await ensureEventFlowSchema();
  const presentation = resolvePresentation(input.presentationKey || "congresso-infantil");
  if (!presentation) throw new Error("Escolha uma apresentacao valida.");
  const eventCount = normalizeEventCount(input.eventCount || 1);
  const couponCode = normalizeCouponCode(input.couponCode);
  const basePriceCents = presentation.unitPriceCents * eventCount;
  let coupon = null;

  if (couponCode) {
    const couponResult = await query(
      `select id, code, discount_cents, presentation_key, event_count,
              free_transport, transport_amount_cents, transport_trip_type, transport_city_a, transport_city_b,
              free_lodging, active, created_at, updated_at
         from event_discount_coupons
        where code = $1 and active = true
        limit 1`,
      [couponCode]
    );
    coupon = mapCouponRow(couponResult.rows[0]);
    if (!coupon) throw new Error("Pagina personalizada invalida ou inativa.");
    if (coupon.presentationKey !== presentation.key || coupon.eventCount !== eventCount) {
      throw new Error(`Esta pagina foi configurada para ${coupon.presentationName}, em ${coupon.eventCount} evento${coupon.eventCount === 1 ? "" : "s"}.`);
    }
  }

  const discountCents = Math.min(basePriceCents, Number(coupon?.discountCents || 0));
  const transportAmountCents = coupon?.freeTransport ? 0 : Number(coupon?.transportAmountCents || 0);
  const finalPriceCents = Math.max(0, basePriceCents - discountCents + transportAmountCents);
  return {
    presentationKey: presentation.key,
    presentationName: presentation.name,
    unitPriceCents: presentation.unitPriceCents,
    eventCount,
    basePriceCents,
    couponCode: coupon?.code || "",
    couponDiscountCents: discountCents,
    finalPriceCents,
    freeTransport: Boolean(coupon && (coupon.freeTransport || transportAmountCents === 0)),
    transportAmountCents,
    transportTripType: coupon?.transportTripType || "",
    transportCityA: coupon?.transportCityA || "",
    transportCityB: coupon?.transportCityB || "",
    transportDescription: coupon?.transportDescription || "",
    freeLodging: Boolean(coupon?.freeLodging),
    coupon
  };
}

export async function listAdminEventFlow() {
  await ensureEventFlowSchema();
  const result = await query(`
    with candidate_users as (
      select user_id from event_proposal_visits
      union
      select user_id from "all-terms" where user_id is not null
    ), visit_stats as (
      select user_id, count(*)::int as access_count, min(opened_at) as first_access_at, max(last_seen_at) as last_access_at
        from event_proposal_visits
       group by user_id
    ), activity_stats as (
      select user_id,
             floor(sum(greatest(0, extract(epoch from (coalesce(ended_at, last_seen_at) - started_at)))))::bigint as active_seconds
        from event_proposal_activity_sessions
       group by user_id
    )
    select u.id as user_id, u.name, u.username,
           coalesce(vs.access_count, 0)::int as access_count,
           coalesce(ast.active_seconds, 0)::bigint as active_seconds,
           vs.first_access_at, vs.last_access_at,
           efs.contractor_panel_at,
           latest_term.id as term_id,
           latest_term.created_at as term_created_at,
           latest_term.answers
      from candidate_users cu
      join users u on u.id = cu.user_id
      left join visit_stats vs on vs.user_id = u.id
      left join activity_stats ast on ast.user_id = u.id
      left join event_flow_state efs on efs.user_id = u.id
      left join lateral (
        select id, created_at, answers
          from "all-terms"
         where user_id = u.id
         order by created_at desc
         limit 1
      ) latest_term on true
     where efs.deleted_at is null
     order by coalesce(vs.last_access_at, latest_term.created_at) desc nulls last, lower(coalesce(u.name, u.username, '')) asc
  `);

  return result.rows.map((row) => ({
    userId: row.user_id,
    name: row.answers?.igreja || row.name || "-",
    accountName: row.name || "-",
    username: row.username || "-",
    accessCount: Number(row.access_count || 0),
    activeSeconds: Number(row.active_seconds || 0),
    firstAccessAt: row.first_access_at || null,
    lastAccessAt: row.last_access_at || null,
    contractorPanelAt: row.contractor_panel_at || null,
    status: row.contractor_panel_at ? "scheduled" : "open",
    termId: row.term_id || null,
    termCreatedAt: row.term_created_at || null,
    presentationName: row.answers?.presentationName || "",
    eventCount: Number(row.answers?.eventCount || 0),
    couponCode: row.answers?.couponCode || "",
    finalPriceCents: Number(row.answers?.finalPriceCents || 0)
  }));
}

export function getEventPresentations() {
  return EVENT_PRESENTATIONS.map((item) => ({ ...item }));
}
