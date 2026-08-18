import { query } from "./db.js";

let schemaPromise = null;

function normalizeBookRow(row = {}, { includePages = false } = {}) {
  const book = {
    id: String(row.id || ""),
    title: String(row.title || ""),
    literaryStyle: String(row.literary_style || ""),
    coverStyle: String(row.cover_style || ""),
    contextPrompt: String(row.context_prompt || ""),
    synopsis: String(row.synopsis || ""),
    coverImageUrl: String(row.cover_image_url || ""),
    pageCount: Number(row.page_count || 0),
    generatedPageCount: Number(row.generated_page_count || 0),
    status: String(row.status || "queued"),
    feedback: String(row.feedback || ""),
    errorMessage: String(row.error_message || ""),
    model: String(row.model_id || ""),
    imageModel: String(row.image_model_id || ""),
    authorUserId: String(row.author_user_id || ""),
    authorName: String(row.author_name || "Autor iLife"),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null
  };
  if (includePages) {
    book.pages = Array.isArray(row.pages)
      ? row.pages.map((page) => ({
          pageNumber: Number(page?.pageNumber || page?.page_number || 0),
          title: String(page?.title || ""),
          content: String(page?.content || "")
        }))
      : [];
  }
  return book;
}

export async function ensureProject200BooksSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query(`create extension if not exists pgcrypto;`);
      await query(`
        create table if not exists project200_books (
          id uuid primary key default gen_random_uuid(),
          author_user_id uuid not null references users(id) on delete cascade,
          title text not null,
          literary_style text not null default 'Romance',
          cover_style text not null default 'Editorial cinematografica',
          context_prompt text not null default '',
          synopsis text not null default '',
          outline jsonb not null default '{}'::jsonb,
          cover_image_url text not null default '',
          page_count smallint not null default 12,
          generated_page_count smallint not null default 0,
          status text not null default 'queued',
          feedback text not null default 'Na fila para ser escrito por Luna.',
          error_message text not null default '',
          model_id text not null default 'gpt-5.6-luna',
          image_model_id text not null default 'gpt-image-1-mini',
          started_at timestamptz,
          published_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint project200_books_page_count_check check (page_count between 1 and 200)
        );
      `);
      await query(`
        create table if not exists project200_book_pages (
          book_id uuid not null references project200_books(id) on delete cascade,
          page_number smallint not null,
          title text not null default '',
          content text not null,
          character_count integer not null default 0,
          created_at timestamptz not null default now(),
          primary key (book_id, page_number),
          constraint project200_book_pages_number_check check (page_number between 1 and 200)
        );
      `);
      await query(`create index if not exists idx_project200_books_public on project200_books(status, published_at desc, created_at desc);`);
      await query(`create index if not exists idx_project200_books_author on project200_books(author_user_id, created_at desc);`);
      await query(`create index if not exists idx_project200_book_pages_book on project200_book_pages(book_id, page_number);`);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function createProject200Book(userId, payload = {}) {
  await ensureProject200BooksSchema();
  const title = String(payload.title || "").replace(/\s+/gu, " ").trim().slice(0, 140);
  const literaryStyle = String(payload.literaryStyle || "Romance").replace(/\s+/gu, " ").trim().slice(0, 80) || "Romance";
  const coverStyle = String(payload.coverStyle || "Editorial cinematografica").replace(/\s+/gu, " ").trim().slice(0, 120) || "Editorial cinematografica";
  const contextPrompt = String(payload.contextPrompt || "").trim().slice(0, 12000);
  const pageCount = Math.max(1, Math.min(200, Number(payload.pageCount || 12) || 12));
  if (title.length < 2) throw new Error("Dê um título para o livro.");
  if (contextPrompt.length < 20) throw new Error("Conte um pouco mais sobre o livro no contexto criativo.");
  const result = await query(
    `insert into project200_books (author_user_id, title, literary_style, cover_style, context_prompt, page_count)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [userId, title, literaryStyle, coverStyle, contextPrompt, pageCount]
  );
  return normalizeBookRow(result.rows[0]);
}

export async function listProject200Books(userId) {
  await ensureProject200BooksSchema();
  const result = await query(
    `select b.*, coalesce(nullif(trim(u.name), ''), nullif(trim(u.username), ''), 'Autor iLife') as author_name
       from project200_books b
       join users u on u.id = b.author_user_id
      where b.status = 'ready' or b.author_user_id = $1
      order by case when b.status = 'ready' then 0 else 1 end, b.published_at desc nulls last, b.created_at desc`,
    [userId]
  );
  return result.rows.map((row) => normalizeBookRow(row));
}

export async function getProject200Book(userId, bookId) {
  await ensureProject200BooksSchema();
  const result = await query(
    `select b.*, coalesce(nullif(trim(u.name), ''), nullif(trim(u.username), ''), 'Autor iLife') as author_name,
            coalesce((
              select jsonb_agg(jsonb_build_object('pageNumber', p.page_number, 'title', p.title, 'content', p.content) order by p.page_number)
                from project200_book_pages p where p.book_id = b.id
            ), '[]'::jsonb) as pages
       from project200_books b
       join users u on u.id = b.author_user_id
      where b.id = $2 and (b.status = 'ready' or b.author_user_id = $1)
      limit 1`,
    [userId, bookId]
  );
  return result.rows[0] ? normalizeBookRow(result.rows[0], { includePages: true }) : null;
}

export async function resetGeneratingProject200Books() {
  await ensureProject200BooksSchema();
  await query(`update project200_books set status = 'queued', feedback = 'Retomando a escrita com Luna.', updated_at = now() where status = 'generating'`);
}

export async function claimNextProject200Book() {
  await ensureProject200BooksSchema();
  const result = await query(`
    with next_book as (
      select id from project200_books where status = 'queued' order by created_at asc limit 1 for update skip locked
    )
    update project200_books b
       set status = 'generating', feedback = 'Luna está planejando o livro.', error_message = '', started_at = coalesce(started_at, now()), updated_at = now()
      from next_book
     where b.id = next_book.id
    returning b.*
  `);
  return result.rows[0] ? normalizeBookRow(result.rows[0]) : null;
}

export async function updateProject200BookGeneration(bookId, payload = {}) {
  await ensureProject200BooksSchema();
  const generatedPageCount = Math.max(0, Math.min(200, Number(payload.generatedPageCount || 0) || 0));
  const feedback = String(payload.feedback || "Luna está escrevendo.").trim().slice(0, 500);
  const synopsis = String(payload.synopsis || "").trim();
  const outline = payload.outline && typeof payload.outline === "object" ? payload.outline : null;
  const coverImageUrl = String(payload.coverImageUrl || "").trim();
  await query(
    `update project200_books
        set generated_page_count = greatest(generated_page_count, $2), feedback = $3,
            synopsis = case when $4 <> '' then $4 else synopsis end,
            outline = case when $5::jsonb is not null then $5::jsonb else outline end,
            cover_image_url = case when $6 <> '' then $6 else cover_image_url end,
            updated_at = now()
      where id = $1`,
    [bookId, generatedPageCount, feedback, synopsis, outline ? JSON.stringify(outline) : null, coverImageUrl]
  );
}

export async function replaceProject200BookPages(bookId, pages = []) {
  await ensureProject200BooksSchema();
  await query(`delete from project200_book_pages where book_id = $1`, [bookId]);
  for (const page of pages) {
    await query(
      `insert into project200_book_pages (book_id, page_number, title, content, character_count)
       values ($1, $2, $3, $4, $5)`,
      [bookId, page.pageNumber, String(page.title || "").slice(0, 160), page.content, Array.from(String(page.content || "")).length]
    );
  }
}

export async function completeProject200Book(bookId, pages = []) {
  await replaceProject200BookPages(bookId, pages);
  const result = await query(
    `update project200_books
        set status = 'ready', generated_page_count = page_count, feedback = 'Publicado na biblioteca geral.',
            error_message = '', published_at = now(), updated_at = now()
      where id = $1 returning *`,
    [bookId]
  );
  return normalizeBookRow(result.rows[0]);
}

export async function failProject200Book(bookId, errorMessage) {
  await ensureProject200BooksSchema();
  await query(
    `update project200_books set status = 'failed', feedback = 'A escrita foi interrompida.', error_message = $2, updated_at = now() where id = $1`,
    [bookId, String(errorMessage || "Falha desconhecida.").trim().slice(0, 2000)]
  );
}
