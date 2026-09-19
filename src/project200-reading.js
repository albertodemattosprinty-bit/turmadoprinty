import { db, query } from "./db.js";
import { ensureExtraGoalsSchema } from "./extra-goals.js";
import { getCanonicalProject200BibleChapter } from "./project200-bible-versions.js";
import { ensureProject200PointsSchema } from "./project200-friends.js";

let schemaPromise = null;
const dateKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const boundedInteger = (value, fallback, min, max) => Math.max(min, Math.min(max, Math.trunc(Number(value ?? fallback) || fallback)));

function serializeReadingRow(row = {}) {
  return { totalCharacters: Number(row.total_characters || 0), bibleCharacters: Number(row.bible_characters || 0), exactPoints: Number(row.exact_points || 0), visiblePoints: Math.floor(Number(row.exact_points || 0)), completedBibleChapters: row.completed_bible_chapters || [], biblePlan: row.bible_plan || null, updatedAt: row.updated_at };
}

function serializeReadingPosition(row = {}) {
  return {
    readingType: row.reading_type === "bible" ? "bible" : "book",
    bookKey: String(row.book_key || ""),
    chapterNumber: Number(row.chapter_number || 0),
    chunkIndex: Math.max(0, Number(row.chunk_index || 0)),
    updatedAt: row.updated_at
  };
}

export function normalizeProject200ReadingPosition(position = {}) {
  const readingType = position?.readingType === "bible" ? "bible" : "book";
  const bookKey = String(position?.bookKey || "").trim().slice(0, 120);
  if (!bookKey) throw new Error("Livro inválido para salvar a posição de leitura.");
  return {
    readingType,
    bookKey,
    chapterNumber: readingType === "bible" ? boundedInteger(position?.chapterNumber, 1, 1, 200) : 0,
    chunkIndex: boundedInteger(position?.chunkIndex, 0, 0, 100000)
  };
}

async function listProject200ReadingPositions(userId, client = { query }) {
  const result = await client.query(
    `select reading_type, book_key, chapter_number, chunk_index, updated_at
       from project200_reading_positions
      where user_id=$1
      order by updated_at desc`,
    [userId]
  );
  return result.rows.map(serializeReadingPosition);
}

async function listProject200CompletedBibleChapters(userId, client = { query }) {
  const result = await client.query(
    `select book_key, chapter_number
       from project200_bible_chapter_progress
      where user_id=$1
      order by completed_at, book_key, chapter_number`,
    [userId]
  );
  return result.rows.map((row) => `${row.book_key}:${Number(row.chapter_number)}`);
}

function normalizeBibleSchedule(value, repeatDays) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const frequency = ["none", "daily", "weekly", "monthly_custom", "periodic", "yearly"].includes(String(raw.frequency || "")) ? String(raw.frequency) : "daily";
  const intervalUnit = ["day", "week", "month", "year"].includes(String(raw.intervalUnit || "")) ? String(raw.intervalUnit) : "day";
  const cleanDays = (days, fallback = []) => [...new Set((Array.isArray(days) ? days : fallback).map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
  const notificationRaw = raw.notification && typeof raw.notification === "object" ? raw.notification : {};
  return {
    nativeType: "bible_reading", locked: true, frequency, intervalUnit,
    interval: boundedInteger(raw.interval, 1, 1, 999),
    weekDays: cleanDays(raw.weekDays, repeatDays), avoidDays: cleanDays(raw.avoidDays),
    monthlyMode: raw.monthlyMode === "day" ? "day" : "weekday",
    monthDay: boundedInteger(raw.monthDay, 1, 1, 31),
    monthlyOrdinalIndex: boundedInteger(raw.monthlyOrdinalIndex, 0, 0, 4),
    monthlyWeekdayIndex: boundedInteger(raw.monthlyWeekdayIndex, 0, 0, 6),
    startsOn: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.startsOn || "")) ? String(raw.startsOn) : dateKey(),
    endMode: ["never", "date", "count"].includes(String(raw.endMode || "")) ? String(raw.endMode) : "never",
    endsOn: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.endsOn || "")) ? String(raw.endsOn) : "",
    count: boundedInteger(raw.count, 10, 1, 999),
    notification: {
      mode: ["at_time", "5m", "10m", "30m", "1h", "1d", "custom"].includes(String(notificationRaw.mode || "")) ? String(notificationRaw.mode) : "at_time",
      customAmount: boundedInteger(notificationRaw.customAmount, 10, 1, 999),
      customUnit: ["minutes", "hours", "days"].includes(String(notificationRaw.customUnit || "")) ? String(notificationRaw.customUnit) : "minutes"
    }
  };
}

