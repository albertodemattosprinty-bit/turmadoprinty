import { query } from "./db.js";

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
      created_at timestamptz not null default now()
    );
  `);
  await query(`alter table "all-terms" add column if not exists user_id uuid references users(id) on delete set null;`);
  await query(`create index if not exists idx_all_terms_event_date_time on "all-terms"(event_date asc, event_time_sort asc, created_at asc);`);
  await query(`create index if not exists idx_all_terms_user_id_created_at on "all-terms"(user_id, created_at desc);`);
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

export async function createAllTermEntry(rawAnswers, userId = null) {
  await ensureAllTermsSchema();
  const answers = sanitizeTermAnswers(rawAnswers);
  const eventDate = parseEventDate(answers);
  const eventTimeSort = parseEventTimeSort(answers.horario);

  const result = await query(
    `
      insert into "all-terms" (user_id, answers, event_date, event_time, event_time_sort)
      values ($1, $2::jsonb, $3::date, $4, $5)
      returning id, user_id, answers, event_date, event_time, event_time_sort, created_at;
    `,
    [userId || null, JSON.stringify(answers), eventDate, answers.horario, eventTimeSort]
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
      select id, user_id, answers, event_date, event_time, created_at
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
      select id, user_id, answers, event_date, event_time, created_at
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
      select id, user_id, answers, event_date, event_time, created_at
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
    eventDate: row.event_date,
    eventTime: row.event_time,
    createdAt: row.created_at
  };
}
