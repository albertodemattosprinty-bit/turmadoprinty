import crypto from "node:crypto";
import { query } from "./db.js";
import { formatEventMoney, resolveEventPricing } from "./event-flow.js";

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
];

const QUESTION_ORDER = [
  { key: "igreja", label: "Qual é o nome da igreja?" },
  { key: "contratante", label: "Qual é o nome do contratante?" },
  { key: "whatsapp", label: "Qual é o WhatsApp do contratante?" },
  { key: "historia", label: "Qual história foi escolhida?" },
  { key: "dia", label: "Em que dia será o evento?" },
  { key: "mes", label: "Em qual mês será o evento?" },
  { key: "ano", label: "Em qual ano será o evento?" },
  { key: "horario", label: "Qual será o horário do evento?" },
  { key: "pais", label: "Em qual país ou região será o evento?" },
  { key: "endereco", label: "Qual é o endereço do evento?" },
  { key: "cidade", label: "Em qual cidade será o evento?" },
  { key: "cep", label: "Qual é o código postal (CEP)?" },
  { key: "presentationName", label: "Apresentacao escolhida" },
  { key: "eventCount", label: "Quantidade de eventos" },
  { key: "unitPrice", label: "Valor por evento" },
  { key: "basePrice", label: "Valor antes do desconto" },
  { key: "couponCode", label: "Pagina personalizada" },
  { key: "couponDiscount", label: "Desconto aplicado" },
  { key: "finalPrice", label: "Preco final" },
  { key: "freeTransport", label: "Transporte livre de cobranca" },
  { key: "transportAmount", label: "Valor definido para o transporte" },
  { key: "transportRoute", label: "Rota do transporte" },
  { key: "transportDescription", label: "Condicao do transporte" },
  { key: "freeLodging", label: "Hospedagem livre de cobranca" },
  { key: "pagamentoVencimento", label: "Vencimento do primeiro pagamento" },
  { key: "assinatura", label: "Assinatura" },
  { key: "assinaturaCpf", label: "CPF da assinatura" }
];

export async function ensureAllTermsSchema() {
  await query(`
    create table if not exists "all-terms" (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references users(id) on delete set null,
      answers jsonb not null,
      event_date date not null,
      event_time text not null,
      event_time_sort smallint not null default 0,
      accepted_terms jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now()
    );
  `);
  await query(`alter table "all-terms" add column if not exists user_id uuid references users(id) on delete set null;`);
  await query(`alter table "all-terms" add column if not exists accepted_terms jsonb not null default '[]'::jsonb;`);
  await query(`create index if not exists idx_all_terms_event_date_time on "all-terms"(event_date asc, event_time_sort asc, created_at asc);`);
  await query(`create index if not exists idx_all_terms_user_id_created_at on "all-terms"(user_id, created_at desc);`);
  await query(`alter table "all-terms" add column if not exists claim_token_hash text;`);
  await query(`alter table "all-terms" add column if not exists claimed_at timestamptz;`);
}

function normalizeMonthValue(rawMonth) {
  const value = String(rawMonth || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return value;
}

function resolveMonthNumber(monthInput) {
  const normalized = normalizeMonthValue(monthInput);
  const idxByName = MONTHS_PT.indexOf(normalized);
  if (idxByName >= 0) {
    return idxByName + 1;
  }

  const numeric = Number(normalized);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }

  return null;
}