export async function ensureProject200ReadingSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    await query(`create table if not exists project200_reading_progress (
      user_id uuid primary key references users(id) on delete cascade,
      total_characters bigint not null default 0,
      bible_characters bigint not null default 0,
      exact_points numeric(16,2) not null default 0,
      completed_bible_chapters jsonb not null default '[]'::jsonb,
      bible_plan jsonb,
      updated_at timestamptz not null default now()
    )`);
    await query(`create table if not exists project200_reading_events (
      id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
      block_key text not null, characters integer not null, book_key text, chapter_number integer,
      reading_type text not null default 'book',
      created_at timestamptz not null default now(), unique(user_id, block_key)
    )`);
    await query(`create table if not exists project200_reading_positions (
      user_id uuid not null references users(id) on delete cascade,
      reading_type text not null default 'book',
      book_key text not null,
      chapter_number integer not null default 0,
      chunk_index integer not null default 0,
      updated_at timestamptz not null default now(),
      primary key(user_id, reading_type, book_key, chapter_number)
    )`);
    await query(`create table if not exists project200_bible_chapter_progress (
      user_id uuid not null references users(id) on delete cascade,
      book_key text not null,
      chapter_number integer not null check(chapter_number between 1 and 200),
      completed_at timestamptz not null default now(),
      primary key(user_id, book_key, chapter_number)
    )`);
    await query("alter table project200_reading_progress add column if not exists bible_characters bigint not null default 0");
    await query("alter table project200_reading_events add column if not exists reading_type text not null default 'book'");
    await query("create index if not exists idx_project200_reading_events_user_created on project200_reading_events(user_id, created_at desc)");
    await query("create index if not exists idx_project200_reading_events_bible_chapter on project200_reading_events(user_id, reading_type, book_key, chapter_number)");
    await query("create index if not exists idx_project200_reading_positions_user_updated on project200_reading_positions(user_id, updated_at desc)");
    await query("create index if not exists idx_project200_bible_chapter_progress_user_completed on project200_bible_chapter_progress(user_id, completed_at desc)");
    await query(`insert into project200_bible_chapter_progress(user_id,book_key,chapter_number)
      select progress.user_id,
             split_part(chapter.value #>> '{}', ':', 1),
             split_part(chapter.value #>> '{}', ':', 2)::integer
        from project200_reading_progress progress
        cross join lateral jsonb_array_elements(progress.completed_bible_chapters) chapter(value)
       where (chapter.value #>> '{}') ~ '^[A-Z0-9]+:[0-9]{1,3}$'
      on conflict do nothing`);
  })().catch((error) => { schemaPromise = null; throw error; });
  return schemaPromise;
}

export async function getProject200Reading(userId) {
  await ensureProject200ReadingSchema();
  await query(`insert into project200_reading_progress(user_id) values($1) on conflict do nothing`, [userId]);
  const [result, positions, completedBibleChapters] = await Promise.all([
    query(`select total_characters, bible_characters, exact_points, completed_bible_chapters, bible_plan, updated_at from project200_reading_progress where user_id=$1`, [userId]),
    listProject200ReadingPositions(userId),
    listProject200CompletedBibleChapters(userId)
  ]);
  return { ...serializeReadingRow(result.rows[0]), completedBibleChapters, positions };
}

