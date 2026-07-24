import crypto from "node:crypto";

import { query } from "./db.js";
import { decryptUserJson, encryptUserJson, ensurePrivacyEncryptionSchema, getPrivacyEncryptionStatus } from "./privacy-crypto.js";

export const PROJECT200_MARIN_PERSONAS = Object.freeze([
  { key: "marin", name: "Marin" },
  { key: "peter", name: "Peter" },
  { key: "lena", name: "Lena" },
  { key: "gaia", name: "Gaia" },
  { key: "sami", name: "Sami" },
  { key: "zach", name: "Zach" }
]);

export const PROJECT200_MARIN_GENERAL_PROMPT = `
Você é a inteligência do programa iLife, um programa completo de mudança de vida baseado em 12 aspectos que promovem qualidade de vida e plenitude de existência.

Seja humano, incisivo, motivador e realmente interessado no usuário. Acompanhe o ritmo da conversa: responda com menos quando menos for suficiente e nunca ultrapasse 400 caracteres na mensagem conversacional. Não transforme a conversa em questionário. Faça uma pergunta por vez, comente a resposta e construa vínculo de longo prazo. Quando couber naturalmente, use filosofia e exemplos históricos.

Cada minuto de ação concluída vale um ponto. Os pontos abastecem os aspectos: Sono, Alimentação, Hidratação, Aprendizado, Trabalho, Casa, Exercícios, Social, Propósito, Higiene, Lazer e Família. O objetivo é construir, ao longo dos anos, um Plano de Vida saudável, próspero, sustentável e personalizado, com horizonte de cinco anos.

Sua matéria-prima são os minutos que o usuário aceita investir. Negocie esse tempo com respeito e transforme minutos em hábitos concretos. A referência inicial é uma base negociável de até 275 minutos diários, sem contar sono e sem impor trabalho ou lazer como peso fixo. Mesmo fora da conta-base, cuide do sono, da saúde, do descanso, da segurança financeira e da existência de uma fonte plausível de recursos.

Não planeje tudo de uma vez. Conheça a vida do usuário sem pressa e construa o plano em camadas. Ajude-o a manter consistência, concluir e registrar ações no aplicativo. Você pode propor tarefas como beber água, fazer uma refeição balanceada, escovar os dentes e organizar o ambiente.

Valorize disciplina, foco, projetos sustentáveis, construção de ativos e ambição. Nunca abandone o usuário. Diga com humanidade que continuará ao lado dele e não o deixará desistir. Ao mesmo tempo, respeite a autonomia dele: motive sem culpa, ameaça, humilhação, dependência emocional ou pressão para ignorar sono, saúde, alimentação, vínculos e limites físicos.

Quando tiver informações suficientes, crie de uma a oito propostas acionáveis por resposta. Diga que o usuário pode tocar somente nas que quiser ativar. Ações precisam de título, aspecto, data, horário inicial e duração. Missões precisam de título, quantidade-meta e tempo por unidade. Não crie microtarefas de missões. Movimentações financeiras precisam indicar entrada ou saída, valor, natureza à vista ou futura e agenda completa. Se faltar um dado obrigatório, pergunte antes em vez de inventar.
`.trim();

const DEFAULT_PERSONA_PROMPTS = Object.freeze({
  marin: "Amigo de longo prazo, sereno, perspicaz e firme. Conecta todos os aspectos da vida sem soar robótico.",
  peter: "Prático, estratégico e organizado. Converte objetivos em próximos passos claros, sem perder humanidade.",
  lena: "Acolhedora, atenta e encorajadora. Escuta profundamente e conduz com firmeza gentil.",
  gaia: "Equilibrada, reflexiva e ligada à sustentabilidade da rotina. Protege consistência, saúde e sentido.",
  sami: "Curioso, leve e próximo. Faz perguntas inteligentes e torna mudanças difíceis mais simples de começar.",
  zach: "Direto, energético e competitivo de forma saudável. Estimula execução, foco e compromisso sem humilhar."
});

