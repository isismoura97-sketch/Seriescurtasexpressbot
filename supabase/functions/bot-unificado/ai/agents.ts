import type { AIAgentName, AITask, AISettings } from "./types.ts";

export type AIAgentDefinition = {
  name: AIAgentName;
  version: string;
  purpose: string;
  enabledFlag: keyof AISettings;
  legacyFlag?: keyof AISettings;
  tasks: readonly AITask[];
  contextFields: readonly string[];
  readOnly: boolean;
  humanReviewRequired: boolean;
  publicEnabled: boolean;
};

const EDITORIAL_FIELDS = [
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
] as const;

const READ_ONLY_CATALOG_FIELDS = [
  "id",
  "title",
  "alternate_title",
  "short_description",
  "description",
  "category",
  "categories",
  "tags",
  "language",
  "duration_minutes",
  "is_free",
  "price",
  "status",
  "is_active",
] as const;

export const AI_AGENT_DEFINITIONS: Readonly<Record<AIAgentName, AIAgentDefinition>> = {
  editorial: {
    name: "editorial",
    version: "2026-07-18.3",
    purpose: "Rascunhos editoriais para sinopses, títulos, tags e variações.",
    enabledFlag: "ai_editorial_agent_enabled",
    legacyFlag: "ai_editorial_enabled",
    tasks: [
      "improve_short_synopsis",
      "improve_full_synopsis",
      "suggest_tags",
      "suggest_categories",
      "suggest_alternate_title",
      "review_spelling",
      "generate_variations",
    ],
    contextFields: EDITORIAL_FIELDS,
    readOnly: true,
    humanReviewRequired: true,
    publicEnabled: false,
  },
  seo: {
    name: "seo",
    version: "2026-07-18.3",
    purpose: "Sugestões de SEO e compartilhamento baseadas no cadastro real.",
    enabledFlag: "ai_seo_agent_enabled",
    legacyFlag: "ai_editorial_enabled",
    tasks: ["generate_seo", "generate_share_copy"],
    contextFields: EDITORIAL_FIELDS,
    readOnly: true,
    humanReviewRequired: true,
    publicEnabled: false,
  },
  catalog: {
    name: "catalog",
    version: "2026-07-18.3",
    purpose: "Auditoria somente leitura da consistência do catálogo.",
    enabledFlag: "ai_catalog_agent_enabled",
    tasks: [],
    contextFields: READ_ONLY_CATALOG_FIELDS,
    readOnly: true,
    humanReviewRequired: true,
    publicEnabled: false,
  },
  discovery: {
    name: "discovery",
    version: "2026-07-18.3",
    purpose: "Extração de filtros para descoberta de séries reais.",
    enabledFlag: "ai_discovery_agent_enabled",
    legacyFlag: "ai_search_enabled",
    tasks: ["extract_search_filters"],
    contextFields: [
      "query",
      "available_genres",
      "available_tags",
      "available_languages",
      "title",
      "categories",
      "is_lgbtqia_content",
    ],
    readOnly: true,
    humanReviewRequired: false,
    publicEnabled: false,
  },
  analytics: {
    name: "analytics",
    version: "2026-07-18.3",
    purpose: "Apoio a análises agregadas e somente leitura.",
    enabledFlag: "ai_analytics_agent_enabled",
    tasks: [],
    contextFields: ["period", "aggregated_metrics", "series_id"],
    readOnly: true,
    humanReviewRequired: true,
    publicEnabled: false,
  },
  marketing: {
    name: "marketing",
    version: "2026-07-18.3",
    purpose: "Rascunhos promocionais sem publicação automática.",
    enabledFlag: "ai_marketing_agent_enabled",
    legacyFlag: "ai_editorial_enabled",
    tasks: ["generate_telegram_copy", "generate_promotional_call"],
    contextFields: EDITORIAL_FIELDS,
    readOnly: true,
    humanReviewRequired: true,
    publicEnabled: false,
  },
  administration: {
    name: "administration",
    version: "2026-07-18.3",
    purpose: "Leitura segura de problemas operacionais, sem mutações.",
    enabledFlag: "ai_administration_agent_enabled",
    tasks: [],
    contextFields: READ_ONLY_CATALOG_FIELDS,
    readOnly: true,
    humanReviewRequired: true,
    publicEnabled: false,
  },
  support: {
    name: "support",
    version: "2026-07-18.3",
    purpose: "Orientação de suporte e encaminhamento humano.",
    enabledFlag: "ai_support_agent_enabled",
    legacyFlag: "ai_support_enabled",
    tasks: [],
    contextFields: ["authenticated_user_id", "current_request", "faq"],
    readOnly: true,
    humanReviewRequired: true,
    publicEnabled: false,
  },
};

const TASK_TO_AGENT = new Map<AITask, AIAgentName>(
  Object.values(AI_AGENT_DEFINITIONS).flatMap((definition) =>
    definition.tasks.map((task) => [task, definition.name] as const)
  ),
);

export function resolveAIAgentForTask(task: AITask): AIAgentName {
  return TASK_TO_AGENT.get(task) || "editorial";
}

export function getAIAgentDefinition(agent: AIAgentName): AIAgentDefinition {
  return AI_AGENT_DEFINITIONS[agent];
}

export function isAIAgentEnabled(settings: AISettings, agent: AIAgentName) {
  if (!settings.ai_enabled) return false;
  const definition = getAIAgentDefinition(agent);
  const current = settings[definition.enabledFlag];
  const legacy = definition.legacyFlag ? settings[definition.legacyFlag] : false;
  return current === true || legacy === true;
}

export function getAIAgentDailyLimit(
  settings: AISettings,
  agent: AIAgentName,
  isOwner: boolean,
) {
  const configured = settings.agent_daily_limits[agent];
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) return configured;
  return isOwner
    ? settings.daily_request_limit_per_admin
    : settings.daily_request_limit_per_user;
}

export function getAIAgentBudget(
  settings: AISettings,
  agent: AIAgentName,
) {
  const configured = settings.agent_monthly_budgets[agent];
  return typeof configured === "number" && Number.isFinite(configured) && configured >= 0
    ? configured
    : settings.monthly_budget_cents;
}

export function getAIAgentModel(settings: AISettings, agent: AIAgentName) {
  const configured = String(settings.agent_models[agent] || "").trim();
  return configured || settings.model;
}

export function listAIAgentStatuses(settings: AISettings) {
  return Object.values(AI_AGENT_DEFINITIONS).map((definition) => ({
    name: definition.name,
    version: definition.version,
    purpose: definition.purpose,
    enabled: isAIAgentEnabled(settings, definition.name),
    read_only: definition.readOnly,
    human_review_required: definition.humanReviewRequired,
    public_enabled: definition.publicEnabled,
    tasks: [...definition.tasks],
  }));
}
