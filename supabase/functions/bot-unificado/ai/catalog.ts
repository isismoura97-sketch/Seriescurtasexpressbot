export type CatalogAuditTool =
  | "list_series_without_seo"
  | "list_series_without_banner"
  | "list_series_without_trailer"
  | "list_series_without_category"
  | "list_series_with_invalid_price"
  | "list_publication_readiness_issues";

export type CatalogAuditIssue = {
  entity_id: string;
  entity_type: "series";
  title: string;
  severity: "low" | "medium" | "high";
  message: string;
  admin_path: string;
};

export type CatalogAuditResult = {
  tool: CatalogAuditTool;
  inspected_count: number;
  issue_count: number;
  summary: string;
  issues: CatalogAuditIssue[];
  source: "catalog_service";
};

const TOOL_ALIASES: Array<[CatalogAuditTool, string[]]> = [
  ["list_series_without_seo", ["seo", "meta", "buscador", "google"]],
  ["list_series_without_banner", ["banner", "banners", "backdrop", "faixa"]],
  ["list_series_without_trailer", ["trailer", "teaser", "previa"]],
  ["list_series_without_category", ["categoria", "categorias", "genero", "gênero"]],
  ["list_series_with_invalid_price", ["preco", "preço", "valor", "paga"]],
  ["list_publication_readiness_issues", ["publicar", "publicacao", "publicação", "pronta", "prontas"]],
];

function text(value: unknown, max = 240) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function list(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item, 80)).filter(Boolean);
  return text(value, 300).split(/[,/;|]/).map((item) => item.trim()).filter(Boolean);
}

function truthy(value: unknown) {
  return value === true || value === 1 || ["true", "1", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

function hasAny(row: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => Boolean(text(row[key])));
}

function issue(row: Record<string, unknown>, severity: CatalogAuditIssue["severity"], message: string): CatalogAuditIssue {
  const id = text(row.id || row.series_id, 100);
  return {
    entity_id: id,
    entity_type: "series",
    title: text(row.title || "Série", 160),
    severity,
    message: text(message, 240),
    admin_path: `/admin?series_id=${encodeURIComponent(id)}`,
  };
}

export function normalizeCatalogAuditTool(value: unknown): CatalogAuditTool | null {
  const query = text(value, 300).toLowerCase();
  if (["list_series_without_seo", "list_series_without_banner", "list_series_without_trailer", "list_series_without_category", "list_series_with_invalid_price", "list_publication_readiness_issues"].includes(query)) {
    return query as CatalogAuditTool;
  }
  for (const [tool, aliases] of TOOL_ALIASES) {
    if (aliases.some((alias) => query.includes(alias))) return tool;
  }
  return null;
}

function isPublished(row: Record<string, unknown>) {
  return String(row.status ?? "published").toLowerCase() === "published" && row.is_active !== false;
}

function auditRow(row: Record<string, unknown>, tool: CatalogAuditTool) {
  const title = text(row.title);
  const paid = !truthy(row.is_free) && Number(row.price ?? 0) > 0;
  const categories = [...list(row.categories), ...list(row.category), ...list(row.genre)];
  const hasPlayback = truthy(row.has_playback) || hasAny(row, ["video_url", "video_storage_path", "video_file_id", "telegram_file_id", "episode_file_id"]) || Number(row.playable_episode_count ?? 0) > 0;
  const hasCover = truthy(row.has_cover) || hasAny(row, ["cover_url", "cover_storage_path", "cover_file_id"]);
  const hasTrailer = truthy(row.has_trailer) || hasAny(row, ["trailer_url", "trailer_storage_path", "trailer_file_id"]);
  const hasSeo = hasAny(row, ["seo_title", "seo_description", "canonical_url", "og_title", "og_description"]);
  const issues: CatalogAuditIssue[] = [];

  if (tool === "list_series_without_seo" && isPublished(row) && !hasSeo) issues.push(issue(row, "medium", "A série publicada não possui campos de SEO personalizados."));
  if (tool === "list_series_without_banner" && isPublished(row) && !hasAny(row, ["banner_url", "banner_storage_path", "backdrop_url", "backdrop_storage_path"])) issues.push(issue(row, "low", "A série publicada não possui banner ou backdrop cadastrado."));
  if (tool === "list_series_without_trailer" && isPublished(row) && !hasTrailer) issues.push(issue(row, "low", "A série publicada não possui trailer ou prévia."));
  if (tool === "list_series_without_category" && isPublished(row) && categories.length === 0) issues.push(issue(row, "medium", "A série publicada não possui categoria ou gênero."));
  if (tool === "list_series_with_invalid_price" && !truthy(row.is_free) && (!Number.isFinite(Number(row.price ?? 0)) || Number(row.price ?? 0) <= 0)) issues.push(issue(row, "high", "A série paga não possui preço maior que zero."));
  if (tool === "list_publication_readiness_issues") {
    if (!title) issues.push(issue(row, "high", "Título ausente."));
    if (isPublished(row) && !text(row.description || row.short_description)) issues.push(issue(row, "high", "Descrição ausente para publicação."));
    if (isPublished(row) && !hasCover) issues.push(issue(row, "high", "Capa ausente para publicação."));
    if (isPublished(row) && !hasPlayback) issues.push(issue(row, "high", "Conteúdo de reprodução ausente para publicação."));
    if (isPublished(row) && !truthy(row.is_free) && !paid) issues.push(issue(row, "high", "Preço inválido para série paga."));
  }
  return issues;
}

export function auditCatalog(
  rows: Record<string, unknown>[],
  tool: CatalogAuditTool,
): CatalogAuditResult {
  const issues = rows.flatMap((row) => auditRow(row, tool)).slice(0, 200);
  const label = tool.replace(/^list_series_/, "").replace(/_/g, " ");
  return {
    tool,
    inspected_count: rows.length,
    issue_count: issues.length,
    summary: issues.length
      ? `Encontrei ${issues.length} item(ns) na auditoria de ${label}.`
      : `Nenhum problema foi encontrado na auditoria de ${label}.`,
    issues,
    source: "catalog_service",
  };
}
