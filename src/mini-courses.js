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
  if (kind === "course-map") {
    return "course-map";
  }
  if (kind === "chapter_open") {
    return "chapter_open";
  }
  if (kind === "didactic") {
    return "didactic";
  }
  if (kind === "closing") {
    return "closing";
  }
  return "text";
}

function normalizeCourseStyle(value) {
  return String(value || "").trim().toLowerCase() === "story" ? "story" : "course";
}

function countCourseContentPages(pages = []) {
  return (Array.isArray(pages) ? pages : []).filter((page) => !["course-map", "chapter_open"].includes(String(page?.kind || "").trim().toLowerCase())).length;
}

function normalizeQuizQuestions(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index) => {
      const options = Array.isArray(item?.options)
        ? item.options.map((option) => String(option || "").trim()).filter(Boolean).slice(0, 4)
        : [];
      const correctIndex = Math.max(0, Math.min(options.length - 1, Number(item?.correctIndex || 0) || 0));

      if (options.length !== 4) {
        return null;
      }

      return {
        id: String(item?.id || `q${index + 1}`).trim() || `q${index + 1}`,
        question: String(item?.question || "").trim(),
        options,
        correctIndex,
        explanation: String(item?.explanation || "").trim()
      };
    })
    .filter((item) => item && item.question && item.options.length === 4)
    .slice(0, 10);
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
      subtitle: String(item?.subtitle || "").trim(),
      logline: String(item?.logline || "").trim(),
      chapterNumber: Math.max(0, Number(item?.chapterNumber || 0) || 0),
      paragraphs: normalizeParagraphs(item?.paragraphs),
      bullets: normalizeBullets(item?.bullets),
      tableRows: normalizeTableRows(item?.tableRows),
      imageUrl: String(item?.imageUrl || "").trim(),
      imagePrompt: String(item?.imagePrompt || "").trim(),
      audioUrl: String(item?.audioUrl || "").trim(),
      audioScript: String(item?.audioScript || "").trim()
    }))
    .filter((item) => item.title || item.subtitle || item.logline || item.paragraphs.length || item.bullets.length || item.tableRows.length);
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
  const quizQuestions = normalizeQuizQuestions(row.quiz_questions || []);
  const pageCount = Math.max(1, Number(row.page_count || pages.length || 1) || pages.length || 1);
  const contentPageCount = Math.max(1, Number(row.content_page_count || countCourseContentPages(pages) || 1) || countCourseContentPages(pages) || 1);
  const chapterCount = Math.max(1, Number(row.chapter_count || 1) || 1);

  return {
    id: row.id,
    title: row.title || "Curso MINI",
    context: row.context || "",
    pageCount,
    contentPageCount,
    chapterCount,
    courseStyle: normalizeCourseStyle(row.course_style || "course"),
    durationMinutes: Math.max(1, Number(row.duration_minutes || contentPageCount) || contentPageCount),
    coverImageUrl: row.cover_image_url || "",
    coverImagePrompt: row.cover_image_prompt || "",
    pages,
    quizQuestions,
    hasQuiz: quizQuestions.length > 0,
    createdByUserId: row.created_by_user_id || null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    progress: normalizeProgress(row, pageCount),
    quizResult: {
      bestScore: Number(row.quiz_best_score || 0) || 0,
      lastScore: Number(row.quiz_last_score || 0) || 0,
      attemptsCount: Number(row.quiz_attempts_count || 0) || 0,
      updatedAt: toIso(row.quiz_updated_at)
    }
  };
}

