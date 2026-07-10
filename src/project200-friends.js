import { db, query } from "./db.js";
import { ensureProject200ProfilesSchema, PROJECT200_DEFAULT_PROFILE_AVATAR, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

const PROJECT200_FRIEND_SCOPE_MAP = new Map([
  ["today", { key: "today", label: "Hoje", days: 1 }],
  ["last7", { key: "last7", label: "7 dias", days: 7 }],
  ["last15", { key: "last15", label: "15 dias", days: 15 }],
  ["last30", { key: "last30", label: "30 dias", days: 30 }]
]);
const PROJECT200_FRIEND_TIME_ZONE = "America/Sao_Paulo";

function normalizeScope(scopeKey = "today") {
  const normalized = String(scopeKey || "today").trim().toLowerCase();
  return PROJECT200_FRIEND_SCOPE_MAP.get(normalized) || PROJECT200_FRIEND_SCOPE_MAP.get("today");
}

function toDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const target = Number.isNaN(date.getTime()) ? new Date() : date;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROJECT200_FRIEND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(target);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

function addDateDays(dateKey, delta) {
  const [year, month, day] = String(dateKey || "1970-01-01").split("-").map((value) => Number(value || 0));
  const date = new Date(Date.UTC(year, Math.max(0, month - 1), day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + Number(delta || 0));
  return toDateKey(date);
}

function normalizeFriendshipStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "accepted" || normalized === "rejected") {
    return normalized;
  }
  return "pending";
}

function buildInitials(name = "", username = "") {
  const source = String(name || username || "").trim();
  if (!source) {
    return "U";
  }
  const parts = source.split(/\s+/u).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase() || "U";
}

function normalizeFriendCardRow(row, points = 0) {
  const name = String(row?.name || row?.username || "Usuario").trim() || "Usuario";
  const username = String(row?.username || "").trim();
  return {
    userId: String(row?.id || "").trim(),
    name,
    username,
    avatarPreset: String(row?.avatar_preset || PROJECT200_DEFAULT_PROFILE_AVATAR).trim() || PROJECT200_DEFAULT_PROFILE_AVATAR,
    avatarDataUrl: String(row?.avatar_data_url || "").trim(),
    svgIconUrl: String(row?.svg_icon_url || "").trim(),
    svgIconLabel: String(row?.svg_icon_label || "").trim(),
    initials: buildInitials(name, username),
    points: Math.max(0, Math.trunc(Number(points || 0) || 0))
  };
}

async function getUserCardMap(userIds = []) {
  await ensureProject200ProfilesSchema();
  const normalizedIds = [...new Set((Array.isArray(userIds) ? userIds : []).map((value) => String(value || "").trim()).filter(Boolean))];
  if (!normalizedIds.length) {
    return new Map();
  }
  const result = await query(
    `
      select
        u.id,
        u.name,
        u.username,
        p.avatar_preset,
        p.avatar_data_url,
        p.svg_icon_url,
        p.svg_icon_label
      from users u
      left join lateral (
        select avatar_preset, avatar_data_url, svg_icon_url, svg_icon_label
        from project200_profiles
        where user_id = u.id
          and deleted_at is null
        order by
          case when lower(trim(coalesce(name, ''))) = lower($2) then 0 else 1 end,
          case when nullif(trim(coalesce(avatar_data_url, '')), '') is not null then 0 else 1 end,
          case when nullif(trim(coalesce(svg_icon_url, '')), '') is not null then 0 else 1 end,
          sort_order asc,
          created_at asc
        limit 1
      ) p on true
      where u.id = any($1::uuid[])
    `,
    [normalizedIds, PROJECT200_DEFAULT_PROFILE_NAME]
  );
  return new Map(result.rows.map((row) => [String(row.id || "").trim(), row]));
}