function normalizePersonaKey(value) {
  const key = String(value || "").trim().toLowerCase();
  return PROJECT200_MARIN_PERSONAS.some((persona) => persona.key === key) ? key : "marin";
}

function normalizeProfileName(value) {
  return String(value || "Usuario").trim().slice(0, 90) || "Usuario";
}

function messageEncryptionContext(messageId, field) {
  return `project200-marin-message:${messageId}:${field}`;
}

async function normalizeMessage(userId, row) {
  let content = String(row.content || "");
  let storedProposals = Array.isArray(row.proposals) ? row.proposals : [];
  if (Number(row.encryption_version) >= 1 && row.content_encrypted) {
    content = String(await decryptUserJson(
      userId,
      row.content_encrypted,
      messageEncryptionContext(row.id, "content")
    ) || "");
    storedProposals = await decryptUserJson(
      userId,
      row.proposals_encrypted,
      messageEncryptionContext(row.id, "proposals")
    ) || [];
  }
  const applicationByKey = new Map(
    (Array.isArray(row.applications) ? row.applications : []).map((application) => [
      String(application?.proposalKey || ""),
      String(application?.status || "").toUpperCase()
    ])
  );
  const proposals = (Array.isArray(storedProposals) ? storedProposals : []).map((proposal) => ({
    ...proposal,
    _applied: ["PROCESSING", "APPLIED"].includes(applicationByKey.get(String(proposal?.key || "")))
  }));
  return {
    id: row.id,
    role: row.role,
    content,
    proposals,
    model: row.model_id || "",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
  };
}