function parseEventDate(answers) {
  const day = Number(answers?.dia);
  const year = Number(answers?.ano);
  const month = resolveMonthNumber(answers?.mes);

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("Dia do evento inválido.");
  }

  if (!Number.isInteger(year) || year < 2026 || year > 2030) {
    throw new Error("Ano do evento inválido.");
  }

  if (!month) {
    throw new Error("Mês do evento inválido.");
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseEventTimeSort(eventTime) {
  const match = String(eventTime || "").trim().toLowerCase().match(/^(\d{1,2})h(\d{2})(am|pm)$/);
  if (!match) {
    return 0;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];

  if (!Number.isInteger(hour) || hour < 1 || hour > 12) {
    return 0;
  }
  if (minute !== 0 && minute !== 30) {
    return 0;
  }

  if (period === "pm" && hour < 12) {
    hour += 12;
  }
  if (period === "am" && hour === 12) {
    hour = 0;
  }

  return (hour * 60) + minute;
}

export function sanitizeTermAnswers(input) {
  const answers = {};

  for (const item of QUESTION_ORDER) {
    answers[item.key] = String(input?.[item.key] || "").trim();
  }

  if (!answers.igreja) throw new Error("Nome da igreja é obrigatório.");
  if (!answers.contratante) throw new Error("Nome do contratante é obrigatório.");
  if (!/^\d{1,15}$/.test(answers.whatsapp)) throw new Error("WhatsApp inválido. Use até 15 números.");
  if (!answers.historia) throw new Error("História é obrigatória.");
  if (!answers.endereco) throw new Error("Endereço é obrigatório.");
  if (!answers.cidade) throw new Error("Cidade é obrigatória.");
  if (!/^\d{8}$/.test(answers.cep)) throw new Error("CEP inválido. Use exatamente 8 dígitos.");
  if (!answers.assinatura) throw new Error("Assinatura é obrigatória.");
  if (!/^\d{11}$/.test(answers.assinaturaCpf)) throw new Error("CPF da assinatura inválido. Use 11 dígitos.");

  return answers;
}

function sanitizeAcceptedTerms(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 24).map((item) => ({
    title: String(item?.title || "").trim().slice(0, 180),
    text: String(item?.text || "").trim().slice(0, 5000)
  })).filter((item) => item.title || item.text);
}

async function buildCommercialAnswers(rawAnswers) {
  const pricing = await resolveEventPricing({
    presentationKey: rawAnswers?.presentationKey,
    eventCount: rawAnswers?.eventCount,
    couponCode: rawAnswers?.couponCode
  });
  return {
    pricing,
    values: {
      presentationName: pricing.presentationName,
      eventCount: String(pricing.eventCount),
      unitPrice: formatEventMoney(pricing.unitPriceCents),
      basePrice: formatEventMoney(pricing.basePriceCents),
      couponCode: pricing.couponCode,
      couponDiscount: formatEventMoney(pricing.couponDiscountCents),
      finalPrice: formatEventMoney(pricing.finalPriceCents),
      freeTransport: pricing.freeTransport ? "Sim" : "Nao",
      transportAmount: pricing.transportAmountCents ? formatEventMoney(pricing.transportAmountCents) : (pricing.freeTransport ? "Livre de cobranca" : "Nao definido"),
      transportRoute: pricing.transportCityA && pricing.transportCityB ? (pricing.transportTripType === "ROUND_TRIP" ? `${pricing.transportCityA} para ${pricing.transportCityB} e volta para ${pricing.transportCityA}` : `${pricing.transportCityA} para ${pricing.transportCityB}`) : "Nao definida",
      transportDescription: pricing.transportDescription || (pricing.freeTransport ? "Transporte sem cobranca" : "Transporte nao definido"),
      freeLodging: pricing.freeLodging ? "Sim" : "Nao"
    }
  };
}

