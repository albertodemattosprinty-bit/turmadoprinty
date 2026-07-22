import crypto from "node:crypto";

import { query } from "./db.js";
import { getProject200FriendsSnapshot, resolveProject200FriendAssignmentUser } from "./project200-friends.js";
import { decryptUserJson, encryptUserJson, ensurePrivacyEncryptionSchema } from "./privacy-crypto.js";

const MAX_MESSAGES = 100;
const MAX_OCCURRENCES = 180;
let tutorsSchemaPromise = null;

function tutorMessageContext(messageId, field) {
  return `project200-tutor-message:${messageId}:${field}`;
}

function normalizeId(value) {
  return String(value || "").trim();
}

function buildPairKey(leftUserId, rightUserId) {
  return [normalizeId(leftUserId), normalizeId(rightUserId)].sort().join(":");
}

function normalizeProposal(rawProposal) {
  if (!rawProposal || typeof rawProposal !== "object") return null;
  const type = String(rawProposal.type || "").trim().toLowerCase();
  if (!["action", "mission"].includes(type)) {
    throw new Error("Tipo de proposta invalido.");
  }
  const title = String(rawProposal.title || "").trim().slice(0, 120);
  if (title.length < 2) {
    throw new Error("Informe um titulo valido.");
  }
  const proposal = {
    key: String(rawProposal.key || crypto.randomUUID()).trim().slice(0, 100),
    type,
    title
  };

  if (type === "action") {
    const rawOccurrences = Array.isArray(rawProposal.occurrences) ? rawProposal.occurrences.slice(0, MAX_OCCURRENCES) : [];
    if (!rawOccurrences.length) {
      throw new Error("Defina ao menos um horario para a tarefa.");
    }
    const occurrences = rawOccurrences.map((entry) => {
      const startAt = new Date(entry?.startAt);
      const endAt = new Date(entry?.endAt);
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
        throw new Error("Horario da tarefa invalido.");
      }
      if (endAt.getTime() - startAt.getTime() > 24 * 60 * 60 * 1000) {
        throw new Error("A tarefa nao pode ultrapassar 24 horas.");
      }
      return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
    });
    const first = occurrences[0];
    const durationMinutes = Math.max(1, Math.round((new Date(first.endAt) - new Date(first.startAt)) / 60000));
    proposal.aspectId = String(rawProposal.aspectId || rawProposal.categoryId || "aspecto").trim().toLowerCase().slice(0, 60) || "aspecto";
    proposal.repeatRule = String(rawProposal.repeatRule || "none").trim().toLowerCase().slice(0, 40) || "none";
    proposal.repeatDays = [...new Set((Array.isArray(rawProposal.repeatDays) ? rawProposal.repeatDays : [])
      .map((value) => Math.trunc(Number(value)))
      .filter((value) => value >= 0 && value <= 6))];
    proposal.occurrences = occurrences;
    proposal.startAt = first.startAt;
    proposal.endAt = first.endAt;
    proposal.durationMinutes = durationMinutes;
    proposal.dateLabel = String(rawProposal.dateLabel || "").trim().slice(0, 100);
    proposal.timeLabel = String(rawProposal.timeLabel || "").trim().slice(0, 100);
    proposal.svgIconUrl = String(rawProposal.svgIconUrl || "").trim().slice(0, 2000);
    proposal.svgIconLabel = String(rawProposal.svgIconLabel || "").trim().slice(0, 160);
  } else {
    proposal.targetValue = Math.max(1, Math.min(10000, Math.trunc(Number(rawProposal.targetValue) || 1)));
    proposal.unitDurationSeconds = Math.max(0, Math.min(86400, Math.trunc(Number(
      rawProposal.unitDurationSeconds ?? (Number(rawProposal.unitDurationMinutes || 0) * 60)
    ) || 0)));
    proposal.unitDurationMinutes = Math.max(0, Math.trunc(proposal.unitDurationSeconds / 60));
    proposal.svgIconUrl = String(rawProposal.svgIconUrl || "").trim().slice(0, 2000);
    proposal.svgIconLabel = String(rawProposal.svgIconLabel || "").trim().slice(0, 160);
  }
  return proposal;
}

