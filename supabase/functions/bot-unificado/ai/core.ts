import type {
  AISettings,
  EditorialFields,
  EditorialSuggestion,
  SearchFilters,
  SearchIntent,
} from "./types.ts";

const EMPTY_EDITORIAL_FIELDS: EditorialFields = {
  seo_title: "",
  seo_description: "",
  og_title: "",
  og_description: "",
  short_description: "",
  description: "",
  alternate_title: "",
  tags: [],
  categories: [],
  telegram_copy: "",
  share_copy: "",
  variations: [],
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  ai_enabled: false,
  ai_editorial_enabled: false,
  ai_search_enabled: false,
  ai_support_enabled: false,
  ai_streaming_enabled: false,
  provider: "openai",
  model: "gpt-5.6-luna",
  assistant_name: "Express IA",
  welcome_message:
    "Olá! Sou a Express IA. Posso ajudar você a encontrar uma série curta de acordo com o que deseja assistir.",
  tone: "acolhedor, objetivo e fácil de entender",
  description:
    "Assistente de inteligência artificial do Séries Curtas Express.",
  avatar_url: null,
  daily_request_limit_per_user: 10,
  daily_request_limit_per_admin: 100,
  monthly_budget_cents: null,
  max_input_characters: 8000,
  max_output_tokens: 1200,
  request_timeout_ms: 25000,
  cache_ttl_seconds: 86400,
};

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(
    /\s+/g,
    " ",
  ).trim().slice(0, maxLength);
}

function cleanList(value: unknown, maxItems: number, maxLength: number) {
  const list = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(list.map((item) => cleanText(item, maxLength)).filter(Boolean)),
  ).slice(0, maxItems);
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function boundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, Math.round(parsed)))
    : fallback;
}

export function normalizeAISettings(value: unknown): AISettings {
  const row = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  return {
    ai_enabled: cleanBoolean(row.ai_enabled, DEFAULT_AI_SETTINGS.ai_enabled),
    ai_editorial_enabled: cleanBoolean(
      row.ai_editorial_enabled,
      DEFAULT_AI_SETTINGS.ai_editorial_enabled,
    ),
    ai_search_enabled: cleanBoolean(
      row.ai_search_enabled,
      DEFAULT_AI_SETTINGS.ai_search_enabled,
    ),
    ai_support_enabled: cleanBoolean(
      row.ai_support_enabled,
      DEFAULT_AI_SETTINGS.ai_support_enabled,
    ),
    ai_streaming_enabled: cleanBoolean(
      row.ai_streaming_enabled,
      DEFAULT_AI_SETTINGS.ai_streaming_enabled,
    ),
    provider: row.provider === "openai"
      ? "openai"
      : DEFAULT_AI_SETTINGS.provider,
    model: cleanText(row.model, 100) || DEFAULT_AI_SETTINGS.model,
    assistant_name: cleanText(row.assistant_name, 60) ||
      DEFAULT_AI_SETTINGS.assistant_name,
    welcome_message: cleanText(row.welcome_message, 240) ||
      DEFAULT_AI_SETTINGS.welcome_message,
    tone: cleanText(row.tone, 120) || DEFAULT_AI_SETTINGS.tone,
    description: cleanText(row.description, 240) ||
      DEFAULT_AI_SETTINGS.description,
    avatar_url: cleanText(row.avatar_url, 500) || null,
    daily_request_limit_per_user: boundedInteger(
      row.daily_request_limit_per_user,
      DEFAULT_AI_SETTINGS.daily_request_limit_per_user,
      1,
      1000,
    ),
    daily_request_limit_per_admin: boundedInteger(
      row.daily_request_limit_per_admin,
      DEFAULT_AI_SETTINGS.daily_request_limit_per_admin,
      1,
      5000,
    ),
    monthly_budget_cents: row.monthly_budget_cents == null
      ? null
      : boundedInteger(row.monthly_budget_cents, 0, 0, 100000000),
    max_input_characters: boundedInteger(
      row.max_input_characters,
      DEFAULT_AI_SETTINGS.max_input_characters,
      500,
      50000,
    ),
    max_output_tokens: boundedInteger(
      row.max_output_tokens,
      DEFAULT_AI_SETTINGS.max_output_tokens,
      100,
      8000,
    ),
    request_timeout_ms: boundedInteger(
      row.request_timeout_ms,
      DEFAULT_AI_SETTINGS.request_timeout_ms,
      3000,
      120000,
    ),
    cache_ttl_seconds: boundedInteger(
      row.cache_ttl_seconds,
      DEFAULT_AI_SETTINGS.cache_ttl_seconds,
      60,
      2592000,
    ),
  };
}