export async function createAllTermEntry(rawAnswers, userId = null, rawAcceptedTerms = [], claimToken = "") {
  await ensureAllTermsSchema();
  const commercial = await buildCommercialAnswers(rawAnswers);
  const answers = sanitizeTermAnswers({ ...rawAnswers, ...commercial.values });
  const eventPagePath = String(rawAnswers?.eventPagePath || "").trim().toLowerCase();
  if (/^\/[a-z0-9][a-z0-9-]{2,39}$/.test(eventPagePath)) {
    answers.eventPagePath = eventPagePath;
  }
  answers.presentationKey = commercial.pricing.presentationKey;
  answers.unitPriceCents = String(commercial.pricing.unitPriceCents);
  answers.basePriceCents = String(commercial.pricing.basePriceCents);
  answers.transportAmountCents = String(commercial.pricing.transportAmountCents || 0);
  answers.couponDiscountCents = String(commercial.pricing.couponDiscountCents);
  answers.finalPriceCents = String(commercial.pricing.finalPriceCents);
  const firstPaymentDue = String(rawAnswers?.pagamentoVencimentoIso || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(firstPaymentDue)) {
    answers.pagamentoVencimentoIso = firstPaymentDue;
  }
  const acceptedTerms = sanitizeAcceptedTerms(rawAcceptedTerms);
  const eventDate = parseEventDate(answers);
  const eventTimeSort = parseEventTimeSort(answers.horario);

  const result = await query(
    `
      insert into "all-terms" (user_id, answers, event_date, event_time, event_time_sort, accepted_terms, claim_token_hash)
      values ($1, $2::jsonb, $3::date, $4, $5, $6::jsonb, $7)
      returning id, user_id, answers, event_date, event_time, event_time_sort, accepted_terms, created_at;
    `,
    [userId || null, JSON.stringify(answers), eventDate, answers.horario, eventTimeSort, JSON.stringify(acceptedTerms), claimToken ? crypto.createHash("sha256").update(claimToken).digest("hex") : null]
  );

  return result.rows[0];
}

export async function listAllTermDates() {
  await ensureAllTermsSchema();
  const result = await query(
    `
      select to_char(event_date, 'YYYY-MM-DD') as date
      from "all-terms"
      group by event_date
      order by event_date asc;
    `
  );

  return result.rows.map((row) => row.date).filter(Boolean);
}

export async function listAllTermsByDate(dateIso) {
  await ensureAllTermsSchema();
  const result = await query(
    `
      select id, user_id, answers, accepted_terms, event_date, event_time, created_at
      from "all-terms"
      where event_date = $1::date
      order by event_time_sort asc, created_at asc;
    `,
    [dateIso]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id || null,
    answers: row.answers || {},
    acceptedTerms: row.accepted_terms || [],
    eventDate: row.event_date,
    eventTime: row.event_time,
    createdAt: row.created_at
  }));
}

export function getTermQuestionOrder() {
  return QUESTION_ORDER.slice();
}

export async function deleteAllTerms() {
  await ensureAllTermsSchema();
  await query(`delete from "all-terms";`);
}

export async function deleteTermById(termId) {
  await ensureAllTermsSchema();
  const result = await query(`delete from "all-terms" where id = $1`, [String(termId || "").trim()]);
  return Number(result.rowCount || 0) > 0;
}

export async function getAllTermById(termId) {
  await ensureAllTermsSchema();
  const result = await query(
    `
      select id, user_id, answers, accepted_terms, event_date, event_time, created_at
      from "all-terms"
      where id = $1
      limit 1;
    `,
    [String(termId || "").trim()]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id || null,
    answers: row.answers || {},
    acceptedTerms: row.accepted_terms || [],
    eventDate: row.event_date,
    eventTime: row.event_time,
    createdAt: row.created_at
  };
}

export async function getLatestTermByUserId(userId) {
  if (!userId) {
    return null;
  }

  await ensureAllTermsSchema();
  const result = await query(
    `
      select id, user_id, answers, accepted_terms, event_date, event_time, created_at
      from "all-terms"
      where user_id = $1
      order by created_at desc
      limit 1;
    `,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id || null,
    answers: row.answers || {},
    acceptedTerms: row.accepted_terms || [],
    eventDate: row.event_date,
    eventTime: row.event_time,
    createdAt: row.created_at
  };
}