async function getTutorLink(userId, contactUserId = "") {
  await ensureProject200TutorsSchema();
  const viewerId = normalizeId(userId);
  const contactId = normalizeId(contactUserId);
  const params = [viewerId];
  let contactClause = "";
  if (contactId) {
    params.push(contactId);
    contactClause = `and (
      (owner_user_id = $1 and tutor_user_id = $2)
      or (owner_user_id = $2 and tutor_user_id = $1)
    )`;
  }
  const result = await query(
    `select id, owner_user_id, tutor_user_id, active, created_at, updated_at,
            clock_timestamp() as sync_cursor
       from project200_tutor_links
      where active = true
        and (owner_user_id = $1 or tutor_user_id = $1)
        ${contactClause}
      order by updated_at desc
      limit 1`,
    params
  );
  return result.rows[0] || null;
}

function getCounterpartUserId(link, viewerUserId) {
  return normalizeId(link?.owner_user_id) === normalizeId(viewerUserId)
    ? normalizeId(link?.tutor_user_id)
    : normalizeId(link?.owner_user_id);
}

async function normalizeTutorMessage(viewerUserId, row) {
  const encryptionOwnerId = normalizeId(row.owner_user_id);
  let content = String(row.content || "");
  let proposals = Array.isArray(row.proposals) ? row.proposals : [];
  if (Number(row.encryption_version) >= 1 && row.content_encrypted) {
    content = String(await decryptUserJson(
      encryptionOwnerId,
      row.content_encrypted,
      tutorMessageContext(row.id, "content")
    ) || "");
    proposals = await decryptUserJson(
      encryptionOwnerId,
      row.proposals_encrypted,
      tutorMessageContext(row.id, "proposals")
    ) || [];
  }
  const applicationByKey = new Map(
    (Array.isArray(row.applications) ? row.applications : []).map((application) => [
      String(application?.proposalKey || ""),
      String(application?.status || "").toUpperCase()
    ])
  );
  const recipientUserId = normalizeId(row.recipient_user_id);
  return {
    id: normalizeId(row.id),
    role: normalizeId(row.sender_user_id) === normalizeId(viewerUserId) ? "user" : "assistant",
    content,
    proposals: (Array.isArray(proposals) ? proposals : []).map((proposal) => {
      const status = applicationByKey.get(String(proposal?.key || "")) || "PENDING";
      return {
        ...proposal,
        _canApply: recipientUserId === normalizeId(viewerUserId) && !["PROCESSING", "APPLIED"].includes(status),
        _applied: status === "APPLIED",
        _pending: status === "PROCESSING",
        _status: status
      };
    }),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    source: "human"
  };
}

export async function ensureProject200TutorsSchema() {
  if (!tutorsSchemaPromise) {
    tutorsSchemaPromise = (async () => {
      await ensurePrivacyEncryptionSchema();
      await query(`
        create table if not exists project200_tutor_links (
          id uuid primary key default gen_random_uuid(),
          pair_key text not null unique,
          owner_user_id uuid not null references users(id) on delete cascade,
          tutor_user_id uuid not null references users(id) on delete cascade,
          created_by_user_id uuid not null references users(id) on delete cascade,
          active boolean not null default true,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          check (owner_user_id <> tutor_user_id)
        );
      `);
      await query("create index if not exists idx_project200_tutor_links_owner on project200_tutor_links(owner_user_id, active, updated_at desc);");
      await query("create index if not exists idx_project200_tutor_links_tutor on project200_tutor_links(tutor_user_id, active, updated_at desc);");
      await query(`
        create table if not exists project200_tutor_messages (
          id uuid primary key,
          link_id uuid not null references project200_tutor_links(id) on delete cascade,
          sender_user_id uuid not null references users(id) on delete cascade,
          recipient_user_id uuid not null references users(id) on delete cascade,
          content text not null default '',
          proposals jsonb not null default '[]'::jsonb,
          content_encrypted jsonb,
          proposals_encrypted jsonb,
          encryption_version integer not null default 0,
          read_at timestamptz,
          created_at timestamptz not null default now(),
          check (sender_user_id <> recipient_user_id)
        );
      `);
      await query(`
        do $$
        begin
          if not exists (
            select 1
              from information_schema.columns
             where table_schema = current_schema()
               and table_name = ''project200_tutor_messages''
               and column_name = ''read_at''
          ) then
            alter table project200_tutor_messages add column read_at timestamptz;
            update project200_tutor_messages set read_at = created_at where read_at is null;
          end if;
        end $$;
      `);
      await query("create index if not exists idx_project200_tutor_messages_link_created on project200_tutor_messages(link_id, created_at desc);");
      await query("create index if not exists idx_project200_tutor_messages_recipient_unread on project200_tutor_messages(recipient_user_id, created_at desc) where read_at is null;");
      await query(`
        create table if not exists project200_tutor_proposal_applications (
          recipient_user_id uuid not null references users(id) on delete cascade,
          message_id uuid not null references project200_tutor_messages(id) on delete cascade,
          proposal_key text not null,
          proposal_type text not null,
          status text not null default 'PROCESSING',
          entity_id uuid,
          error_text text not null default '',
          attempts integer not null default 1,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          primary key (recipient_user_id, message_id, proposal_key)
        );
      `);
      await query("create index if not exists idx_project200_tutor_proposal_applications_message_updated on project200_tutor_proposal_applications(message_id, updated_at desc);");
    })().catch((error) => {
      tutorsSchemaPromise = null;
      throw error;
    });
  }
  return tutorsSchemaPromise;
}

