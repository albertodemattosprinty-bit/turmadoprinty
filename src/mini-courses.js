import { query } from "./db.js";

function toIso(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeParagraphs(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeBullets(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeTableRows(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => ({
      label: String(item?.label || "").trim(),
      value: String(item?.value || "").trim()
    }))
    .filter((item) => item.label || item.value)
    .slice(0, 8);
}

function normalizePageKind(value) {
  const kind = String(value || "").trim().toLowerCase();
  if (kind === "didactic") {
    return "didactic";
  }
  if (kind === "closing") {
    return "closing";
  }
  return "text";
}

function normalizeCoursePages(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index) => ({
      pageNumber: Math.max(1, Number(item?.pageNumber || index + 1) || index + 1),
      kind: normalizePageKind(item?.kind),
      title: String(item?.title || `Pagina ${index + 1}`).trim() || `Pagina ${index + 1}`,
      paragraphs: normalizeParagraphs(item?.paragraphs),
      bullets: normalizeBullets(item?.bullets),
      tableRows: normalizeTableRows(item?.tableRows),
      imageUrl: String(item?.imageUrl || "").trim(),
      imagePrompt: String(item?.imagePrompt || "").trim(),
      audioUrl: String(item?.audioUrl || "").trim(),
      audioScript: String(item?.audioScript || "").trim()
    }))
    .filter((item) => item.title || item.paragraphs.length || item.bullets.length || item.tableRows.length);
}

function normalizeProgress(row, pageCount = 0) {
  if (!row) {
    return {
      currentPage: 1,
      pagesRead: 0,
      totalPages: pageCount,
      completed: false,
      startedAt: null,
      completedAt: null,
      updatedAt: null
    };
  }

  const safeTotal = Math.max(0, Number(pageCount || 0) || 0);
  const pagesRead = Math.max(0, Math.min(safeTotal || 999, Number(row.pages_read || 0) || 0));
  const currentPage = Math.max(1, Math.min(safeTotal || 1, Number(row.current_page || 1) || 1));

  return {
    currentPage,
    pagesRead,
    totalPages: safeTotal,
    completed: Boolean(row.completed_at) || (safeTotal > 0 && pagesRead >= safeTotal),
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
    updatedAt: toIso(row.updated_at)
  };
}

function normalizeCourse(row) {
  const pages = normalizeCoursePages(row.pages || []);
  const pageCount = Math.max(1, Number(row.page_count || pages.length || 1) || pages.length || 1);

  return {
    id: row.id,
    title: row.title || "Curso MINI",
    context: row.context || "",
    pageCount,
    durationMinutes: Math.max(1, Number(row.duration_minutes || pageCount) || pageCount),
    coverImageUrl: row.cover_image_url || "",
    coverImagePrompt: row.cover_image_prompt || "",
    pages,
    createdByUserId: row.created_by_user_id || null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    progress: normalizeProgress(row, pageCount)
  };
}

function normalizeCourseJob(row) {
  return {
    id: row.id,
    title: String(row.title || "Curso MINI").trim() || "Curso MINI",
    context: String(row.context || "").trim(),
    requestedModel: String(row.requested_model || "").trim() || "gpt-5.1",
    requestedPageCount: Math.max(1, Number(row.requested_page_count || 1) || 1),
    generatedPageCount: Math.max(0, Number(row.generated_page_count || 0) || 0),
    status: String(row.status || "queued").trim().toLowerCase() || "queued",
    feedback: String(row.feedback || "").trim(),
    errorMessage: String(row.error_message || "").trim(),
    courseId: row.course_id || null,
    createdByUserId: row.created_by_user_id || null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at)
  };
}