export async function getTermByEventPageSlug(slug, { userId = null } = {}) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(normalizedSlug)) return null;

  await ensureAllTermsSchema();
  const result = await query(
    `
      select id, user_id, answers, accepted_terms, event_date, event_time, created_at
      from "all-terms"
      where user_id is not null
        and (
          lower(coalesce(answers->>'eventPagePath', '')) = $1
          or upper(coalesce(answers->>'couponCode', '')) = $2
        )
        and ($3::uuid is null or user_id = $3::uuid)
      order by created_at desc
      limit 1;
    `,
    [`/${normalizedSlug}`, normalizedSlug.toUpperCase(), userId || null]
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    answers: row.answers || {},
    acceptedTerms: row.accepted_terms || [],
    eventDate: row.event_date,
    eventTime: row.event_time,
    createdAt: row.created_at
  };
}

export async function updateLatestTermCouponByUserId(userId, couponCode = "") {
  if (!userId) throw new Error("Usuario nao informado.");
  await ensureAllTermsSchema();
  const current = await getLatestTermByUserId(userId);
  if (!current) throw new Error("Preencha o termo antes de aplicar um cupom.");

  const commercial = await buildCommercialAnswers({
    ...current.answers,
    couponCode
  });
  const answers = {
    ...current.answers,
    ...commercial.values,
    presentationKey: commercial.pricing.presentationKey,
    unitPriceCents: String(commercial.pricing.unitPriceCents),
    transportAmountCents: String(commercial.pricing.transportAmountCents || 0),
    basePriceCents: String(commercial.pricing.basePriceCents),
    couponDiscountCents: String(commercial.pricing.couponDiscountCents),
    finalPriceCents: String(commercial.pricing.finalPriceCents)
  };
  const benefits = [
    commercial.pricing.freeTransport ? "Livre de transporte" : "",
    commercial.pricing.transportDescription || "",
    commercial.pricing.freeLodging ? "Livre de hospedagem" : ""
  ].filter(Boolean);
  const acceptedTerms = [
    ...(current.acceptedTerms || []).filter((item) => item?.title !== "Atualizacao comercial do cupom"),
    {
      title: "Atualizacao comercial do cupom",
      text: commercial.pricing.couponCode
        ? `Cupom ${commercial.pricing.couponCode}: desconto de ${formatEventMoney(commercial.pricing.couponDiscountCents)}. Preco final: ${formatEventMoney(commercial.pricing.finalPriceCents)}.${benefits.length ? ` ${benefits.join(". ")}.` : ""}`
        : `Cupom removido. Preco normal restaurado para ${formatEventMoney(commercial.pricing.finalPriceCents)}.`
    }
  ];

  const result = await query(
    `update "all-terms"
        set answers = $3::jsonb, accepted_terms = $4::jsonb
      where id = $1 and user_id = $2
      returning id, user_id, answers, accepted_terms, event_date, event_time, created_at`,
    [current.id, userId, JSON.stringify(answers), JSON.stringify(acceptedTerms)]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id || null,
    answers: row.answers || {},
    acceptedTerms: row.accepted_terms || [],
    eventDate: row.event_date,
    eventTime: row.event_time,
    createdAt: row.created_at
  };
}

export async function claimAllTerm(termId, claimToken, userId) {
  if (!termId || !claimToken || !userId) throw new Error("Dados de vinculacao incompletos.");
  await ensureAllTermsSchema();
  const tokenHash = crypto.createHash("sha256").update(String(claimToken)).digest("hex");
  const result = await query(`
    update "all-terms"
       set user_id = $3, claimed_at = now(), claim_token_hash = null
     where id = $1 and user_id is null and claim_token_hash = $2
     returning id, user_id, answers, accepted_terms, event_date, event_time, created_at
  `, [termId, tokenHash, userId]);
  const row = result.rows[0];
  if (!row) throw new Error("Este termo ja foi vinculado ou o acesso expirou.");
  return {
    id: row.id,
    userId: row.user_id,
    answers: row.answers || {},
    acceptedTerms: row.accepted_terms || [],
    eventDate: row.event_date,
    eventTime: row.event_time,
    createdAt: row.created_at
  };
}