export async function ensureProject200MarinSchema() {
  await ensurePrivacyEncryptionSchema();
  await query(`
    create table if not exists project200_marin_prompts (
      prompt_key text primary key,
      prompt_text text not null,
      updated_by_user_id uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query(`
    create table if not exists project200_marin_settings (
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      persona_key text not null default 'marin',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (user_id, assigned_profile)
    );
  `);
  await query(`
    create table if not exists project200_marin_conversations (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      persona_key text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, assigned_profile, persona_key)
    );
  `);
  await query(`
    create table if not exists project200_marin_messages (
      id uuid primary key default gen_random_uuid(),
      conversation_id uuid not null references project200_marin_conversations(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      role text not null check (role in ('user', 'assistant')),
      content text not null,
      proposals jsonb not null default '[]'::jsonb,
      model_id text not null default '',
      created_at timestamptz not null default now()
    );
  `);
  await query("alter table project200_marin_messages add column if not exists content_encrypted jsonb;");
  await query("alter table project200_marin_messages add column if not exists proposals_encrypted jsonb;");
  await query("alter table project200_marin_messages add column if not exists encryption_version integer not null default 0;");
  await query("create index if not exists idx_project200_marin_messages_conversation_created on project200_marin_messages(conversation_id, created_at desc);");
  await query(`
    create table if not exists project200_marin_runs (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      conversation_id uuid references project200_marin_conversations(id) on delete set null,
      model_id text not null,
      route_reason text not null default '',
      input_tokens integer not null default 0,
      output_tokens integer not null default 0,
      total_tokens integer not null default 0,
      latency_ms integer not null default 0,
      status text not null default 'COMPLETED',
      error_text text not null default '',
      created_at timestamptz not null default now()
    );
  `);
  await query(`
    create table if not exists project200_marin_proposal_applications (
      user_id uuid not null references users(id) on delete cascade,
      message_id uuid not null references project200_marin_messages(id) on delete cascade,
      proposal_key text not null,
      proposal_type text not null,
      status text not null default 'PROCESSING',
      entity_id uuid,
      error_text text not null default '',
      attempts integer not null default 1,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (user_id, message_id, proposal_key)
    );
  `);

  const defaults = [
    ["general", PROJECT200_MARIN_GENERAL_PROMPT],
    ...PROJECT200_MARIN_PERSONAS.map((persona) => [`persona:${persona.key}`, DEFAULT_PERSONA_PROMPTS[persona.key] || ""])
  ];
  for (const [key, prompt] of defaults) {
    await query(
      `insert into project200_marin_prompts (prompt_key, prompt_text)
       values ($1, $2)
       on conflict (prompt_key) do nothing`,
      [key, prompt]
    );
  }
}

export async function getProject200MarinPrompts({ includeText = false } = {}) {
  await ensureProject200MarinSchema();
  const result = await query("select prompt_key, prompt_text, updated_at from project200_marin_prompts");
  const byKey = new Map(result.rows.map((row) => [row.prompt_key, row]));
  const personas = PROJECT200_MARIN_PERSONAS.map((persona) => {
    const stored = byKey.get(`persona:${persona.key}`);
    return {
      ...persona,
      ...(includeText ? { prompt: String(stored?.prompt_text || DEFAULT_PERSONA_PROMPTS[persona.key] || "") } : {}),
      updatedAt: stored?.updated_at ? new Date(stored.updated_at).toISOString() : null
    };
  });
  const general = byKey.get("general");
  return {
    personas,
    generalPrompt: includeText ? String(general?.prompt_text || PROJECT200_MARIN_GENERAL_PROMPT) : "",
    generalPromptUpdatedAt: general?.updated_at ? new Date(general.updated_at).toISOString() : null
  };
}

export async function updateProject200MarinPrompt(adminUserId, promptKey, promptText) {
  await ensureProject200MarinSchema();
  const rawKey = String(promptKey || "").trim().toLowerCase();
  const normalizedKey = rawKey === "general" ? "general" : `persona:${normalizePersonaKey(rawKey.replace(/^persona:/, ""))}`;
  const text = String(promptText || "").trim();
  if (text.length < 10) throw new Error("O prompt precisa ter pelo menos 10 caracteres.");
  if (text.length > 30000) throw new Error("O prompt ultrapassou 30 mil caracteres.");
  const result = await query(
    `insert into project200_marin_prompts (prompt_key, prompt_text, updated_by_user_id, updated_at)
     values ($1, $2, $3, now())
     on conflict (prompt_key) do update
       set prompt_text = excluded.prompt_text,
           updated_by_user_id = excluded.updated_by_user_id,
           updated_at = now()
     returning prompt_key, prompt_text, updated_at`,
    [normalizedKey, text, adminUserId]
  );
  return {
    key: result.rows[0].prompt_key,
    prompt: result.rows[0].prompt_text,
    updatedAt: new Date(result.rows[0].updated_at).toISOString()
  };
}

export async function getProject200MarinSetting(userId, profileName) {
  await ensureProject200MarinSchema();
  const profile = normalizeProfileName(profileName);
  const result = await query(
    "select persona_key from project200_marin_settings where user_id = $1 and assigned_profile = $2 limit 1",
    [userId, profile]
  );
  return { profile, personaKey: normalizePersonaKey(result.rows[0]?.persona_key) };
}

export async function setProject200MarinPersona(userId, profileName, personaKey) {
  await ensureProject200MarinSchema();
  const profile = normalizeProfileName(profileName);
  const key = normalizePersonaKey(personaKey);
  await query(
    `insert into project200_marin_settings (user_id, assigned_profile, persona_key, updated_at)
     values ($1, $2, $3, now())
     on conflict (user_id, assigned_profile) do update set persona_key = excluded.persona_key, updated_at = now()`,
    [userId, profile, key]
  );
  return { profile, personaKey: key };
}

export async function getOrCreateProject200MarinConversation(userId, profileName, personaKey) {
  await ensureProject200MarinSchema();
  const profile = normalizeProfileName(profileName);
  const key = normalizePersonaKey(personaKey);
  const result = await query(
    `insert into project200_marin_conversations (user_id, assigned_profile, persona_key, updated_at)
     values ($1, $2, $3, now())
     on conflict (user_id, assigned_profile, persona_key)
     do update set updated_at = project200_marin_conversations.updated_at
     returning id, assigned_profile, persona_key`,
    [userId, profile, key]
  );
  return {
    id: result.rows[0].id,
    profile: result.rows[0].assigned_profile,
    personaKey: result.rows[0].persona_key
  };
}

export async function listProject200MarinMessages(userId, profileName, personaKey, limit = 60) {
  const conversation = await getOrCreateProject200MarinConversation(userId, profileName, personaKey);
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(Number(limit) || 60)));
  const result = await query(
    `select recent.id, recent.role, recent.content, recent.proposals, recent.model_id, recent.created_at,
            recent.content_encrypted, recent.proposals_encrypted, recent.encryption_version,
            coalesce((
              select jsonb_agg(jsonb_build_object(
                'proposalKey', application.proposal_key,
                'status', application.status
              ))
                from project200_marin_proposal_applications application
               where application.user_id = $2 and application.message_id = recent.id
            ), '[]'::jsonb) as applications
       from (
         select id, role, content, proposals, model_id, created_at,
                content_encrypted, proposals_encrypted, encryption_version
           from project200_marin_messages
          where conversation_id = $1 and user_id = $2
          order by created_at desc
          limit $3
       ) recent
      order by created_at asc`,
    [conversation.id, userId, safeLimit]
  );
  return { conversation, messages: await Promise.all(result.rows.map((row) => normalizeMessage(userId, row))) };
}

export async function appendProject200MarinMessage(userId, conversationId, payload = {}) {
  await ensureProject200MarinSchema();
  const role = payload?.role === "assistant" ? "assistant" : "user";
  const content = String(payload?.content || "").trim();
  if (!content) throw new Error("Mensagem vazia.");
  const proposals = Array.isArray(payload?.proposals) ? payload.proposals.slice(0, 8) : [];
  const messageId = crypto.randomUUID();
  const [contentEncrypted, proposalsEncrypted] = await Promise.all([
    encryptUserJson(userId, content, messageEncryptionContext(messageId, "content")),
    encryptUserJson(userId, proposals, messageEncryptionContext(messageId, "proposals"))
  ]);
  const encrypted = Boolean(contentEncrypted && proposalsEncrypted);
  const result = await query(
    `insert into project200_marin_messages (
       id, conversation_id, user_id, role, content, proposals, model_id,
       content_encrypted, proposals_encrypted, encryption_version
     )
     select $1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10
      where exists (
        select 1 from project200_marin_conversations where id = $2 and user_id = $3
      )
     returning id, role, content, proposals, model_id, created_at,
               content_encrypted, proposals_encrypted, encryption_version`,
    [
      messageId,
      conversationId,
      userId,
      role,
      encrypted ? "[encrypted]" : content,
      JSON.stringify(encrypted ? [] : proposals),
      String(payload?.model || "").trim(),
      contentEncrypted ? JSON.stringify(contentEncrypted) : null,
      proposalsEncrypted ? JSON.stringify(proposalsEncrypted) : null,
      encrypted ? 1 : 0
    ]
  );
  if (!result.rows[0]) throw new Error("Conversa não encontrada.");
  await query("update project200_marin_conversations set updated_at = now() where id = $1 and user_id = $2", [conversationId, userId]);
  return normalizeMessage(userId, result.rows[0]);
}

export async function getProject200MarinMessage(userId, messageId) {
  await ensureProject200MarinSchema();
  const result = await query(
    `select id, role, content, proposals, model_id, created_at,
            content_encrypted, proposals_encrypted, encryption_version
       from project200_marin_messages
      where id = $1 and user_id = $2
      limit 1`,
    [String(messageId || "").trim(), userId]
  );
  return result.rows[0] ? normalizeMessage(userId, result.rows[0]) : null;
}

export async function migrateProject200MarinMessagesEncryption({ batchSize = 100 } = {}) {
  await ensureProject200MarinSchema();
  if (!getPrivacyEncryptionStatus().enabled) {
    throw new Error("PROJECT200_DATA_KEK precisa estar configurada antes da migracao.");
  }
  const safeBatchSize = Math.max(1, Math.min(500, Math.trunc(Number(batchSize) || 100)));
  const result = await query(
    `select id, user_id, content, proposals
       from project200_marin_messages
      where encryption_version = 0
      order by created_at asc
      limit $1`,
    [safeBatchSize]
  );
  let encrypted = 0;
  for (const row of result.rows) {
    const [contentEncrypted, proposalsEncrypted] = await Promise.all([
      encryptUserJson(row.user_id, String(row.content || ""), messageEncryptionContext(row.id, "content")),
      encryptUserJson(row.user_id, Array.isArray(row.proposals) ? row.proposals : [], messageEncryptionContext(row.id, "proposals"))
    ]);
    const updated = await query(
      `update project200_marin_messages
          set content = '[encrypted]',
              proposals = '[]'::jsonb,
              content_encrypted = $3::jsonb,
              proposals_encrypted = $4::jsonb,
              encryption_version = 1
        where id = $1 and user_id = $2 and encryption_version = 0
        returning id`,
      [row.id, row.user_id, JSON.stringify(contentEncrypted), JSON.stringify(proposalsEncrypted)]
    );
    if (updated.rows[0]) encrypted += 1;
  }
  return { scanned: result.rows.length, encrypted };
}

export async function recordProject200MarinRun(userId, conversationId, payload = {}) {
  await ensureProject200MarinSchema();
  await query(
    `insert into project200_marin_runs (
       user_id, conversation_id, model_id, route_reason, input_tokens, output_tokens,
       total_tokens, latency_ms, status, error_text
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      userId,
      conversationId || null,
      String(payload?.model || "").trim() || "unknown",
      String(payload?.routeReason || "").trim().slice(0, 240),
      Math.max(0, Math.trunc(Number(payload?.inputTokens) || 0)),
      Math.max(0, Math.trunc(Number(payload?.outputTokens) || 0)),
      Math.max(0, Math.trunc(Number(payload?.totalTokens) || 0)),
      Math.max(0, Math.trunc(Number(payload?.latencyMs) || 0)),
      String(payload?.status || "COMPLETED").trim().toUpperCase().slice(0, 30),
      String(payload?.errorText || "").trim().slice(0, 2000)
    ]
  );
}