export async function listProject200Tutors(userId) {
  await ensureProject200TutorsSchema();
  const viewerId = normalizeId(userId);
  const [linksResult, snapshot] = await Promise.all([
    query(
      `select id, owner_user_id, tutor_user_id, created_at, updated_at
         from project200_tutor_links
        where active = true and (owner_user_id = $1 or tutor_user_id = $1)
        order by updated_at desc`,
      [viewerId]
    ),
    getProject200FriendsSnapshot(viewerId, "today")
  ]);
  const friendById = new Map((Array.isArray(snapshot?.friends) ? snapshot.friends : []).map((friend) => [
    normalizeId(friend?.userId),
    friend
  ]));
  const tutors = linksResult.rows.map((link) => {
    const contactUserId = getCounterpartUserId(link, viewerId);
    const friend = friendById.get(contactUserId) || {
      userId: contactUserId,
      name: "Usuario",
      username: "",
      initials: "U",
      avatarDataUrl: "",
      svgIconUrl: ""
    };
    return {
      ...friend,
      linkId: normalizeId(link.id),
      contactUserId,
      relationship: normalizeId(link.owner_user_id) === viewerId ? "tutor" : "student",
      relationshipLabel: normalizeId(link.owner_user_id) === viewerId ? "Seu tutor" : "Seu tutorado",
      createdAt: link.created_at ? new Date(link.created_at).toISOString() : null
    };
  });
  const tutorIds = new Set(tutors.map((entry) => normalizeId(entry.contactUserId)));
  return {
    tutors,
    friends: (Array.isArray(snapshot?.friends) ? snapshot.friends : []).map((friend) => ({
      ...friend,
      isTutor: tutorIds.has(normalizeId(friend?.userId))
    }))
  };
}

export async function addProject200Tutor(userId, tutorUserId) {
  await ensureProject200TutorsSchema();
  const ownerId = normalizeId(userId);
  const tutorId = normalizeId(tutorUserId);
  if (!ownerId || !tutorId || ownerId === tutorId) {
    throw new Error("Escolha um amigo valido.");
  }
  await resolveProject200FriendAssignmentUser(ownerId, tutorId);
  const pairKey = buildPairKey(ownerId, tutorId);
  await query(
    `insert into project200_tutor_links (
       pair_key, owner_user_id, tutor_user_id, created_by_user_id, active, updated_at
     ) values ($1, $2, $3, $2, true, now())
     on conflict (pair_key) do update
       set active = true,
           updated_at = now()`,
    [pairKey, ownerId, tutorId]
  );
  return listProject200Tutors(ownerId);
}