async function getPointsByUserIds(userIds = [], scopeKey = "today") {
  const normalizedIds = [...new Set((Array.isArray(userIds) ? userIds : []).map((value) => String(value || "").trim()).filter(Boolean))];
  if (!normalizedIds.length) {
    return new Map();
  }
  const scope = normalizeScope(scopeKey);
  if (scope.days <= 1) {
    const todayKey = toDateKey();
    const result = await query(
      `
        select
          user_id,
          coalesce(sum(
            case
              when progress_date = $2::date then progress_value * unit_duration_minutes
              else 0
            end
          ), 0)::bigint as points
        from extra_goals
        where user_id = any($1::uuid[])
          and assigned_profile = $3
        group by user_id
      `,
      [normalizedIds, todayKey, PROJECT200_DEFAULT_PROFILE_NAME]
    );
    return new Map(result.rows.map((row) => [String(row.user_id || "").trim(), Math.max(0, Math.trunc(Number(row.points || 0) || 0))]));
  }

  const endDateKey = toDateKey();
  const startDateKey = addDateDays(endDateKey, -(scope.days - 1));
  const result = await query(
    `
      select
        h.user_id,
        coalesce(sum(h.progress_value * g.unit_duration_minutes), 0)::bigint as points
      from extra_goal_progress_history h
      join extra_goals g
        on g.id = h.goal_id
       and g.user_id = h.user_id
      where h.user_id = any($1::uuid[])
        and h.assigned_profile = $2
        and h.scope_date >= $3::date
        and h.scope_date <= $4::date
      group by h.user_id
    `,
    [normalizedIds, PROJECT200_DEFAULT_PROFILE_NAME, startDateKey, endDateKey]
  );
  return new Map(result.rows.map((row) => [String(row.user_id || "").trim(), Math.max(0, Math.trunc(Number(row.points || 0) || 0))]));
}

export async function ensureProject200FriendsSchema() {
  await query(`
    create table if not exists project200_friendships (
      id uuid primary key default gen_random_uuid(),
      requester_user_id uuid not null references users(id) on delete cascade,
      addressee_user_id uuid not null references users(id) on delete cascade,
      status text not null default 'pending',
      responded_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      check (requester_user_id <> addressee_user_id)
    );
  `);
  await query("alter table project200_friendships add column if not exists responded_at timestamptz;");
  await query("alter table project200_friendships add column if not exists status text not null default 'pending';");
  await query("alter table project200_friendships add column if not exists created_at timestamptz not null default now();");
  await query("alter table project200_friendships add column if not exists updated_at timestamptz not null default now();");
  await query("create unique index if not exists idx_project200_friendships_request_pair on project200_friendships(requester_user_id, addressee_user_id);");
  await query("create index if not exists idx_project200_friendships_user_status on project200_friendships(addressee_user_id, status, updated_at desc);");
  await query("create index if not exists idx_project200_friendships_requester_status on project200_friendships(requester_user_id, status, updated_at desc);");
}