function normalizeCourseJob(row) {
  return {
    id: row.id,
    title: String(row.title || "Curso MINI").trim() || "Curso MINI",
    context: String(row.context || "").trim(),
    requestedModel: String(row.requested_model || "").trim() || "gpt-5.1",
    requestedPageCount: Math.max(1, Number(row.requested_page_count || 1) || 1),
    requestedChapterCount: Math.max(1, Number(row.requested_chapter_count || 1) || 1),
    requestedCourseStyle: normalizeCourseStyle(row.requested_course_style || "course"),
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
      content_page_count smallint not null default 1,
      chapter_count smallint not null default 1,
      course_style text not null default 'course',
      duration_minutes smallint not null default 1,
      pages jsonb not null default '[]'::jsonb,
      quiz_questions jsonb not null default '[]'::jsonb,
      cover_image_url text not null default '',
      cover_image_prompt text not null default '',
      created_by_user_id uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("alter table mini_courses add column if not exists quiz_questions jsonb not null default '[]'::jsonb;");
  await query("alter table mini_courses add column if not exists content_page_count smallint not null default 1;");
  await query("alter table mini_courses add column if not exists chapter_count smallint not null default 1;");
  await query("alter table mini_courses add column if not exists course_style text not null default 'course';");

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
    create table if not exists mini_course_quiz_results (
      user_id uuid not null references users(id) on delete cascade,
      course_id uuid not null references mini_courses(id) on delete cascade,
      best_score numeric(4,1) not null default 0,
      last_score numeric(4,1) not null default 0,
      best_correct_answers smallint not null default 0,
      last_correct_answers smallint not null default 0,
      total_questions smallint not null default 10,
      attempts_count integer not null default 0,
      updated_at timestamptz not null default now(),
      primary key (user_id, course_id)
    );
  `);
  await query("create index if not exists idx_mini_course_quiz_results_user_updated_at on mini_course_quiz_results(user_id, updated_at desc);");

  await query(`
    create table if not exists mini_course_jobs (
      id uuid primary key default gen_random_uuid(),
      title text not null default 'Curso MINI',
      context text not null default '',
      requested_model text not null default 'gpt-5.1',
      requested_page_count smallint not null default 8,
      requested_chapter_count smallint not null default 1,
      requested_course_style text not null default 'course',
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
  await query("alter table mini_course_jobs add column if not exists requested_chapter_count smallint not null default 1;");
  await query("alter table mini_course_jobs add column if not exists requested_course_style text not null default 'course';");
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
          c.content_page_count,
          c.chapter_count,
          c.course_style,
          c.duration_minutes,
          c.pages,
          c.quiz_questions,
          c.cover_image_url,
          c.cover_image_prompt,
          c.created_by_user_id,
          c.created_at,
          c.updated_at,
          p.current_page,
          p.pages_read,
          p.started_at,
          p.completed_at,
          p.updated_at as progress_updated_at,
          q.best_score as quiz_best_score,
          q.last_score as quiz_last_score,
          q.attempts_count as quiz_attempts_count,
          q.updated_at as quiz_updated_at
        from mini_courses c
        left join mini_course_progress p
          on p.course_id = c.id
         and p.user_id = $1
        left join mini_course_quiz_results q
          on q.course_id = c.id
         and q.user_id = $1
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
          c.content_page_count,
          c.chapter_count,
          c.course_style,
          c.duration_minutes,
          c.pages,
          c.quiz_questions,
          c.cover_image_url,
          c.cover_image_prompt,
          c.created_by_user_id,
          c.created_at,
          c.updated_at,
          null::smallint as current_page,
          null::smallint as pages_read,
          null::timestamptz as started_at,
          null::timestamptz as completed_at,
          null::timestamptz as progress_updated_at,
          null::numeric as quiz_best_score,
          null::numeric as quiz_last_score,
          null::integer as quiz_attempts_count,
          null::timestamptz as quiz_updated_at
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
          c.content_page_count,
          c.chapter_count,
          c.course_style,
          c.duration_minutes,
          c.pages,
          c.quiz_questions,
          c.cover_image_url,
          c.cover_image_prompt,
          c.created_by_user_id,
          c.created_at,
          c.updated_at,
          p.current_page,
          p.pages_read,
          p.started_at,
          p.completed_at,
          p.updated_at as progress_updated_at,
          q.best_score as quiz_best_score,
          q.last_score as quiz_last_score,
          q.attempts_count as quiz_attempts_count,
          q.updated_at as quiz_updated_at
        from mini_courses c
        left join mini_course_progress p
          on p.course_id = c.id
         and p.user_id = $2
        left join mini_course_quiz_results q
          on q.course_id = c.id
         and q.user_id = $2
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
          c.content_page_count,
          c.chapter_count,
          c.course_style,
          c.duration_minutes,
          c.pages,
          c.quiz_questions,
          c.cover_image_url,
          c.cover_image_prompt,
          c.created_by_user_id,
          c.created_at,
          c.updated_at,
          null::smallint as current_page,
          null::smallint as pages_read,
          null::timestamptz as started_at,
          null::timestamptz as completed_at,
          null::timestamptz as progress_updated_at,
          null::numeric as quiz_best_score,
          null::numeric as quiz_last_score,
          null::integer as quiz_attempts_count,
          null::timestamptz as quiz_updated_at
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

export async function createMiniCourse({ title, context, pages, quizQuestions = [], coverImageUrl = "", coverImagePrompt = "", createdByUserId = null, chapterCount = 1, courseStyle = "course", contentPageCount = null } = {}) {
  await ensureMiniCoursesSchema();
  const safeTitle = String(title || "Curso MINI").trim() || "Curso MINI";
  const safeContext = String(context || "").trim();
  const normalizedPages = normalizeCoursePages(pages || []);
  const normalizedQuizQuestions = normalizeQuizQuestions(quizQuestions || []);
  const pageCount = Math.max(1, normalizedPages.length || 1);
  const safeContentPageCount = Math.max(1, Number(contentPageCount || countCourseContentPages(normalizedPages) || 1) || countCourseContentPages(normalizedPages) || 1);
  const safeChapterCount = Math.max(1, Number(chapterCount || 1) || 1);
  const safeCourseStyle = normalizeCourseStyle(courseStyle);
  const durationMinutes = safeContentPageCount;
  const result = await query(
    `
      insert into mini_courses (
        title,
        context,
        page_count,
        content_page_count,
        chapter_count,
        course_style,
        duration_minutes,
        pages,
        quiz_questions,
        cover_image_url,
        cover_image_prompt,
        created_by_user_id,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, now(), now())
      returning *
    `,
    [
      safeTitle.slice(0, 180),
      safeContext.slice(0, 2000),
      pageCount,
      safeContentPageCount,
      safeChapterCount,
      safeCourseStyle,
      durationMinutes,
      JSON.stringify(normalizedPages),
      JSON.stringify(normalizedQuizQuestions),
      String(coverImageUrl || "").trim(),
      String(coverImagePrompt || "").trim().slice(0, 1000),
      createdByUserId
    ]
  );

  return normalizeCourse(result.rows[0]);
}

export async function updateMiniCourseQuiz(courseId, quizQuestions = []) {
  await ensureMiniCoursesSchema();
  const normalizedQuizQuestions = normalizeQuizQuestions(quizQuestions || []);
  const result = await query(
    `
      update mini_courses
      set
        quiz_questions = $2::jsonb,
        updated_at = now()
      where id = $1
      returning *
    `,
    [courseId, JSON.stringify(normalizedQuizQuestions)]
  );
  return result.rows[0] ? normalizeCourse(result.rows[0]) : null;
}

export async function updateMiniCourseCover(courseId, coverImageUrl = "") {
  await ensureMiniCoursesSchema();
  const result = await query(
    `
      update mini_courses
      set
        cover_image_url = $2,
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      courseId,
      String(coverImageUrl || "").trim().slice(0, 2000)
    ]
  );
  return result.rows[0] ? normalizeCourse(result.rows[0]) : null;
}

export async function createMiniCourseJob({ title, context, requestedModel = "gpt-5.1", requestedPageCount = 8, requestedChapterCount = 1, requestedCourseStyle = "course", createdByUserId } = {}) {
  await ensureMiniCoursesSchema();
  const safeTitle = String(title || "Curso MINI").trim() || "Curso MINI";
  const safeContext = String(context || "").trim();
  const safeModel = String(requestedModel || "gpt-5.1").trim() || "gpt-5.1";
  const pageCount = Math.max(4, Math.min(300, Number(requestedPageCount || 8) || 8));
  const chapterCount = Math.max(1, Math.min(pageCount, Number(requestedChapterCount || 1) || 1));
  const courseStyle = normalizeCourseStyle(requestedCourseStyle);
  const result = await query(
    `
      insert into mini_course_jobs (
        title,
        context,
        requested_model,
        requested_page_count,
        requested_chapter_count,
        requested_course_style,
        generated_page_count,
        status,
        feedback,
        error_message,
        created_by_user_id,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, 0, 'queued', 'Na fila para gerar o curso.', '', $7, now(), now())
      returning *
    `,
    [
      safeTitle.slice(0, 180),
      safeContext.slice(0, 2000),
      safeModel.slice(0, 120),
      pageCount,
      chapterCount,
      courseStyle,
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

export async function saveMiniCourseQuizResult(userId, courseId, { correctAnswers = 0, totalQuestions = 10 } = {}) {
  await ensureMiniCoursesSchema();
  const total = Math.max(1, Math.min(10, Number(totalQuestions || 10) || 10));
  const correct = Math.max(0, Math.min(total, Number(correctAnswers || 0) || 0));
  const score = Number(((correct / total) * 10).toFixed(1));
  const result = await query(
    `
      insert into mini_course_quiz_results (
        user_id,
        course_id,
        best_score,
        last_score,
        best_correct_answers,
        last_correct_answers,
        total_questions,
        attempts_count,
        updated_at
      )
      values ($1, $2, $3, $3, $4, $4, $5, 1, now())
      on conflict (user_id, course_id)
      do update set
        best_score = greatest(mini_course_quiz_results.best_score, $3),
        last_score = $3,
        best_correct_answers = greatest(mini_course_quiz_results.best_correct_answers, $4),
        last_correct_answers = $4,
        total_questions = $5,
        attempts_count = mini_course_quiz_results.attempts_count + 1,
        updated_at = now()
      returning *
    `,
    [userId, courseId, score, correct, total]
  );

  return {
    score: Number(result.rows[0]?.last_score || score) || score,
    bestScore: Number(result.rows[0]?.best_score || score) || score,
    correctAnswers: correct,
    totalQuestions: total,
    attemptsCount: Number(result.rows[0]?.attempts_count || 1) || 1,
    updatedAt: toIso(result.rows[0]?.updated_at)
  };
}

export async function startMiniCourse(userId, courseId) {
  await ensureMiniCoursesSchema();
  return getMiniCourseById(courseId, userId);
}

export async function updateMiniCourseProgress(userId, courseId, nextPage) {
  await ensureMiniCoursesSchema();
  const course = await getMiniCourseById(courseId, userId);
  if (!course) {
    return null;
  }

  const totalPages = Math.max(1, Number(course.pageCount || 1) || 1);
  const safePage = Math.max(1, Math.min(totalPages, Number(nextPage || 1) || 1));
  const hasStoredProgress = Boolean(course.progress?.startedAt) || Math.max(0, Number(course.progress?.pagesRead || 0) || 0) >= 2;

  if (!hasStoredProgress && safePage < 2) {
    return {
      ...course,
      progress: {
        ...course.progress,
        currentPage: 1,
        pagesRead: 0,
        totalPages,
        completed: false
      }
    };
  }

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