export async function listProject200TutorMessages(userId, contactUserId, limit = 80, after = "") {
  const viewerId = normalizeId(userId);
  const link = await getTutorLink(viewerId, contactUserId);
  if (!link) throw new Error("Tutor nao encontrado.");
  const safeLimit = Math.max(1, Math.min(MAX_MESSAGES, Math.trunc(Number(limit) || 80)));
  const rawAfter = String(after || "").trim();
  const afterDate = rawAfter ? new Date(rawAfter) : null;
  if (afterDate && Number.isNaN(afterDate.getTime())) {
    throw new Error("Cursor de mensagens invalido.");
  }
  const cursor = new Date(link.sync_cursor || Date.now()).toISOString();
  const afterIso = afterDate ? afterDate.toISOString() : null;
  const result = await query(
    `select recent.*,
            $3::uuid as owner_user_id,
            coalesce((
              select jsonb_agg(jsonb_build_object(
                'proposalKey', application.proposal_key,
                'status', application.status
              ))
                from project200_tutor_proposal_applications application
               where application.message_id = recent.id
            ), '[]'::jsonb) as applications
       from (
         select message.id, message.link_id, message.sender_user_id, message.recipient_user_id,
                message.content, message.proposals, message.content_encrypted,
                message.proposals_encrypted, message.encryption_version, message.read_at, message.created_at
           from project200_tutor_messages message
          where message.link_id = $1
            and message.created_at <= $5::timestamptz
            and (
              $4::timestamptz is null
              or message.created_at > $4::timestamptz
              or exists (
                select 1
                  from project200_tutor_proposal_applications changed_application
                 where changed_application.message_id = message.id
                   and changed_application.updated_at > $4::timestamptz
                   and changed_application.updated_at <= $5::timestamptz
              )
            )
          order by message.created_at desc
          limit $2
       ) recent
      order by recent.created_at asc`,
    [link.id, safeLimit, link.owner_user_id, afterIso, cursor]
  );
  return {
    linkId: normalizeId(link.id),
    contactUserId: getCounterpartUserId(link, viewerId),
    cursor,
    incremental: Boolean(afterIso),
    messages: await Promise.all(result.rows.map((row) => normalizeTutorMessage(viewerId, row)))
  };
}

export async function listProject200TutorInbox(userId, limit = 100) {
  await ensureProject200TutorsSchema();
  const viewerId = normalizeId(userId);
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 100)));
  const result = await query(
    `select message.id, message.sender_user_id, message.created_at,
            count(*) over()::integer as unread_total
       from project200_tutor_messages message
       join project200_tutor_links link
         on link.id = message.link_id
        and link.active = true
      where message.recipient_user_id = $1
        and message.read_at is null
      order by message.created_at desc
      limit $2`,
    [viewerId, safeLimit]
  );
  if (!result.rows.length) {
    return { unreadCount: 0, notifications: [] };
  }

  const snapshot = await getProject200FriendsSnapshot(viewerId, "today");
  const friendById = new Map((Array.isArray(snapshot?.friends) ? snapshot.friends : []).map((friend) => [
    normalizeId(friend?.userId),
    friend
  ]));
  const notificationBySender = new Map();
  result.rows.forEach((row) => {
    const contactUserId = normalizeId(row.sender_user_id);
    const existing = notificationBySender.get(contactUserId);
    if (existing) {
      existing.unreadCount += 1;
      return;
    }
    const friend = friendById.get(contactUserId) || {
      userId: contactUserId,
      name: "Usuario",
      username: "",
      initials: "U",
      avatarDataUrl: "",
      svgIconUrl: ""
    };
    notificationBySender.set(contactUserId, {
      ...friend,
      contactUserId,
      unreadCount: 1,
      latestMessageId: normalizeId(row.id),
      latestMessageAt: row.created_at ? new Date(row.created_at).toISOString() : null
    });
  });
  return {
    unreadCount: Math.max(0, Number(result.rows[0]?.unread_total || result.rows.length)),
    notifications: [...notificationBySender.values()]
  };
}

export async function markProject200TutorMessagesRead(userId, contactUserId) {
  await ensureProject200TutorsSchema();
  const viewerId = normalizeId(userId);
  const contactId = normalizeId(contactUserId);
  const link = await getTutorLink(viewerId, contactId);
  if (!link) throw new Error("Tutor nao encontrado.");
  const result = await query(
    `update project200_tutor_messages
        set read_at = clock_timestamp()
      where link_id = $1
        and recipient_user_id = $2
        and sender_user_id = $3
        and read_at is null
      returning id`,
    [link.id, viewerId, contactId]
  );
  return { readCount: result.rowCount || 0 };
}