export async function recordProject200ReadingBlocks(userId, blocks = []) {
  await Promise.all([ensureProject200ReadingSchema(), ensureProject200PointsSchema(), ensureExtraGoalsSchema()]);
  const client = await db.connect(); let added = 0; let addedBible = 0;
  try {
    await client.query("begin");
    for (const block of Array.isArray(blocks) ? blocks.slice(0, 5) : []) {
      const key = String(block?.key || "").slice(0, 220); const characters = Math.max(0, Math.min(2000, Math.trunc(Number(block?.characters || 0))));
      if (!key || !characters) continue;
      const readingType = block?.readingType === "bible" ? "bible" : "book";
      const inserted = await client.query(`insert into project200_reading_events(user_id,block_key,characters,book_key,chapter_number,reading_type) values($1,$2,$3,$4,$5,$6) on conflict do nothing returning characters`, [userId, key, characters, String(block?.bookKey || "").slice(0,120), Number(block?.chapterNumber || 0) || null, readingType]);
      if (inserted.rows[0]) { added += characters; if (readingType === "bible") addedBible += characters; }
    }
    const progressResult = await client.query(`insert into project200_reading_progress(user_id,total_characters,bible_characters,exact_points) values($1,$2::bigint,$3::bigint,($2::bigint)::numeric/50) on conflict(user_id) do update set total_characters=project200_reading_progress.total_characters+excluded.total_characters,bible_characters=project200_reading_progress.bible_characters+excluded.bible_characters,exact_points=(project200_reading_progress.total_characters+excluded.total_characters)::numeric/50,updated_at=now() returning total_characters,bible_characters,exact_points,completed_bible_chapters,bible_plan,updated_at`, [userId, added, addedBible]);
    const progress = serializeReadingRow(progressResult.rows[0]); const today = dateKey();
    const todayResult = await client.query(`select coalesce(sum(characters),0)::bigint as characters from project200_reading_events where user_id=$1 and reading_type='bible' and (created_at at time zone 'America/Sao_Paulo')::date=$2::date`, [userId, today]);
    const dailyCharacters = Number(todayResult.rows[0]?.characters || 0); const rate = Math.max(1, Number(progress.biblePlan?.lettersPerSecond || 14.7)); const completedMinutes = Math.floor(dailyCharacters / rate / 60);
    await client.query(`update extra_goals set progress_value=$2,progress_date=$3::date,last_progress_at=now(),updated_at=now() where user_id=$1 and schedule_config->>'nativeType'='bible_reading'`, [userId, completedMinutes, today]);
    const previousVisiblePoints = Math.floor(Math.max(0, progress.totalCharacters - added) / 50); const earnedVisiblePoints = Math.max(0, progress.visiblePoints - previousVisiblePoints);
    if (earnedVisiblePoints > 0) await client.query(`insert into project200_point_events(user_id,source_type,source_key,points,scope_date,metadata) values($1,'reading',$2,$3,$4::date,$5::jsonb) on conflict(user_id,source_type,source_key) do update set points=project200_point_events.points+excluded.points,metadata=excluded.metadata,updated_at=now()`, [userId, `reading-${today}`, earnedVisiblePoints, today, JSON.stringify({ exactPoints: progress.exactPoints, totalCharacters: progress.totalCharacters })]);
    await client.query("commit");
    const positions = await listProject200ReadingPositions(userId, client);
    const completedBibleChapters = await listProject200CompletedBibleChapters(userId, client);
    return { ...progress, completedBibleChapters, positions, addedCharacters: added, addedPoints: Number((added / 50).toFixed(2)) };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function saveProject200ReadingPosition(userId, position = {}) {
  await ensureProject200ReadingSchema();
  const { readingType, bookKey, chapterNumber, chunkIndex } = normalizeProject200ReadingPosition(position);
  const result = await query(
    `insert into project200_reading_positions(user_id,reading_type,book_key,chapter_number,chunk_index)
     values($1,$2,$3,$4,$5)
     on conflict(user_id,reading_type,book_key,chapter_number) do update
       set chunk_index=greatest(project200_reading_positions.chunk_index,excluded.chunk_index),updated_at=now()
     returning reading_type, book_key, chapter_number, chunk_index, updated_at`,
    [userId, readingType, bookKey, chapterNumber, chunkIndex]
  );
  return serializeReadingPosition(result.rows[0]);
}

export async function completeProject200BibleChapter(userId, bookKey, chapterNumber, expectedBlocks) {
  await ensureProject200ReadingSchema();
  const canonical = await getCanonicalProject200BibleChapter(bookKey, chapterNumber);
  const chapterKey = `${canonical.bookKey}:${canonical.chapterNumber}`;
  const requiredBlocks = Math.trunc(Number(expectedBlocks || 0));
  if (!Number.isInteger(requiredBlocks) || requiredBlocks < 1 || requiredBlocks > 10000) throw new Error("Quantidade de trechos inválida para concluir o capítulo.");
  const client = await db.connect();
  try {
    await client.query("begin");
    const completed = await client.query(
      `select 1 from project200_bible_chapter_progress where user_id=$1 and book_key=$2 and chapter_number=$3`,
      [userId, canonical.bookKey, canonical.chapterNumber]
    );
    if (!completed.rows[0]) {
      const readBlocks = await client.query(
        `select count(*)::integer as total
           from project200_reading_events
          where user_id=$1 and reading_type='bible' and book_key=$2 and chapter_number=$3`,
        [userId, canonical.bookKey, canonical.chapterNumber]
      );
      if (Number(readBlocks.rows[0]?.total || 0) < requiredBlocks) throw new Error("Leia todos os trechos deste capítulo antes de concluí-lo.");
    }
    await client.query(
      `insert into project200_bible_chapter_progress(user_id,book_key,chapter_number)
       values($1,$2,$3)
       on conflict(user_id,book_key,chapter_number) do nothing`,
      [userId, canonical.bookKey, canonical.chapterNumber]
    );
    await client.query(`insert into project200_reading_progress(user_id,completed_bible_chapters) values($1,$2::jsonb) on conflict(user_id) do update set completed_bible_chapters=(select jsonb_agg(distinct item) from jsonb_array_elements(project200_reading_progress.completed_bible_chapters || excluded.completed_bible_chapters) item),updated_at=now()`, [userId, JSON.stringify([chapterKey])]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  return getProject200Reading(userId);
}

export async function saveProject200BiblePlan(userId, plan = {}, assignedProfile = "Usuario") {
  await Promise.all([ensureProject200ReadingSchema(), ensureExtraGoalsSchema()]);
  const repeatDays = Array.isArray(plan.repeatDays) ? [...new Set(plan.repeatDays.map(Number).filter((v) => Number.isInteger(v) && v >= 0 && v <= 6))].sort((a, b) => a - b) : [0,1,2,3,4,5,6];
  const scheduleConfig = normalizeBibleSchedule(plan.scheduleConfig, repeatDays);
  const safe = { lettersPerSecond: Math.max(1, Number(plan.lettersPerSecond || 1)), durationMonths: Math.max(0, Number(plan.durationMonths || 12)), durationDays: Math.max(0, Number(plan.durationDays || 0)), dailyMinutes: Math.max(1, Math.ceil(Number(plan.dailyMinutes || 1))), repeatDays, scheduleConfig };
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query(`insert into project200_reading_progress(user_id,bible_plan) values($1,$2::jsonb) on conflict(user_id) do update set bible_plan=excluded.bible_plan,updated_at=now()`, [userId, JSON.stringify(safe)]);
    await client.query(`insert into extra_goals(user_id,assigned_profile,title,category_id,goal_kind,target_value,unit_duration_minutes,unit_duration_seconds,repeat_days,schedule_config) select $1,$5,'Ler a Bíblia','aprendizado','goal',$2,0,0,$3::jsonb,$4::jsonb where not exists(select 1 from extra_goals where user_id=$1 and schedule_config->>'nativeType'='bible_reading')`, [userId, safe.dailyMinutes, JSON.stringify(safe.repeatDays), JSON.stringify(scheduleConfig), assignedProfile]);
    await client.query(`update extra_goals set assigned_profile=$5,target_value=$2,unit_duration_minutes=0,unit_duration_seconds=0,repeat_days=$3::jsonb,schedule_config=$4::jsonb,updated_at=now() where user_id=$1 and schedule_config->>'nativeType'='bible_reading'`, [userId, safe.dailyMinutes, JSON.stringify(safe.repeatDays), JSON.stringify(scheduleConfig), assignedProfile]);
    const today = dateKey(); const todayResult = await client.query(`select coalesce(sum(characters),0)::bigint as characters from project200_reading_events where user_id=$1 and reading_type='bible' and (created_at at time zone 'America/Sao_Paulo')::date=$2::date`, [userId, today]);
    const completedMinutes = Math.floor(Number(todayResult.rows[0]?.characters || 0) / safe.lettersPerSecond / 60);
    await client.query(`update extra_goals set progress_value=$2,progress_date=$3::date,last_progress_at=case when $2>0 then now() else last_progress_at end,updated_at=now() where user_id=$1 and schedule_config->>'nativeType'='bible_reading'`, [userId, completedMinutes, today]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  return getProject200Reading(userId);
}