export async function ensureMiniCoursesSchema() {
  await query(`
    create table if not exists mini_courses (
      id uuid primary key default gen_random_uuid(),
      title text not null default 'Curso MINI',
      context text not null default '',
      page_count smallint not null default 1,
      duration_minutes smallint not null default 1,
      pages jsonb not null default '[]'::jsonb,
      cover_image_url text not null default '',
      cover_image_prompt text not null default '',
      created_by_user_id uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await query(`
    create table if not exists mini_course_progress (
      user_id uuid not null references users(id) on delete cascade,
      course_id uuid not null references mini_courses(id) on delete cascade,
      current_page smallint not null default 1,
      pages_read smallint not null default 0,
      started_at timestamptz not null default now(),
      completed_at timestamptz,
      updated_at timestamptz not null default now(),
      primary key (user_id, course_id)
    );
  `);

  await query("create index if not exists idx_mini_courses_updated_at on mini_courses(updated_at desc, created_at desc);");
  await query("create index if not exists idx_mini_course_progress_user_updated_at on mini_course_progress(user_id, updated_at desc);");

  await query(`
    create table if not exists mini_course_jobs (
      id uuid primary key default gen_random_uuid(),
      title text not null default 'Curso MINI',
      context text not null default '',
      requested_model text not null default 'gpt-5.1',
      requested_page_count smallint not null default 8,
      generated_page_count smallint not null default 0,
      status text not null default 'queued',
      feedback text not null default '',
      error_message text not null default '',
      course_id uuid references mini_courses(id) on delete set null,
      created_by_user_id uuid references users(id) on delete cascade,
      started_at timestamptz,
      finished_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("alter table mini_course_jobs add column if not exists requested_model text not null default 'gpt-5.1';");
  await query("create index if not exists idx_mini_course_jobs_creator_updated_at on mini_course_jobs(created_by_user_id, updated_at desc, created_at desc);");
  await query("create index if not exists idx_mini_course_jobs_status_created_at on mini_course_jobs(status, created_at asc);");
}

export async function listMiniCourses(userId = "") {
  await ensureMiniCoursesSchema();
  const safeUserId = String(userId || "").trim();
  const result = safeUserId
    ? await query(
      `
        select
          c.id,
          c.title,
          c.context,
          c.page_count,
          c.duration_minutes,
          c.pages,
          c.cover_image_url,
          c.cover_image_prompt,
          c.created_by_user_id,
          c.created_at,
          c.updated_at,
          p.current_page,
          p.pages_read,
          p.started_at,
          p.completed_at,
          p.updated_at as progress_updated_at
        from mini_courses c
        left join mini_course_progress p
          on p.course_id = c.id
         and p.user_id = $1
        order by c.updated_at desc, c.created_at desc
      `,
      [safeUserId]
    )
    : await query(
      `
        select
          c.id,
          c.title,
          c.context,
          c.page_count,
          c.duration_minutes,
          c.pages,
          c.cover_image_url,
          c.cover_image_prompt,
          c.created_by_user_id,
          c.created_at,
          c.updated_at,
          null::smallint as current_page,
          null::smallint as pages_read,
          null::timestamptz as started_at,
          null::timestamptz as completed_at,
          null::timestamptz as progress_updated_at
        from mini_courses c
        order by c.updated_at desc, c.created_at desc
      `
    );

  return result.rows.map((row) => normalizeCourse({
    ...row,
    updated_at: row.progress_updated_at || row.updated_at
  }));
}

export async function getMiniCourseById(courseId, userId = "") {
  await ensureMiniCoursesSchema();
  const safeUserId = String(userId || "").trim();
  const result = safeUserId
    ? await query(
      `
        select
          c.id,
          c.title,
          c.context,
          c.page_count,
          c.duration_minutes,
          c.pages,
          c.cover_image_url,
          c.cover_image_prompt,
          c.created_by_user_id,
          c.created_at,
          c.updated_at,
          p.current_page,
          p.pages_read,
          p.started_at,
          p.completed_at,
          p.updated_at as progress_updated_at
        from mini_courses c
        left join mini_course_progress p
          on p.course_id = c.id
         and p.user_id = $2
        where c.id = $1
        limit 1
      `,
      [courseId, safeUserId]
    )
    : await query(
      `
        select
          c.id,
          c.title,
          c.context,
          c.page_count,
          c.duration_minutes,
          c.pages,
          c.cover_image_url,
          c.cover_image_prompt,
          c.created_by_user_id,
          c.created_at,
          c.updated_at,
          null::smallint as current_page,
          null::smallint as pages_read,
          null::timestamptz as started_at,
          null::timestamptz as completed_at,
          null::timestamptz as progress_updated_at
        from mini_courses c
        where c.id = $1
        limit 1
      `,
      [courseId]
    );

  if (!result.rows[0]) {
    return null;
  }

  return normalizeCourse({
    ...result.rows[0],
    updated_at: result.rows[0].progress_updated_at || result.rows[0].updated_at
  });
}

export async function createMiniCourse({ title, context, pages, coverImageUrl = "", coverImagePrompt = "", createdByUserId = null } = {}) {
  await ensureMiniCoursesSchema();
  const safeTitle = String(title || "Curso MINI").trim() || "Curso MINI";
  const safeContext = String(context || "").trim();
  const normalizedPages = normalizeCoursePages(pages || []);
  const pageCount = Math.max(1, normalizedPages.length || 1);
  const durationMinutes = pageCount;
  const result = await query(
    `
      insert into mini_courses (
        title,
        context,
        page_count,
        duration_minutes,
        pages,
        cover_image_url,
        cover_image_prompt,
        created_by_user_id,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, now(), now())
      returning *
    `,
    [
      safeTitle.slice(0, 180),
      safeContext.slice(0, 2000),
      pageCount,
      durationMinutes,
      JSON.stringify(normalizedPages),
      String(coverImageUrl || "").trim(),
      String(coverImagePrompt || "").trim().slice(0, 1000),
      createdByUserId
    ]
  );

  return normalizeCourse(result.rows[0]);
}

export async function createMiniCourseJob({ title, context, requestedModel = "gpt-5.1", requestedPageCount = 8, createdByUserId } = {}) {
  await ensureMiniCoursesSchema();
  const safeTitle = String(title || "Curso MINI").trim() || "Curso MINI";
  const safeContext = String(context || "").trim();
  const safeModel = String(requestedModel || "gpt-5.1").trim() || "gpt-5.1";
  const pageCount = Math.max(4, Math.min(300, Number(requestedPageCount || 8) || 8));
  const result = await query(
    `
      insert into mini_course_jobs (
        title,
        context,
        requested_model,
        requested_page_count,
        generated_page_count,
        status,
        feedback,
        error_message,
        created_by_user_id,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, 0, 'queued', 'Na fila para gerar o curso.', '', $5, now(), now())
      returning *
    `,
    [
      safeTitle.slice(0, 180),
      safeContext.slice(0, 2000),
      safeModel.slice(0, 120),
      pageCount,
      createdByUserId
    ]
  );

  return normalizeCourseJob(result.rows[0]);
}

export async function listMiniCourseJobs(createdByUserId) {
  await ensureMiniCoursesSchema();
  const result = await query(
    `
      select *
      from mini_course_jobs
      where created_by_user_id = $1
      order by
        case status
          when 'running' then 0
          when 'queued' then 1
          when 'failed' then 2
          else 3
        end,
        updated_at desc,
        created_at desc
    `,
    [createdByUserId]
  );

  return result.rows.map((row) => normalizeCourseJob(row));
}

export async function resetRunningMiniCourseJobs() {
  await ensureMiniCoursesSchema();
  await query(
    `
      update mini_course_jobs
      set
        status = 'queued',
        feedback = case
          when feedback = '' then 'Retomando a geracao apos reinicio do servidor.'
          else feedback
        end,
        updated_at = now()
      where status = 'running'
    `
  );
}

export async function claimNextMiniCourseJob() {
  await ensureMiniCoursesSchema();
  const result = await query(
    `
      update mini_course_jobs
      set
        status = 'running',
        started_at = coalesce(started_at, now()),
        feedback = 'Iniciando geracao do curso...',
        error_message = '',
        updated_at = now()
      where id = (
        select id
        from mini_course_jobs
        where status = 'queued'
        order by created_at asc
        limit 1
      )
      returning *
    `
  );

  return result.rows[0] ? normalizeCourseJob(result.rows[0]) : null;
}

export async function updateMiniCourseJobProgress(jobId, { generatedPageCount, feedback = "" } = {}) {
  await ensureMiniCoursesSchema();
  const result = await query(
    `
      update mini_course_jobs
      set
        generated_page_count = greatest(0, $2::smallint),
        feedback = $3,
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      jobId,
      Math.max(0, Number(generatedPageCount || 0) || 0),
      String(feedback || "").trim()
    ]
  );

  return result.rows[0] ? normalizeCourseJob(result.rows[0]) : null;
}

export async function completeMiniCourseJob(jobId, { generatedPageCount, courseId = null, feedback = "" } = {}) {
  await ensureMiniCoursesSchema();
  const result = await query(
    `
      update mini_course_jobs
      set
        status = 'completed',
        generated_page_count = greatest(0, $2::smallint),
        course_id = $3,
        feedback = $4,
        error_message = '',
        finished_at = now(),
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      jobId,
      Math.max(0, Number(generatedPageCount || 0) || 0),
      courseId,
      String(feedback || "").trim()
    ]
  );

  return result.rows[0] ? normalizeCourseJob(result.rows[0]) : null;
}

export async function failMiniCourseJob(jobId, { generatedPageCount = 0, feedback = "", errorMessage = "" } = {}) {
  await ensureMiniCoursesSchema();
  const result = await query(
    `
      update mini_course_jobs
      set
        status = 'failed',
        generated_page_count = greatest(0, $2::smallint),
        feedback = $3,
        error_message = $4,
        finished_at = now(),
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      jobId,
      Math.max(0, Number(generatedPageCount || 0) || 0),
      String(feedback || "").trim(),
      String(errorMessage || "").trim()
    ]
  );

  return result.rows[0] ? normalizeCourseJob(result.rows[0]) : null;
}

export async function deleteMiniCourse(courseId) {
  await ensureMiniCoursesSchema();
  const result = await query(
    `
      delete from mini_courses
      where id = $1
      returning id
    `,
    [courseId]
  );
  return Boolean(result.rowCount);
}

export async function startMiniCourse(userId, courseId) {
  await ensureMiniCoursesSchema();
  const course = await getMiniCourseById(courseId, userId);
  if (!course) {
    return null;
  }

  const totalPages = Math.max(1, Number(course.pageCount || 1) || 1);
  const result = await query(
    `
      insert into mini_course_progress (user_id, course_id, current_page, pages_read, started_at, updated_at)
      values ($1, $2, 1, 1, now(), now())
      on conflict (user_id, course_id)
      do update set
        current_page = greatest(mini_course_progress.current_page, 1),
        pages_read = greatest(mini_course_progress.pages_read, 1),
        updated_at = now()
      returning user_id, course_id, current_page, pages_read, started_at, completed_at, updated_at
    `,
    [userId, courseId]
  );

  return {
    ...course,
    progress: normalizeProgress(result.rows[0], totalPages)
  };
}

export async function updateMiniCourseProgress(userId, courseId, nextPage) {
  await ensureMiniCoursesSchema();
  const course = await getMiniCourseById(courseId, userId);
  if (!course) {
    return null;
  }

  const totalPages = Math.max(1, Number(course.pageCount || 1) || 1);
  const safePage = Math.max(1, Math.min(totalPages, Number(nextPage || 1) || 1));
  const result = await query(
    `
      insert into mini_course_progress (user_id, course_id, current_page, pages_read, started_at, updated_at, completed_at)
      values ($1, $2, $3::smallint, $3::smallint, now(), now(), case when $3::smallint >= $4::smallint then now() else null end)
      on conflict (user_id, course_id)
      do update set
        current_page = $3::smallint,
        pages_read = greatest(mini_course_progress.pages_read, $3::smallint),
        completed_at = case
          when greatest(mini_course_progress.pages_read, $3::smallint) >= $4::smallint then coalesce(mini_course_progress.completed_at, now())
          else mini_course_progress.completed_at
        end,
        updated_at = now()
      returning user_id, course_id, current_page, pages_read, started_at, completed_at, updated_at
    `,
    [userId, courseId, safePage, totalPages]
  );

  return {
    ...course,
    progress: normalizeProgress(result.rows[0], totalPages)
  };
}

export async function getMiniCourseUserSummary(userId) {
  await ensureMiniCoursesSchema();
  const result = await query(
    `
      select
        count(*) filter (where completed_at is not null)::int as completed_courses,
        count(*)::int as started_courses
      from mini_course_progress
      where user_id = $1
    `,
    [userId]
  );

  return {
    completedCourses: Number(result.rows[0]?.completed_courses || 0) || 0,
    startedCourses: Number(result.rows[0]?.started_courses || 0) || 0
  };
}