export async function appendProject200TutorMessage(userId, contactUserId, payload = {}) {
  const senderId = normalizeId(userId);
  const link = await getTutorLink(senderId, contactUserId);
  if (!link) throw new Error("Tutor nao encontrado.");
  const recipientId = getCounterpartUserId(link, senderId);
  const proposal = payload?.proposal ? normalizeProposal(payload.proposal) : null;
  const proposals = proposal ? [proposal] : [];
  const content = String(payload?.content || "").trim().slice(0, 4000)
    || (proposal ? (proposal.type === "mission" ? "Missao sugerida" : "Tarefa sugerida") : "");
  if (!content) throw new Error("Mensagem vazia.");

  const messageId = crypto.randomUUID();
  const encryptionOwnerId = normalizeId(link.owner_user_id);
  const [contentEncrypted, proposalsEncrypted] = await Promise.all([
    encryptUserJson(encryptionOwnerId, content, tutorMessageContext(messageId, "content")),
    encryptUserJson(encryptionOwnerId, proposals, tutorMessageContext(messageId, "proposals"))
  ]);
  const encrypted = Boolean(contentEncrypted && proposalsEncrypted);
  const result = await query(
    `insert into project200_tutor_messages (
       id, link_id, sender_user_id, recipient_user_id, content, proposals,
       content_encrypted, proposals_encrypted, encryption_version
     ) values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9)
     returning id, link_id, sender_user_id, recipient_user_id, content, proposals,
               content_encrypted, proposals_encrypted, encryption_version, read_at, created_at`,
    [
      messageId,
      link.id,
      senderId,
      recipientId,
      encrypted ? "[encrypted]" : content,
      JSON.stringify(encrypted ? [] : proposals),
      contentEncrypted ? JSON.stringify(contentEncrypted) : null,
      proposalsEncrypted ? JSON.stringify(proposalsEncrypted) : null,
      encrypted ? 1 : 0
    ]
  );
  await query("update project200_tutor_links set updated_at = now() where id = $1", [link.id]);
  return normalizeTutorMessage(senderId, {
    ...result.rows[0],
    owner_user_id: link.owner_user_id,
    applications: []
  });
}

export async function claimProject200TutorProposal(userId, messageId, proposalKey) {
  await ensureProject200TutorsSchema();
  const recipientId = normalizeId(userId);
  const key = String(proposalKey || "").trim().slice(0, 100);
  const result = await query(
    `select message.*, link.owner_user_id
       from project200_tutor_messages message
       join project200_tutor_links link on link.id = message.link_id and link.active = true
      where message.id = $1
        and message.recipient_user_id = $2
        and (link.owner_user_id = $2 or link.tutor_user_id = $2)
      limit 1`,
    [normalizeId(messageId), recipientId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Cartao de tutor nao encontrado.");
  const normalized = await normalizeTutorMessage(recipientId, { ...row, applications: [] });
  const proposal = normalized.proposals.find((entry) => String(entry?.key || "") === key);
  if (!proposal) throw new Error("Proposta nao encontrada.");

  const inserted = await query(
    `insert into project200_tutor_proposal_applications (
       recipient_user_id, message_id, proposal_key, proposal_type
     ) values ($1,$2,$3,$4)
     on conflict (recipient_user_id, message_id, proposal_key) do nothing
     returning *`,
    [recipientId, row.id, key, proposal.type]
  );
  if (inserted.rows[0]) {
    return { claimed: true, proposal, application: inserted.rows[0] };
  }
  const retried = await query(
    `update project200_tutor_proposal_applications
        set status = 'PROCESSING', attempts = attempts + 1, error_text = '', updated_at = now()
      where recipient_user_id = $1 and message_id = $2 and proposal_key = $3 and status = 'FAILED'
      returning *`,
    [recipientId, row.id, key]
  );
  if (retried.rows[0]) {
    return { claimed: true, proposal, application: retried.rows[0] };
  }
  const existing = await query(
    `select * from project200_tutor_proposal_applications
      where recipient_user_id = $1 and message_id = $2 and proposal_key = $3 limit 1`,
    [recipientId, row.id, key]
  );
  return { claimed: false, proposal, application: existing.rows[0] || null };
}

export async function finishProject200TutorProposal(userId, messageId, proposalKey, entityId) {
  await ensureProject200TutorsSchema();
  await query(
    `update project200_tutor_proposal_applications
        set status = 'APPLIED', entity_id = $4, error_text = '', updated_at = now()
      where recipient_user_id = $1 and message_id = $2 and proposal_key = $3`,
    [normalizeId(userId), normalizeId(messageId), String(proposalKey || "").trim(), entityId || null]
  );
}

export async function failProject200TutorProposal(userId, messageId, proposalKey, errorText) {
  await ensureProject200TutorsSchema();
  await query(
    `update project200_tutor_proposal_applications
        set status = 'FAILED', error_text = $4, updated_at = now()
      where recipient_user_id = $1 and message_id = $2 and proposal_key = $3`,
    [
      normalizeId(userId),
      normalizeId(messageId),
      String(proposalKey || "").trim(),
      String(errorText || "").trim().slice(0, 2000)
    ]
  );
}