export async function claimProject200MarinProposal(userId, messageId, proposalKey, proposalType) {
  await ensureProject200MarinSchema();
  const key = String(proposalKey || "").trim().slice(0, 100);
  if (!key) throw new Error("Proposta inválida.");
  const inserted = await query(
    `insert into project200_marin_proposal_applications (user_id, message_id, proposal_key, proposal_type)
     values ($1,$2,$3,$4)
     on conflict (user_id, message_id, proposal_key) do nothing
     returning *`,
    [userId, messageId, key, String(proposalType || "").trim().slice(0, 30)]
  );
  if (inserted.rows[0]) return { claimed: true, application: inserted.rows[0] };
  const retried = await query(
    `update project200_marin_proposal_applications
        set status = 'PROCESSING', error_text = '', attempts = attempts + 1, updated_at = now()
      where user_id = $1 and message_id = $2 and proposal_key = $3 and status = 'FAILED'
      returning *`,
    [userId, messageId, key]
  );
  if (retried.rows[0]) return { claimed: true, application: retried.rows[0] };
  const existing = await query(
    `select * from project200_marin_proposal_applications
      where user_id = $1 and message_id = $2 and proposal_key = $3 limit 1`,
    [userId, messageId, key]
  );
  return { claimed: false, application: existing.rows[0] || null };
}

export async function finishProject200MarinProposal(userId, messageId, proposalKey, entityId) {
  await query(
    `update project200_marin_proposal_applications
        set status = 'APPLIED', entity_id = $4, error_text = '', updated_at = now()
      where user_id = $1 and message_id = $2 and proposal_key = $3`,
    [userId, messageId, String(proposalKey || "").trim(), entityId || null]
  );
}

export async function failProject200MarinProposal(userId, messageId, proposalKey, errorText) {
  await query(
    `update project200_marin_proposal_applications
        set status = 'FAILED', error_text = $4, updated_at = now()
      where user_id = $1 and message_id = $2 and proposal_key = $3`,
    [userId, messageId, String(proposalKey || "").trim(), String(errorText || "").trim().slice(0, 2000)]
  );
}