export async function createProject200FriendInvite(userId, targetUserId) {
  await ensureProject200FriendsSchema();
  const requesterUserId = String(userId || "").trim();
  const addresseeUserId = String(targetUserId || "").trim();
  if (!requesterUserId || !addresseeUserId) {
    throw new Error("Convite invalido.");
  }
  if (requesterUserId === addresseeUserId) {
    throw new Error("Voce nao pode adicionar a si mesmo.");
  }
  const client = await db.connect();
  try {
    await client.query("begin");
    const existingResult = await client.query(
      `
        select *
        from project200_friendships
        where (requester_user_id = $1 and addressee_user_id = $2)
           or (requester_user_id = $2 and addressee_user_id = $1)
        order by created_at desc
        limit 1
        for update
      `,
      [requesterUserId, addresseeUserId]
    );
    const existing = existingResult.rows[0] || null;
    if (existing) {
      const status = normalizeFriendshipStatus(existing.status);
      if (status === "accepted") {
        await client.query("commit");
        return { id: existing.id, status, created: false, alreadyFriends: true };
      }
      if (status === "pending") {
        await client.query("commit");
        if (String(existing.requester_user_id || "").trim() === addresseeUserId) {
          throw new Error("Esse usuario ja enviou um convite para voce.");
        }
        return { id: existing.id, status, created: false, alreadyPending: true };
      }
      await client.query(
        `
          update project200_friendships
          set requester_user_id = $1,
              addressee_user_id = $2,
              status = 'pending',
              responded_at = null,
              updated_at = now()
          where id = $3
        `,
        [requesterUserId, addresseeUserId, existing.id]
      );
      await client.query("commit");
      return { id: existing.id, status: "pending", created: true };
    }

    const created = await client.query(
      `
        insert into project200_friendships (
          requester_user_id, addressee_user_id, status, created_at, updated_at
        )
        values ($1, $2, 'pending', now(), now())
        returning id, status
      `,
      [requesterUserId, addresseeUserId]
    );
    await client.query("commit");
    return { id: created.rows[0]?.id, status: normalizeFriendshipStatus(created.rows[0]?.status), created: true };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function updateFriendInviteStatus(userId, friendshipId, nextStatus) {
  await ensureProject200FriendsSchema();
  const normalizedFriendshipId = String(friendshipId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  const normalizedStatus = normalizeFriendshipStatus(nextStatus);
  if (!normalizedFriendshipId || !normalizedUserId || normalizedStatus === "pending") {
    throw new Error("Convite invalido.");
  }
  const result = await query(
    `
      update project200_friendships
      set status = $3,
          responded_at = now(),
          updated_at = now()
      where id = $1
        and addressee_user_id = $2
        and status = 'pending'
      returning id, status
    `,
    [normalizedFriendshipId, normalizedUserId, normalizedStatus]
  );
  if (!result.rows[0]) {
    throw new Error("Convite nao encontrado.");
  }
  return {
    id: result.rows[0].id,
    status: normalizeFriendshipStatus(result.rows[0].status)
  };
}

export async function acceptProject200FriendInvite(userId, friendshipId) {
  return updateFriendInviteStatus(userId, friendshipId, "accepted");
}

export async function rejectProject200FriendInvite(userId, friendshipId) {
  return updateFriendInviteStatus(userId, friendshipId, "rejected");
}

export async function getProject200FriendsSnapshot(userId, scopeKey = "today") {
  await ensureProject200FriendsSchema();
  const normalizedUserId = String(userId || "").trim();
  const scope = normalizeScope(scopeKey);
  const friendshipsResult = await query(
    `
      select *
      from project200_friendships
      where requester_user_id = $1
         or addressee_user_id = $1
      order by updated_at desc, created_at desc
    `,
    [normalizedUserId]
  );
  const friendships = friendshipsResult.rows;
  const userIds = new Set([normalizedUserId]);
  const incomingInvites = [];
  const acceptedFriendIds = [];

  for (const row of friendships) {
    const requesterUserId = String(row.requester_user_id || "").trim();
    const addresseeUserId = String(row.addressee_user_id || "").trim();
    const status = normalizeFriendshipStatus(row.status);
    if (requesterUserId) {
      userIds.add(requesterUserId);
    }
    if (addresseeUserId) {
      userIds.add(addresseeUserId);
    }
    if (status === "pending" && addresseeUserId === normalizedUserId) {
      incomingInvites.push({
        id: String(row.id || "").trim(),
        fromUserId: requesterUserId,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
      });
    }
    if (status === "accepted") {
      const friendUserId = requesterUserId === normalizedUserId ? addresseeUserId : requesterUserId;
      if (friendUserId) {
        acceptedFriendIds.push(friendUserId);
      }
    }
  }

  const [userCardMap, pointsByUserId] = await Promise.all([
    getUserCardMap([...userIds]),
    getPointsByUserIds([normalizedUserId, ...acceptedFriendIds], scope.key)
  ]);

  const selfRow = userCardMap.get(normalizedUserId) || { id: normalizedUserId, name: "Usuario", username: "" };
  const self = {
    ...normalizeFriendCardRow(selfRow, pointsByUserId.get(normalizedUserId) || 0),
    isSelf: true
  };

  const pending = incomingInvites
    .map((invite) => {
      const row = userCardMap.get(invite.fromUserId) || { id: invite.fromUserId, name: "Usuario", username: "" };
      return {
        id: invite.id,
        fromUser: normalizeFriendCardRow(row, 0),
        createdAt: invite.createdAt
      };
    })
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));

  const friends = [...new Set(acceptedFriendIds)]
    .map((friendUserId) => {
      const row = userCardMap.get(friendUserId) || { id: friendUserId, name: "Usuario", username: "" };
      return normalizeFriendCardRow(row, pointsByUserId.get(friendUserId) || 0);
    })
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }
      return String(left.name || "").localeCompare(String(right.name || ""), "pt-BR");
    });

  return {
    scope,
    pendingCount: pending.length,
    self,
    incomingInvites: pending,
    friends
  };
}
