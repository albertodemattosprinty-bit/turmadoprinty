import { hasDatabase, query } from "./db.js";

export const DEFAULT_ALBUM_PRICE_CENTS = 4990;
export const DEFAULT_PLAN_PRICES = {
  gratis: 0,
  plus: 990,
  pro: 1990,
  life: 2990
};

export const DEFAULT_BANNERS = {
  home: {
    desktop: "/homesite.png",
    mobile: "/homesite.png"
  },
  produtos: {
    desktop: "/cantata.png",
    mobile: "/cantata.png"
  },
  eventos: {
    desktop: "/eventos.png",
    mobile: "/eventos.png"
  }
};

export const DEFAULT_TEXT_OVERRIDES = {};

export const DEFAULT_SCHEDULE = [
  { monthLabel: "Setembro", dateLabel: "06/09", place: "Igreja Assembleia de Deus Belem", city: "Pinheiros - SP", time: "10:00" },
  { monthLabel: "Setembro", dateLabel: "13/09", place: "Assembleia de Deus Madureira", city: "Barra do Garcas", time: "18:00" },
  { monthLabel: "Setembro", dateLabel: "20/09", place: "Eleva Treinamento Professores", city: "Monte Alegre - SP", time: "09:00" },
  { monthLabel: "Setembro", dateLabel: "20/09", place: "Eleva Treinamento Professores", city: "Monte Alegre - SP", time: "09:00" },
  { monthLabel: "Setembro", dateLabel: "21/09", place: "Ministerio Ev. Cristo e a Resposta", city: "Santos - SP", time: "10:30" },
  { monthLabel: "Setembro", dateLabel: "27/09", place: "Igreja Verbo da Vida Ibirite", city: "MG", time: "09:00" },
  { monthLabel: "Setembro", dateLabel: "27/09", place: "Igreja Verbo da Vida Ibirite", city: "MG", time: "09:00" },
  { monthLabel: "Outubro", dateLabel: "04/10", place: "Igreja Metodista V. Formosa", city: "SP", time: "09:30" },
  { monthLabel: "Outubro", dateLabel: "04/10", place: "Presbiteriana Pilar do Sul", city: "SP", time: "19:30" },
  { monthLabel: "Outubro", dateLabel: "11/10", place: "Igreja Familia Global", city: "SP", time: "10:00" },
  { monthLabel: "Outubro", dateLabel: "11/10", place: "Igreja Nasci Pra Deus", city: "Guarulhos", time: "14:30" },
  { monthLabel: "Outubro", dateLabel: "12/10", place: "Comunidade Batista em Moema", city: "SP", time: "10:30" },
  { monthLabel: "Outubro", dateLabel: "12/10", place: "Igreja Avivamento Biblico", city: "SP", time: "18:00" },
  { monthLabel: "Outubro", dateLabel: "18/10", place: "Comunidade da Graca Atibaia", city: "SP", time: "17:00" },
  { monthLabel: "Outubro", dateLabel: "18/10", place: "Zona Leste tem Jeito", city: "Endereco a confirmar", time: "10:00" },
  { monthLabel: "Outubro", dateLabel: "19/10", place: "Igreja Pb. de Ermelino Matarazzo", city: "SP", time: "18:00" },
  { monthLabel: "Outubro", dateLabel: "25/10", place: "Tabernaculo Cristo Jacui", city: "SP", time: "19:00" },
  { monthLabel: "Novembro", dateLabel: "01/11", place: "Igreja Metodista Livre", city: "Rudge Ramos", time: "17:00" },
  { monthLabel: "Novembro", dateLabel: "22/11", place: "Assembleia de Deus Sorocaba", city: "SP", time: "18:00" },
  { monthLabel: "Novembro", dateLabel: "27/11", place: "Igreja Chamados", city: "Holambra", time: "10:00" }
];

let siteConfigReadyPromise = null;

function normalizeMonthLabel(value) {
  return String(value || "").trim();
}

function normalizeDateLabel(value) {
  return String(value || "").trim();
}

function normalizePlace(value) {
  return String(value || "").trim();
}

function normalizeCity(value) {
  return String(value || "").trim();
}

function normalizeTime(value) {
  return String(value || "").trim();
}

function normalizeBannerUrl(value) {
  return String(value || "").trim();
}

function normalizeBannerMap(value, fallback) {
  const source = typeof value === "object" && value ? value : {};

  return {
    desktop: normalizeBannerUrl(source.desktop || fallback.desktop),
    mobile: normalizeBannerUrl(source.mobile || fallback.mobile || source.desktop || fallback.desktop)
  };
}

function normalizeBanners(value) {
  const source = typeof value === "object" && value ? value : {};
  const entries = {};

  for (const [key, fallback] of Object.entries(DEFAULT_BANNERS)) {
    entries[key] = normalizeBannerMap(source[key], fallback);
  }

  for (const [key, banner] of Object.entries(source)) {
    if (!entries[key]) {
      entries[key] = normalizeBannerMap(banner, { desktop: "", mobile: "" });
    }
  }

  return entries;
}

function normalizeTextOverrides(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, text]) => [String(key || "").trim(), String(text || "").trim()])
      .filter(([key, text]) => key && text)
  );
}