export function sanitizeAIContext(value: unknown, maxCharacters = 8000) {
  const row = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const allowed = [
    "id",
    "title",
    "alternate_title",
    "short_description",
    "description",
    "genre",
    "genres",
    "category",
    "categories",
    "tags",
    "is_lgbtqia_content",
    "lgbtqia_editorial_description",
    "content_warnings",
    "language",
    "subtitle_language",
    "duration_minutes",
    "release_year",
    "age_rating",
    "is_free",
    "price",
    "currency",
    "status",
    "is_active",
    "is_dubbed",
    "is_subtitled",
    "style",
    "available_genres",
    "available_tags",
    "available_categories",
    "available_languages",
    "query",
  ];
  const output: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in row)) continue;
    const current = row[key];
    output[key] = Array.isArray(current)
      ? cleanList(current, 30, 100)
      : typeof current === "boolean" || typeof current === "number"
      ? current
      : cleanText(current, 3000);
  }
  const serialized = JSON.stringify(output);
  if (serialized.length <= maxCharacters) return output;
  output.description = cleanText(
    output.description,
    Math.max(0, maxCharacters - 2000),
  );
  output.short_description = cleanText(output.short_description, 500);
  return output;
}

export function validateEditorialSuggestion(
  value: unknown,
): EditorialSuggestion {
  const root = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const fields = root.fields && typeof root.fields === "object"
    ? root.fields as Record<string, unknown>
    : {};
  return {
    fields: {
      ...EMPTY_EDITORIAL_FIELDS,
      seo_title: cleanText(fields.seo_title, 70),
      seo_description: cleanText(fields.seo_description, 180),
      og_title: cleanText(fields.og_title, 95),
      og_description: cleanText(fields.og_description, 220),
      short_description: cleanText(fields.short_description, 220),
      description: cleanText(fields.description, 3000),
      alternate_title: cleanText(fields.alternate_title, 160),
      tags: cleanList(fields.tags, 8, 50),
      categories: cleanList(fields.categories, 5, 60),
      telegram_copy: cleanText(fields.telegram_copy, 900),
      share_copy: cleanText(fields.share_copy, 300),
      variations: cleanList(fields.variations, 3, 500),
    },
    notes: cleanList(root.notes, 6, 180),
  };
}

export function validateSearchIntent(
  value: unknown,
  allowed: {
    genres: string[];
    tags: string[];
    languages: string[];
    titles: string[];
  },
): SearchIntent {
  const root = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const filters = root.filters && typeof root.filters === "object"
    ? root.filters as Record<string, unknown>
    : {};
  const intersect = (items: unknown, candidates: string[], limit: number) => {
    const map = new Map(
      candidates.map((item) => [normalizeSearchText(item), item]),
    );
    return cleanList(items, limit, 100).map((item) =>
      map.get(normalizeSearchText(item))
    ).filter(Boolean) as string[];
  };
  const languageMap = new Map(
    allowed.languages.map((item) => [normalizeSearchText(item), item]),
  );
  const titleMap = new Map(
    allowed.titles.map((item) => [normalizeSearchText(item), item]),
  );
  const duration = Number(filters.maxDurationMinutes);
  const sort = ["relevance", "newest", "price_asc"].includes(String(root.sort))
    ? String(root.sort) as SearchIntent["sort"]
    : "relevance";
  return {
    intent: "discover_series",
    filters: {
      genres: intersect(filters.genres, allowed.genres, 5),
      tags: intersect(filters.tags, allowed.tags, 8),
      isFree: typeof filters.isFree === "boolean" ? filters.isFree : null,
      maxDurationMinutes: Number.isFinite(duration) && duration > 0
        ? Math.min(1440, Math.round(duration))
        : null,
      language: languageMap.get(normalizeSearchText(filters.language)) || "",
      similarToTitle:
        titleMap.get(normalizeSearchText(filters.similarToTitle)) || "",
      keywords: cleanList(filters.keywords, 10, 50),
    },
    sort,
  };
}

