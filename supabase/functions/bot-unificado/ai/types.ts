export type AIAgentName =
  | "editorial"
  | "seo"
  | "catalog"
  | "discovery"
  | "analytics"
  | "marketing"
  | "administration"
  | "support";

export type AITask =
  | "generate_seo"
  | "improve_short_synopsis"
  | "improve_full_synopsis"
  | "suggest_tags"
  | "suggest_categories"
  | "generate_telegram_copy"
  | "generate_share_copy"
  | "suggest_alternate_title"
  | "generate_promotional_call"
  | "review_spelling"
  | "generate_variations"
  | "extract_search_filters";

export type AISettings = {
  ai_enabled: boolean;
  ai_editorial_enabled: boolean;
  ai_search_enabled: boolean;
  ai_support_enabled: boolean;
  ai_streaming_enabled: boolean;
  ai_editorial_agent_enabled: boolean;
  ai_seo_agent_enabled: boolean;
  ai_catalog_agent_enabled: boolean;
  ai_discovery_agent_enabled: boolean;
  ai_analytics_agent_enabled: boolean;
  ai_marketing_agent_enabled: boolean;
  ai_administration_agent_enabled: boolean;
  ai_support_agent_enabled: boolean;
  ai_rag_enabled: boolean;
  ai_embeddings_enabled: boolean;
  ai_admin_memory_enabled: boolean;
  provider: "openai";
  model: string;
  agent_models: Partial<Record<AIAgentName, string>>;
  agent_daily_limits: Partial<Record<AIAgentName, number>>;
  agent_monthly_budgets: Partial<Record<AIAgentName, number>>;
  assistant_name: string;
  welcome_message: string;
  tone: string;
  description: string;
  avatar_url: string | null;
  daily_request_limit_per_user: number;
  daily_request_limit_per_admin: number;
  monthly_budget_cents: number | null;
  max_input_characters: number;
  max_output_tokens: number;
  request_timeout_ms: number;
  cache_ttl_seconds: number;
};

export type AIProviderInput = {
  task: AITask;
  model: string;
  instructions: string;
  data: Record<string, unknown>;
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  timeoutMs: number;
};

export type AIProviderResult = {
  data: Record<string, unknown>;
  inputTokens: number | null;
  outputTokens: number | null;
  responseId: string | null;
};

export interface AIProvider {
  readonly name: string;
  generateStructured(input: AIProviderInput): Promise<AIProviderResult>;
}

export type EditorialFields = {
  seo_title: string;
  seo_description: string;
  og_title: string;
  og_description: string;
  short_description: string;
  description: string;
  alternate_title: string;
  tags: string[];
  categories: string[];
  telegram_copy: string;
  share_copy: string;
  variations: string[];
};

export type EditorialSuggestion = {
  fields: EditorialFields;
  notes: string[];
};

export type SearchFilters = {
  genres: string[];
  tags: string[];
  isFree: boolean | null;
  maxDurationMinutes: number | null;
  language: string;
  similarToTitle: string;
  keywords: string[];
};

export type SearchIntent = {
  intent: "discover_series";
  filters: SearchFilters;
  sort: "relevance" | "newest" | "price_asc";
};