export async function ensureSiteConfigSchema() {
  if (!hasDatabase()) {
    return;
  }

  if (!siteConfigReadyPromise) {
    siteConfigReadyPromise = (async () => {
      await query(`
        create table if not exists app_settings (
          key text primary key,
          value jsonb not null default '{}'::jsonb,
          updated_at timestamptz not null default now()
        );
      `);

      await query(`
        create table if not exists agenda_events (
          id uuid primary key default gen_random_uuid(),
          month_label text not null,
          date_label text not null,
          place text not null,
          city text not null,
          time_label text not null,
          sort_order integer not null,
          created_at timestamptz not null default now()
        );
      `);

      await query("create index if not exists idx_agenda_events_sort_order on agenda_events(sort_order);");

      await query(
        `
          insert into app_settings (key, value)
          values ('pricing', $1::jsonb)
          on conflict (key) do nothing
        `,
        [JSON.stringify({ albumPriceCents: DEFAULT_ALBUM_PRICE_CENTS, albumOverrides: {}, planPrices: DEFAULT_PLAN_PRICES })]
      );

      await query(
        `
          insert into app_settings (key, value)
          values ('site_content', $1::jsonb)
          on conflict (key) do nothing
        `,
        [JSON.stringify({ banners: DEFAULT_BANNERS, textOverrides: DEFAULT_TEXT_OVERRIDES })]
      );

      const existingAgenda = await query("select count(*)::int as total from agenda_events");

      if ((existingAgenda.rows[0]?.total || 0) === 0) {
        for (const [index, item] of DEFAULT_SCHEDULE.entries()) {
          await query(
            `
              insert into agenda_events (month_label, date_label, place, city, time_label, sort_order)
              values ($1, $2, $3, $4, $5, $6)
            `,
            [item.monthLabel, item.dateLabel, item.place, item.city, item.time, index + 1]
          );
        }
      }
    })().catch((error) => {
      siteConfigReadyPromise = null;
      throw error;
    });
  }

  return siteConfigReadyPromise;
}

export async function getSitePricingSettings() {
  if (!hasDatabase()) {
    return {
      albumPriceCents: DEFAULT_ALBUM_PRICE_CENTS,
      albumOverrides: {},
      planPrices: { ...DEFAULT_PLAN_PRICES }
    };
  }

  await ensureSiteConfigSchema();
  const result = await query("select value from app_settings where key = 'pricing' limit 1");
  const value = result.rows[0]?.value || {};

  return {
    albumPriceCents: Number(value.albumPriceCents) || DEFAULT_ALBUM_PRICE_CENTS,
    albumOverrides: typeof value.albumOverrides === "object" && value.albumOverrides ? value.albumOverrides : {},
    planPrices: {
      ...DEFAULT_PLAN_PRICES,
      ...(value.planPrices || {})
    }
  };
}

export async function saveSitePricingSettings({ albumPriceCents, albumOverrides, planPrices }) {
  await ensureSiteConfigSchema();
  const payload = {
    albumPriceCents: Number(albumPriceCents) || DEFAULT_ALBUM_PRICE_CENTS,
    albumOverrides: typeof albumOverrides === "object" && albumOverrides ? albumOverrides : {},
    planPrices: {
      ...DEFAULT_PLAN_PRICES,
      ...(planPrices || {})
    }
  };

  await query(
    `
      insert into app_settings (key, value, updated_at)
      values ('pricing', $1::jsonb, now())
      on conflict (key) do update
        set value = excluded.value,
            updated_at = now()
    `,
    [JSON.stringify(payload)]
  );

  return payload;
}

export async function getSiteContentSettings() {
  if (!hasDatabase()) {
    return {
      banners: normalizeBanners(DEFAULT_BANNERS),
      textOverrides: { ...DEFAULT_TEXT_OVERRIDES }
    };
  }

  await ensureSiteConfigSchema();
  const result = await query("select value from app_settings where key = 'site_content' limit 1");
  const value = result.rows[0]?.value || {};

  return {
    banners: normalizeBanners(value.banners),
    textOverrides: normalizeTextOverrides(value.textOverrides)
  };
}

export async function saveSiteContentSettings({ banners, textOverrides }) {
  await ensureSiteConfigSchema();
  const payload = {
    banners: normalizeBanners(banners),
    textOverrides: normalizeTextOverrides(textOverrides)
  };

  await query(
    `
      insert into app_settings (key, value, updated_at)
      values ('site_content', $1::jsonb, now())
      on conflict (key) do update
        set value = excluded.value,
            updated_at = now()
    `,
    [JSON.stringify(payload)]
  );

  return payload;
}

export async function getScheduleEntries() {
  if (!hasDatabase()) {
    return DEFAULT_SCHEDULE.map((item, index) => ({ id: `default-${index + 1}`, ...item }));
  }

  await ensureSiteConfigSchema();
  const result = await query(
    `
      select id, month_label, date_label, place, city, time_label, sort_order
      from agenda_events
      order by sort_order asc, created_at asc
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    monthLabel: row.month_label,
    dateLabel: row.date_label,
    place: row.place,
    city: row.city,
    time: row.time_label,
    sortOrder: row.sort_order
  }));
}

export async function createScheduleEntry({ monthLabel, dateLabel, place, city, time }) {
  await ensureSiteConfigSchema();
  const nextOrderResult = await query("select coalesce(max(sort_order), 0) + 1 as next_order from agenda_events");
  const nextOrder = Number(nextOrderResult.rows[0]?.next_order) || 1;

  const result = await query(
    `
      insert into agenda_events (month_label, date_label, place, city, time_label, sort_order)
      values ($1, $2, $3, $4, $5, $6)
      returning id, month_label, date_label, place, city, time_label, sort_order
    `,
    [
      normalizeMonthLabel(monthLabel),
      normalizeDateLabel(dateLabel),
      normalizePlace(place),
      normalizeCity(city),
      normalizeTime(time),
      nextOrder
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    monthLabel: row.month_label,
    dateLabel: row.date_label,
    place: row.place,
    city: row.city,
    time: row.time_label,
    sortOrder: row.sort_order
  };
}