export function normalizeSearchText(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildFallbackSearchIntent(
  query: string,
  allowed: {
    genres: string[];
    tags: string[];
    languages: string[];
    titles: string[];
  },
): SearchIntent {
  const normalized = normalizeSearchText(query);
  const includesTerm = (term: string) =>
    normalized.includes(normalizeSearchText(term));
  const durationMatch = normalized.match(
    /(?:menos de|ate|maximo de)\s*(\d{1,4})\s*(?:min|minutos|hora|horas)/,
  );
  let maxDurationMinutes: number | null = null;
  if (durationMatch) {
    const number = Number(durationMatch[1]);
    maxDurationMinutes = normalized.slice(durationMatch.index).includes("hora")
      ? number * 60
      : number;
  }
  const similarToTitle = allowed.titles.find((title) => includesTerm(title)) ||
    "";
  const stopWords = new Set([
    "quero",
    "uma",
    "serie",
    "series",
    "curta",
    "com",
    "de",
    "do",
    "da",
    "e",
    "ou",
    "algo",
    "mostre",
    "assistir",
    "parecida",
    "parecido",
  ]);
  const keywords = normalized.split(" ").filter((term) =>
    term.length > 2 && !stopWords.has(term)
  ).slice(0, 10);
  return {
    intent: "discover_series",
    filters: {
      genres: allowed.genres.filter(includesTerm).slice(0, 5),
      tags: allowed.tags.filter(includesTerm).slice(0, 8),
      isFree: /\b(?:gratis|gratuita|gratuitas)\b/.test(normalized)
        ? true
        : /\b(?:paga|pagas|premium)\b/.test(normalized)
        ? false
        : null,
      maxDurationMinutes,
      language: allowed.languages.find(includesTerm) || "",
      similarToTitle,
      keywords,
    },
    sort: /mais nova|lancamento|recent/.test(normalized)
      ? "newest"
      : /mais barata|menor preco/.test(normalized)
      ? "price_asc"
      : "relevance",
  };
}

export function buildFallbackEditorial(
  task: string,
  data: Record<string, unknown>,
): EditorialSuggestion {
  const title = cleanText(data.title, 160) || "Esta série";
  const short = cleanText(data.short_description || data.description, 220);
  const full = cleanText(data.description || data.short_description, 3000);
  const fields = { ...EMPTY_EDITORIAL_FIELDS };
  if (task === "generate_seo") {
    fields.seo_title = cleanText(`${title} — Série Curta Completa`, 70);
    fields.seo_description = cleanText(
      `Conheça ${title}, uma série curta completa.${short ? ` ${short}` : ""}`,
      180,
    );
    fields.og_title = fields.seo_title;
    fields.og_description = fields.seo_description;
    fields.share_copy = cleanText(
      `Conheça ${title} no Séries Curtas Express.`,
      300,
    );
  } else if (task === "generate_telegram_copy") {
    fields.telegram_copy = cleanText(
      `NO AR! ✅\n\n${title}\n\n${full || short}`,
      900,
    );
  } else if (task === "generate_share_copy") {
    fields.share_copy = cleanText(
      `Conheça ${title} no Séries Curtas Express.${short ? ` ${short}` : ""}`,
      300,
    );
  } else if (task === "suggest_alternate_title") {
    fields.alternate_title = cleanText(data.alternate_title, 160);
  } else if (task === "generate_promotional_call") {
    fields.share_copy = cleanText(
      `${title}${short ? `: ${short}` : ""}`,
      300,
    );
  } else if (task === "suggest_tags") {
    fields.tags = cleanList(data.tags, 8, 50);
  } else if (task === "suggest_categories") {
    fields.categories = cleanList(
      data.categories || data.genres || data.genre || data.category,
      5,
      60,
    );
  } else if (task === "improve_short_synopsis" || task === "review_spelling") {
    fields.short_description = short;
  } else if (task === "improve_full_synopsis") {
    fields.description = full;
  } else if (task === "generate_variations") {
    fields.variations = [short || full].filter(Boolean);
  }
  return {
    fields,
    notes: ["Fallback determinístico usado; revise antes de aplicar."],
  };
}

export function filterCatalogByIntent(
  series: Record<string, unknown>[],
  intent: SearchIntent,
) {
  const similar = intent.filters.similarToTitle
    ? series.find((item) =>
      normalizeSearchText(item.title) ===
        normalizeSearchText(intent.filters.similarToTitle)
    )
    : null;
  const similarTerms = similar
    ? normalizeSearchText([
      similar.genre,
      similar.category,
      ...(Array.isArray(similar.categories) ? similar.categories : []),
      ...(Array.isArray(similar.tags) ? similar.tags : []),
    ].join(" ")).split(" ").filter(Boolean)
    : [];
  const scored = series.map((item) => {
    const haystack = normalizeSearchText([
      item.title,
      item.alternate_title,
      item.short_description,
      item.description,
      item.genre,
      item.category,
      ...(Array.isArray(item.categories) ? item.categories : []),
      ...(Array.isArray(item.tags) ? item.tags : []),
      item.language,
    ].join(" "));
    const price = Number(item.price ?? 0);
    const free = item.is_free === true || price <= 0;
    const duration = Number(item.duration_minutes ?? 0);
    if (intent.filters.isFree !== null && free !== intent.filters.isFree) {
      return null;
    }
    if (
      intent.filters.maxDurationMinutes &&
      (!(duration > 0) || duration > intent.filters.maxDurationMinutes)
    ) return null;
    if (
      intent.filters.language &&
      !haystack.includes(normalizeSearchText(intent.filters.language))
    ) return null;
    if (
      intent.filters.genres.some((term) =>
        !haystack.includes(normalizeSearchText(term))
      )
    ) return null;
    if (
      intent.filters.tags.some((term) =>
        !haystack.includes(normalizeSearchText(term))
      )
    ) return null;
    const keywordMatches = intent.filters.keywords.filter((term) =>
      haystack.includes(normalizeSearchText(term))
    ).length;
    const similarMatches = similarTerms.filter((term) =>
      haystack.includes(term)
    ).length;
    const requiredKeywordMatches =
      intent.filters.genres.length || intent.filters.tags.length ||
        intent.filters.similarToTitle
        ? 0
        : Math.min(1, intent.filters.keywords.length);
    if (keywordMatches < requiredKeywordMatches) return null;
    return { item, score: keywordMatches * 3 + similarMatches };
  }).filter(Boolean) as Array<{ item: Record<string, unknown>; score: number }>;
  scored.sort((a, b) => {
    if (intent.sort === "price_asc") {
      return Number(a.item.price ?? 0) - Number(b.item.price ?? 0);
    }
    if (intent.sort === "newest") {
      return String(b.item.published_at || b.item.created_at || "")
        .localeCompare(String(a.item.published_at || a.item.created_at || ""));
    }
    return b.score - a.score;
  });
  return scored.slice(0, 12).map(({ item }) => item);
}

export async function hashAIValue(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
