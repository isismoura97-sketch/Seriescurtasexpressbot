const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const CAPTCHA_SECRET = Deno.env.get("TELEGRAM_CAPTCHA_SECRET") ?? TELEGRAM_BOT_TOKEN;
const CAPTCHA_WEBAPP_URL = Deno.env.get("CAPTCHA_WEBAPP_URL") ?? "https://seriescurtasexpressbot.vercel.app/verify.html";
const CAPTCHA_MAX_AGE_SECONDS = Number(Deno.env.get("CAPTCHA_MAX_AGE_SECONDS") ?? "600");
const WEBAPP_MAX_AGE_SECONDS = Number(Deno.env.get("WEBAPP_MAX_AGE_SECONDS") ?? "600");
const SERIES_WEBAPP_URL = Deno.env.get("SERIES_WEBAPP_URL") ?? "https://seriescurtasexpressbot.vercel.app/";
const CATALOG_URL = Deno.env.get("CATALOG_URL") ?? SERIES_WEBAPP_URL;
const PROTECTED_URL_TTL_SECONDS = Number(Deno.env.get("PROTECTED_URL_TTL_SECONDS") ?? "120") || 120;
const SUPPORT_URL = Deno.env.get("SUPPORT_URL") ?? Deno.env.get("TELEGRAM_SUPPORT_URL") ?? "https://t.me/ShortNovelsBot";
const TELEGRAM_BOT_USERNAME = (
  Deno.env.get("TELEGRAM_BOT_USERNAME") ??
  SUPPORT_URL.replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "")
).trim();
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPPORT_INBOX_EMAIL = Deno.env.get("SUPPORT_INBOX_EMAIL") ?? "isismoura97@gmail.com";
const SUPPORT_FROM_EMAIL = Deno.env.get("SUPPORT_FROM_EMAIL") ?? "Séries Curtas Express <onboarding@resend.dev>";
const APP_BUILD_VERSION = Deno.env.get("APP_BUILD_VERSION") ?? "20260712-03";
const WELCOME_LOGO_URL = Deno.env.get("WELCOME_LOGO_URL") ??
  new URL(`/assets/logo-welcome.png?v=${APP_BUILD_VERSION}`, SERIES_WEBAPP_URL).toString();
const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") ?? "";
const MERCADO_PAGO_WEBHOOK_SECRET = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET") ?? "";
const MERCADO_PAGO_PIX_KEY = Deno.env.get("MERCADO_PAGO_PIX_KEY") ?? "";
const MERCADO_PAGO_PIX_COPY = Deno.env.get("MERCADO_PAGO_PIX_COPY") ?? "";
const MERCADO_PAGO_PIX_QR_CODE_BASE64 = Deno.env.get("MERCADO_PAGO_PIX_QR_CODE_BASE64") ?? "";
const PAYMENT_ORDERS_TABLE = Deno.env.get("PAYMENT_ORDERS_TABLE") ?? "payment_orders";
const PAYMENT_ORDER_ITEMS_TABLE = Deno.env.get("PAYMENT_ORDER_ITEMS_TABLE") ?? "payment_order_items";
const ENTITLEMENTS_TABLE = Deno.env.get("ENTITLEMENTS_TABLE") ?? "entitlements";
const SHOPPING_CARTS_TABLE = Deno.env.get("SHOPPING_CARTS_TABLE") ?? "shopping_carts";
const COUPONS_TABLE = Deno.env.get("COUPONS_TABLE") ?? "coupons";
const COUPON_REDEMPTIONS_TABLE = Deno.env.get("COUPON_REDEMPTIONS_TABLE") ?? "coupon_redemptions";
const APP_EVENTS_TABLE = Deno.env.get("APP_EVENTS_TABLE") ?? "app_events";
const TELEGRAM_STARS_DEFAULT_PRICE = Math.max(1, Math.round(Number(Deno.env.get("TELEGRAM_STARS_DEFAULT_PRICE") ?? "50") || 50));
const OWNER_TELEGRAM_USER_ID = Deno.env.get("OWNER_TELEGRAM_USER_ID") ?? "";
const OWNER_AREA_PASSWORD = Deno.env.get("OWNER_AREA_PASSWORD") ?? "";
const OWNER_AREA_PASSWORD_SHA256 = Deno.env.get("OWNER_AREA_PASSWORD_SHA256") ?? "";
const SERIES_COVER_BUCKET = Deno.env.get("SERIES_COVER_BUCKET") ?? "covers";
const SERIES_TRAILER_BUCKET = Deno.env.get("SERIES_TRAILER_BUCKET") ?? "trailers";
const SERIES_VIDEO_BUCKET = Deno.env.get("SERIES_VIDEO_BUCKET") ?? "videos";
const PUBLIC_CHANNEL_USERNAME = Deno.env.get("PUBLIC_CHANNEL_USERNAME") ?? "";
const PUBLIC_CHANNEL_ID = Deno.env.get("PUBLIC_CHANNEL_ID") ?? "";
const SERIES_ANNOUNCE_CHANNEL_USERNAME = (Deno.env.get("SERIES_ANNOUNCE_CHANNEL_USERNAME") || PUBLIC_CHANNEL_USERNAME || "curtasexpress").trim();
const SERIES_ANNOUNCE_CHANNEL_ID = (Deno.env.get("SERIES_ANNOUNCE_CHANNEL_ID") || PUBLIC_CHANNEL_ID).trim();
const PUBLIC_CHANNEL_ALERT_CHAT_ID = Deno.env.get("PUBLIC_CHANNEL_ALERT_CHAT_ID") ?? "";
const PUBLIC_CHANNEL_AUTO_BAN = (Deno.env.get("PUBLIC_CHANNEL_AUTO_BAN") ?? "true").toLowerCase() !== "false";
const PUBLIC_CHANNEL_STRICTNESS = (Deno.env.get("PUBLIC_CHANNEL_STRICTNESS") ?? "conservative").toLowerCase();
const PUBLIC_CHANNEL_AUDIT_TABLE = Deno.env.get("PUBLIC_CHANNEL_AUDIT_TABLE") ?? "public_channel_member_audit";
const PUBLIC_CHANNEL_POST_AUDIT_TABLE = Deno.env.get("PUBLIC_CHANNEL_POST_AUDIT_TABLE") ?? "public_channel_post_audit";
const PUBLIC_CHANNEL_ALLOWLIST_USER_IDS = new Set(
  (Deno.env.get("PUBLIC_CHANNEL_ALLOWLIST_USER_IDS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const PUBLIC_CHANNEL_ALLOWLIST_USERNAMES = new Set(
  (Deno.env.get("PUBLIC_CHANNEL_ALLOWLIST_USERNAMES") ?? "")
    .split(",")
    .map((value) => normalizeHandle(value))
    .filter(Boolean),
);
const DEFAULT_PUBLIC_CHANNEL_DELETE_LABELS = [
  "gruposdegram",
  "lista solar",
  "telegrupos | lista de grupos",
  "magfi ads",
  "divulgacao total",
  "divulgar telegram",
  "tele auto post",
  "lista crescimento",
];
const PUBLIC_CHANNEL_POST_CLEANUP_ENABLED = (Deno.env.get("PUBLIC_CHANNEL_POST_CLEANUP_ENABLED") ?? "true").toLowerCase() !== "false";
const PUBLIC_CHANNEL_DELETE_ADMIN_USER_IDS = new Set(
  (Deno.env.get("PUBLIC_CHANNEL_DELETE_ADMIN_USER_IDS") ?? "")
    .split(",")
    .map((value) => String(value || "").trim())
    .filter(Boolean),
);
const PUBLIC_CHANNEL_DELETE_ADMIN_USERNAMES = new Set(
  (Deno.env.get("PUBLIC_CHANNEL_DELETE_ADMIN_USERNAMES") ?? "")
    .split(",")
    .map((value) => normalizeHandle(value))
    .filter(Boolean),
);
const PUBLIC_CHANNEL_DELETE_ADMIN_LABELS = new Set(
  (Deno.env.get("PUBLIC_CHANNEL_DELETE_ADMIN_LABELS") ?? DEFAULT_PUBLIC_CHANNEL_DELETE_LABELS.join(","))
    .split(",")
    .map((value) => normalizeMatchLabel(value))
    .filter(Boolean),
);
const PUBLIC_CHANNEL_DELETE_VIA_BOT_IDS = new Set(
  (Deno.env.get("PUBLIC_CHANNEL_DELETE_VIA_BOT_IDS") ?? "")
    .split(",")
    .map((value) => String(value || "").trim())
    .filter(Boolean),
);
const PUBLIC_CHANNEL_DELETE_VIA_BOT_USERNAMES = new Set(
  (Deno.env.get("PUBLIC_CHANNEL_DELETE_VIA_BOT_USERNAMES") ?? "")
    .split(",")
    .map((value) => normalizeHandle(value))
    .filter(Boolean),
);
const FUNCTION_NAME = "bot-unificado";
const SERIES_TABLE = Deno.env.get("SERIES_TABLE") ?? "series";
const SERIES_ID_COLUMN = Deno.env.get("SERIES_ID_COLUMN") ?? "id";
const SERIES_TITLE_COLUMN = Deno.env.get("SERIES_TITLE_COLUMN") ?? "title";
const EPISODES_TABLE = Deno.env.get("EPISODES_TABLE") ?? "episodes";
const EPISODE_SERIES_COLUMN = Deno.env.get("EPISODE_SERIES_COLUMN") ?? "series_id";
const EPISODE_TITLE_COLUMN = Deno.env.get("EPISODE_TITLE_COLUMN") ?? "title";
const EPISODE_NUMBER_COLUMN = Deno.env.get("EPISODE_NUMBER_COLUMN") ?? "episode_number";
const SERIES_VIDEO_URL_COLUMNS = (Deno.env.get("SERIES_VIDEO_URL_COLUMNS") ?? "video_url,stream_url,media_url,url")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SERIES_VIDEO_FILE_ID_COLUMNS = (Deno.env.get("SERIES_VIDEO_FILE_ID_COLUMNS") ?? "video_file_id,file_id,telegram_file_id")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const PRIMARY_SERIES_VIDEO_FILE_ID_COLUMN = SERIES_VIDEO_FILE_ID_COLUMNS[0] || "video_file_id";
const EPISODE_VIDEO_FILE_ID_COLUMNS = (Deno.env.get("EPISODE_VIDEO_FILE_ID_COLUMNS") ?? "file_id,video_file_id,telegram_file_id")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const USER_SERIES_PROGRESS_TABLE = Deno.env.get("USER_SERIES_PROGRESS_TABLE") ?? "user_series_progress";
const USER_SERIES_FAVORITES_TABLE = Deno.env.get("USER_SERIES_FAVORITES_TABLE") ?? "user_series_favorites";
const ANALYTICS_EVENT_NAMES = new Set([
  "app_opened",
  "catalog_loaded",
  "series_viewed",
  "series_search",
  "telegram_open",
  "free_series_opened",
  "favorite_added",
  "add_to_cart",
  "remove_from_cart",
  "checkout_started",
  "checkout_created",
  "checkout_reused",
  "payment_created",
  "payment_approved",
  "purchase_completed",
  "purchase_failed",
  "purchase_refunded",
  "purchase_chargeback",
  "telegram_pre_checkout_approved",
  "delivery_requested",
  "delivery_completed",
  "cart_abandoned",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,apikey,content-type,x-client-info,range,x-webapp-init-data,x-request-id,x-owner-password,x-owner-field-name,x-owner-file-name,x-owner-series-id",
    "access-control-allow-credentials": "true",
    "access-control-max-age": "86400",
    "vary": "Origin",
  };
}

function json(req: Request, data: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(req),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function safeFilename(name: string) {
  return (name || "video")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "video";
}

function slugifySeriesTitle(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function normalizeSeriesTags(value: unknown) {
  const entries = Array.isArray(value) ? value : String(value ?? "").split(/[,;|]/);
  return Array.from(new Set(entries.map((entry) => String(entry ?? "").trim()).filter(Boolean))).slice(0, 24);
}

function resolveSeriesAnnouncementChannelTarget() {
  if (SERIES_ANNOUNCE_CHANNEL_ID) return SERIES_ANNOUNCE_CHANNEL_ID;
  const handle = normalizeHandle(SERIES_ANNOUNCE_CHANNEL_USERNAME);
  if (!handle) return "";
  return `@${handle}`;
}

function normalizeTelegramFileIdInput(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    if (/^file_id:?$/i.test(current)) {
      return lines[i + 1] ?? "";
    }
  }

  const match = raw.match(/\b[A-Za-z0-9_-]{30,}\b/);
  return match ? match[0] : raw;
}

function buildPlaybackUrl(req: Request, fileId: string, title = "") {
  const baseUrl = SUPABASE_URL
    ? new URL(`/functions/v1/${FUNCTION_NAME}/api`, SUPABASE_URL)
    : new URL(req.url);

  const url = baseUrl;
  url.searchParams.set("action", "playback");
  url.searchParams.set("file_id", fileId);
  if (title) url.searchParams.set("title", title);
  return url.toString();
}

async function buildSignedPlaybackUrl(req: Request, fileId: string, title = "") {
  const url = new URL(buildPlaybackUrl(req, fileId, title));
  const token = await encryptChallenge(CAPTCHA_SECRET, {
    v: 1,
    file_id: fileId,
    expires_at: Math.floor(Date.now() / 1000) + PROTECTED_URL_TTL_SECONDS,
  });
  url.searchParams.set("token", token);
  return url.toString();
}

function buildSeriesLaunchUrl(seriesId: string) {
  const url = new URL(SERIES_WEBAPP_URL);
  url.searchParams.set("play", seriesId);
  return url.toString();
}

function buildTelegramCheckoutUrl(orderId: string) {
  const suffix = String(orderId ?? "").trim();
  const botUsername = TELEGRAM_BOT_USERNAME || "ShortNovelsBot";
  const url = new URL(`https://t.me/${botUsername}`);
  if (suffix) {
    url.searchParams.set("start", `checkout_${suffix}`);
  }
  return url.toString();
}

function buildBotStartUrl(payload: string) {
  const botUsername = TELEGRAM_BOT_USERNAME || "ShortNovelsBot";
  const url = new URL(`https://t.me/${botUsername}`);
  if (payload) {
    url.searchParams.set("start", payload);
  }
  return url.toString();
}

function buildSupportMailtoUrl(input: {
  email: string;
  subject: string;
  description: string;
  context?: string;
}) {
  const lines = [
    "Nova solicitação de suporte enviada pelo Mini App.",
    "",
    `E-mail do usuário: ${input.email || "não informado"}`,
    `Assunto: ${input.subject || "não informado"}`,
    `Descrição: ${input.description || "não informado"}`,
  ];

  if (input.context) {
    lines.push("", `Contexto: ${input.context}`);
  }

  const body = lines.join("\n");
  return `mailto:${encodeURIComponent(SUPPORT_INBOX_EMAIL)}?subject=${encodeURIComponent(`[Suporte Mini App] ${input.subject || "Solicitação"}`)}&body=${encodeURIComponent(body)}`;
}

async function sendSupportEmail(input: {
  email: string;
  subject: string;
  description: string;
  context?: string;
  telegramUserId: string;
  telegramUserName?: string;
  telegramName?: string;
}) {
  if (!RESEND_API_KEY) {
    return { ok: false as const, mailtoUrl: buildSupportMailtoUrl(input) };
  }

  const subject = `[Suporte Mini App] ${input.subject}`.slice(0, 140);
  const plainTextLines = [
    "Nova solicitação de suporte enviada pelo Mini App.",
    "",
    `E-mail do usuário: ${input.email}`,
    `Assunto: ${input.subject}`,
    `Descrição: ${input.description}`,
  ];

  if (input.context) {
    plainTextLines.push("", `Contexto: ${input.context}`);
  }

  plainTextLines.push("", `Telegram ID: ${input.telegramUserId}`);
  if (input.telegramName) {
    plainTextLines.push(`Nome Telegram: ${input.telegramName}`);
  }
  if (input.telegramUserName) {
    plainTextLines.push(`Username: @${input.telegramUserName.replace(/^@/, "")}`);
  }

  const htmlLines = [
    "<p>Nova solicitação de suporte enviada pelo Mini App.</p>",
    `<p><strong>E-mail do usuário:</strong> ${escapeHtml(input.email)}</p>`,
    `<p><strong>Assunto:</strong> ${escapeHtml(input.subject)}</p>`,
    `<p><strong>Descrição:</strong><br>${escapeHtml(input.description).replace(/\n/g, "<br>")}</p>`,
    input.context ? `<p><strong>Contexto:</strong> ${escapeHtml(input.context)}</p>` : "",
    `<p><strong>Telegram ID:</strong> ${escapeHtml(input.telegramUserId)}</p>`,
    input.telegramName ? `<p><strong>Nome Telegram:</strong> ${escapeHtml(input.telegramName)}</p>` : "",
    input.telegramUserName ? `<p><strong>Username:</strong> @${escapeHtml(input.telegramUserName.replace(/^@/, ""))}</p>` : "",
  ].filter(Boolean);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: SUPPORT_FROM_EMAIL,
      to: SUPPORT_INBOX_EMAIL,
      reply_to: input.email,
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0b1a2f;">${htmlLines.join("")}</div>`,
      text: plainTextLines.join("\n"),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(String(error));
  }

  return { ok: true as const, id: typeof data?.id === "string" ? data.id : "" };
}

async function sendSupportTelegramNotification(input: {
  email: string;
  subject: string;
  description: string;
  context?: string;
  telegramUserId: string;
  telegramUserName?: string;
  telegramName?: string;
}) {
  if (!OWNER_TELEGRAM_USER_ID) {
    return { ok: false as const, skipped: true };
  }

  const ticketId = `${Date.now()}`;
  const lines = [
    "🧾 <b>Novo ticket de suporte</b>",
    "",
    "<b>Status:</b> novo",
    "<b>Origem:</b> Mini App",
    `<b>Ticket:</b> <code>${escapeHtml(ticketId)}</code>`,
    "",
    `<b>E-mail:</b> ${escapeHtml(input.email)}`,
    `<b>Assunto:</b> ${escapeHtml(input.subject)}`,
    "<b>Descrição:</b>",
    escapeHtml(input.description),
  ];

  if (input.context) {
    lines.push("", `<b>Contexto:</b> ${escapeHtml(input.context)}`);
  }

  lines.push("", `<b>Telegram ID:</b> <code>${escapeHtml(input.telegramUserId)}</code>`);

  if (input.telegramName) {
    lines.push(`<b>Nome Telegram:</b> ${escapeHtml(input.telegramName)}`);
  }

  if (input.telegramUserName) {
    lines.push(`<b>Username:</b> @${escapeHtml(input.telegramUserName.replace(/^@/, ""))}`);
  }

  lines.push("", "────────────────────", "Responda este ticket pelo bot ou encaminhe para a equipe interna.");

  const text = lines.join("\n").slice(0, 3900);

  const result = await telegramRequest("sendMessage", {
    chat_id: OWNER_TELEGRAM_USER_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  return { ok: true as const, messageId: typeof result?.message_id === "number" ? result.message_id : null };
}

function buildMainBotReplyMarkup() {
  return stringifyJson({
    inline_keyboard: [
      [{ text: "Catálogo", url: CATALOG_URL }],
      [{ text: "Mini App", web_app: { url: SERIES_WEBAPP_URL } }],
      [{ text: "Suporte", url: SUPPORT_URL }],
    ],
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSeriesRowFilter(seriesId: string) {
  const idColumn = SERIES_ID_COLUMN || "id";
  return `${SERIES_TABLE}?${idColumn}=eq.${encodeURIComponent(seriesId)}`;
}

function telegramApiUrl(path: string) {
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${path}`;
}

function normalizeHandle(value: unknown) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

function normalizeMatchLabel(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function labelMatchesConfiguredSet(value: unknown, configured: Set<string>) {
  const normalized = normalizeMatchLabel(value);
  if (!normalized || !configured.size) return false;
  for (const entry of configured) {
    if (!entry) continue;
    if (normalized === entry || normalized.includes(entry) || entry.includes(normalized)) {
      return true;
    }
  }
  return false;
}

function isPublicChannelAllowlisted(user: Record<string, unknown>) {
  const userId = user.id == null ? "" : String(user.id);
  const username = normalizeHandle(user.username);

  return (
    (userId && PUBLIC_CHANNEL_ALLOWLIST_USER_IDS.has(userId)) ||
    (username && PUBLIC_CHANNEL_ALLOWLIST_USERNAMES.has(username))
  );
}

function isTargetPublicChannel(chat: Record<string, unknown> | undefined) {
  if (!chat || chat.type !== "channel") return false;

  if (!PUBLIC_CHANNEL_ID && !PUBLIC_CHANNEL_USERNAME) {
    return true;
  }

  if (PUBLIC_CHANNEL_ID && String(chat.id) === PUBLIC_CHANNEL_ID) {
    return true;
  }

  if (PUBLIC_CHANNEL_USERNAME && normalizeHandle(chat.username) === normalizeHandle(PUBLIC_CHANNEL_USERNAME)) {
    return true;
  }

  return false;
}

function looksRandomText(text: string) {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned.length < 8) return false;
  const vowels = cleaned.match(/[aeiou]/g)?.length ?? 0;
  const consonants = cleaned.match(/[bcdfghjklmnpqrstvwxyz]/g)?.length ?? 0;
  const digitGroups = cleaned.match(/\d+/g)?.length ?? 0;
  return consonants >= vowels * 2 && consonants >= 6 && digitGroups <= 1;
}

function getPublicChannelPolicy(mode = PUBLIC_CHANNEL_STRICTNESS) {
  switch (mode) {
    case "strict":
      return {
        mode: "strict",
        banThreshold: 75,
        alertThreshold: 55,
        photoPenalty: 10,
        noUsernamePenalty: 8,
        randomTextPenalty: 16,
        shortUsernamePenalty: 8,
        repeatedUsernamePenalty: 10,
        shortDisplayNamePenalty: 6,
        randomDisplayNamePenalty: 12,
        noLanguagePenalty: 2,
      };
    case "conservative":
      return {
        mode: "conservative",
        banThreshold: 98,
        alertThreshold: 75,
        photoPenalty: 4,
        noUsernamePenalty: 3,
        randomTextPenalty: 8,
        shortUsernamePenalty: 6,
        repeatedUsernamePenalty: 8,
        shortDisplayNamePenalty: 4,
        randomDisplayNamePenalty: 10,
        noLanguagePenalty: 2,
      };
    case "balanced":
    default:
      return {
        mode: "balanced",
        banThreshold: 88,
        alertThreshold: 68,
        photoPenalty: 5,
        noUsernamePenalty: 4,
        randomTextPenalty: 12,
        shortUsernamePenalty: 7,
        repeatedUsernamePenalty: 9,
        shortDisplayNamePenalty: 5,
        randomDisplayNamePenalty: 11,
        noLanguagePenalty: 2,
      };
  }
}

async function sendModerationAlert(message: string) {
  if (!PUBLIC_CHANNEL_ALERT_CHAT_ID) return;
  try {
    await telegramRequest("sendMessage", {
      chat_id: PUBLIC_CHANNEL_ALERT_CHAT_ID,
      text: message,
      disable_web_page_preview: true,
    });
  } catch {
    // best effort
  }
}

async function deletePublicChannelMessage(chatId: string | number, messageId: string | number) {
  return await telegramRequest("deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

async function banPublicChannelMember(chatId: string | number, userId: string | number) {
  return await telegramRequest("banChatMember", {
    chat_id: chatId,
    user_id: userId,
  });
}

async function getTelegramUserProfilePhotoCount(userId: string | number) {
  const result = await telegramRequest("getUserProfilePhotos", {
    user_id: userId,
    limit: 1,
  }) as { total_count?: number };

  return Number(result?.total_count ?? 0);
}

function stringifyJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

async function supabaseRestRequest(path: string, init: { method?: string; headers?: Record<string, string>; body?: BodyInit } = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado");
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      accept: "application/json",
      ...(init.headers || {}),
    },
    body: init.body,
  });

  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  if (!res.ok) {
    const error = new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : `Supabase request failed (${res.status})`,
    ) as Error & { status?: number; body?: unknown };
    error.status = res.status;
    error.body = data;
    throw error;
  }

  return data;
}

function storagePublicUrl(bucket: string, objectPath: string) {
  if (!SUPABASE_URL || !bucket || !objectPath) return "";
  const cleanedPath = objectPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${cleanedPath}`;
}

function encodeStorageObjectPath(objectPath: string) {
  return objectPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function createStorageSignedUrl(bucket: string, objectPath: string, expiresIn = PROTECTED_URL_TTL_SECONDS) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !bucket || !objectPath) return "";

  const encodedPath = encodeStorageObjectPath(objectPath);
  const url = `${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ expiresIn }),
  });

  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw response for error reporting
  }

  if (!res.ok) {
    const message = typeof data === "object" && data && "message" in data
      ? String((data as { message?: string }).message)
      : `Storage signed URL failed (${res.status})`;
    throw new Error(message);
  }

  const signedUrl = typeof data === "object" && data
    ? String((data as { signedURL?: unknown; signedUrl?: unknown }).signedURL ?? (data as { signedUrl?: unknown }).signedUrl ?? "")
    : "";
  if (!signedUrl) return "";

  return new URL(signedUrl, SUPABASE_URL).toString();
}

function getStorageObjectName(seriesId: string, kind: string, fileName: string) {
  const cleanedSeriesId = String(seriesId || "series").trim() || "series";
  const cleanedKind = String(kind || "media").trim() || "media";
  return `${cleanedSeriesId}/${cleanedKind}-${safeFilename(fileName || cleanedKind)}`;
}

async function uploadStorageObject(bucket: string, objectPath: string, file: File) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado");
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStorageObjectPath(objectPath)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: await file.arrayBuffer(),
  });

  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  if (!res.ok) {
    const error = new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : `Storage upload failed (${res.status})`,
    ) as Error & { status?: number; body?: unknown };
    error.status = res.status;
    error.body = data;
    throw error;
  }

  return {
    path: objectPath,
    publicUrl: storagePublicUrl(bucket, objectPath),
  };
}

async function uploadStorageStream(bucket: string, objectPath: string, req: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado");
  }

  if (!req.body) {
    throw new Error("Corpo do upload ausente");
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStorageObjectPath(objectPath)}`;
  const contentType = req.headers.get("content-type") || "application/octet-stream";
  const contentLength = req.headers.get("content-length");
  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": contentType,
    "x-upsert": "true",
  };

  if (contentLength) {
    headers["content-length"] = contentLength;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: req.body,
  });

  const text = await res.text().catch(() => "");
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  if (!res.ok) {
    const error = new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : `Storage stream upload failed (${res.status})`,
    ) as Error & { status?: number; body?: unknown };
    error.status = res.status;
    error.body = data;
    throw error;
  }

  return {
    path: objectPath,
    publicUrl: storagePublicUrl(bucket, objectPath),
  };
}

async function createStorageSignedUploadUrl(bucket: string, objectPath: string, upsert = true) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado");
  }

  const url = `${SUPABASE_URL}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${encodeStorageObjectPath(objectPath)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ upsert }),
  });

  const text = await res.text().catch(() => "");
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  if (!res.ok) {
    const error = new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : `Storage signed upload failed (${res.status})`,
    ) as Error & { status?: number; body?: unknown };
    error.status = res.status;
    error.body = data;
    throw error;
  }

  const signedUrl = typeof data === "object" && data && "url" in data
    ? String((data as { url?: string }).url || "")
    : "";
  const token = typeof data === "object" && data && "token" in data
    ? String((data as { token?: string }).token || "")
    : "";

  if (!signedUrl) {
    throw new Error("Supabase não retornou a URL assinada de upload");
  }

  return {
    path: objectPath,
    token,
    uploadUrl: new URL(signedUrl, SUPABASE_URL).toString(),
  };
}

function extractStorageObjectPathFromUrl(publicUrl: unknown, bucket: string) {
  if (typeof publicUrl !== "string" || !publicUrl || !bucket) return "";

  try {
    const parsed = new URL(publicUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const publicIndex = parts.findIndex((part) => part === "public");
    if (publicIndex === -1) return "";

    const bucketIndex = publicIndex + 1;
    if (parts[bucketIndex] !== bucket) return "";

    return parts.slice(bucketIndex + 1).map((part) => decodeURIComponent(part)).join("/");
  } catch {
    return "";
  }
}

async function deleteStorageObject(bucket: string, objectPath: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !bucket || !objectPath) {
    return false;
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStorageObjectPath(objectPath)}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Storage delete failed (${res.status})`);
  }

  return true;
}

async function deleteSeriesMediaAssets(row: Record<string, unknown>) {
  const candidates = [
    { bucket: SERIES_COVER_BUCKET, path: String(row.cover_storage_path ?? "").trim() || extractStorageObjectPathFromUrl(row.cover_url, SERIES_COVER_BUCKET) },
    { bucket: SERIES_VIDEO_BUCKET, path: String(row.video_storage_path ?? "").trim() || extractStorageObjectPathFromUrl(row.video_url, SERIES_VIDEO_BUCKET) },
    { bucket: SERIES_TRAILER_BUCKET, path: String(row.trailer_storage_path ?? "").trim() || extractStorageObjectPathFromUrl(row.trailer_url, SERIES_TRAILER_BUCKET) },
  ].filter((entry) => Boolean(entry.path));

  for (const entry of candidates) {
    try {
      await deleteStorageObject(entry.bucket, entry.path);
    } catch {
      // best effort; the row still gets removed
    }
  }
}

type CheckoutMethod = "mercado_pago_link" | "pix_qr" | "telegram_checkout";

type CanonicalCheckoutItem = {
  id: string;
  title: string;
  quantity: number;
  price: number;
  cover_url: string | null;
  stars_price?: number;
};

function normalizeCheckoutMethod(value: unknown): CheckoutMethod {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pix" || normalized === "pix_qr" || normalized === "pix-qr") return "pix_qr";
  if (normalized === "telegram" || normalized === "telegram_checkout" || normalized === "telegram-checkout") return "telegram_checkout";
  return "mercado_pago_link";
}

function isTelegramDigitalPaymentMethodAllowed(method: CheckoutMethod): boolean {
  return method === "telegram_checkout";
}

function normalizeCheckoutItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const title = String(entry.title ?? entry.name ?? `Item ${index + 1}`).trim() || `Item ${index + 1}`;
      const id = String(entry.id ?? entry.serie_id ?? entry.product_id ?? `${index + 1}`).trim() || `${index + 1}`;
      const rawQuantity = Number(entry.quantity ?? 1);
      const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? Math.floor(rawQuantity) : 1;
      const rawPrice = Number(entry.price ?? entry.unit_price ?? entry.amount ?? 0);
      const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? Number(rawPrice.toFixed(2)) : 0;
      const coverUrl = typeof entry.cover_url === "string" && entry.cover_url.trim() ? entry.cover_url.trim() : null;

      return {
        id,
        title,
        quantity,
        price,
        cover_url: coverUrl,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      title: string;
      quantity: number;
      price: number;
      cover_url: string | null;
    }>;
}

function calculateCheckoutTotal(items: Array<{ quantity: number; price: number }>) {
  return Number(
    items
      .reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0)
      .toFixed(2),
  );
}

function buildCheckoutDescription(items: Array<{ title: string }>) {
  const titles = items.map((item) => item.title).filter(Boolean).slice(0, 4);
  if (!titles.length) return "Compra no Séries Express";
  return titles.join(" • ").slice(0, 120);
}

function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

function buildPaymentNotificationUrl() {
  const baseUrl = SUPABASE_URL
    ? new URL(`/functions/v1/${FUNCTION_NAME}/api`, SUPABASE_URL)
    : new URL("https://seriescurtasexpressbot.vercel.app/");
  baseUrl.searchParams.set("action", "mercado-pago-webhook");
  return baseUrl.toString();
}

function buildPaymentReturnUrl(orderId: string) {
  const url = new URL(SERIES_WEBAPP_URL);
  url.searchParams.set("payment_order_id", orderId);
  return url.toString();
}

function mercadoPagoApiUrl(path: string) {
  return `https://api.mercadopago.com${path.startsWith("/") ? path : `/${path}`}`;
}

async function mercadoPagoRequest(path: string, init: { method?: string; headers?: Record<string, string>; body?: BodyInit } = {}) {
  if (!MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
  }

  const res = await fetch(mercadoPagoApiUrl(path), {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      accept: "application/json",
      ...(init.headers || {}),
    },
    body: init.body,
  });

  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  if (!res.ok) {
    const error = new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : `Mercado Pago request failed (${res.status})`,
    ) as Error & { status?: number; body?: unknown };
    error.status = res.status;
    error.body = data;
    throw error;
  }

  return data;
}

function getWebhookOrderId(payload: Record<string, unknown>, url: URL) {
  const data = payload.data as Record<string, unknown> | undefined;
  const bodyId = typeof data?.id === "string" || typeof data?.id === "number" ? String(data.id) : "";
  const queryId = url.searchParams.get("id") || url.searchParams.get("data.id") || "";
  return bodyId || queryId;
}

async function createPaymentOrderRecord(entry: {
  orderId: string;
  userId: string;
  chatId: string;
  paymentMethod: CheckoutMethod;
  amount: number;
  subtotal?: number;
  discountAmount?: number;
  couponCode?: string | null;
  items: CanonicalCheckoutItem[];
  buyerEmail?: string | null;
  buyerName?: string | null;
  description: string;
  status?: string;
  salesChannel?: "telegram" | "web";
  paymentProvider?: "mercado_pago" | "telegram_stars";
  providerCurrency?: "BRL" | "XTR";
  providerAmount?: number | null;
}) {
  const rows = await supabaseRestRequest(PAYMENT_ORDERS_TABLE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: stringifyJson([
      {
        order_id: entry.orderId,
        user_id: entry.userId,
        chat_id: entry.chatId,
        status: entry.status ?? "created",
        payment_method: entry.paymentMethod,
        checkout_mode: entry.paymentMethod,
        sales_channel: entry.salesChannel ?? "telegram",
        payment_provider: entry.paymentProvider ?? "mercado_pago",
        provider_currency: entry.providerCurrency ?? "BRL",
        provider_amount: entry.providerAmount ?? null,
        currency: "BRL",
        amount: Number(entry.amount.toFixed(2)),
        subtotal: Number((entry.subtotal ?? entry.amount).toFixed(2)),
        discount_amount: Number((entry.discountAmount ?? 0).toFixed(2)),
        coupon_code: entry.couponCode ?? null,
        items: entry.items,
        buyer_email: entry.buyerEmail ?? null,
        buyer_name: entry.buyerName ?? null,
        description: entry.description,
        external_reference: entry.orderId,
      },
    ]),
  });

  const order = Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
  try {
    await createPaymentOrderItemRecords(
      entry.orderId,
      entry.items,
      entry.discountAmount ?? 0,
      entry.paymentProvider === "telegram_stars",
      entry.providerAmount ?? null,
    );
  } catch (error) {
    await updatePaymentOrderRecord(entry.orderId, {
      status: "failed",
      error_message: "Falha ao registrar os itens do pedido",
    }).catch(() => null);
    throw error;
  }
  return order;
}

async function createPaymentOrderItemRecords(
  orderId: string,
  items: CanonicalCheckoutItem[],
  orderDiscount: number,
  usesStars: boolean,
  providerOrderAmount: number | null,
) {
  let remainingDiscountCents = Math.max(0, Math.round(orderDiscount * 100));
  const baseStarsTotal = items.reduce(
    (sum, item) => sum + Math.max(1, Math.round(item.stars_price ?? TELEGRAM_STARS_DEFAULT_PRICE)),
    0,
  );
  let remainingProviderAmount = usesStars
    ? Math.max(1, Math.round(providerOrderAmount ?? baseStarsTotal))
    : 0;
  const rows = items.map((item, index) => {
    const unitCents = Math.max(0, Math.round(item.price * 100));
    const discountCents = Math.min(unitCents, remainingDiscountCents);
    remainingDiscountCents -= discountCents;
    const baseStars = Math.max(1, Math.round(item.stars_price ?? TELEGRAM_STARS_DEFAULT_PRICE));
    const remainingItems = items.length - index - 1;
    const proportionalStars = Math.round(
      (baseStars / Math.max(1, baseStarsTotal)) * Math.max(items.length, providerOrderAmount ?? baseStarsTotal),
    );
    const providerAmount = usesStars
      ? index === items.length - 1
        ? remainingProviderAmount
        : Math.max(1, Math.min(proportionalStars, remainingProviderAmount - remainingItems))
      : null;
    if (providerAmount != null) remainingProviderAmount = Math.max(0, remainingProviderAmount - providerAmount);
    return {
      order_id: orderId,
      series_id: item.id,
      title: item.title,
      quantity: 1,
      unit_amount: Number((unitCents / 100).toFixed(2)),
      discount_amount: Number((discountCents / 100).toFixed(2)),
      final_amount: Number(((unitCents - discountCents) / 100).toFixed(2)),
      currency: "BRL",
      provider_amount: providerAmount,
    };
  });

  if (!rows.length) return;
  await supabaseRestRequest(`${PAYMENT_ORDER_ITEMS_TABLE}?on_conflict=order_id,series_id`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: stringifyJson(rows),
  });
}

async function updatePaymentOrderRecord(orderId: string, patch: Record<string, unknown>) {
  const rows = await supabaseRestRequest(`${PAYMENT_ORDERS_TABLE}?order_id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: stringifyJson({
      updated_at: new Date().toISOString(),
      ...patch,
    }),
  });

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
}

async function getPaymentOrderById(orderId: string) {
  const rows = await supabaseRestRequest(`${PAYMENT_ORDERS_TABLE}?select=*&order_id=eq.${encodeURIComponent(orderId)}&limit=1`);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function getPaymentOrderByPaymentId(paymentId: string) {
  const rows = await supabaseRestRequest(`${PAYMENT_ORDERS_TABLE}?select=*&mercado_pago_payment_id=eq.${encodeURIComponent(paymentId)}&limit=1`);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function getOrderItemIds(order: Record<string, unknown>) {
  return (Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [])
    .map((item) => String(item.id ?? item.serie_id ?? item.series_id ?? "").trim())
    .filter(Boolean)
    .sort();
}

async function findReusablePendingOrder(entry: {
  userId: string;
  items: CanonicalCheckoutItem[];
  couponCode: string | null;
  paymentProvider: "mercado_pago" | "telegram_stars";
}) {
  const createdAfter = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const rows = await supabaseRestRequest(
    `${PAYMENT_ORDERS_TABLE}?select=*&user_id=eq.${encodeURIComponent(entry.userId)}`
      + `&payment_provider=eq.${encodeURIComponent(entry.paymentProvider)}`
      + `&status=in.(created,pending,pending_payment)&created_at=gte.${encodeURIComponent(createdAfter)}`
      + "&order=created_at.desc&limit=10",
  );
  if (!Array.isArray(rows)) return null;

  const expectedIds = entry.items.map((item) => item.id).sort();
  return rows.find((candidate) => {
    const row = candidate as Record<string, unknown>;
    const rowIds = getOrderItemIds(row);
    const sameItems = rowIds.length === expectedIds.length
      && rowIds.every((id, index) => id === expectedIds[index]);
    const sameCoupon = normalizeCouponCode(row.coupon_code) === normalizeCouponCode(entry.couponCode);
    return sameItems && sameCoupon && Boolean(String(row.checkout_url ?? row.ticket_url ?? "").trim());
  }) as Record<string, unknown> | undefined || null;
}

async function getUserSeriesProgressRow(userId: string, seriesId: string) {
  const rows = await supabaseRestRequest(
    `${USER_SERIES_PROGRESS_TABLE}?select=*&user_id=eq.${encodeURIComponent(userId)}&series_id=eq.${encodeURIComponent(seriesId)}&limit=1`,
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] as Record<string, unknown> : null;
}

async function getLatestUserSeriesProgress(userId: string) {
  const rows = await supabaseRestRequest(
    `${USER_SERIES_PROGRESS_TABLE}?select=*&user_id=eq.${encodeURIComponent(userId)}&order=last_opened_at.desc&limit=1`,
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] as Record<string, unknown> : null;
}

async function getUserSeriesProgressRows(userId: string) {
  if (!userId) return [];
  const rows = await supabaseRestRequest(
    `${USER_SERIES_PROGRESS_TABLE}?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1000`,
  );
  return Array.isArray(rows) ? rows as Record<string, unknown>[] : [];
}

async function getUserFavoriteSeriesRows(userId: string) {
  if (!userId) return [];
  const rows = await supabaseRestRequest(
    `${USER_SERIES_FAVORITES_TABLE}?select=series_id,created_at,updated_at&user_id=eq.${encodeURIComponent(userId)}&limit=1000`,
  );
  return Array.isArray(rows) ? rows as Record<string, unknown>[] : [];
}

async function getUserFavoriteSeriesIds(userId: string) {
  const rows = await getUserFavoriteSeriesRows(userId).catch(() => []);
  const ids = new Set<string>();
  for (const row of rows) {
    const seriesId = String(row.series_id ?? row.serie_id ?? "").trim();
    if (seriesId) ids.add(seriesId);
  }
  return ids;
}

async function upsertUserSeriesFavorite(userId: string, seriesId: string) {
  const now = new Date().toISOString();
  const rows = await supabaseRestRequest(
    `${USER_SERIES_FAVORITES_TABLE}?on_conflict=user_id,series_id`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: stringifyJson([{
        user_id: userId,
        series_id: seriesId,
        updated_at: now,
      }]),
    },
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] as Record<string, unknown> : rows as Record<string, unknown>;
}

async function deleteUserSeriesFavorite(userId: string, seriesId: string) {
  await supabaseRestRequest(
    `${USER_SERIES_FAVORITES_TABLE}?user_id=eq.${encodeURIComponent(userId)}&series_id=eq.${encodeURIComponent(seriesId)}`,
    {
      method: "DELETE",
      headers: {
        prefer: "return=minimal",
      },
    },
  );
}

function normalizeAnalyticsMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(source).slice(0, 20)) {
    if (!/^[a-zA-Z0-9_.-]{1,48}$/.test(key)) continue;
    if (typeof raw === "string") output[key] = raw.slice(0, 240);
    else if (typeof raw === "number" && Number.isFinite(raw)) output[key] = raw;
    else if (typeof raw === "boolean") output[key] = raw;
    else if (raw == null) output[key] = null;
  }
  return output;
}

async function recordAppEvent(entry: {
  eventName: string;
  userId: string;
  seriesId?: string | null;
  orderId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const eventName = String(entry.eventName ?? "").trim().toLowerCase();
  const userId = String(entry.userId ?? "").trim();
  if (!userId || !ANALYTICS_EVENT_NAMES.has(eventName)) return null;

  try {
    const rows = await supabaseRestRequest(APP_EVENTS_TABLE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: stringifyJson([{
        event_name: eventName,
        user_id: userId,
        series_id: entry.seriesId ? String(entry.seriesId).slice(0, 160) : null,
        order_id: entry.orderId ? String(entry.orderId).slice(0, 160) : null,
        session_id: entry.sessionId ? String(entry.sessionId).slice(0, 160) : null,
        metadata: normalizeAnalyticsMetadata(entry.metadata),
      }]),
    });
    return rows;
  } catch (error) {
    console.warn("[ANALYTICS] Falha ao registrar evento:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function handleAnalyticsEvent(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json(req, { error: "Corpo da requisicao invalido" }, 400);

  let userId = "";
  try {
    userId = (await validateWebAppInitData(String(body.init_data ?? body.initData ?? ""))).userId;
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Dados do Telegram invalidos" }, 401);
  }

  const eventName = String(body.event_name ?? body.event ?? "").trim().toLowerCase();
  if (!ANALYTICS_EVENT_NAMES.has(eventName)) {
    return json(req, { error: "Evento de analytics invalido" }, 400);
  }

  await recordAppEvent({
    eventName,
    userId,
    seriesId: String(body.series_id ?? body.serie_id ?? "").trim() || null,
    orderId: String(body.order_id ?? body.orderId ?? "").trim() || null,
    sessionId: String(body.session_id ?? body.sessionId ?? "").trim() || null,
    metadata: normalizeAnalyticsMetadata(body.metadata),
  });

  return json(req, { ok: true });
}

async function upsertUserSeriesProgress(entry: {
  userId: string;
  seriesId: string;
  seriesTitle: string;
  category?: string | null;
  lastPositionSeconds?: number;
  durationSeconds?: number | null;
  completionPercent?: number;
  lastEvent?: string;
  lastPlaybackMode?: string;
}) {
  const existing = await getUserSeriesProgressRow(entry.userId, entry.seriesId).catch(() => null);
  const now = new Date().toISOString();
  const normalizedPosition = Number.isFinite(entry.lastPositionSeconds)
    ? Number(Math.max(0, Number(entry.lastPositionSeconds || 0)).toFixed(2))
    : 0;
  const normalizedDuration = Number.isFinite(entry.durationSeconds)
    ? Number(Math.max(0, Number(entry.durationSeconds || 0)).toFixed(2))
    : null;
  const normalizedCompletion = Number.isFinite(entry.completionPercent)
    ? Number(Math.max(0, Math.min(100, Number(entry.completionPercent || 0))).toFixed(2))
    : 0;
  const previousCompletion = Number(existing?.completion_percent ?? 0) || 0;
  const previousWatchCount = Number(existing?.watch_count ?? 0) || 0;
  const eventName = String(entry.lastEvent || "progress").trim() || "progress";
  const shouldIncrementWatchCount = ["opened", "launched", "telegram_delivery", "continue"].includes(eventName);
  const completed = normalizedCompletion >= 95 || eventName === "completed" || existing?.completed === true;

  const payload = {
    user_id: entry.userId,
    series_id: entry.seriesId,
    series_title: entry.seriesTitle || null,
    category: entry.category ?? null,
    last_position_seconds: normalizedPosition,
    duration_seconds: normalizedDuration,
    completion_percent: Math.max(previousCompletion, normalizedCompletion),
    last_event: eventName,
    last_playback_mode: entry.lastPlaybackMode || "direct",
    watch_count: shouldIncrementWatchCount ? previousWatchCount + 1 : previousWatchCount,
    completed,
    first_opened_at: String(existing?.first_opened_at ?? now),
    last_opened_at: now,
    updated_at: now,
  };

  const rows = await supabaseRestRequest(
    `${USER_SERIES_PROGRESS_TABLE}?on_conflict=user_id,series_id`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: stringifyJson([payload]),
    },
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] as Record<string, unknown> : rows as Record<string, unknown>;
}

async function createMercadoPagoPreference(order: {
  orderId: string;
  userId: string;
  amount: number;
  description: string;
  items: Array<{ title: string; quantity: number; price: number }>;
  buyerEmail?: string | null;
  buyerName?: string | null;
}) {
  const response = await mercadoPagoRequest("/checkout/preferences", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: stringifyJson({
      items: order.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: Number(item.price.toFixed(2)),
        currency_id: "BRL",
      })),
      payer: {
        email: order.buyerEmail ?? undefined,
        first_name: order.buyerName ?? undefined,
      },
      external_reference: order.orderId,
      metadata: {
        order_id: order.orderId,
        user_id: order.userId,
        payment_method: "mercado_pago_link",
      },
      back_urls: {
        success: buildPaymentReturnUrl(order.orderId),
        pending: buildPaymentReturnUrl(order.orderId),
        failure: buildPaymentReturnUrl(order.orderId),
      },
      auto_return: "approved",
      notification_url: buildPaymentNotificationUrl(),
      statement_descriptor: "SERIES EXPRESS",
    }),
  }) as Record<string, unknown>;

  return {
    preferenceId: typeof response.id === "string" ? response.id : String(response.id ?? ""),
    initPoint:
      typeof response.init_point === "string" && response.init_point
        ? response.init_point
        : typeof response.sandbox_init_point === "string"
        ? response.sandbox_init_point
        : "",
    response,
  };
}

async function createMercadoPagoPixPayment(order: {
  orderId: string;
  userId: string;
  amount: number;
  description: string;
  buyerEmail: string;
  buyerName?: string | null;
}) {
  try {
    const response = await mercadoPagoRequest("/v1/payments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": order.orderId,
      },
      body: stringifyJson({
        transaction_amount: Number(order.amount.toFixed(2)),
        description: order.description,
        payment_method_id: "pix",
        payer: {
          email: order.buyerEmail,
          first_name: order.buyerName ?? undefined,
        },
        external_reference: order.orderId,
        metadata: {
          order_id: order.orderId,
          user_id: order.userId,
          payment_method: "pix_qr",
        },
        notification_url: buildPaymentNotificationUrl(),
      }),
    }) as Record<string, unknown>;

    const interaction = response.point_of_interaction as Record<string, unknown> | undefined;
    const transactionData = interaction?.transaction_data as Record<string, unknown> | undefined;

    return {
      paymentId: typeof response.id === "string" ? response.id : String(response.id ?? ""),
      status: typeof response.status === "string" ? response.status : "pending",
      qrCode:
        typeof transactionData?.qr_code === "string" && transactionData.qr_code
          ? transactionData.qr_code
          : MERCADO_PAGO_PIX_COPY || MERCADO_PAGO_PIX_KEY,
      qrCodeBase64:
        typeof transactionData?.qr_code_base64 === "string" && transactionData.qr_code_base64
          ? transactionData.qr_code_base64
          : MERCADO_PAGO_PIX_QR_CODE_BASE64,
      ticketUrl: typeof transactionData?.ticket_url === "string" ? transactionData.ticket_url : "",
      response,
      fallback: false,
    };
  } catch (error) {
    if (MERCADO_PAGO_PIX_COPY || MERCADO_PAGO_PIX_KEY || MERCADO_PAGO_PIX_QR_CODE_BASE64) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        paymentId: "",
        status: "pending",
        qrCode: MERCADO_PAGO_PIX_COPY || MERCADO_PAGO_PIX_KEY,
        qrCodeBase64: MERCADO_PAGO_PIX_QR_CODE_BASE64,
        ticketUrl: "",
        response: {
          fallback: true,
          error: message,
        },
        fallback: true,
      };
    }

    throw error;
  }
}

async function createTelegramStarsInvoice(order: {
  orderId: string;
  description: string;
  starsAmount: number;
}) {
  const amount = Math.max(1, Math.round(order.starsAmount));
  const result = await telegramRequest("createInvoiceLink", {
    title: "Series Curtas Express",
    description: String(order.description || "Acesso a serie curta").slice(0, 255),
    payload: order.orderId,
    provider_token: "",
    currency: "XTR",
    prices: stringifyJson([{ label: "Acesso ao conteudo", amount }]),
  });

  const invoiceUrl = String(result ?? "").trim();
  if (!invoiceUrl.startsWith("https://t.me/$")) {
    throw new Error("Telegram nao retornou um link de pagamento valido");
  }
  return invoiceUrl;
}

async function fetchMercadoPagoPayment(paymentId: string) {
  return await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(paymentId)}`) as Record<string, unknown>;
}

function buildProcessingProgressBar(completed: number, total: number) {
  const safeTotal = Math.max(1, total);
  const width = 10;
  const ratio = Math.max(0, Math.min(1, completed / safeTotal));
  const filled = Math.max(0, Math.min(width, Math.round(ratio * width)));
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function buildDeliveryProgressText(
  orderId: string,
  completed: number,
  total: number,
  currentTitle = "",
  failedCount = 0,
  finished = false,
) {
  const shortOrderId = String(orderId ?? "").slice(0, 8);
  const lines = [
    "Pagamento confirmado.",
    `Pedido: ${shortOrderId}`,
    finished ? "Entrega em processamento finalizada." : "Liberando suas séries no Telegram.",
    `${buildProcessingProgressBar(completed, total)} ${Math.min(completed, total)}/${total}`,
  ];

  if (!finished && currentTitle) {
    lines.push(`Agora: ${currentTitle}`);
  }

  if (finished) {
    lines.push(
      failedCount > 0
        ? "Parte do pedido foi entregue. Se faltar algo, abra o catálogo e tente novamente."
        : "Suas séries já estão liberadas aqui no bot.",
    );
  }

  if (failedCount > 0) {
    lines.push(`Pendências: ${failedCount}`);
  }

  return lines.join("\n");
}

async function upsertDeliveryProgressMessage(
  chatId: string,
  text: string,
  messageId?: number,
) {
  if (messageId) {
    try {
      await telegramRequest("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text,
      });
      return messageId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("message is not modified")) {
        return messageId;
      }
    }
  }

  const sent = await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    protect_content: true,
  }) as Record<string, unknown>;

  return Number(sent.message_id ?? 0) || 0;
}

async function sendPaymentCreatedMessage(order: Record<string, unknown>) {
  const chatId = String(order.chat_id ?? order.user_id ?? "");
  if (!chatId) return;

  const method = normalizeCheckoutMethod(order.payment_method);
  const amount = Number(order.amount ?? 0);
  const amountText = formatCurrencyBRL(amount);
  const providerAmount = Math.max(0, Math.round(Number(order.provider_amount ?? 0) || 0));
  const shortOrderId = String(order.order_id ?? "").slice(0, 8);
  const baseLines = [
    "Pedido criado com sucesso.",
    `Pedido: ${shortOrderId}`,
    `Pagamento: ${method === "telegram_checkout" && providerAmount > 0 ? `${providerAmount} Stars` : amountText}`,
  ];

  if (method === "mercado_pago_link" && typeof order.checkout_url === "string" && order.checkout_url) {
    baseLines.push("Abra o botão abaixo para concluir o pagamento.");
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: baseLines.join("\n"),
      reply_markup: JSON.stringify({
        inline_keyboard: [[{ text: "Abrir pagamento", url: order.checkout_url }]],
      }),
    });
    return;
  }

  if (method === "pix_qr") {
    baseLines.push("O QR Code do Pix está disponível no mini app.");
    if (typeof order.ticket_url === "string" && order.ticket_url) {
      baseLines.push(`Link alternativo: ${order.ticket_url}`);
    }
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: baseLines.join("\n"),
      reply_markup: JSON.stringify({
        inline_keyboard: [[{ text: "Abrir mini app", web_app: { url: SERIES_WEBAPP_URL } }]],
      }),
    });
    return;
  }

  if (method === "telegram_checkout") {
    baseLines.push("O pagamento seguro em Telegram Stars esta pronto.");
    baseLines.push("Toque no botao abaixo para concluir.");
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: baseLines.join("\n"),
      reply_markup: JSON.stringify({
        inline_keyboard: [[{
          text: "Pagar com Stars",
          url: typeof order.checkout_url === "string" && order.checkout_url
            ? order.checkout_url
            : buildTelegramCheckoutUrl(String(order.order_id ?? "")),
        }]],
      }),
    });
    return;
  }

  baseLines.push("O checkout foi iniciado dentro do Telegram.");
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: baseLines.join("\n"),
    reply_markup: JSON.stringify({
      inline_keyboard: [[{ text: "Abrir catálogo", web_app: { url: SERIES_WEBAPP_URL } }]],
    }),
  });
}

async function sendPaymentConfirmationMessage(
  order: Record<string, unknown>,
  payment: Record<string, unknown>,
  deliverySummary?: {
    delivered: Array<{ seriesId: string; title: string; deliveryType: "telegram_file" | "telegram_url" }>;
    failed: Array<{ seriesId: string; title: string; reason: string }>;
  },
) {
  const chatId = String(order.chat_id ?? order.user_id ?? "");
  if (!chatId) return;

  const method = normalizeCheckoutMethod(order.payment_method);
  const amount = Number(order.amount ?? 0);
  const amountText = formatCurrencyBRL(amount);
  const providerAmount = Math.max(0, Math.round(Number(order.provider_amount ?? 0) || 0));
  const shortOrderId = String(order.order_id ?? "").slice(0, 8);
  const statusDetail = typeof payment.status_detail === "string" ? payment.status_detail : "";
  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
  const primarySeriesId = items.length
    ? String(items[0].id ?? items[0].serie_id ?? items[0].series_id ?? "").trim()
    : "";
  const primarySeriesTitle = items.length
    ? String(items[0].title ?? items[0].name ?? "").trim()
    : "";
  const lines = [
    "Pago com sucesso.",
    `Pedido: ${shortOrderId}`,
    `Valor: ${method === "telegram_checkout" && providerAmount > 0 ? `${providerAmount} Stars` : amountText}`,
    `Metodo: ${method === "pix_qr" ? "Pix" : method === "telegram_checkout" ? "Telegram Stars" : "Mercado Pago"}`,
  ];

  if (statusDetail) {
    lines.push(`Detalhe: ${statusDetail}`);
  }

  const deliveredChatCount = deliverySummary?.delivered.filter((entry) => (
    entry.deliveryType === "telegram_file" || entry.deliveryType === "telegram_url"
  )).length ?? 0;
  if (deliveredChatCount > 0) {
    lines.push(`Sua serie ja foi entregue no chat do Telegram: ${deliveredChatCount} titulo(s).`);
  }
  if ((deliverySummary?.failed.length ?? 0) > 0) {
    lines.push("Se algo nao abrir, toque em Abrir catalogo e tente de novo.");
  }

  const buttons: Array<Array<{ text: string; url?: string; web_app?: { url: string } }>> = [];
  if (primarySeriesId) {
    buttons.push([{
      text: primarySeriesTitle ? `Assistir ${primarySeriesTitle}` : "Abrir série",
      web_app: { url: buildSeriesLaunchUrl(primarySeriesId) },
    }]);
  }
  buttons.push([{ text: "Abrir catálogo", web_app: { url: SERIES_WEBAPP_URL } }]);

  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: lines.join("\n"),
    reply_markup: JSON.stringify({ inline_keyboard: buttons }),
  });
}

function normalizeWebhookStatus(value: unknown) {
  const status = String(value ?? "").trim().toLowerCase();
  if (!status) return "pending";
  // Authorized payments still need capture and must never release content.
  if (status === "authorized") return "pending";
  if (status === "in_process") return "pending";
  if (status === "in_mediation") return "pending";
  return status;
}

function validateApprovedPaymentForOrder(order: Record<string, unknown>, payment: Record<string, unknown>) {
  const orderId = String(order.order_id ?? "").trim();
  const storedPaymentId = String(order.mercado_pago_payment_id ?? "").trim();
  const paymentId = String(payment.id ?? "").trim();
  const externalReference = String(payment.external_reference ?? "").trim();
  const metadata = payment.metadata as Record<string, unknown> | undefined;
  const metadataOrderId = String(metadata?.order_id ?? "").trim();
  const references = [externalReference, metadataOrderId].filter(Boolean);

  if (!orderId) return "Pedido sem identificador interno";
  if (references.length && !references.includes(orderId)) return "Pagamento vinculado a outro pedido";
  if (!references.length && (!storedPaymentId || !paymentId || storedPaymentId !== paymentId)) {
    return "Pagamento sem referencia confiavel ao pedido";
  }

  const expectedCents = Math.round((Number(order.amount ?? 0) || 0) * 100);
  const paidAmount = Number(payment.transaction_amount);
  const paidCents = Number.isFinite(paidAmount) ? Math.round(paidAmount * 100) : -1;
  if (expectedCents <= 0 || paidCents !== expectedCents) return "Valor pago diverge do valor do pedido";

  const currency = String(payment.currency_id ?? "").trim().toUpperCase();
  if (currency !== "BRL") return "Moeda do pagamento invalida";
  if (payment.captured === false) return "Pagamento ainda nao foi capturado";
  return "";
}

function validateTelegramStarsPaymentForOrder(
  order: Record<string, unknown>,
  payment: Record<string, unknown>,
  userId: string,
) {
  const orderId = String(order.order_id ?? "").trim();
  if (!orderId || String(payment.invoice_payload ?? "").trim() !== orderId) {
    return "Fatura vinculada a outro pedido";
  }
  if (!userId || String(order.user_id ?? "").trim() !== userId) {
    return "Pagamento vinculado a outro usuario";
  }
  if (String(order.payment_provider ?? "").trim() !== "telegram_stars") {
    return "Provedor do pedido invalido";
  }
  if (String(order.provider_currency ?? "").trim().toUpperCase() !== "XTR"
    || String(payment.currency ?? "").trim().toUpperCase() !== "XTR") {
    return "Moeda da fatura invalida";
  }
  const expected = Math.round(Number(order.provider_amount ?? 0) || 0);
  const paid = Math.round(Number(payment.total_amount ?? 0) || 0);
  if (expected <= 0 || paid !== expected) return "Quantidade de Stars divergente";
  return "";
}

function getHeaderValue(req: Request, names: string[]) {
  for (const name of names) {
    const value = req.headers.get(name);
    if (value) return value;
  }
  return "";
}

function parseMercadoPagoSignature(signatureHeader: string) {
  const parts = String(signatureHeader ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const ts = parts.find((part) => part.startsWith("ts="))?.slice(3) ?? "";
  const v1 = parts.find((part) => part.startsWith("v1="))?.slice(3) ?? "";

  return { ts, v1 };
}

function getMercadoPagoNotificationDataId(payload: Record<string, unknown>, url: URL) {
  const data = payload.data as Record<string, unknown> | undefined;
  const bodyId = typeof data?.id === "string" || typeof data?.id === "number" ? String(data.id) : "";
  const queryId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";
  return bodyId || queryId;
}

function buildMercadoPagoSignatureManifest(dataId: string, requestId: string, ts: string) {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId};`);
  if (requestId) parts.push(`request-id:${requestId};`);
  if (ts) parts.push(`ts:${ts};`);
  return parts.join("");
}

function hexFromBytes(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(left: string, right: string) {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b || a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hashMercadoPagoWebhookManifest(secret: string, manifest: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  return hexFromBytes(new Uint8Array(signature));
}

async function validateMercadoPagoWebhookSignature(req: Request, payload: Record<string, unknown>, url: URL) {
  if (!MERCADO_PAGO_WEBHOOK_SECRET) {
    return { validated: false, skipped: true, reason: "secret_missing" };
  }

  const notificationType = String(payload.type ?? payload.action ?? payload.topic ?? "").trim().toLowerCase();
  const isPayment = notificationType.includes("payment");
  const signatureHeader = getHeaderValue(req, ["x-signature"]);
  const requestId = getHeaderValue(req, ["x-request-id"]);
  const dataId = getMercadoPagoNotificationDataId(payload, url);

  if (!signatureHeader || !requestId || !dataId) {
    if (isPayment) {
      throw new Error("Assinatura do webhook ausente");
    }

    return { validated: false, skipped: true, reason: "signature_unavailable_for_notification_type" };
  }

  const { ts, v1 } = parseMercadoPagoSignature(signatureHeader);
  if (!ts || !v1) {
    if (isPayment) {
      throw new Error("Assinatura do webhook inválida");
    }

    return { validated: false, skipped: true, reason: "signature_headers_incomplete" };
  }

  const manifest = buildMercadoPagoSignatureManifest(dataId, requestId, ts);
  const expected = await hashMercadoPagoWebhookManifest(MERCADO_PAGO_WEBHOOK_SECRET, manifest);

  if (!timingSafeEqualHex(expected, v1)) {
    throw new Error("Assinatura do webhook inválida");
  }

  return { validated: true, skipped: false };
}

function getDeliveredItemIds(order: Record<string, unknown>) {
  const raw = order.delivered_item_ids;
  if (!Array.isArray(raw)) return new Set<string>();
  return new Set(raw.map((value) => String(value ?? "").trim()).filter(Boolean));
}

async function claimOrderDelivery(order: Record<string, unknown>) {
  const orderId = String(order.order_id ?? "").trim();
  if (!orderId) return { claimed: false, order };

  const currentStatus = String(order.delivery_status ?? "pending").trim().toLowerCase();
  const startedAt = Date.parse(String(order.delivery_started_at ?? "")) || 0;
  const lockIsFresh = currentStatus === "processing" && startedAt > Date.now() - 10 * 60 * 1000;
  if (currentStatus === "completed" || lockIsFresh) {
    return { claimed: false, order };
  }

  if (currentStatus === "processing" && !lockIsFresh) {
    await updatePaymentOrderRecord(orderId, {
      delivery_status: "retry",
      delivery_last_error: "Entrega anterior interrompida; retomada automatica iniciada.",
    }).catch(() => null);
  }

  const rows = await supabaseRestRequest(
    `${PAYMENT_ORDERS_TABLE}?order_id=eq.${encodeURIComponent(orderId)}&delivery_status=neq.processing`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: stringifyJson({
        delivery_status: "processing",
        delivery_attempts: (Number(order.delivery_attempts ?? 0) || 0) + 1,
        delivery_started_at: new Date().toISOString(),
        delivery_last_error: null,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  const claimedOrder = Array.isArray(rows) && rows.length > 0 ? rows[0] as Record<string, unknown> : null;
  return { claimed: Boolean(claimedOrder), order: claimedOrder || order };
}

async function applyMercadoPagoPaymentState(order: Record<string, unknown>, payment: Record<string, unknown>, webhookPayload: unknown) {
  const previousStatus = String(order.status ?? "");
  const currentStatus = normalizeWebhookStatus(payment.status);
  const orderId = String(order.order_id ?? "").trim();
  if (currentStatus === "approved") {
    const reconciliationError = validateApprovedPaymentForOrder(order, payment);
    if (reconciliationError) {
      const reviewOrder = orderId
        ? await updatePaymentOrderRecord(orderId, {
          status: "payment_review",
          mercado_pago_payment_id: String(payment.id ?? order.mercado_pago_payment_id ?? ""),
          webhook_payload: webhookPayload,
          last_event_at: new Date().toISOString(),
          error_message: reconciliationError,
        }) as Record<string, unknown>
        : order;
      if (orderId) await updateCouponRedemption(orderId, "reversed");
      console.error("[PAYMENT] Pagamento aprovado bloqueado na conciliacao:", reconciliationError, orderId);
      return reviewOrder;
    }
  }

  const nextPatch: Record<string, unknown> = {
    mercado_pago_payment_id: String(payment.id ?? order.mercado_pago_payment_id ?? ""),
    webhook_payload: webhookPayload,
    last_event_at: new Date().toISOString(),
    status: currentStatus,
  };

  if (typeof payment.point_of_interaction === "object" && payment.point_of_interaction) {
    const interaction = payment.point_of_interaction as Record<string, unknown>;
    const transactionData = interaction.transaction_data as Record<string, unknown> | undefined;
    if (typeof transactionData?.qr_code === "string" && transactionData.qr_code) {
      nextPatch.pix_qr_code = transactionData.qr_code;
    }
    if (typeof transactionData?.qr_code_base64 === "string" && transactionData.qr_code_base64) {
      nextPatch.pix_qr_code_base64 = transactionData.qr_code_base64;
    }
    if (typeof transactionData?.ticket_url === "string" && transactionData.ticket_url) {
      nextPatch.ticket_url = transactionData.ticket_url;
    }
  }

  if (currentStatus === "approved") {
    nextPatch.confirmed_at = new Date().toISOString();
    nextPatch.paid_at = new Date().toISOString();
    nextPatch.external_payment_id = String(payment.id ?? order.mercado_pago_payment_id ?? "");
    nextPatch.error_message = null;
  } else if (currentStatus === "rejected") {
    nextPatch.rejected_at = new Date().toISOString();
  } else if (currentStatus === "cancelled" || currentStatus === "canceled") {
    nextPatch.canceled_at = new Date().toISOString();
  } else if (currentStatus === "refunded") {
    nextPatch.refunded_at = new Date().toISOString();
    nextPatch.delivery_status = "revoked";
  } else if (currentStatus === "charged_back") {
    nextPatch.chargeback_at = new Date().toISOString();
    nextPatch.delivery_status = "revoked";
  }

  const updatedOrder = orderId
    ? await updatePaymentOrderRecord(orderId, nextPatch) as Record<string, unknown>
    : order;

  if (orderId && currentStatus === "approved") {
    await updateCouponRedemption(orderId, "applied");
  } else if (orderId && ["rejected", "cancelled", "canceled", "expired"].includes(currentStatus)) {
    await updateCouponRedemption(orderId, "reversed");
  }

  if (
    orderId
    && previousStatus.toLowerCase() !== currentStatus
    && ["rejected", "cancelled", "canceled", "expired"].includes(currentStatus)
  ) {
    await recordAppEvent({
      eventName: "purchase_failed",
      userId: String(updatedOrder.user_id ?? ""),
      orderId,
      metadata: { payment_provider: "mercado_pago", payment_status: currentStatus },
    });
  }

  if (orderId && (currentStatus === "refunded" || currentStatus === "charged_back")) {
    await revokeOrderEntitlements(orderId, currentStatus === "refunded" ? "refunded" : "charged_back");
    await recordAppEvent({
      eventName: currentStatus === "refunded" ? "purchase_refunded" : "purchase_chargeback",
      userId: String(updatedOrder.user_id ?? ""),
      orderId,
      metadata: { payment_provider: "mercado_pago" },
    });
  }

  let finalOrder = updatedOrder;
  if (currentStatus === "approved") {
    await grantOrderEntitlements(updatedOrder);
    const deliveryStatus = String(updatedOrder.delivery_status ?? "pending").trim().toLowerCase();
    const shouldDeliver = previousStatus !== "approved" || deliveryStatus !== "completed";
    let deliverySummary = null;
    if (shouldDeliver) {
      deliverySummary = await deliverApprovedOrderSeries(updatedOrder);
      finalOrder = orderId
        ? (await getPaymentOrderById(orderId) as Record<string, unknown> | null) || updatedOrder
        : updatedOrder;
    }

    if (previousStatus !== "approved") {
      await recordAppEvent({
        eventName: "payment_approved",
        userId: String(updatedOrder.user_id ?? ""),
        orderId,
        metadata: {
          payment_method: normalizeCheckoutMethod(updatedOrder.payment_method),
          delivery_status: String(deliverySummary?.deliveryStatus ?? updatedOrder.delivery_status ?? "pending"),
        },
      });
      await recordAppEvent({
        eventName: "purchase_completed",
        userId: String(updatedOrder.user_id ?? ""),
        orderId,
        metadata: {
          payment_provider: "mercado_pago",
          amount: Number(updatedOrder.amount ?? 0) || 0,
        },
      });
    }

    const notificationAlreadySent = Boolean(finalOrder.delivery_notification_sent_at);
    const hasDeliveryResult = Boolean(
      deliverySummary
      && (deliverySummary.delivered.length || deliverySummary.failed.length || deliverySummary.deliveryStatus === "completed")
    );
    if (deliverySummary && hasDeliveryResult && !notificationAlreadySent) {
      await sendPaymentConfirmationMessage(finalOrder, payment, deliverySummary);
      if (orderId) {
        finalOrder = await updatePaymentOrderRecord(orderId, {
          delivery_notification_sent_at: new Date().toISOString(),
        }) as Record<string, unknown>;
      }
    }
  }

  return finalOrder;
}

function normalizeCouponCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

async function validateCouponForCheckout(
  userId: string,
  couponInput: unknown,
  items: Array<{ id: string; title: string; quantity: number; price: number; cover_url: string | null }>,
) {
  const subtotal = calculateCheckoutTotal(items);
  const code = normalizeCouponCode(couponInput);
  if (!code) return { code: "", subtotal, discountAmount: 0, total: subtotal, description: "" };

  const rows = await supabaseFetch(`${COUPONS_TABLE}?select=*&code=eq.${encodeURIComponent(code)}&limit=1`);
  const coupon = Array.isArray(rows) && rows.length ? rows[0] as Record<string, unknown> : null;
  if (!coupon || coupon.active !== true) throw new Error("Cupom invalido ou inativo");

  const now = Date.now();
  const startsAt = Date.parse(String(coupon.starts_at ?? "")) || 0;
  const endsAt = Date.parse(String(coupon.ends_at ?? "")) || 0;
  if (startsAt && now < startsAt) throw new Error("Este cupom ainda nao esta disponivel");
  if (endsAt && now >= endsAt) throw new Error("Este cupom expirou");

  const minimumAmount = Number(coupon.minimum_amount ?? 0) || 0;
  if (subtotal < minimumAmount) {
    throw new Error(`Este cupom exige um subtotal minimo de ${formatCurrencyBRL(minimumAmount)}`);
  }

  const eligibleIds = new Set(
    Array.isArray(coupon.eligible_series_ids)
      ? coupon.eligible_series_ids.map((id) => String(id)).filter(Boolean)
      : [],
  );
  const eligibleSubtotal = items
    .filter((item) => !eligibleIds.size || eligibleIds.has(String(item.id)))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (eligibleSubtotal <= 0) throw new Error("Este cupom nao se aplica aos itens do carrinho");

  const reservations = await supabaseFetch(
    `${COUPON_REDEMPTIONS_TABLE}?select=user_id,status,created_at&coupon_code=eq.${encodeURIComponent(code)}&status=in.(reserved,applied)&limit=5000`,
  ).catch(() => []);
  const validReservations = (Array.isArray(reservations) ? reservations as Record<string, unknown>[] : [])
    .filter((entry) => entry.status === "applied" || (Date.parse(String(entry.created_at ?? "")) || 0) > now - 30 * 60 * 1000);
  const usageLimit = Number(coupon.usage_limit ?? 0) || 0;
  const perUserLimit = Number(coupon.per_user_limit ?? 1) || 1;
  if (usageLimit > 0 && validReservations.length >= usageLimit) throw new Error("Este cupom atingiu o limite de usos");
  if (validReservations.filter((entry) => String(entry.user_id ?? "") === userId).length >= perUserLimit) {
    throw new Error("Este cupom ja foi utilizado por esta conta");
  }

  const value = Number(coupon.discount_value ?? 0) || 0;
  const discountType = String(coupon.discount_type ?? "");
  const rawDiscount = discountType === "percentage" ? eligibleSubtotal * (value / 100) : value;
  const discountAmount = Number(Math.min(eligibleSubtotal, Math.max(0, rawDiscount)).toFixed(2));
  const total = Number((subtotal - discountAmount).toFixed(2));
  if (discountAmount <= 0) throw new Error("Este cupom nao gerou desconto");
  if (total < 1) throw new Error("O total com desconto precisa ser de pelo menos R$ 1,00");

  return {
    code,
    subtotal,
    discountAmount,
    total,
    description: String(coupon.description ?? "").trim(),
  };
}

async function ensureCheckoutItemsNotOwned(
  userId: string,
  items: Array<{ id: string }>,
) {
  const accessibleIds = isOwnerUserId(userId)
    ? new Set(items.map((item) => String(item.id)))
    : await getAccessibleSeriesIds(userId);
  const ownedItems = items.filter((item) => accessibleIds.has(String(item.id)));
  if (ownedItems.length) {
    throw new Error(ownedItems.length === items.length
      ? "Voce ja possui acesso aos itens selecionados."
      : "Remova do carrinho as series que ja estao na sua biblioteca.");
  }
}

async function handleCouponValidate(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json(req, { error: "Corpo da requisicao invalido" }, 400);
  let userId = "";
  try {
    userId = (await validateWebAppInitData(String(body.init_data ?? body.initData ?? ""))).userId;
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Dados do Telegram invalidos" }, 401);
  }
  try {
    const items = await resolveCanonicalCheckoutItems(body.items);
    if (!items.length) return json(req, { error: "Carrinho vazio" }, 400);
    await ensureCheckoutItemsNotOwned(userId, items);
    const result = await validateCouponForCheckout(userId, body.coupon_code, items);
    return json(req, { ok: true, coupon: result });
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Cupom invalido" }, 400);
  }
}

async function handleCartSync(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json(req, { error: "Corpo da requisicao invalido" }, 400);
  let userId = "";
  try {
    userId = (await validateWebAppInitData(String(body.init_data ?? body.initData ?? ""))).userId;
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Dados do Telegram invalidos" }, 401);
  }

  const operation = String(body.operation ?? "load").trim().toLowerCase();
  if (operation === "load") {
    const rows = await supabaseFetch(`${SHOPPING_CARTS_TABLE}?select=item_ids,coupon_code,updated_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`);
    const row = Array.isArray(rows) && rows.length ? rows[0] as Record<string, unknown> : null;
    const accessibleIds = isOwnerUserId(userId)
      ? new Set((Array.isArray(row?.item_ids) ? row.item_ids : []).map(String))
      : await getAccessibleSeriesIds(userId);
    return json(req, {
      ok: true,
      cart: {
        item_ids: Array.isArray(row?.item_ids) ? row.item_ids.map(String).filter((id) => !accessibleIds.has(id)) : [],
        coupon_code: String(row?.coupon_code ?? ""),
        updated_at: row?.updated_at ?? null,
      },
    });
  }
  if (operation !== "save") return json(req, { error: "Operacao de carrinho invalida" }, 400);

  const requestedIds = Array.from(new Set(
    (Array.isArray(body.item_ids) ? body.item_ids : []).map((id) => String(id ?? "").trim()).filter(Boolean),
  )).slice(0, 50);
  const accessibleIds = isOwnerUserId(userId)
    ? new Set(requestedIds)
    : await getAccessibleSeriesIds(userId);
  const validIds: string[] = [];
  for (const id of requestedIds) {
    const row = await getSeriesById(id);
    if (row && isSeriesActive(row) && !isSeriesFree(row) && !accessibleIds.has(id)) validIds.push(id);
  }
  const couponCode = normalizeCouponCode(body.coupon_code) || null;
  const now = new Date().toISOString();
  const saved = await supabaseRestRequest(`${SHOPPING_CARTS_TABLE}?on_conflict=user_id`, {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=representation" },
    body: stringifyJson([{ user_id: userId, item_ids: validIds, coupon_code: couponCode, updated_at: now }]),
  });
  const row = Array.isArray(saved) ? saved[0] : saved;
  return json(req, { ok: true, cart: row });
}

async function createCouponRedemption(entry: { code: string; userId: string; orderId: string; discountAmount: number }) {
  if (!entry.code || entry.discountAmount <= 0) return null;
  return await supabaseRestRequest("rpc/reserve_coupon_redemption", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stringifyJson({
      p_coupon_code: entry.code,
      p_user_id: entry.userId,
      p_order_id: entry.orderId,
      p_discount_amount: entry.discountAmount,
    }),
  });
}

async function updateCouponRedemption(orderId: string, status: "applied" | "reversed") {
  const timestampField = status === "applied" ? "applied_at" : "reversed_at";
  await supabaseRestRequest(`${COUPON_REDEMPTIONS_TABLE}?order_id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: stringifyJson({ status, [timestampField]: new Date().toISOString() }),
  }).catch(() => null);
}

async function handlePaymentCreate(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json(req, { error: "Corpo da requisição inválido" }, 400);
  }

  let userId = "";
  try {
    const initData = String(body.init_data ?? body.initData ?? "");
    const validated = await validateWebAppInitData(initData);
    userId = validated.userId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(req, { error: message }, 401);
  }

  let items;
  try {
    items = await resolveCanonicalCheckoutItems(body.items);
    await ensureCheckoutItemsNotOwned(userId, items);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Itens invalidos" }, 400);
  }
  if (!items.length) return json(req, { error: "Carrinho vazio" }, 400);

  const paymentMethod = normalizeCheckoutMethod(body.payment_method ?? body.method ?? body.checkout_method);
  if (!isTelegramDigitalPaymentMethodAllowed(paymentMethod)) {
    return json(req, {
      error: "Dentro do Telegram, conteudos digitais devem ser pagos com Telegram Stars.",
      code: "telegram_stars_required",
    }, 400);
  }
  const buyerEmail = String(body.buyer_email ?? body.email ?? "").trim();
  const buyerName = String(body.buyer_name ?? body.name ?? "").trim();
  let pricing;
  try {
    pricing = await validateCouponForCheckout(userId, body.coupon_code, items);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Cupom invalido" }, 400);
  }
  const amount = pricing.total;
  const baseStarsAmount = items.reduce(
    (sum, item) => sum + Math.max(1, Math.round(item.stars_price ?? TELEGRAM_STARS_DEFAULT_PRICE)),
    0,
  );
  const discountRatio = pricing.subtotal > 0 ? pricing.total / pricing.subtotal : 1;
  const starsAmount = Math.max(items.length, Math.round(baseStarsAmount * discountRatio));
  const description = buildCheckoutDescription(items);

  const reusableOrder = await findReusablePendingOrder({
    userId,
    items,
    couponCode: pricing.code || null,
    paymentProvider: "telegram_stars",
  }).catch(() => null);
  if (reusableOrder) {
    const reusableOrderId = String(reusableOrder.order_id ?? "").trim();
    await recordAppEvent({
      eventName: "checkout_reused",
      userId,
      orderId: reusableOrderId,
      metadata: { payment_provider: "telegram_stars", item_count: items.length },
    });
    return json(req, {
      ok: true,
      reused: true,
      order: reusableOrder,
      payment_method: "telegram_checkout",
      payment_link: String(reusableOrder.checkout_url ?? ""),
      provider_currency: "XTR",
      provider_amount: Number(reusableOrder.provider_amount ?? starsAmount) || starsAmount,
    });
  }

  const orderId = crypto.randomUUID();
  const chatId = userId;

  if (paymentMethod === "pix_qr" && !buyerEmail) {
    return json(req, { error: "Informe um e-mail válido para gerar o Pix." }, 400);
  }

  let order: Record<string, unknown>;
  try {
    order = await createPaymentOrderRecord({
      orderId,
      userId,
      chatId,
      paymentMethod,
      amount,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      couponCode: pricing.code || null,
      items,
      buyerEmail: buyerEmail || null,
      buyerName: buyerName || null,
      description,
      status: "created",
      salesChannel: "telegram",
      paymentProvider: "telegram_stars",
      providerCurrency: "XTR",
      providerAmount: starsAmount,
    }) as Record<string, unknown>;
  } catch (error) {
    await recordAppEvent({
      eventName: "purchase_failed",
      userId,
      orderId,
      metadata: { payment_provider: "telegram_stars", stage: "order_creation" },
    });
    return json(req, {
      error: error instanceof Error ? error.message : "Nao foi possivel criar o pedido",
    }, 500);
  }

  if (pricing.code && pricing.discountAmount > 0) {
    try {
      await createCouponRedemption({ code: pricing.code, userId, orderId, discountAmount: pricing.discountAmount });
    } catch {
      await updatePaymentOrderRecord(orderId, { status: "failed", error_message: "Falha ao reservar cupom" }).catch(() => null);
      await recordAppEvent({
        eventName: "purchase_failed",
        userId,
        orderId,
        metadata: { payment_provider: "telegram_stars", stage: "coupon_reservation" },
      });
      return json(req, { error: "Nao foi possivel reservar este cupom. Tente novamente." }, 409);
    }
  }

  await recordAppEvent({
    eventName: "payment_created",
    userId,
    orderId,
    metadata: {
      payment_method: paymentMethod,
      item_count: items.length,
      amount,
    },
  });
  await recordAppEvent({
    eventName: "checkout_created",
    userId,
    orderId,
    metadata: {
      payment_provider: "telegram_stars",
      item_count: items.length,
      provider_amount: starsAmount,
    },
  });

  try {
    if (paymentMethod === "telegram_checkout") {
      const invoiceUrl = await createTelegramStarsInvoice({ orderId, description, starsAmount });
      order = await updatePaymentOrderRecord(orderId, {
        status: "pending_payment",
        checkout_url: invoiceUrl,
        last_event_at: new Date().toISOString(),
      }) as Record<string, unknown>;

      await sendPaymentCreatedMessage(order);
      return json(req, {
        ok: true,
        order,
        payment_method: paymentMethod,
        payment_link: invoiceUrl,
        provider_currency: "XTR",
        provider_amount: starsAmount,
      });
    }

    if (paymentMethod === "pix_qr") {
      const pix = await createMercadoPagoPixPayment({
        orderId,
        userId,
        amount,
        description,
        buyerEmail,
        buyerName: buyerName || null,
      });

      order = await updatePaymentOrderRecord(orderId, {
        status: "pending_payment",
        mercado_pago_payment_id: pix.paymentId,
        pix_qr_code: pix.qrCode || null,
        pix_qr_code_base64: pix.qrCodeBase64 || null,
        ticket_url: pix.ticketUrl || null,
        webhook_payload: pix.response,
        last_event_at: new Date().toISOString(),
      }) as Record<string, unknown>;

      await sendPaymentCreatedMessage({
        ...order,
        payment_method: paymentMethod,
        order_id: orderId,
      });

      return json(req, {
        ok: true,
        order,
        payment_method: paymentMethod,
        payment_link: null,
        pix_qr_code: pix.qrCode,
        pix_qr_code_base64: pix.qrCodeBase64,
        ticket_url: pix.ticketUrl,
      });
    }

    const preference = await createMercadoPagoPreference({
      orderId,
      userId,
      amount,
      description,
      items: pricing.discountAmount > 0
        ? [{ title: description, quantity: 1, price: amount }]
        : items,
      buyerEmail: buyerEmail || null,
      buyerName: buyerName || null,
    });

    order = await updatePaymentOrderRecord(orderId, {
      status: "pending_payment",
      preference_id: preference.preferenceId,
      checkout_url: preference.initPoint || null,
      webhook_payload: preference.response,
      last_event_at: new Date().toISOString(),
    }) as Record<string, unknown>;

    await sendPaymentCreatedMessage({
      ...order,
      payment_method: paymentMethod,
      order_id: orderId,
    });

    return json(req, {
      ok: true,
      order,
      payment_method: paymentMethod,
      payment_link: preference.initPoint,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updatePaymentOrderRecord(orderId, {
      status: "failed",
      error_message: message,
      last_event_at: new Date().toISOString(),
    }).catch(() => null);
    if (pricing.code) await updateCouponRedemption(orderId, "reversed");
    await recordAppEvent({
      eventName: "purchase_failed",
      userId,
      orderId,
      metadata: { payment_provider: "telegram_stars", stage: "checkout_creation" },
    });
    return json(req, { error: message }, 500);
  }
}

async function handlePaymentStatus(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json(req, { error: "Corpo da requisição inválido" }, 400);
  }

  const orderId = String(body.order_id ?? body.orderId ?? "").trim();
  if (!orderId) {
    return json(req, { error: "order_id ausente" }, 400);
  }

  let userId = "";
  try {
    const initData = String(body.init_data ?? body.initData ?? "");
    const validated = await validateWebAppInitData(initData);
    userId = validated.userId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(req, { error: message }, 401);
  }

  const order = await getPaymentOrderById(orderId);
  if (!order) {
    return json(req, { error: "Pedido não encontrado" }, 404);
  }

  if (String(order.user_id) !== userId) {
    return json(req, { error: "Acesso negado" }, 403);
  }

  let refreshedOrder = order;
  const paymentId = String(order.mercado_pago_payment_id ?? "").trim();
  if (paymentId && !["refunded", "charged_back"].includes(String(order.status ?? "").toLowerCase())) {
    try {
      const payment = await fetchMercadoPagoPayment(paymentId);
      const externalReference = String(payment.external_reference ?? "").trim();
      const metadata = payment.metadata as Record<string, unknown> | undefined;
      const metadataOrderId = String(metadata?.order_id ?? "").trim();
      if (!externalReference || externalReference === orderId || metadataOrderId === orderId) {
        refreshedOrder = await applyMercadoPagoPaymentState(order as Record<string, unknown>, payment, {
          source: "payment-status",
          fetched_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn("[PAYMENT] Falha ao sincronizar status do pagamento:", error instanceof Error ? error.message : String(error));
    }
  }

  if (
    String(refreshedOrder.status ?? "").toLowerCase() === "approved"
    && String(refreshedOrder.delivery_status ?? "pending").toLowerCase() !== "completed"
  ) {
    await deliverApprovedOrderSeries(refreshedOrder as Record<string, unknown>);
    refreshedOrder = await getPaymentOrderById(orderId) || refreshedOrder;
  }

  return json(req, {
    ok: true,
    order: refreshedOrder,
  });
}

async function handleMercadoPagoWebhook(req: Request, url: URL) {
  const payload = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) {
    return json(req, { ok: false, error: "Webhook inválido" }, 400);
  }

  try {
    await validateMercadoPagoWebhookSignature(req, payload, url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PAYMENT] Webhook do Mercado Pago rejeitado:", message);
    return json(req, { ok: false, error: message }, 401);
  }

  const paymentId = getWebhookOrderId(payload, url);
  if (!paymentId) {
    return json(req, { ok: true, ignored: true });
  }

  try {
    const payment = await fetchMercadoPagoPayment(paymentId);
    const orderId = String(payment.external_reference ?? (payment.metadata as Record<string, unknown> | undefined)?.order_id ?? "").trim();
    if (!orderId) {
      return json(req, { ok: true, ignored: true });
    }

    let order = await getPaymentOrderById(orderId);
    if (!order) {
      order = await getPaymentOrderByPaymentId(paymentId);
    }
    if (!order) {
      return json(req, { ok: true, ignored: true });
    }

    order = await applyMercadoPagoPaymentState(order as Record<string, unknown>, payment, payload);
    const currentStatus = String(order.status ?? normalizeWebhookStatus(payment.status));

    return json(req, {
      ok: true,
      action: "mercado_pago_webhook",
      payment_id: paymentId,
      status: currentStatus,
      order_id: orderId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PAYMENT] Falha no webhook do Mercado Pago:", message);
    return json(req, { ok: false, error: message }, 500);
  }
}

async function recordPublicChannelAudit(entry: {
  chatId: string | number;
  chatUsername?: string | null;
  chatTitle?: string | null;
  userId: string | number;
  username?: string | null;
  displayName?: string | null;
  isBot: boolean;
  joined: boolean;
  decision: string;
  analysisMode?: string | null;
  score?: number | null;
  reasons?: string[];
  strongSignals?: string[];
  profilePhotos?: number | null;
  rawUpdate: Record<string, unknown>;
}) {
  try {
    await supabaseRestRequest(PUBLIC_CHANNEL_AUDIT_TABLE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: stringifyJson([
        {
          chat_id: String(entry.chatId),
          chat_username: entry.chatUsername ?? null,
          chat_title: entry.chatTitle ?? null,
          user_id: String(entry.userId),
          username: entry.username ?? null,
          display_name: entry.displayName ?? null,
          is_bot: entry.isBot,
          joined: entry.joined,
          decision: entry.decision,
          analysis_mode: entry.analysisMode ?? null,
          score: entry.score ?? null,
          reasons: entry.reasons ?? [],
          strong_signals: entry.strongSignals ?? [],
          profile_photos: entry.profilePhotos ?? null,
          raw_update: entry.rawUpdate,
        },
      ]),
    });
  } catch (error) {
    console.error("[AUDIT] Falha ao registrar entrada do canal público:", error);
  }
}

async function recordPublicChannelPost(entry: {
  channelId: string | number;
  channelUsername?: string | null;
  channelTitle?: string | null;
  messageId: string | number;
  date?: number | null;
  authorSignature?: string | null;
  messageType?: string | null;
  text?: string | null;
  caption?: string | null;
  rawUpdate: Record<string, unknown>;
}) {
  try {
    await supabaseRestRequest(PUBLIC_CHANNEL_POST_AUDIT_TABLE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: stringifyJson([
        {
          channel_id: String(entry.channelId),
          channel_username: entry.channelUsername ?? null,
          channel_title: entry.channelTitle ?? null,
          message_id: String(entry.messageId),
          message_date: entry.date ? new Date(entry.date * 1000).toISOString() : null,
          author_signature: entry.authorSignature ?? null,
          message_type: entry.messageType ?? null,
          text: entry.text ?? null,
          caption: entry.caption ?? null,
          raw_update: entry.rawUpdate,
        },
      ]),
    });
  } catch (error) {
    console.error("[AUDIT] Falha ao registrar post do canal público:", error);
  }
}

async function analyzePublicChannelJoin(user: Record<string, unknown>) {
  const policy = getPublicChannelPolicy();
  const reasons: string[] = [];
  const strongSignals: string[] = [];
  let score = 0;

  const isBot = user.is_bot === true;
  const username = normalizeHandle(user.username);
  const firstName = typeof user.first_name === "string" ? user.first_name.trim() : "";
  const lastName = typeof user.last_name === "string" ? user.last_name.trim() : "";
  const displayName = `${firstName} ${lastName}`.trim();
  const languageCode = typeof user.language_code === "string" ? user.language_code.trim() : "";
  let profilePhotos = 0;

  if (isBot) {
    score += 100;
    reasons.push("Conta marcada como bot pelo Telegram");
  }

  if (!username) {
    score += policy.noUsernamePenalty;
    reasons.push("Sem @username");
  } else {
    if (username.length < 5 || username.length > 24) {
      score += policy.shortUsernamePenalty;
      reasons.push("Username fora do padrão comum");
    }

    if (looksRandomText(username)) {
      score += policy.randomTextPenalty;
      reasons.push("Username parece gerado automaticamente");
      strongSignals.push("username_random");
    }

    if (/(.)\1{3,}/.test(username)) {
      score += policy.repeatedUsernamePenalty;
      reasons.push("Username com repetição excessiva");
      strongSignals.push("username_repetido");
    }
  }

  if (displayName) {
    if (displayName.length < 6) {
      score += policy.shortDisplayNamePenalty;
      reasons.push("Nome muito curto");
    }

    if (looksRandomText(displayName.replace(/\s+/g, ""))) {
      score += policy.randomDisplayNamePenalty;
      reasons.push("Nome parece aleatório");
      strongSignals.push("nome_random");
    }
  } else {
    score += 10;
    reasons.push("Sem nome exibido");
  }

  if (!languageCode) {
    score += policy.noLanguagePenalty;
    reasons.push("Sem código de idioma");
  }

  try {
    profilePhotos = await getTelegramUserProfilePhotoCount(user.id as string | number);
    if (profilePhotos === 0) {
      score += policy.photoPenalty;
      reasons.push("Sem foto de perfil");
    }
  } catch {
    score += 5;
    reasons.push("Não foi possível verificar foto de perfil");
  }

  if (firstName && lastName && looksRandomText(`${firstName}${lastName}`)) {
    score += policy.randomDisplayNamePenalty;
    reasons.push("Nome completo parece aleatório");
    strongSignals.push("nome_completo_random");
  }

  return {
    score,
    reasons,
    strongSignals,
    isBot,
    profilePhotos,
    username: username || null,
    displayName: displayName || null,
    policy,
  };
}

async function telegramRequest(method: string, payload: Record<string, string | number | boolean>) {
  const res = await fetch(telegramApiUrl(method), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams(
      Object.entries(payload).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {}),
    ),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.description || `${method} failed (${res.status})`);
  }

  return data.result;
}

async function getTelegramWebhookInfo() {
  return await telegramRequest("getWebhookInfo", {});
}

function sanitizeTelegramWebhookInfo(info: Record<string, unknown>) {
  return {
    url: typeof info.url === "string" ? info.url : "",
    pending_update_count: typeof info.pending_update_count === "number" ? info.pending_update_count : 0,
    last_error_date: typeof info.last_error_date === "number" ? info.last_error_date : null,
    last_error_message: typeof info.last_error_message === "string" ? info.last_error_message : null,
    max_connections: typeof info.max_connections === "number" ? info.max_connections : null,
    allowed_updates: Array.isArray(info.allowed_updates) ? info.allowed_updates : [],
    has_custom_certificate: info.has_custom_certificate === true,
  };
}

async function configureTelegramBotSurface() {
  await telegramRequest("setMyCommands", {
    commands: stringifyJson([
      { command: "start", description: "Abrir o catalogo" },
      { command: "catalogo", description: "Ver series disponiveis" },
      { command: "continuar", description: "Retomar ultima serie" },
      { command: "recomendar", description: "Receber recomendacoes" },
      { command: "paysupport", description: "Ajuda com pagamentos" },
      { command: "menu", description: "Mostrar opcoes" },
      { command: "ajuda", description: "Receber ajuda" },
    ]),
  });

  await telegramRequest("setChatMenuButton", {
    menu_button: stringifyJson({
      type: "web_app",
      text: "Mini App",
      web_app: { url: SERIES_WEBAPP_URL },
    }),
  });
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function textEncode(value: string) {
  return new TextEncoder().encode(value);
}

function textDecode(value: Uint8Array) {
  return new TextDecoder().decode(value);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

async function sha256Hex(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", textEncode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function validateOwnerPassword(password: string) {
  const submitted = String(password ?? "");
  if (!submitted) return false;

  const configuredPassword = OWNER_AREA_PASSWORD;
  if (configuredPassword && constantTimeEqual(submitted, configuredPassword)) {
    return true;
  }

  const configuredHash = OWNER_AREA_PASSWORD_SHA256.trim().toLowerCase();
  if (configuredHash) {
    return constantTimeEqual(await sha256Hex(submitted), configuredHash);
  }

  if (!configuredPassword) return false;

  return constantTimeEqual(submitted, configuredPassword);
}

async function deriveAesKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", textEncode(secret));
  return await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptChallenge(secret: string, payload: Record<string, unknown>) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(secret);
  const encoded = textEncode(JSON.stringify(payload));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded));
  return `${base64UrlEncode(iv)}.${base64UrlEncode(cipher)}`;
}

async function decryptChallenge(secret: string, token: string) {
  const [ivPart, cipherPart] = token.split(".");
  if (!ivPart || !cipherPart) {
    throw new Error("Token de desafio inválido");
  }

  const iv = base64UrlDecode(ivPart);
  const cipher = base64UrlDecode(cipherPart);
  const key = await deriveAesKey(secret);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher));
  return JSON.parse(textDecode(plain)) as Record<string, unknown>;
}

async function validatePlaybackToken(fileId: string, token: string) {
  if (!fileId || !token) return false;

  try {
    const payload = await decryptChallenge(CAPTCHA_SECRET, token);
    const tokenFileId = String(payload.file_id ?? "");
    const expiresAt = Number(payload.expires_at ?? 0);
    return Boolean(
      tokenFileId &&
      constantTimeEqual(tokenFileId, fileId) &&
      expiresAt &&
      Math.floor(Date.now() / 1000) <= expiresAt
    );
  } catch {
    return false;
  }
}

function buildCaptchaQuestion() {
  const operators = [
    { label: "+", compute: (a: number, b: number) => a + b },
    { label: "-", compute: (a: number, b: number) => a - b },
    { label: "×", compute: (a: number, b: number) => a * b },
  ];

  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const left = operator.label === "-" && a < b ? b : a;
  const right = operator.label === "-" && a < b ? a : b;
  const answer = String(operator.compute(left, right));
  const question = `Quanto é ${left} ${operator.label} ${right}?`;

  return { question, answer };
}

async function buildCaptchaToken(update: {
  query_id?: string;
  user_id: number | string;
  chat_id: number | string;
  title?: string;
}) {
  const { question, answer } = buildCaptchaQuestion();
  const expiresAt = Math.floor(Date.now() / 1000) + CAPTCHA_MAX_AGE_SECONDS;
  const payload = {
    v: 1,
    query_id: update.query_id ?? "",
    user_id: String(update.user_id),
    chat_id: String(update.chat_id),
    title: update.title ?? "",
    answer,
    expires_at: expiresAt,
  };
  const token = await encryptChallenge(CAPTCHA_SECRET, payload);

  return {
    token: base64UrlEncode(
      textEncode(JSON.stringify({
        v: 1,
        q: question,
        exp: expiresAt,
        u: String(update.user_id),
        c: token,
      })),
    ),
    question,
  };
}

function parseWebAppInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash") || "";
  params.delete("hash");

  const checkString = [...params.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) => {
      if (aKey === bKey) return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return aKey < bKey ? -1 : 1;
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  return { hash, checkString, params };
}

async function validateWebAppInitData(initData: string) {
  if (!initData) {
    throw new Error("Dados do Telegram ausentes");
  }

  const { hash, checkString, params } = parseWebAppInitData(initData);
  if (!hash) {
    throw new Error("Hash ausente");
  }

  const webAppKey = await crypto.subtle.importKey(
    "raw",
    textEncode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const derivedKeyBytes = await crypto.subtle.sign("HMAC", webAppKey, textEncode(TELEGRAM_BOT_TOKEN));
  const signingKey = await crypto.subtle.importKey(
    "raw",
    derivedKeyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedHashBytes = new Uint8Array(await crypto.subtle.sign("HMAC", signingKey, textEncode(checkString)));
  const expectedHash = Array.from(expectedHashBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  if (!constantTimeEqual(hash, expectedHash)) {
    throw new Error("Dados do Telegram inválidos");
  }

  const authDate = Number(params.get("auth_date") || "0");
  if (!authDate || Number.isNaN(authDate)) {
    throw new Error("auth_date ausente");
  }

  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age < 0 || age > WEBAPP_MAX_AGE_SECONDS) {
    throw new Error("Sessão do Telegram expirada");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("Usuário do Telegram ausente");
  }

  const user = JSON.parse(userRaw) as { id?: number | string; is_bot?: boolean };
  if (!user?.id || user.is_bot) {
    throw new Error("Usuário do Telegram inválido");
  }

  return { userId: String(user.id), user, authDate };
}

async function telegramGetFile(fileId: string) {
  const url = new URL(telegramApiUrl("getFile"));
  url.searchParams.set("file_id", fileId);

  const res = await fetch(url.toString());
  const payload = await res.json();

  if (!res.ok || !payload.ok) {
    throw new Error(payload?.description || `Telegram getFile failed (${res.status})`);
  }

  return payload.result as { file_path: string };
}

async function downloadTelegramFileAsVideo(fileId: string, title: string) {
  const { file_path } = await telegramGetFile(fileId);
  if (!file_path) {
    throw new Error("Telegram file_path ausente");
  }

  const upstreamUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file_path}`;
  const upstream = await fetch(upstreamUrl);
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    throw new Error(detail || `Telegram download failed (${upstream.status})`);
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  const contentType = upstream.headers.get("content-type") || "video/mp4";
  const fallbackName = `${safeFilename(title || fileId)}.mp4`;

  return new File([bytes], fallbackName, { type: contentType });
}

async function sendChatJoinRequestWebApp(chatJoinRequestQueryId: string, webAppUrl: string) {
  return await telegramRequest("sendChatJoinRequestWebApp", {
    chat_join_request_query_id: chatJoinRequestQueryId,
    web_app_url: webAppUrl,
  });
}

async function answerChatJoinRequestQuery(
  chatJoinRequestQueryId: string,
  result: "approve" | "decline" | "queue",
) {
  return await telegramRequest("answerChatJoinRequestQuery", {
    chat_join_request_query_id: chatJoinRequestQueryId,
    result,
  });
}

async function sendCaptchaInvitation(chatId: string | number, webAppUrl: string) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: "Abra a verificação para confirmar sua entrada.",
    reply_markup: JSON.stringify({
      inline_keyboard: [[{ text: "Abrir verificação", web_app: { url: webAppUrl } }]],
    }),
  });
}

async function approveChatJoinRequest(chatId: string | number, userId: string | number) {
  return await telegramRequest("approveChatJoinRequest", {
    chat_id: chatId,
    user_id: userId,
  });
}

async function declineChatJoinRequest(chatId: string | number, userId: string | number) {
  return await telegramRequest("declineChatJoinRequest", {
    chat_id: chatId,
    user_id: userId,
  });
}

async function answerTelegramPreCheckout(queryId: string, ok: boolean, errorMessage = "") {
  return await telegramRequest("answerPreCheckoutQuery", {
    pre_checkout_query_id: queryId,
    ok,
    ...(ok || !errorMessage ? {} : { error_message: errorMessage.slice(0, 200) }),
  });
}

async function handleTelegramPreCheckoutQuery(req: Request, update: Record<string, unknown>) {
  const query = update.pre_checkout_query as Record<string, unknown> | undefined;
  if (!query) return null;

  const queryId = String(query.id ?? "").trim();
  const orderId = String(query.invoice_payload ?? "").trim();
  const user = query.from as Record<string, unknown> | undefined;
  const userId = String(user?.id ?? "").trim();
  const currency = String(query.currency ?? "").trim().toUpperCase();
  const totalAmount = Math.round(Number(query.total_amount ?? 0) || 0);
  if (!queryId) return json(req, { ok: false, error: "Consulta de pagamento sem identificador" }, 400);

  try {
    const order = orderId ? await getPaymentOrderById(orderId) as Record<string, unknown> | null : null;
    const validationError = order
      ? validateTelegramStarsPaymentForOrder(order, query, userId)
      : "Pedido nao encontrado";
    const valid = Boolean(
      order
      && !validationError
      && !["approved", "refunded", "charged_back"].includes(String(order.status ?? "").toLowerCase())
    );

    if (!valid || !order) {
      await answerTelegramPreCheckout(queryId, false, "Este pedido nao esta mais disponivel. Abra o catalogo e tente novamente.");
      return json(req, { ok: true, action: "telegram_pre_checkout_rejected" });
    }

    const itemIds = (Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [])
      .map((item) => String(item.id ?? item.serie_id ?? item.series_id ?? "").trim())
      .filter(Boolean);
    const accessible = isOwnerUserId(userId) ? new Set<string>() : await getAccessibleSeriesIds(userId);
    if (itemIds.some((seriesId) => accessible.has(seriesId))) {
      await answerTelegramPreCheckout(queryId, false, "Voce ja possui acesso a um dos itens deste pedido.");
      return json(req, { ok: true, action: "telegram_pre_checkout_already_owned" });
    }

    await answerTelegramPreCheckout(queryId, true);
    await recordAppEvent({
      eventName: "telegram_pre_checkout_approved",
      userId,
      orderId,
      metadata: { provider_currency: "XTR", provider_amount: totalAmount },
    });
    return json(req, { ok: true, action: "telegram_pre_checkout_approved" });
  } catch (error) {
    await answerTelegramPreCheckout(queryId, false, "Nao foi possivel validar o pedido agora. Tente novamente.").catch(() => null);
    console.error("[PAYMENT] Falha no pre-checkout do Telegram:", error instanceof Error ? error.message : String(error));
    return json(req, { ok: true, action: "telegram_pre_checkout_failed" });
  }
}

async function handleTelegramSuccessfulPayment(
  req: Request,
  message: Record<string, unknown>,
  payment: Record<string, unknown>,
) {
  const orderId = String(payment.invoice_payload ?? "").trim();
  const chargeId = String(payment.telegram_payment_charge_id ?? "").trim();
  const providerChargeId = String(payment.provider_payment_charge_id ?? "").trim();
  const currency = String(payment.currency ?? "").trim().toUpperCase();
  const totalAmount = Math.round(Number(payment.total_amount ?? 0) || 0);
  const from = message.from as Record<string, unknown> | undefined;
  const userId = String(from?.id ?? "").trim();
  const order = orderId ? await getPaymentOrderById(orderId) as Record<string, unknown> | null : null;

  const validationError = order
    ? validateTelegramStarsPaymentForOrder(order, payment, userId)
    : "Pedido nao encontrado";
  if (!order || validationError || !chargeId) {
    console.error("[PAYMENT] successful_payment do Telegram rejeitado por divergencia", orderId);
    return json(req, { ok: false, error: "Pagamento divergente do pedido" }, 409);
  }

  const alreadyApproved = String(order.status ?? "").toLowerCase() === "approved";
  if (alreadyApproved && String(order.telegram_payment_charge_id ?? "") !== chargeId) {
    return json(req, { ok: false, error: "Pedido ja vinculado a outro pagamento" }, 409);
  }

  let approvedOrder = alreadyApproved ? order : await updatePaymentOrderRecord(orderId, {
    status: "approved",
    external_payment_id: chargeId,
    telegram_payment_charge_id: chargeId,
    telegram_provider_charge_id: providerChargeId || null,
    confirmed_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    last_event_at: new Date().toISOString(),
    error_message: null,
    webhook_payload: { source: "telegram_successful_payment", currency, total_amount: totalAmount },
  }) as Record<string, unknown>;

  await grantOrderEntitlements(approvedOrder);
  await updateCouponRedemption(orderId, "applied");
  const deliverySummary = await deliverApprovedOrderSeries(approvedOrder);
  approvedOrder = await getPaymentOrderById(orderId) as Record<string, unknown> || approvedOrder;

  if (!alreadyApproved) {
    await recordAppEvent({
      eventName: "payment_approved",
      userId,
      orderId,
      metadata: {
        payment_method: "telegram_checkout",
        payment_provider: "telegram_stars",
        provider_currency: "XTR",
        provider_amount: totalAmount,
        delivery_status: deliverySummary.deliveryStatus,
      },
    });
    await recordAppEvent({
      eventName: "purchase_completed",
      userId,
      orderId,
      metadata: {
        payment_provider: "telegram_stars",
        provider_currency: "XTR",
        provider_amount: totalAmount,
      },
    });
  }

  if (!approvedOrder.delivery_notification_sent_at) {
    await sendPaymentConfirmationMessage(approvedOrder, { status_detail: "Confirmado pelo Telegram" }, deliverySummary);
    approvedOrder = await updatePaymentOrderRecord(orderId, {
      delivery_notification_sent_at: new Date().toISOString(),
    }) as Record<string, unknown>;
  }

  return json(req, {
    ok: true,
    action: alreadyApproved ? "telegram_payment_replayed" : "telegram_payment_approved",
    order_id: orderId,
    delivery_status: approvedOrder.delivery_status ?? deliverySummary.deliveryStatus,
  });
}

async function handleTelegramRefundedPayment(
  req: Request,
  payment: Record<string, unknown>,
) {
  const orderId = String(payment.invoice_payload ?? "").trim();
  const chargeId = String(payment.telegram_payment_charge_id ?? "").trim();
  const order = orderId ? await getPaymentOrderById(orderId) as Record<string, unknown> | null : null;
  const userId = String(order?.user_id ?? "").trim();
  const validationError = order
    ? validateTelegramStarsPaymentForOrder(order, payment, userId)
    : "Pedido nao encontrado";

  if (
    !order
    || validationError
    || !chargeId
    || String(order.telegram_payment_charge_id ?? "").trim() !== chargeId
  ) {
    console.error("[PAYMENT] refunded_payment do Telegram rejeitado por divergencia", orderId);
    return json(req, { ok: false, error: "Estorno divergente do pedido" }, 409);
  }

  if (String(order.status ?? "").toLowerCase() !== "refunded") {
    await updatePaymentOrderRecord(orderId, {
      status: "refunded",
      refunded_at: new Date().toISOString(),
      delivery_status: "revoked",
      last_event_at: new Date().toISOString(),
      webhook_payload: {
        source: "telegram_refunded_payment",
        currency: String(payment.currency ?? "").toUpperCase(),
        total_amount: Math.round(Number(payment.total_amount ?? 0) || 0),
      },
    });
    await revokeOrderEntitlements(orderId, "refunded");
    await recordAppEvent({
      eventName: "purchase_refunded",
      userId,
      orderId,
      metadata: { payment_provider: "telegram_stars" },
    });
  }

  return json(req, { ok: true, action: "telegram_payment_refunded", order_id: orderId });
}

async function handleTelegramUserMessage(req: Request, update: Record<string, unknown>) {
  const message = getUpdateMessage(update);
  if (!message) {
    return json(req, { ok: true, ignored: true });
  }

  const chat = message.chat as Record<string, unknown> | undefined;
  const from = message.from as Record<string, unknown> | undefined;
  const chatType = typeof chat?.type === "string" ? chat.type : "";
  const chatId = chat?.id as string | number | undefined;
  const senderUserId = from?.id == null ? "" : String(from.id);
  const isOwnerSender = senderUserId === String(OWNER_TELEGRAM_USER_ID);
  if (chatId == null) {
    return json(req, { ok: true, ignored: true });
  }

  const successfulPayment = message.successful_payment as Record<string, unknown> | undefined;
  if (successfulPayment) {
    return await handleTelegramSuccessfulPayment(req, message, successfulPayment);
  }

  const refundedPayment = message.refunded_payment as Record<string, unknown> | undefined;
  if (refundedPayment) {
    return await handleTelegramRefundedPayment(req, refundedPayment);
  }

  const mediaFileEntries = getTelegramMediaFileEntries(message);
  if (chatType === "private" && isOwnerSender && mediaFileEntries.length) {
    const bindingSeriesId = resolveOwnerSeriesBindingId(message);
    const targetEntry = pickOwnerSeriesVideoEntry(mediaFileEntries);
    if (bindingSeriesId && targetEntry?.fileId) {
      try {
        const updatedRow = await updateSeriesVideoFileId(bindingSeriesId, targetEntry.fileId);
        await sendTelegramFileIdMessage(chatId, mediaFileEntries);
        await telegramRequest("sendMessage", {
          chat_id: chatId,
          text: [
            "File_ID vinculado com sucesso.",
            `Serie ID: ${bindingSeriesId}`,
            `Titulo: ${String((updatedRow as Record<string, unknown>)?.[SERIES_TITLE_COLUMN] ?? "").trim() || "-"}`,
          ].join("\n"),
          reply_markup: stringifyJson({
            inline_keyboard: [
              [{ text: "Abrir serie no Mini App", web_app: { url: buildSeriesLaunchUrl(bindingSeriesId) } }],
              [{ text: "Abrir catalogo", web_app: { url: SERIES_WEBAPP_URL } }],
            ],
          }),
        });
        return json(req, { ok: true, action: "file_id_bound", count: mediaFileEntries.length, series_id: bindingSeriesId });
      } catch (error) {
        await sendTelegramFileIdMessage(chatId, mediaFileEntries);
        await telegramRequest("sendMessage", {
          chat_id: chatId,
          text: `Recebi a midia, mas nao consegui vincular o File_ID automaticamente: ${error instanceof Error ? error.message : String(error)}`,
        });
        return json(req, { ok: true, action: "file_id_bind_failed", count: mediaFileEntries.length, series_id: bindingSeriesId });
      }
    }

    await sendTelegramFileIdMessage(chatId, mediaFileEntries);
    return json(req, { ok: true, action: "file_id_sent", count: mediaFileEntries.length });
  }

  const webAppData = message.web_app_data as Record<string, unknown> | undefined;
  const webAppDataRaw = typeof webAppData?.data === "string" ? webAppData.data.trim() : "";
  if (webAppDataRaw) {
    const payload = parseAppPayload(webAppDataRaw);
    if (payload?.action === "play_video") {
      const serieId = String(payload.serie_id ?? "").trim();
      const title = String(payload.title ?? "").trim();
      if (serieId) {
        await sendSeriesLaunchPrompt(chatId, serieId, await resolveSeriesTitle(serieId, title));
        return json(req, { ok: true, action: "web_app_playback_received" });
      }
    }

    if (payload?.action === "checkout_cart") {
      const rawItems = payload.items;
      const itemCount = Array.isArray(rawItems) ? rawItems.length : Number(payload.item_count ?? 0);
      const totalValue = Number(payload.total ?? 0);
      const total = Number.isFinite(totalValue)
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)
        : String(payload.total ?? "R$ 0,00");
      await sendCheckoutAck(chatId, Number.isFinite(itemCount) && itemCount > 0 ? itemCount : 0, total);
      return json(req, { ok: true, action: "checkout_received" });
    }
  }

  const text = typeof message.text === "string" ? message.text.trim() : "";
  if (text.startsWith("/start")) {
    const startPayload = text.replace(/^\/start(?:@\w+)?\s*/i, "").trim();
    if (startPayload.startsWith("play_")) {
      const serieId = startPayload.slice("play_".length).trim();
      if (serieId) {
        await sendSeriesLaunchPrompt(chatId, serieId, await resolveSeriesTitle(serieId));
        return json(req, { ok: true, action: "start_playback_received" });
      }
    }
    if (startPayload.startsWith("checkout_")) {
      const orderId = startPayload.slice("checkout_".length).trim();
      if (orderId) {
        const order = await getPaymentOrderById(orderId);
        if (order) {
          if (String(order.status ?? "").toLowerCase() === "approved") {
            await sendPaymentConfirmationMessage(order as Record<string, unknown>, { status_detail: "Pagamento já confirmado." });
          } else {
            await sendPaymentCreatedMessage(order as Record<string, unknown>);
          }
          return json(req, { ok: true, action: "start_checkout_received" });
        }
      }
    }
    if (startPayload === "continue") {
      await sendContinueWatchingMessage(chatId, String(chatId));
      return json(req, { ok: true, action: "start_continue_sent" });
    }
    if (startPayload === "recommend") {
      await sendRecommendationsMessage(chatId, String(chatId));
      return json(req, { ok: true, action: "start_recommend_sent" });
    }
    if (startPayload.startsWith("fileid_")) {
      if (!isOwnerSender) {
        await sendBotWelcomeMessageRich(chatId);
        return json(req, { ok: true, action: "owner_only_hidden" });
      }
      const seriesId = startPayload.slice("fileid_".length).trim();
      if (seriesId) {
        await sendOwnerSeriesFileIdCapturePrompt(chatId, seriesId);
        return json(req, { ok: true, action: "start_fileid_series_prompt_sent", series_id: seriesId });
      }
    }
    await sendBotWelcomeMessageRich(chatId);
    return json(req, { ok: true, action: "start_welcome_sent" });
  }

  if (/^(?:\/menu|menu|\/catalogo|catalogo|\/catálogo|catálogo|\/ajuda|ajuda|\/help|help)$/i.test(text)) {
    await sendBotWelcomeMessageRich(chatId);
    return json(req, { ok: true, action: "menu_sent" });
  }

  if (/^(?:\/continuar|continuar)$/i.test(text)) {
    await sendContinueWatchingMessage(chatId, String(chatId));
    return json(req, { ok: true, action: "continue_sent" });
  }

  if (/^(?:\/recomendar|recomendar|\/recomendacoes|recomendacoes)$/i.test(text)) {
    await sendRecommendationsMessage(chatId, String(chatId));
    return json(req, { ok: true, action: "recommend_sent" });
  }

  if (/^\/paysupport(?:@\w+)?$/i.test(text)) {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "Para ajuda com pagamento ou entrega, abra o suporte e informe o codigo do pedido.",
      reply_markup: stringifyJson({
        inline_keyboard: [[{ text: "Abrir suporte", web_app: { url: `${SERIES_WEBAPP_URL.replace(/\/$/, "")}/ajuda` } }]],
      }),
    });
    return json(req, { ok: true, action: "payment_support_sent" });
  }

  if (/^(?:\/fileid|fileid)(?:\s+[A-Za-z0-9_-]+)?$/i.test(text)) {
    if (!isOwnerSender) {
      await sendBotWelcomeMessageRich(chatId);
      return json(req, { ok: true, action: "owner_only_hidden" });
    }
    const boundSeriesId = extractSeriesBindingIdFromText(text);
    if (boundSeriesId) {
      await sendOwnerSeriesFileIdCapturePrompt(chatId, boundSeriesId);
      return json(req, { ok: true, action: "fileid_series_prompt_sent", series_id: boundSeriesId });
    }
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: [
        "Envie uma foto, vídeo, documento, áudio ou outro arquivo no privado.",
        "Eu vou responder com o File_ID e o File Unique ID da mídia enviada.",
      ].join("\n"),
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: "Mini App", web_app: { url: SERIES_WEBAPP_URL } }],
          [{ text: "Suporte", url: SUPPORT_URL }],
        ],
      }),
    });
    return json(req, { ok: true, action: "fileid_help_sent" });
  }

  if (chatType === "private" && text) {
    await sendBotWelcomeMessageRich(chatId);
    return json(req, { ok: true, action: "private_help_sent" });
  }

  return json(req, { ok: true, ignored: true });
}

async function proxyTelegramFile(req: Request, fileId: string, title = "") {
  if (!TELEGRAM_BOT_TOKEN) {
    return json(req, { error: "TELEGRAM_BOT_TOKEN não configurado" }, 500);
  }

  let file_path = "";
  try {
    ({ file_path } = await telegramGetFile(fileId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(
      req,
      {
        error: message,
        type: "internal_player_unavailable",
        title,
      },
      message.toLowerCase().includes("file is too big") ? 422 : 500,
    );
  }
  const upstreamUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file_path}`;
  const range = req.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: range ? { Range: range } : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(
      req,
      {
        error: message || "Telegram file fetch failed",
        type: "internal_player_unavailable",
        title,
      },
      502,
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return json(
      req,
      {
        error: detail || `Telegram file request failed (${upstream.status})`,
        type: "internal_player_unavailable",
        title,
      },
      upstream.status,
    );
  }

  const headers = new Headers(corsHeaders(req));
  headers.set("cache-control", "no-store");
  headers.set("accept-ranges", upstream.headers.get("accept-ranges") || "bytes");
  headers.set("content-type", upstream.headers.get("content-type") || "video/mp4");
  headers.set(
    "content-disposition",
    `inline; filename="${safeFilename(title)}.mp4"`,
  );

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("content-range", contentRange);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

function getUpdateChatJoinRequest(update: Record<string, unknown>): {
  queryId: string;
  chatId: string | number;
  userId: string | number;
  userChatId: string | number | null;
  title: string;
} | null {
  const chatJoinRequest = update.chat_join_request as Record<string, unknown> | undefined;
  if (!chatJoinRequest) return null;

  const chat = chatJoinRequest.chat as Record<string, unknown> | undefined;
  const user = chatJoinRequest.from as Record<string, unknown> | undefined;
  const queryId = typeof chatJoinRequest.query_id === "string" ? chatJoinRequest.query_id : "";
  const rawUserChatId = chatJoinRequest.user_chat_id;
  const chatId = chat?.id as string | number | null | undefined;
  const userId = user?.id as string | number | null | undefined;

  if (chatId == null || userId == null) {
    return null;
  }

  return {
    queryId,
    chatId,
    userId,
    userChatId: (typeof rawUserChatId === "string" || typeof rawUserChatId === "number") ? rawUserChatId : null,
    title: typeof chat?.title === "string" ? chat.title : typeof chat?.username === "string" ? chat.username : "",
  };
}

function getUpdateChatMember(update: Record<string, unknown>) {
  const chatMember = update.chat_member as Record<string, unknown> | undefined;
  if (!chatMember) return null;

  const chat = chatMember.chat as Record<string, unknown> | undefined;
  const oldChatMember = chatMember.old_chat_member as Record<string, unknown> | undefined;
  const newChatMember = chatMember.new_chat_member as Record<string, unknown> | undefined;
  const oldStatus = typeof oldChatMember?.status === "string" ? oldChatMember.status : "";
  const newStatus = typeof newChatMember?.status === "string" ? newChatMember.status : "";
  const oldUser = oldChatMember?.user as Record<string, unknown> | undefined;
  const newUser = newChatMember?.user as Record<string, unknown> | undefined;

  if (!chat || !newUser || !isTargetPublicChannel(chat)) {
    return null;
  }

  const chatId = chat.id as string | number | undefined;
  const userId = newUser.id as string | number | undefined;
  if (chatId == null || userId == null) {
    return null;
  }

  const joined =
    (oldStatus === "left" || oldStatus === "kicked" || oldStatus === "") &&
    (newStatus === "member" || newStatus === "administrator" || newStatus === "creator");

  return {
    chat,
    chatId,
    oldStatus,
    newStatus,
    joined,
    user: newUser,
    userId,
    userName: typeof newUser.username === "string" ? newUser.username : "",
    displayName: [newUser.first_name, newUser.last_name].filter((value) => typeof value === "string" && value.trim()).join(" "),
    oldUserId: oldUser?.id as string | number | undefined,
  };
}

function getUpdateMessage(update: Record<string, unknown>) {
  const message = update.message as Record<string, unknown> | undefined;
  if (message) return message;

  const editedMessage = update.edited_message as Record<string, unknown> | undefined;
  return editedMessage ?? null;
}

function getUpdateChannelPost(update: Record<string, unknown>) {
  const channelPost = update.channel_post as Record<string, unknown> | undefined;
  if (channelPost) return { message: channelPost, edited: false };

  const editedChannelPost = update.edited_channel_post as Record<string, unknown> | undefined;
  if (editedChannelPost) return { message: editedChannelPost, edited: true };

  return null;
}

function getPublicChannelPostActor(message: Record<string, unknown>) {
  const from = message.from as Record<string, unknown> | undefined;
  const viaBot = message.via_bot as Record<string, unknown> | undefined;
  const senderChat = message.sender_chat as Record<string, unknown> | undefined;
  const forwardFromChat = message.forward_from_chat as Record<string, unknown> | undefined;

  return {
    authorSignature: typeof message.author_signature === "string" ? message.author_signature : "",
    fromUserId: from?.id == null ? "" : String(from.id),
    fromUsername: normalizeHandle(from?.username),
    fromDisplayName: [from?.first_name, from?.last_name]
      .filter((value) => typeof value === "string" && value.trim())
      .join(" "),
    viaBotId: viaBot?.id == null ? "" : String(viaBot.id),
    viaBotUsername: normalizeHandle(viaBot?.username),
    viaBotName: typeof viaBot?.first_name === "string" ? viaBot.first_name : "",
    senderChatId: senderChat?.id == null ? "" : String(senderChat.id),
    senderChatUsername: normalizeHandle(senderChat?.username),
    senderChatTitle: typeof senderChat?.title === "string" ? senderChat.title : "",
    forwardChatId: forwardFromChat?.id == null ? "" : String(forwardFromChat.id),
    forwardChatUsername: normalizeHandle(forwardFromChat?.username),
    forwardChatTitle: typeof forwardFromChat?.title === "string" ? forwardFromChat.title : "",
  };
}

function matchPublicChannelCleanup(message: Record<string, unknown>) {
  const actor = getPublicChannelPostActor(message);
  const reasons: string[] = [];

  if (!PUBLIC_CHANNEL_POST_CLEANUP_ENABLED) {
    return { shouldDelete: false, reasons, actor };
  }

  if (actor.fromUserId && PUBLIC_CHANNEL_DELETE_ADMIN_USER_IDS.has(actor.fromUserId)) {
    reasons.push(`user_id:${actor.fromUserId}`);
  }
  if (actor.fromUsername && PUBLIC_CHANNEL_DELETE_ADMIN_USERNAMES.has(actor.fromUsername)) {
    reasons.push(`username:${actor.fromUsername}`);
  }
  if (actor.viaBotId && PUBLIC_CHANNEL_DELETE_VIA_BOT_IDS.has(actor.viaBotId)) {
    reasons.push(`via_bot_id:${actor.viaBotId}`);
  }
  if (actor.viaBotUsername && PUBLIC_CHANNEL_DELETE_VIA_BOT_USERNAMES.has(actor.viaBotUsername)) {
    reasons.push(`via_bot_username:${actor.viaBotUsername}`);
  }

  for (const label of [
    actor.authorSignature,
    actor.fromDisplayName,
    actor.viaBotName,
    actor.senderChatTitle,
    actor.forwardChatTitle,
    actor.senderChatUsername,
    actor.forwardChatUsername,
  ]) {
    if (labelMatchesConfiguredSet(label, PUBLIC_CHANNEL_DELETE_ADMIN_LABELS)) {
      reasons.push(`label:${normalizeMatchLabel(label)}`);
    }
  }

  return {
    shouldDelete: reasons.length > 0,
    reasons: [...new Set(reasons)],
    actor,
  };
}

function getMessageType(message: Record<string, unknown>) {
  if (typeof message.text === "string" && message.text.trim()) return "text";
  if (typeof message.caption === "string" && message.caption.trim()) return "caption";
  if (Array.isArray(message.photo) && message.photo.length > 0) return "photo";
  if (message.video) return "video";
  if (message.document) return "document";
  if (message.animation) return "animation";
  if (message.audio) return "audio";
  if (message.voice) return "voice";
  if (message.video_note) return "video_note";
  if (message.sticker) return "sticker";
  return "unknown";
}

function getTelegramFileEntry(value: unknown, label: string) {
  const media = value as Record<string, unknown> | undefined;
  const fileId = typeof media?.file_id === "string" ? media.file_id.trim() : "";
  if (!fileId) return null;

  return {
    label,
    fileId,
    uniqueId: typeof media?.file_unique_id === "string" ? media.file_unique_id : "",
    fileName: typeof media?.file_name === "string" ? media.file_name : "",
    mimeType: typeof media?.mime_type === "string" ? media.mime_type : "",
    fileSize: typeof media?.file_size === "number" ? media.file_size : null,
    width: typeof media?.width === "number" ? media.width : null,
    height: typeof media?.height === "number" ? media.height : null,
    duration: typeof media?.duration === "number" ? media.duration : null,
  };
}

function getTelegramMediaFileEntries(message: Record<string, unknown>) {
  const entries = [];

  const photos = Array.isArray(message.photo) ? message.photo : [];
  if (photos.length) {
    const largestPhoto = photos
      .filter((photo) => photo && typeof photo === "object")
      .sort((left, right) => {
        const leftSize = Number((left as Record<string, unknown>).file_size ?? 0);
        const rightSize = Number((right as Record<string, unknown>).file_size ?? 0);
        return leftSize - rightSize;
      })
      .at(-1);
    const photoEntry = getTelegramFileEntry(largestPhoto, "Imagem");
    if (photoEntry) entries.push(photoEntry);
  }

  for (const [key, label] of [
    ["video", "Video"],
    ["document", "Documento"],
    ["animation", "Animacao"],
    ["audio", "Audio"],
    ["voice", "Voz"],
    ["video_note", "Video circular"],
    ["sticker", "Sticker"],
  ] as const) {
    const entry = getTelegramFileEntry(message[key], label);
    if (entry) entries.push(entry);
  }

  return entries;
}

function formatTelegramFileIdMessage(entries: ReturnType<typeof getTelegramMediaFileEntries>) {
  const lines = entries.length === 1
    ? ["File_ID encontrado:"]
    : ["File_IDs encontrados:"];

  entries.forEach((entry, index) => {
    if (entries.length > 1) lines.push("");
    lines.push(`${entries.length > 1 ? `${index + 1}. ` : ""}Tipo: ${entry.label}`);
    if (entry.fileName) lines.push(`Arquivo: ${entry.fileName}`);
    if (entry.mimeType) lines.push(`MIME: ${entry.mimeType}`);
    if (entry.width && entry.height) lines.push(`Dimensoes: ${entry.width}x${entry.height}`);
    if (entry.duration) lines.push(`Duracao: ${entry.duration}s`);
    if (entry.fileSize) lines.push(`Tamanho: ${entry.fileSize} bytes`);
    if (entry.uniqueId) lines.push(`File Unique ID: ${entry.uniqueId}`);
    lines.push("File_ID:");
    lines.push(entry.fileId);
  });

  return lines.join("\n");
}

async function sendTelegramFileIdMessage(chatId: string | number, entries: ReturnType<typeof getTelegramMediaFileEntries>) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: formatTelegramFileIdMessage(entries),
  });
}

function parseAppPayload(rawValue: string) {
  try {
    const payload = JSON.parse(rawValue) as Record<string, unknown>;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

async function resolveSeriesTitle(serieId: string, fallbackTitle = "") {
  try {
    const row = await getSeriesById(serieId);
    if (!row) return fallbackTitle;

    const title = String((row as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? "").trim();
    return title || fallbackTitle;
  } catch {
    return fallbackTitle;
  }
}

async function updateSeriesVideoFileId(seriesId: string, fileId: string) {
  const normalizedSeriesId = String(seriesId ?? "").trim();
  const normalizedFileId = normalizeTelegramFileIdInput(fileId);
  if (!normalizedSeriesId || !normalizedFileId) {
    throw new Error("Serie ou File_ID invalido");
  }

  const existingRow = await getSeriesById(normalizedSeriesId);
  if (!existingRow) {
    throw new Error("Serie nao encontrada");
  }

  const rowPayload: Record<string, unknown> = {
    [PRIMARY_SERIES_VIDEO_FILE_ID_COLUMN]: normalizedFileId,
  };

  await supabaseRestRequest(
    buildSeriesRowFilter(normalizedSeriesId),
    {
      method: "PATCH",
      headers: {
        prefer: "return=representation",
        "content-type": "application/json",
      },
      body: JSON.stringify(rowPayload),
    },
  );

  return await getSeriesById(normalizedSeriesId);
}

function extractSeriesBindingIdFromText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const patterns = [
    /SCE_SERIES_ID=([A-Za-z0-9_-]+)/i,
    /\/vincular(?:@\w+)?\s+([A-Za-z0-9_-]+)/i,
    /\/serie(?:@\w+)?\s+([A-Za-z0-9_-]+)/i,
    /serie_id[:=\s]+([A-Za-z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return "";
}

function resolveOwnerSeriesBindingId(message: Record<string, unknown>) {
  const direct = [
    message.caption,
    message.text,
  ].map((value) => extractSeriesBindingIdFromText(value)).find(Boolean);
  if (direct) return direct;

  const replyTo = message.reply_to_message as Record<string, unknown> | undefined;
  if (!replyTo) return "";

  return [
    replyTo.text,
    replyTo.caption,
  ].map((value) => extractSeriesBindingIdFromText(value)).find(Boolean) || "";
}

function pickOwnerSeriesVideoEntry(entries: ReturnType<typeof getTelegramMediaFileEntries>) {
  const preferredLabels = new Set(["Video", "Documento", "Animacao", "Video circular"]);
  return entries.find((entry) => preferredLabels.has(entry.label)) || entries[0] || null;
}

async function sendOwnerSeriesFileIdCapturePrompt(chatId: string | number, seriesId: string) {
  const title = await resolveSeriesTitle(seriesId, "");
  const lines = [
    title ? `Captura de File_ID para: ${title}` : "Captura de File_ID da serie",
    `Serie ID: ${seriesId}`,
    `SCE_SERIES_ID=${seriesId}`,
    "",
    "Agora responda a esta mensagem com o video ou documento no privado.",
    "Se preferir, envie a midia com a legenda /vincular " + seriesId,
    "Quando eu receber a midia, vou tentar vincular o File_ID automaticamente.",
  ];

  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: lines.join("\n"),
    reply_markup: stringifyJson({
      inline_keyboard: [
        [{ text: "Abrir serie no Mini App", web_app: { url: buildSeriesLaunchUrl(seriesId) } }],
        [{ text: "Mini App", web_app: { url: SERIES_WEBAPP_URL } }],
      ],
    }),
  });
}

async function sendSeriesLaunchPrompt(chatId: string | number, serieId: string, title: string) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: title
      ? `Abrindo "${title}" no mini app.`
      : "Abrindo a série no mini app.",
    reply_markup: JSON.stringify({
      inline_keyboard: [[{
        text: "Abrir a série",
        web_app: { url: buildSeriesLaunchUrl(serieId) },
      }]],
    }),
  });
}

async function sendSeriesTelegramDelivery(chatId: string | number, fileId: string, title: string, isFree: boolean) {
  const captionLines = [
    isFree ? "Serie gratuita liberada." : "Serie liberada com sucesso.",
    title ? `Titulo: ${title}` : "",
    "Este video foi enviado com protecao dentro do Telegram.",
  ].filter(Boolean);

  return await telegramRequest("sendVideo", {
    chat_id: chatId,
    video: fileId,
    caption: captionLines.join("\n"),
    supports_streaming: true,
    protect_content: true,
    reply_markup: stringifyJson({
      inline_keyboard: [
        [{ text: "Abrir catalogo", web_app: { url: SERIES_WEBAPP_URL } }],
        [{ text: "Suporte", url: SUPPORT_URL }],
      ],
    }),
  });
}

async function sendCheckoutAck(chatId: string | number, itemCount: number, total: string) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: `Seu carrinho esta pronto: ${itemCount} item${itemCount === 1 ? "" : "s"} por ${total}.`,
    reply_markup: JSON.stringify({
      inline_keyboard: [[{
        text: "Abrir catálogo",
        web_app: { url: SERIES_WEBAPP_URL },
      }]],
    }),
  });
}

async function sendBotWelcomeMessage(chatId: string | number) {
  const text = [
    "Bem-vindo ao Series Express.",
    "Abra o catalogo e escolha sua proxima serie.",
    "Toque, assista e volte quando quiser.",
  ].join("\n");
  const replyMarkup = buildMainBotReplyMarkup();

  try {
    return await telegramRequest("sendPhoto", {
      chat_id: chatId,
      photo: WELCOME_LOGO_URL,
      caption: text,
      protect_content: true,
      reply_markup: replyMarkup,
    });
  } catch (error) {
    console.warn("[WELCOME] Falha ao enviar logo nas boas-vindas:", error instanceof Error ? error.message : String(error));
  }

  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    protect_content: true,
    reply_markup: replyMarkup,
  });
}

async function sendBotWelcomeMessageRich(chatId: string | number) {
  const text = [
    "Bem-vindo ao Series Express.",
    "Abra o Mini App e escolha sua proxima serie.",
    "Gratis para comecar. Pagas para liberar na hora.",
  ].join("\n");
  const replyMarkup = buildMainBotReplyMarkup();

  try {
    return await telegramRequest("sendPhoto", {
      chat_id: chatId,
      photo: WELCOME_LOGO_URL,
      caption: text,
      protect_content: true,
      reply_markup: replyMarkup,
    });
  } catch (error) {
    console.warn("[WELCOME] Falha ao enviar logo nas boas-vindas:", error instanceof Error ? error.message : String(error));
  }

  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    protect_content: true,
    reply_markup: replyMarkup,
  });
}

async function sendContinueWatchingMessage(chatId: string | number, userId: string) {
  const progress = await getLatestUserSeriesProgress(userId);
  if (!progress) {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "Ainda nao achei sua ultima serie. Abra o catalogo e comece agora.",
      reply_markup: stringifyJson({
        inline_keyboard: [[{ text: "Abrir catalogo", web_app: { url: SERIES_WEBAPP_URL } }]],
      }),
    });
    return;
  }

  const seriesId = String(progress.series_id ?? "").trim();
  const title = String(progress.series_title ?? "Sua serie").trim() || "Sua serie";
  const completion = Number(progress.completion_percent ?? 0) || 0;
  const position = Number(progress.last_position_seconds ?? 0) || 0;
  const duration = Number(progress.duration_seconds ?? 0) || 0;
  const summary = duration > 0
    ? `${Math.round(position / 60)} min de ${Math.round(duration / 60)} min`
    : `${Math.round(completion)}% concluido`;

  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: [
      `Voce parou em ${title}.`,
      `Falta pouco: ${summary}.`,
      "Toque abaixo para continuar.",
    ].join("\n"),
    reply_markup: stringifyJson({
      inline_keyboard: [[{ text: "Retomar serie", web_app: { url: buildSeriesLaunchUrl(seriesId) } }]],
    }),
  });
}

async function getRecommendedSeriesForUser(userId: string, limit = 3) {
  const [catalog, latestProgress] = await Promise.all([
    getSeriesList(userId),
    getLatestUserSeriesProgress(userId).catch(() => null),
  ]);

  const latestSeriesId = String(latestProgress?.series_id ?? "").trim();
  const latestCategory = String(latestProgress?.category ?? "").trim().toLowerCase();
  const series = Array.isArray(catalog) ? catalog as Record<string, unknown>[] : [];
  const playable = series.filter((row) => row.has_playback);

  const preferred = playable
    .filter((row) => String(row.id ?? "") !== latestSeriesId)
    .filter((row) => latestCategory ? String(row.category ?? "").trim().toLowerCase() === latestCategory : true)
    .sort((left, right) => Number(Boolean(right.has_access)) - Number(Boolean(left.has_access)));

  const fallback = playable
    .filter((row) => String(row.id ?? "") !== latestSeriesId)
    .sort((left, right) => Number(Boolean(right.is_free)) - Number(Boolean(left.is_free)));

  const merged: Record<string, unknown>[] = [];
  for (const item of [...preferred, ...fallback]) {
    if (merged.some((entry) => String(entry.id ?? "") === String(item.id ?? ""))) continue;
    merged.push(item);
    if (merged.length >= limit) break;
  }

  return merged;
}

async function sendRecommendationsMessage(chatId: string | number, userId: string) {
  const items = await getRecommendedSeriesForUser(userId, 3);
  if (!items.length) {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "Ainda nao separei recomendacoes. Abra o catalogo e eu aprendo seu gosto.",
      reply_markup: stringifyJson({
        inline_keyboard: [[{ text: "Abrir catalogo", web_app: { url: SERIES_WEBAPP_URL } }]],
      }),
    });
    return;
  }

  const buttons = items.map((item) => ([{
    text: String(item.title ?? "Abrir serie"),
    web_app: { url: buildSeriesLaunchUrl(String(item.id ?? "")) },
  }]));

  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: "Essas series podem te prender hoje:",
    reply_markup: stringifyJson({
      inline_keyboard: [
        ...buttons,
        [{ text: "Abrir catalogo completo", web_app: { url: SERIES_WEBAPP_URL } }],
      ],
    }),
  });
}

async function handleTelegramWebhook(req: Request) {
  if (!TELEGRAM_BOT_TOKEN) {
    return json(req, { ok: false, error: "TELEGRAM_BOT_TOKEN não configurado" }, 500);
  }

  if (TELEGRAM_WEBHOOK_SECRET) {
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token") || "";
    if (!constantTimeEqual(secretToken, TELEGRAM_WEBHOOK_SECRET)) {
      return json(req, { ok: false, error: "Webhook inválido" }, 403);
    }
  }

  const update = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!update) {
    return json(req, { ok: false, error: "Update inválido" }, 400);
  }

  const preCheckoutResponse = await handleTelegramPreCheckoutQuery(req, update);
  if (preCheckoutResponse) return preCheckoutResponse;

  const channelPostUpdate = getUpdateChannelPost(update);
  if (channelPostUpdate) {
    const channel = channelPostUpdate.message.chat as Record<string, unknown> | undefined;
    if (channel && isTargetPublicChannel(channel)) {
      const cleanup = matchPublicChannelCleanup(channelPostUpdate.message);
      await recordPublicChannelPost({
        channelId: channel.id as string | number,
        channelUsername: typeof channel.username === "string" ? channel.username : null,
        channelTitle: typeof channel.title === "string" ? channel.title : null,
        messageId: channelPostUpdate.message.message_id as string | number,
        date: typeof channelPostUpdate.message.date === "number" ? channelPostUpdate.message.date : null,
        authorSignature: typeof channelPostUpdate.message.author_signature === "string" ? channelPostUpdate.message.author_signature : null,
        messageType: getMessageType(channelPostUpdate.message),
        text: typeof channelPostUpdate.message.text === "string" ? channelPostUpdate.message.text : null,
        caption: typeof channelPostUpdate.message.caption === "string" ? channelPostUpdate.message.caption : null,
        rawUpdate: update,
      });

      if (cleanup.shouldDelete) {
        try {
          await deletePublicChannelMessage(
            channel.id as string | number,
            channelPostUpdate.message.message_id as string | number,
          );
          await sendModerationAlert(
            [
              "Limpeza automatica de publicacao no canal.",
              `Canal: ${typeof channel.title === "string" ? channel.title : typeof channel.username === "string" ? channel.username : String(channel.id ?? "")}`,
              `Mensagem: ${String(channelPostUpdate.message.message_id ?? "")}`,
              `Origem: ${cleanup.actor.authorSignature || cleanup.actor.senderChatTitle || cleanup.actor.fromDisplayName || cleanup.actor.fromUsername || cleanup.actor.viaBotUsername || "nao identificada"}`,
              `Motivos: ${cleanup.reasons.join("; ")}`,
            ].join("\n"),
          );
          return json(req, {
            ok: true,
            action: "public_channel_post_deleted",
            edited: channelPostUpdate.edited,
            reasons: cleanup.reasons,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await sendModerationAlert(
            [
              "Falha ao limpar publicacao no canal.",
              `Mensagem: ${String(channelPostUpdate.message.message_id ?? "")}`,
              `Erro: ${message}`,
              `Motivos: ${cleanup.reasons.join("; ")}`,
            ].join("\n"),
          );
          return json(req, {
            ok: true,
            action: "public_channel_post_delete_failed",
            edited: channelPostUpdate.edited,
            reasons: cleanup.reasons,
            error: message,
          });
        }
      }

      return json(req, {
        ok: true,
        action: "public_channel_post_audited",
        edited: channelPostUpdate.edited,
      });
    }
  }

  const joinRequest = getUpdateChatJoinRequest(update);
  if (!joinRequest) {
    const chatMemberUpdate = getUpdateChatMember(update);
    if (!chatMemberUpdate) {
      return await handleTelegramUserMessage(req, update);
    }

    if (!chatMemberUpdate.joined) {
      return json(req, { ok: true, ignored: true });
    }

    if (isPublicChannelAllowlisted(chatMemberUpdate.user)) {
      await recordPublicChannelAudit({
        chatId: chatMemberUpdate.chatId,
        chatUsername: typeof chatMemberUpdate.chat.username === "string" ? chatMemberUpdate.chat.username : null,
        chatTitle: typeof chatMemberUpdate.chat.title === "string" ? chatMemberUpdate.chat.title : null,
        userId: chatMemberUpdate.userId,
        username: chatMemberUpdate.userName || null,
        displayName: chatMemberUpdate.displayName || null,
        isBot: chatMemberUpdate.user.is_bot === true,
        joined: chatMemberUpdate.joined,
        decision: "allowlisted",
        analysisMode: null,
        score: null,
        reasons: [],
        strongSignals: [],
        profilePhotos: null,
        rawUpdate: update,
      });
      return json(req, {
        ok: true,
        action: "allowlisted",
        user_id: String(chatMemberUpdate.userId),
      });
    }

    const analysis = await analyzePublicChannelJoin(chatMemberUpdate.user);
    const shouldBan =
      analysis.isBot ||
      (analysis.score >= analysis.policy.banThreshold && analysis.strongSignals.length >= 2) ||
      (analysis.score >= analysis.policy.banThreshold + 15 && analysis.strongSignals.length >= 1);
    const safeName = chatMemberUpdate.displayName || chatMemberUpdate.userName || String(chatMemberUpdate.userId);
    const decision = shouldBan && PUBLIC_CHANNEL_AUTO_BAN
      ? "auto_banned"
      : analysis.score >= analysis.policy.alertThreshold
      ? "alerted"
      : "monitored";

    if (shouldBan && PUBLIC_CHANNEL_AUTO_BAN) {
      try {
        await banPublicChannelMember(chatMemberUpdate.chatId, chatMemberUpdate.userId);
        await sendModerationAlert(
          [
            `Modo: ${analysis.policy.mode}`,
            `Expulsão automática no canal público: ${safeName}`,
            `Score: ${analysis.score}`,
            `Limite de banimento: ${analysis.policy.banThreshold}`,
            `Motivos: ${analysis.reasons.join("; ") || "sem motivos adicionais"}`,
          ].join("\n"),
        );
        await recordPublicChannelAudit({
          chatId: chatMemberUpdate.chatId,
          chatUsername: typeof chatMemberUpdate.chat.username === "string" ? chatMemberUpdate.chat.username : null,
          chatTitle: typeof chatMemberUpdate.chat.title === "string" ? chatMemberUpdate.chat.title : null,
          userId: chatMemberUpdate.userId,
          username: chatMemberUpdate.userName || null,
          displayName: chatMemberUpdate.displayName || null,
          isBot: analysis.isBot,
          joined: chatMemberUpdate.joined,
          decision: "auto_banned",
          analysisMode: analysis.policy.mode,
          score: analysis.score,
          reasons: analysis.reasons,
          strongSignals: analysis.strongSignals,
          profilePhotos: analysis.profilePhotos,
          rawUpdate: update,
        });
        return json(req, {
          ok: true,
          action: "auto_banned",
          score: analysis.score,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await sendModerationAlert(
          [
            `Modo: ${analysis.policy.mode}`,
            `Falha ao expulsar membro suspeito no canal público: ${safeName}`,
            `Score: ${analysis.score}`,
            `Limite de banimento: ${analysis.policy.banThreshold}`,
            `Erro: ${message}`,
            `Motivos: ${analysis.reasons.join("; ") || "sem motivos adicionais"}`,
          ].join("\n"),
        );
        await recordPublicChannelAudit({
          chatId: chatMemberUpdate.chatId,
          chatUsername: typeof chatMemberUpdate.chat.username === "string" ? chatMemberUpdate.chat.username : null,
          chatTitle: typeof chatMemberUpdate.chat.title === "string" ? chatMemberUpdate.chat.title : null,
          userId: chatMemberUpdate.userId,
          username: chatMemberUpdate.userName || null,
          displayName: chatMemberUpdate.displayName || null,
          isBot: analysis.isBot,
          joined: chatMemberUpdate.joined,
          decision: "ban_failed",
          analysisMode: analysis.policy.mode,
          score: analysis.score,
          reasons: analysis.reasons,
          strongSignals: analysis.strongSignals,
          profilePhotos: analysis.profilePhotos,
          rawUpdate: update,
        });
        return json(req, {
          ok: true,
          action: "ban_failed",
          score: analysis.score,
          error: message,
        });
      }
    }

    if (analysis.score >= analysis.policy.alertThreshold) {
      await sendModerationAlert(
        [
          `Modo: ${analysis.policy.mode}`,
          `Novo inscrito suspeito no canal público: ${safeName}`,
          `Score: ${analysis.score}`,
          `Limite de alerta: ${analysis.policy.alertThreshold}`,
          `Motivos: ${analysis.reasons.join("; ") || "sem motivos adicionais"}`,
        ].join("\n"),
      );
    }

    await recordPublicChannelAudit({
      chatId: chatMemberUpdate.chatId,
      chatUsername: typeof chatMemberUpdate.chat.username === "string" ? chatMemberUpdate.chat.username : null,
      chatTitle: typeof chatMemberUpdate.chat.title === "string" ? chatMemberUpdate.chat.title : null,
      userId: chatMemberUpdate.userId,
      username: chatMemberUpdate.userName || null,
      displayName: chatMemberUpdate.displayName || null,
      isBot: analysis.isBot,
      joined: chatMemberUpdate.joined,
      decision,
      analysisMode: analysis.policy.mode,
      score: analysis.score,
      reasons: analysis.reasons,
      strongSignals: analysis.strongSignals,
      profilePhotos: analysis.profilePhotos,
      rawUpdate: update,
    });

    return json(req, {
      ok: true,
      action: "monitored",
      score: analysis.score,
    });
  }

  const challenge = await buildCaptchaToken({
    query_id: joinRequest.queryId || undefined,
    user_id: joinRequest.userId,
    chat_id: joinRequest.chatId,
    title: joinRequest.title,
  });

  const webAppUrl = new URL(CAPTCHA_WEBAPP_URL);
  webAppUrl.searchParams.set("token", challenge.token);

  if (joinRequest.queryId) {
    await sendChatJoinRequestWebApp(joinRequest.queryId, webAppUrl.toString());
  } else {
    const fallbackChatId = joinRequest.userChatId ?? joinRequest.userId;
    await sendCaptchaInvitation(fallbackChatId, webAppUrl.toString());
  }
  return json(req, { ok: true, action: "captcha_sent" });
}

function validateTelegramOperationalRequest(req: Request) {
  if (!TELEGRAM_WEBHOOK_SECRET) {
    return json(req, { ok: false, error: "TELEGRAM_WEBHOOK_SECRET nao configurado" }, 503);
  }
  const secretToken = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!constantTimeEqual(secretToken, TELEGRAM_WEBHOOK_SECRET)) {
    return json(req, { ok: false, error: "Acesso operacional negado" }, 403);
  }
  return null;
}

async function handleTelegramWebhookInfo(req: Request) {
  if (!TELEGRAM_BOT_TOKEN) {
    return json(req, { ok: false, error: "TELEGRAM_BOT_TOKEN nao configurado" }, 500);
  }

  const accessError = validateTelegramOperationalRequest(req);
  if (accessError) return accessError;

  const info = await getTelegramWebhookInfo() as Record<string, unknown>;
  return json(req, {
    ok: true,
    webhook: sanitizeTelegramWebhookInfo(info),
  });
}

async function handleTelegramWebhookRepair(req: Request) {
  if (!TELEGRAM_BOT_TOKEN) {
    return json(req, { ok: false, error: "TELEGRAM_BOT_TOKEN nao configurado" }, 500);
  }

  if (!TELEGRAM_WEBHOOK_SECRET) {
    return json(req, { ok: false, error: "TELEGRAM_WEBHOOK_SECRET nao configurado" }, 500);
  }

  const accessError = validateTelegramOperationalRequest(req);
  if (accessError) return accessError;

  const webhookUrl = SUPABASE_URL
    ? new URL(`/functions/v1/${FUNCTION_NAME}/api`, SUPABASE_URL)
    : new URL(req.url);
  webhookUrl.searchParams.set("action", "telegram-webhook");

  await telegramRequest("setWebhook", {
    url: webhookUrl.toString(),
    secret_token: TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: stringifyJson([
      "message",
      "edited_message",
      "chat_member",
      "chat_join_request",
      "my_chat_member",
      "callback_query",
      "channel_post",
      "edited_channel_post",
      "pre_checkout_query",
    ]),
  });
  await configureTelegramBotSurface();

  const info = await getTelegramWebhookInfo() as Record<string, unknown>;
  return json(req, {
    ok: true,
    action: "telegram_webhook_repaired",
    webhook: sanitizeTelegramWebhookInfo(info),
  });
}

async function handleCaptchaVerify(req: Request) {
  if (!TELEGRAM_BOT_TOKEN) {
    return json(req, { ok: false, error: "TELEGRAM_BOT_TOKEN não configurado" }, 500);
  }

  const body = (await req.json().catch(() => null)) as {
    token?: string;
    answer?: string;
    initData?: string;
  } | null;

  if (!body?.token || !body?.answer) {
    return json(req, { ok: false, error: "Dados incompletos" }, 400);
  }

  let telegramUserId = "";
  try {
    const webAppData = await validateWebAppInitData(body.initData || "");
    telegramUserId = webAppData.userId;
  } catch (error) {
    return json(
      req,
      { ok: false, error: error instanceof Error ? error.message : "Dados do Telegram inválidos" },
      403,
    );
  }

  let publicPayload: Record<string, unknown>;
  try {
    publicPayload = JSON.parse(textDecode(base64UrlDecode(body.token))) as Record<string, unknown>;
  } catch {
    return json(req, { ok: false, error: "Token da verificação inválido" }, 400);
  }

  const challengeToken = typeof publicPayload.c === "string" ? publicPayload.c : "";
  const publicUserId = typeof publicPayload.u === "string" ? publicPayload.u : "";

  if (!challengeToken || !publicUserId || !constantTimeEqual(publicUserId, telegramUserId)) {
    return json(req, { ok: false, error: "Usuário não corresponde ao desafio" }, 403);
  }

  let privatePayload: Record<string, unknown>;
  try {
    privatePayload = await decryptChallenge(CAPTCHA_SECRET, challengeToken);
  } catch {
    return json(req, { ok: false, error: "Desafio expirado ou corrompido" }, 400);
  }

  const expectedAnswer = String(privatePayload.answer ?? "");
  const expiresAt = Number(privatePayload.expires_at ?? 0);
  const queryId = String(privatePayload.query_id ?? "");
  const chatId = String(privatePayload.chat_id ?? "");
  const userId = String(privatePayload.user_id ?? "");
  const answer = String(body.answer || "").trim();

  if (!chatId || !userId || !expectedAnswer) {
    return json(req, { ok: false, error: "Desafio incompleto" }, 400);
  }

  if (!constantTimeEqual(userId, telegramUserId)) {
    return json(req, { ok: false, error: "Conta inválida para este desafio" }, 403);
  }

  if (!expiresAt || Math.floor(Date.now() / 1000) > expiresAt) {
    try {
      if (queryId) {
        await answerChatJoinRequestQuery(queryId, "decline");
      } else {
        await declineChatJoinRequest(chatId, userId);
      }
    } catch {
      // ignore
    }
    return json(req, { ok: false, error: "Desafio expirado" }, 410);
  }

  if (!constantTimeEqual(answer, expectedAnswer)) {
    try {
      if (queryId) {
        await answerChatJoinRequestQuery(queryId, "decline");
      } else {
        await declineChatJoinRequest(chatId, userId);
      }
    } catch {
      // ignore
    }
    return json(req, { ok: false, error: "Resposta incorreta" }, 400);
  }

  if (queryId) {
    await answerChatJoinRequestQuery(queryId, "approve");
  } else {
    await approveChatJoinRequest(chatId, userId);
  }
  return json(req, { ok: true, approved: true });
}

async function supabaseFetch(path: string) {
  return await supabaseRestRequest(path);
}

function getEpisodeFileId(row: Record<string, unknown>) {
  for (const key of [...EPISODE_VIDEO_FILE_ID_COLUMNS, "preview_file_id", "previewFileId"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function sortEpisodes(a: Record<string, unknown>, b: Record<string, unknown>) {
  const aNumber = Number(a[EPISODE_NUMBER_COLUMN] ?? Number.MAX_SAFE_INTEGER);
  const bNumber = Number(b[EPISODE_NUMBER_COLUMN] ?? Number.MAX_SAFE_INTEGER);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) {
    return aNumber - bNumber;
  }

  return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
}

async function getEpisodesList(seriesId = "") {
  const filter = seriesId
    ? `&${EPISODE_SERIES_COLUMN}=eq.${encodeURIComponent(seriesId)}`
    : "";
  const data = await supabaseFetch(`${EPISODES_TABLE}?select=*${filter}`);
  return Array.isArray(data) ? data as Record<string, unknown>[] : [];
}

function getPlayableEpisodesForSeries(episodes: Record<string, unknown>[], seriesId: string) {
  return episodes
    .filter((episode) => String(episode[EPISODE_SERIES_COLUMN] ?? "") === seriesId && getEpisodeFileId(episode))
    .sort(sortEpisodes);
}

function buildEpisodeAugmentation(episodes: Record<string, unknown>[], seriesId: string) {
  const seriesEpisodes = episodes
    .filter((episode) => String(episode[EPISODE_SERIES_COLUMN] ?? "") === seriesId)
    .sort(sortEpisodes);
  const playableEpisodes = seriesEpisodes.filter((episode) => getEpisodeFileId(episode));
  const firstPlayable = playableEpisodes[0] || null;

  return {
    episode_count: seriesEpisodes.length,
    playable_episode_count: playableEpisodes.length,
    episode_file_id: firstPlayable ? getEpisodeFileId(firstPlayable) : null,
    episode_title: firstPlayable ? String(firstPlayable[EPISODE_TITLE_COLUMN] ?? "") : null,
    episode_number: firstPlayable?.[EPISODE_NUMBER_COLUMN] ?? null,
  };
}

async function getSeriesList(userId = "", includeProtected = false) {
  const data = await supabaseFetch(`${SERIES_TABLE}?select=*`);
  const series = (Array.isArray(data) ? data as Record<string, unknown>[] : [])
    .filter((row) => includeProtected || isSeriesActive(row));

  let episodes: Record<string, unknown>[] = [];
  try {
    episodes = await getEpisodesList();
  } catch {
    episodes = [];
  }

  let accessibleIds = new Set<string>();
  let favoriteIds = new Set<string>();
  let progressRows: Record<string, unknown>[] = [];

  if (userId) {
    [accessibleIds, favoriteIds, progressRows] = await Promise.all([
      getAccessibleSeriesIds(userId),
      getUserFavoriteSeriesIds(userId).catch(() => new Set<string>()),
      getUserSeriesProgressRows(userId).catch(() => []),
    ]);
  }

  const progressBySeriesId = new Map<string, Record<string, unknown>>();
  for (const progressRow of progressRows) {
    const progressSeriesId = String(progressRow.series_id ?? "").trim();
    if (progressSeriesId) {
      progressBySeriesId.set(progressSeriesId, progressRow);
    }
  }

  return series.map((row) => {
    const seriesId = String(row[SERIES_ID_COLUMN] ?? row.id ?? "");
    const episodeData = buildEpisodeAugmentation(episodes, seriesId);
    const progress = progressBySeriesId.get(seriesId) ?? null;
    const free = isSeriesFree(row);
    const hasAccess = includeProtected || free || accessibleIds.has(seriesId);
    const hasVideoUrl = Boolean(extractVideoStoragePath(row) || extractDirectUrl(row));
    const hasVideoFileId = Boolean(extractTelegramFileId(row));
    const hasEpisodePlayback = Number(episodeData.playable_episode_count ?? 0) > 0;
    const playbackMode = hasVideoUrl ? "direct" : (hasVideoFileId || hasEpisodePlayback ? "telegram" : "missing");
    const output: Record<string, unknown> = {
      ...row,
      ...episodeData,
      cover_url: String(row.cover_url ?? "").trim()
        || (String(row.cover_storage_path ?? "").trim() ? storagePublicUrl(SERIES_COVER_BUCKET, String(row.cover_storage_path)) : null),
      trailer_url: String(row.trailer_url ?? "").trim()
        || (String(row.trailer_storage_path ?? "").trim() ? storagePublicUrl(SERIES_TRAILER_BUCKET, String(row.trailer_storage_path)) : null),
      is_free: free,
      has_access: hasAccess,
      is_favorite: favoriteIds.has(seriesId),
      has_video_url: hasVideoUrl,
      has_video_file_id: hasVideoFileId,
      has_playback: hasVideoUrl || hasVideoFileId || hasEpisodePlayback,
      playback_mode: playbackMode,
      has_progress: Boolean(progress),
      last_position_seconds: Number(progress?.last_position_seconds ?? 0) || 0,
      duration_seconds: Number(progress?.duration_seconds ?? 0) || 0,
      completion_percent: Number(progress?.completion_percent ?? 0) || 0,
      completed: progress?.completed === true,
      last_event: progress?.last_event ?? null,
      last_playback_mode: progress?.last_playback_mode ?? null,
      last_opened_at: progress?.last_opened_at ?? null,
    };

    if (!includeProtected) {
      for (const key of [...SERIES_VIDEO_URL_COLUMNS, ...SERIES_VIDEO_FILE_ID_COLUMNS]) delete output[key];
      for (const key of Object.keys(output)) {
        if (key.toLowerCase().includes("file_id")) delete output[key];
      }
      delete output.video_storage_path;
      delete output.storage_path;
      delete output.cover_storage_path;
      delete output.trailer_storage_path;
    }

    return output;
  });
}

async function getSeriesById(seriesId: string) {
  const idColumns = [SERIES_ID_COLUMN, "id", "serie_id"].filter((value, index, arr) => arr.indexOf(value) === index);
  let lastError: unknown = null;
  let hadSuccessfulQuery = false;

  for (const column of idColumns) {
    try {
      const data = await supabaseFetch(
        `${SERIES_TABLE}?select=*&${column}=eq.${encodeURIComponent(seriesId)}&limit=1`,
      );
      hadSuccessfulQuery = true;
      lastError = null;
      if (Array.isArray(data) && data.length > 0) return data[0];
    } catch (error) {
      lastError = error;
    }
  }

  if (!hadSuccessfulQuery && lastError) {
    throw lastError;
  }

  return null;
}

function getSeriesPrice(row: Record<string, unknown>) {
  const cents = Number(row.price_cents ?? 0);
  if (Number.isFinite(cents) && cents > 0) return Number((cents / 100).toFixed(2));
  const price = Number(row.price ?? 0);
  if (Number.isFinite(price) && price > 0) return Number(price.toFixed(2));

  const accessType = String(row.access_type ?? row.access ?? "").trim().toLowerCase();
  return accessType === "paid" || accessType === "premium" ? 5.9 : 0;
}

function getSeriesStarsPrice(row: Record<string, unknown>) {
  const configured = Number(row.telegram_stars_price ?? 0);
  return Number.isFinite(configured) && configured > 0
    ? Math.round(configured)
    : TELEGRAM_STARS_DEFAULT_PRICE;
}

async function getSeriesBySlug(slug: string) {
  const normalized = slugifySeriesTitle(slug);
  if (!normalized) return null;
  const data = await supabaseFetch(`${SERIES_TABLE}?select=*&slug=eq.${encodeURIComponent(normalized)}&limit=1`);
  return Array.isArray(data) && data.length > 0 ? data[0] as Record<string, unknown> : null;
}

async function handleSeriesSlugResolve(req: Request, url: URL) {
  const oldSlug = slugifySeriesTitle(url.searchParams.get("slug"));
  if (!oldSlug) return json(req, { error: "Slug invalido" }, 400);
  const redirects = await supabaseFetch(
    `series_slug_redirects?select=new_slug&old_slug=eq.${encodeURIComponent(oldSlug)}&limit=1`,
  );
  const newSlug = Array.isArray(redirects) ? String(redirects[0]?.new_slug ?? "").trim() : "";
  if (!newSlug) return json(req, { error: "Redirecionamento nao encontrado" }, 404);
  const target = await getSeriesBySlug(newSlug);
  if (!target || !isSeriesActive(target)) return json(req, { error: "Serie indisponivel" }, 404);
  return json(req, { ok: true, slug: newSlug });
}

function isSeriesFree(row: Record<string, unknown>) {
  return getSeriesPrice(row) <= 0;
}

async function resolveCanonicalCheckoutItems(value: unknown) {
  const requestedItems = normalizeCheckoutItems(value);
  if (!requestedItems.length) return [];

  const seen = new Set<string>();
  const canonicalItems: CanonicalCheckoutItem[] = [];

  for (const requested of requestedItems) {
    if (seen.has(requested.id)) continue;
    seen.add(requested.id);

    const row = await getSeriesById(requested.id);
    if (!row || !isSeriesActive(row as Record<string, unknown>)) {
      throw new Error("Uma das series selecionadas nao esta disponivel.");
    }

    const rowRecord = row as Record<string, unknown>;
    if (isSeriesFree(rowRecord)) {
      throw new Error("Series gratuitas nao precisam de pagamento.");
    }

    const price = getSeriesPrice(rowRecord);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("A serie selecionada esta sem preco valido.");
    }

    canonicalItems.push({
      id: String(rowRecord[SERIES_ID_COLUMN] ?? rowRecord.id ?? requested.id),
      title: String(rowRecord[SERIES_TITLE_COLUMN] ?? requested.title).trim() || requested.title,
      quantity: Math.min(1, Math.max(1, requested.quantity)),
      price,
      cover_url: resolveSeriesCoverPublicUrl(rowRecord) || null,
      stars_price: getSeriesStarsPrice(rowRecord),
    });
  }

  return canonicalItems;
}

function isOwnerUserId(userId: string) {
  return String(userId ?? "").trim() === String(OWNER_TELEGRAM_USER_ID ?? "").trim();
}

function orderContainsSeries(order: Record<string, unknown>, seriesId: string) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.some((item) => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    return String(entry.id ?? entry.serie_id ?? entry.series_id ?? "") === seriesId;
  });
}

async function getApprovedPaymentOrderRows(userId: string) {
  if (!userId) return [];
  try {
    const data = await supabaseFetch(
      `${PAYMENT_ORDERS_TABLE}?select=order_id,items,status,user_id&user_id=eq.${encodeURIComponent(userId)}&status=eq.approved&limit=200`,
    );
    return Array.isArray(data) ? data as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
}

async function getApprovedPurchaseRows(userId: string) {
  if (!userId) return [];
  try {
    const data = await supabaseFetch(
      `purchases?select=serie_id,status,user_id&user_id=eq.${encodeURIComponent(userId)}&status=eq.approved&limit=500`,
    );
    return Array.isArray(data) ? data as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
}

async function getActiveEntitlementRows(userId: string) {
  if (!userId) return [];
  try {
    const data = await supabaseFetch(
      `${ENTITLEMENTS_TABLE}?select=series_id,status,user_id,order_id&user_id=eq.${encodeURIComponent(userId)}&status=eq.active&limit=500`,
    );
    return Array.isArray(data) ? data as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
}

async function grantOrderEntitlements(order: Record<string, unknown>) {
  const orderId = String(order.order_id ?? "").trim();
  const userId = String(order.user_id ?? "").trim();
  const items = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
  if (!orderId || !userId || !items.length) return [];

  const now = new Date().toISOString();
  const rows = items
    .map((item) => String(item.id ?? item.serie_id ?? item.series_id ?? "").trim())
    .filter((seriesId, index, all) => seriesId && all.indexOf(seriesId) === index)
    .map((seriesId) => ({
      user_id: userId,
      series_id: seriesId,
      order_id: orderId,
      source: "purchase",
      status: "active",
      granted_at: now,
      revoked_at: null,
      revoke_reason: null,
      updated_at: now,
    }));

  if (!rows.length) return [];
  const result = await supabaseRestRequest(`${ENTITLEMENTS_TABLE}?on_conflict=user_id,series_id`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation",
    },
    body: stringifyJson(rows),
  });
  return Array.isArray(result) ? result : [];
}

async function revokeOrderEntitlements(orderId: string, reason: "refunded" | "charged_back") {
  if (!orderId) return;
  await supabaseRestRequest(`${ENTITLEMENTS_TABLE}?order_id=eq.${encodeURIComponent(orderId)}&status=eq.active`, {
    method: "PATCH",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: stringifyJson({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function getAccessibleSeriesIds(userId: string) {
  const [entitlements, orders, purchases] = await Promise.all([
    getActiveEntitlementRows(userId),
    getApprovedPaymentOrderRows(userId),
    getApprovedPurchaseRows(userId),
  ]);

  const ids = new Set<string>();
  for (const entitlement of entitlements) {
    const id = String(entitlement.series_id ?? "").trim();
    if (id) ids.add(id);
  }
  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const id = String(entry.id ?? entry.serie_id ?? entry.series_id ?? "").trim();
      if (id) ids.add(id);
    }
  }

  for (const purchase of purchases) {
    const id = String(purchase.serie_id ?? "").trim();
    if (id) ids.add(id);
  }

  return ids;
}

async function userHasPaidForSeries(userId: string, seriesId: string) {
  if (!userId || !seriesId) return false;
  const accessible = await getAccessibleSeriesIds(userId);
  return accessible.has(seriesId);
}

function extractDirectUrl(row: Record<string, unknown>) {
  for (const key of SERIES_VIDEO_URL_COLUMNS) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function resolveSeriesCoverPublicUrl(row: Record<string, unknown>) {
  const directCover = String(row.cover_url ?? "").trim();
  if (directCover) return directCover;

  const storagePath = String(row.cover_storage_path ?? "").trim()
    || extractStorageObjectPathFromUrl(row.cover_url, SERIES_COVER_BUCKET);
  if (!storagePath) return "";

  return storagePublicUrl(SERIES_COVER_BUCKET, storagePath);
}

function truncateTelegramCaption(text: string, maxLength = 1024) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildSeriesAnnouncementCaption(row: Record<string, unknown>) {
  const description = String(row.description ?? "").trim() || String(row.title ?? "Nova série").trim() || "Nova série no catálogo.";
  const lines = [
    "NO AR! ✅",
    "",
    description,
  ];

  if (isSeriesFree(row)) {
    lines.push("", "Série gratuita.");
  }

  return truncateTelegramCaption(lines.join("\n"));
}

function normalizeAnnouncementTextV2(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSeriesAnnouncementCaptionV2(row: Record<string, unknown>) {
  const title = normalizeAnnouncementTextV2(row.title ?? "Nova série") || "Nova série";
  const description = normalizeAnnouncementTextV2(row.description ?? "") || title;
  const lines = [
    "NO AR! ✅",
    title,
    "",
    description,
  ];

  if (isSeriesFree(row)) {
    lines.push("", "Série gratuita.");
  }

  return truncateTelegramCaption(lines.join("\n"));
}

function buildSeriesAnnouncementCaptionV3(row: Record<string, unknown>) {
  const title = normalizeAnnouncementTextV2(row.title ?? "Nova serie") || "Nova serie";
  const description = normalizeAnnouncementTextV2(row.description ?? "") || title;
  const key = String(row.id ?? row.title ?? "serie").trim() || "serie";
  let variantSeed = 0;
  for (let index = 0; index < key.length; index += 1) {
    variantSeed = (variantSeed + key.charCodeAt(index)) % 3;
  }

  const titleLine = variantSeed === 0
    ? title
    : variantSeed === 1
      ? `Em destaque: ${title}`
      : `Serie adicionada: ${title}`;

  const lines = [
    "NO AR! \u2705",
    titleLine,
    "",
    description,
  ];

  if (isSeriesFree(row)) {
    const freeLine = variantSeed === 1
      ? "Disponivel gratuitamente."
      : variantSeed === 2
        ? "Serie gratuita."
        : "Disponivel gratuitamente no catalogo.";
    lines.push("", freeLine);
  }

  return truncateTelegramCaption(lines.join("\n"));
}

async function postSeriesAnnouncementToChannel(row: Record<string, unknown>) {
  const chatId = resolveSeriesAnnouncementChannelTarget();
  if (!chatId) return null;

  const caption = buildSeriesAnnouncementCaptionV3(row);
  const coverUrl = resolveSeriesCoverPublicUrl(row);

  if (coverUrl) {
    try {
      return await telegramRequest("sendPhoto", {
        chat_id: chatId,
        photo: coverUrl,
        caption,
      });
    } catch (error) {
      console.warn("[CHANNEL] Falha ao publicar capa da série:", error instanceof Error ? error.message : String(error));
    }
  }

  try {
    return await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: caption,
    });
  } catch (error) {
    console.warn("[CHANNEL] Falha ao publicar aviso de nova série:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

function extractVideoStoragePath(row: Record<string, unknown>) {
  const explicitPath = String(row.video_storage_path ?? row.storage_path ?? "").trim();
  if (explicitPath) return explicitPath;

  for (const key of SERIES_VIDEO_URL_COLUMNS) {
    const value = row[key];
    const storagePath = extractStorageObjectPathFromUrl(value, SERIES_VIDEO_BUCKET);
    if (storagePath) return storagePath;
  }

  return "";
}

async function resolveStoragePlayback(row: Record<string, unknown>, title: string) {
  const storagePath = extractVideoStoragePath(row);
  if (!storagePath) return null;

  return {
    url: await createStorageSignedUrl(SERIES_VIDEO_BUCKET, storagePath, PROTECTED_URL_TTL_SECONDS),
    type: "storage_signed",
    title,
  };
}

function extractTelegramFileId(row: Record<string, unknown>) {
  for (const key of [...SERIES_VIDEO_FILE_ID_COLUMNS, "preview_file_id", "previewFileId"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const episodeFileId = row.episode_file_id;
  if (typeof episodeFileId === "string" && episodeFileId.trim()) return episodeFileId.trim();
  return null;
}

async function getFirstEpisodeFileForSeries(seriesId: string) {
  const episodes = await getEpisodesList(seriesId);
  const playableEpisodes = getPlayableEpisodesForSeries(episodes, seriesId);
  const firstPlayable = playableEpisodes[0] || null;
  if (!firstPlayable) return null;

  return {
    fileId: getEpisodeFileId(firstPlayable),
    title: String(firstPlayable[EPISODE_TITLE_COLUMN] ?? ""),
    episodeNumber: firstPlayable[EPISODE_NUMBER_COLUMN] ?? null,
  };
}

type SeriesTelegramDeliveryResolution =
  | {
    ok: true;
    title: string;
    isFree: boolean;
    deliveryType: "telegram_file";
    fileId: string;
    source: "series" | "episode";
  }
  | {
    ok: true;
    title: string;
    isFree: boolean;
    deliveryType: "telegram_url";
    videoUrl: string;
    source: "storage" | "direct";
  }
  | {
    ok: false;
    title: string;
    isFree: boolean;
    code: "series_not_found" | "video_not_available";
  };

async function resolveSeriesTelegramDelivery(seriesId: string, fallbackTitle = ""): Promise<SeriesTelegramDeliveryResolution> {
  const row = await getSeriesById(seriesId);
  if (!row) {
    return {
      ok: false,
      title: fallbackTitle,
      isFree: false,
      code: "series_not_found",
    };
  }

  const rowRecord = row as Record<string, unknown>;
  const title = String(rowRecord[SERIES_TITLE_COLUMN] ?? fallbackTitle).trim() || fallbackTitle;
  const isFree = isSeriesFree(rowRecord);

  const fileId = extractTelegramFileId(rowRecord);
  if (fileId) {
    return {
      ok: true,
      title,
      isFree,
      deliveryType: "telegram_file",
      fileId,
      source: "series",
    };
  }

  const episode = await getFirstEpisodeFileForSeries(seriesId);
  if (episode?.fileId) {
    return {
      ok: true,
      title: episode.title ? `${title} - ${episode.title}` : title,
      isFree,
      deliveryType: "telegram_file",
      fileId: episode.fileId,
      source: "episode",
    };
  }

  const storagePlayback = await resolveStoragePlayback(rowRecord, title);
  if (storagePlayback?.url) {
    return {
      ok: true,
      title,
      isFree,
      deliveryType: "telegram_url",
      videoUrl: storagePlayback.url,
      source: "storage",
    };
  }

  const directUrl = extractDirectUrl(rowRecord);
  if (directUrl) {
    return {
      ok: true,
      title,
      isFree,
      deliveryType: "telegram_url",
      videoUrl: directUrl,
      source: "direct",
    };
  }

  return {
    ok: false,
    title,
    isFree,
    code: "video_not_available",
  };
}

async function deliverSeriesToTelegramChat(chatId: string | number, seriesId: string, fallbackTitle = "") {
  const delivery = await resolveSeriesTelegramDelivery(seriesId, fallbackTitle);
  if (!delivery.ok) {
    return delivery;
  }

  if (delivery.deliveryType === "telegram_file") {
    await sendSeriesTelegramDelivery(chatId, delivery.fileId, delivery.title, delivery.isFree);
    return {
      ok: true as const,
      title: delivery.title,
      isFree: delivery.isFree,
      deliveryType: delivery.deliveryType,
      source: delivery.source,
    };
  }

  await telegramRequest("sendVideo", {
    chat_id: chatId,
    video: delivery.videoUrl,
    caption: [
      delivery.isFree ? "Serie gratuita liberada." : "Serie liberada com sucesso.",
      delivery.title ? `Titulo: ${delivery.title}` : "",
      "Este video foi entregue no chat do Telegram.",
    ].filter(Boolean).join("\n"),
    supports_streaming: true,
    protect_content: true,
    reply_markup: stringifyJson({
      inline_keyboard: [
        [{ text: "Abrir catalogo", web_app: { url: SERIES_WEBAPP_URL } }],
        [{ text: "Suporte", url: SUPPORT_URL }],
      ],
    }),
  });
  return {
    ok: true as const,
    title: delivery.title,
    isFree: delivery.isFree,
    deliveryType: "telegram_url" as const,
    source: delivery.source,
  };
}

async function deliverApprovedOrderSeries(order: Record<string, unknown>) {
  const chatId = String(order.chat_id ?? order.user_id ?? "").trim();
  const orderId = String(order.order_id ?? "").trim();
  const items = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
  const uniqueItems = items.filter((item, index, arr) => {
    const seriesId = String(item.id ?? item.serie_id ?? item.series_id ?? "").trim();
    if (!seriesId) return false;
    return arr.findIndex((entry) => String(entry.id ?? entry.serie_id ?? entry.series_id ?? "").trim() === seriesId) === index;
  });

  const summary = {
    delivered: [] as Array<{ seriesId: string; title: string; deliveryType: "telegram_file" | "telegram_url" }>,
    failed: [] as Array<{ seriesId: string; title: string; reason: string }>,
    deliveryStatus: String(order.delivery_status ?? "pending").trim().toLowerCase() || "pending",
  };

  if (!chatId || !orderId || !uniqueItems.length) {
    return summary;
  }

  const claim = await claimOrderDelivery(order);
  if (!claim.claimed) {
    summary.deliveryStatus = String(claim.order.delivery_status ?? summary.deliveryStatus).trim().toLowerCase();
    return summary;
  }

  const deliveredItemIds = getDeliveredItemIds(claim.order);

  let progressMessageId = 0;
  try {
    progressMessageId = await upsertDeliveryProgressMessage(
      chatId,
      buildDeliveryProgressText(String(order.order_id ?? ""), 0, uniqueItems.length),
    );
  } catch (error) {
    console.warn("[PAYMENT] Falha ao iniciar barra de progresso:", error instanceof Error ? error.message : String(error));
  }

  let processedCount = 0;
  for (const item of uniqueItems) {
    const seriesId = String(item.id ?? item.serie_id ?? item.series_id ?? "").trim();
    const title = String(item.title ?? item.name ?? "").trim();
    if (!seriesId) continue;

    if (!deliveredItemIds.has(seriesId)) {
      try {
        const delivery = await deliverSeriesToTelegramChat(chatId, seriesId, title);
        if (delivery.ok) {
          deliveredItemIds.add(seriesId);
          summary.delivered.push({
            seriesId,
            title: delivery.title,
            deliveryType: delivery.deliveryType,
          });
          await updatePaymentOrderRecord(orderId, {
            delivered_item_ids: Array.from(deliveredItemIds),
            delivery_last_error: null,
          }).catch((error) => {
            console.warn("[PAYMENT] Falha ao salvar item entregue:", error instanceof Error ? error.message : String(error));
          });
        } else {
          summary.failed.push({
            seriesId,
            title: delivery.title || title,
            reason: delivery.code,
          });
        }
      } catch (error) {
        summary.failed.push({
          seriesId,
          title,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    processedCount += 1;
    try {
      progressMessageId = await upsertDeliveryProgressMessage(
        chatId,
        buildDeliveryProgressText(
          String(order.order_id ?? ""),
          processedCount,
          uniqueItems.length,
          title,
          summary.failed.length,
          processedCount >= uniqueItems.length,
        ),
        progressMessageId || undefined,
      );
    } catch (error) {
      console.warn("[PAYMENT] Falha ao atualizar barra de progresso:", error instanceof Error ? error.message : String(error));
    }
  }

  const allDelivered = uniqueItems.every((item) => {
    const seriesId = String(item.id ?? item.serie_id ?? item.series_id ?? "").trim();
    return seriesId && deliveredItemIds.has(seriesId);
  });
  const deliveryStatus = allDelivered
    ? "completed"
    : deliveredItemIds.size > 0
      ? "partial"
      : "failed";
  summary.deliveryStatus = deliveryStatus;

  await updatePaymentOrderRecord(orderId, {
    delivery_status: deliveryStatus,
    delivered_item_ids: Array.from(deliveredItemIds),
    delivery_completed_at: allDelivered ? new Date().toISOString() : null,
    delivery_last_error: summary.failed.length ? summary.failed.map((item) => item.reason).join(" | ").slice(0, 1000) : null,
  }).catch((error) => {
    console.warn("[PAYMENT] Falha ao finalizar estado da entrega:", error instanceof Error ? error.message : String(error));
  });

  if (deliveryStatus === "completed") {
    await recordAppEvent({
      eventName: "delivery_completed",
      userId: String(order.user_id ?? ""),
      orderId,
      metadata: { item_count: uniqueItems.length },
    });
  }

  return summary;
}

async function resolveTelegramPlayback(req: Request, fileId: string, title: string) {
  try {
    await telegramGetFile(fileId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("file is too big")) {
      return json(req, {
        type: "internal_player_unavailable",
        title,
        reason: "Este vídeo precisa ser migrado ou convertido para reprodução protegida dentro do Mini App.",
      });
    }
    throw error;
  }

  return json(req, {
    url: await buildSignedPlaybackUrl(req, fileId, title),
    type: "telegram_proxy",
    title,
  });
}

async function handleStream(req: Request, url: URL) {
  const serieId = url.searchParams.get("serie_id") || "";
  const title = url.searchParams.get("title") || "";

  if (!serieId) {
    return json(req, { error: "serie_id ausente" }, 400);
  }

  const row = await getSeriesById(serieId);
  if (!row) {
    return json(req, { error: "Série não encontrada" }, 404);
  }

  const storagePlayback = await resolveStoragePlayback(row as Record<string, unknown>, String((row as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? title));
  if (storagePlayback?.url) {
    return json(req, storagePlayback);
  }

  const directUrl = extractDirectUrl(row as Record<string, unknown>);
  if (directUrl) {
    return json(req, { url: directUrl, type: "direct", title: (row as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? title });
  }

  const fileId = extractTelegramFileId(row as Record<string, unknown>);
  if (fileId) {
    try {
      await telegramGetFile(fileId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("file is too big")) {
        return json(req, {
          type: "internal_player_unavailable",
          title: (row as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? title,
          reason: "Este vídeo precisa ser migrado ou convertido para reprodução protegida dentro do Mini App.",
        });
      }
      throw error;
    }

    return json(req, {
      url: buildPlaybackUrl(req, fileId, String((row as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? title)),
      type: "telegram_proxy",
      title: (row as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? title,
    });
  }

  return json(req, { error: "Vídeo não disponível" }, 404);
}

async function handleStreamV2(req: Request, url: URL) {
  const serieId = url.searchParams.get("serie_id") || "";
  const title = url.searchParams.get("title") || "";

  if (!serieId) {
    return json(req, { error: "serie_id ausente" }, 400);
  }

  const row = await getSeriesById(serieId);
  if (!row) {
    return json(req, { error: "Serie nao encontrada" }, 404);
  }

  let userId = "";
  try {
    const initData = url.searchParams.get("init_data") || "";
    const validated = await validateWebAppInitData(initData);
    userId = validated.userId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logProtectedPlayback("stream_denied", { seriesId: serieId, reason: "telegram_auth_required", detail: message });
    return json(req, { error: message, code: "telegram_auth_required" }, 401);
  }

  if (!isSeriesActive(row as Record<string, unknown>)) {
    logProtectedPlayback("stream_denied", { seriesId: serieId, userId, reason: "series_inactive" });
    return json(req, { error: "Conteudo protegido", code: "series_inactive" }, 403);
  }

  const isOwner = isOwnerUserId(userId);

  if (!isSeriesFree(row as Record<string, unknown>) && !isOwner && !(await userHasPaidForSeries(userId, serieId))) {
    logProtectedPlayback("stream_denied", { seriesId: serieId, userId, reason: "payment_required" });
    return json(req, { error: "Pagamento necessario para assistir esta serie.", code: "payment_required" }, 402);
  }

  const seriesTitle = String((row as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? title);
  const storagePlayback = await resolveStoragePlayback(row as Record<string, unknown>, seriesTitle);
  if (storagePlayback?.url) {
    logProtectedPlayback("stream_granted", { seriesId: serieId, userId, type: storagePlayback.type });
    return json(req, storagePlayback);
  }

  const directUrl = extractDirectUrl(row as Record<string, unknown>);
  if (directUrl) {
    logProtectedPlayback("stream_granted", { seriesId: serieId, userId, type: "direct" });
    return json(req, { url: directUrl, type: "direct", title: seriesTitle });
  }

  const fileId = extractTelegramFileId(row as Record<string, unknown>);
  if (fileId) {
    logProtectedPlayback("stream_granted", { seriesId: serieId, userId, type: "telegram_proxy" });
    return await resolveTelegramPlayback(req, fileId, seriesTitle);
  }

  const episode = await getFirstEpisodeFileForSeries(serieId);
  if (episode?.fileId) {
    const episodeTitle = episode.title ? `${seriesTitle} - ${episode.title}` : seriesTitle;
    logProtectedPlayback("stream_granted", { seriesId: serieId, userId, type: "telegram_proxy_episode" });
    return await resolveTelegramPlayback(req, episode.fileId, episodeTitle);
  }

  logProtectedPlayback("stream_denied", { seriesId: serieId, userId, reason: "video_not_available" });
  return json(req, { error: "Video nao disponivel" }, 404);
}

async function handleSeriesDelivery(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  const seriesId = String(body.series_id ?? body.serie_id ?? body.id ?? "").trim();
  const fallbackTitle = String(body.title ?? "").trim();
  if (!seriesId) {
    return json(req, { error: "series_id ausente" }, 400);
  }

  let userId = "";
  try {
    const validated = await validateWebAppInitData(String(body.init_data ?? body.initData ?? ""));
    userId = validated.userId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(req, { error: message, code: "telegram_auth_required" }, 401);
  }

  const row = await getSeriesById(seriesId);
  if (!row) {
    return json(req, { error: "Serie nao encontrada", code: "series_not_found" }, 404);
  }

  if (!isSeriesActive(row as Record<string, unknown>)) {
    return json(req, { error: "Conteudo protegido", code: "series_inactive" }, 403);
  }

  const isOwner = isOwnerUserId(userId);

  if (!isSeriesFree(row as Record<string, unknown>) && !isOwner && !(await userHasPaidForSeries(userId, seriesId))) {
    return json(req, { error: "Pagamento necessario para liberar esta serie.", code: "payment_required" }, 402);
  }

  const delivery = await deliverSeriesToTelegramChat(userId, seriesId, fallbackTitle);
  if (!delivery.ok) {
    if (delivery.code === "video_not_available") {
      return json(req, { error: "Video nao disponivel", code: delivery.code }, 404);
    }
    return json(req, { error: "Serie nao encontrada", code: delivery.code }, 404);
  }

  return json(req, {
    ok: true,
    delivery: {
      series_id: seriesId,
      title: delivery.title,
      delivery_type: delivery.deliveryType,
      source: "source" in delivery ? delivery.source : null,
      sent_to_chat_id: userId,
    },
  });
}

async function handleProgressSync(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  const seriesId = String(body.series_id ?? body.serie_id ?? body.id ?? "").trim();
  if (!seriesId) {
    return json(req, { error: "series_id ausente" }, 400);
  }

  let userId = "";
  try {
    const validated = await validateWebAppInitData(String(body.init_data ?? body.initData ?? ""));
    userId = validated.userId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(req, { error: message, code: "telegram_auth_required" }, 401);
  }

  const row = await getSeriesById(seriesId);
  const rowRecord = row as Record<string, unknown> | null;
  const seriesTitle = String(body.title ?? rowRecord?.[SERIES_TITLE_COLUMN] ?? "").trim() || "Serie";
  const category = String(body.category ?? rowRecord?.category ?? "").trim() || null;
  const lastPositionSeconds = Number(body.last_position_seconds ?? body.position_seconds ?? body.current_time ?? 0) || 0;
  const durationSeconds = Number(body.duration_seconds ?? body.duration ?? 0) || 0;
  const completionPercent = Number(body.completion_percent ?? body.progress_percent ?? 0) || 0;
  const lastEvent = String(body.event_type ?? body.event ?? "progress").trim() || "progress";
  const lastPlaybackMode = String(body.playback_mode ?? body.mode ?? "direct").trim() || "direct";

  const progress = await upsertUserSeriesProgress({
    userId,
    seriesId,
    seriesTitle,
    category,
    lastPositionSeconds,
    durationSeconds: durationSeconds > 0 ? durationSeconds : null,
    completionPercent,
    lastEvent,
    lastPlaybackMode,
  });

  return json(req, { ok: true, progress });
}

async function handleFavoriteSync(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  const seriesId = String(body.series_id ?? body.serie_id ?? body.id ?? "").trim();
  if (!seriesId) {
    return json(req, { error: "series_id ausente" }, 400);
  }

  let userId = "";
  try {
    const validated = await validateWebAppInitData(String(body.init_data ?? body.initData ?? ""));
    userId = validated.userId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(req, { error: message, code: "telegram_auth_required" }, 401);
  }

  const isFavorite = body.is_favorite === true || String(body.is_favorite ?? body.favorite ?? "").trim().toLowerCase() === "true";
  if (isFavorite) {
    const favorite = await upsertUserSeriesFavorite(userId, seriesId);
    return json(req, { ok: true, is_favorite: true, favorite });
  }

  await deleteUserSeriesFavorite(userId, seriesId);
  return json(req, { ok: true, is_favorite: false, series_id: seriesId });
}

function serializeCustomerOrder(row: Record<string, unknown>) {
  const rawItems = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];
  return {
    order_id: String(row.order_id ?? ""),
    status: String(row.status ?? "unknown"),
    payment_method: String(row.payment_method ?? "unknown"),
    payment_provider: String(row.payment_provider ?? "unknown"),
    provider_currency: String(row.provider_currency ?? ""),
    provider_amount: Number(row.provider_amount ?? 0) || 0,
    amount: Number(row.amount ?? 0) || 0,
    subtotal: Number(row.subtotal ?? row.amount ?? 0) || 0,
    discount_amount: Number(row.discount_amount ?? 0) || 0,
    coupon_code: String(row.coupon_code ?? ""),
    created_at: row.created_at ?? null,
    confirmed_at: row.confirmed_at ?? null,
    delivery_status: String(row.delivery_status ?? "pending"),
    delivery_completed_at: row.delivery_completed_at ?? null,
    items: rawItems.map((item) => ({
      series_id: String(item.id ?? item.serie_id ?? item.series_id ?? ""),
      title: String(item.title ?? item.name ?? "Serie"),
      price: Number(item.price ?? 0) || 0,
    })),
  };
}

async function getCustomerPaymentRows(userId: string) {
  const data = await supabaseFetch(
      `${PAYMENT_ORDERS_TABLE}?select=order_id,status,payment_method,payment_provider,provider_currency,provider_amount,amount,subtotal,discount_amount,coupon_code,items,created_at,confirmed_at,delivery_status,delivery_completed_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=200`,
  );
  return Array.isArray(data) ? data as Record<string, unknown>[] : [];
}

async function handleCustomerArea(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json(req, { error: "Corpo da requisicao invalido" }, 400);

  let validated: { userId: string; user: Record<string, unknown> };
  try {
    validated = await validateWebAppInitData(String(body.init_data ?? body.initData ?? "")) as {
      userId: string;
      user: Record<string, unknown>;
    };
  } catch (error) {
    return json(req, {
      error: error instanceof Error ? error.message : "Dados do Telegram invalidos",
      code: "telegram_auth_required",
    }, 401);
  }

  const userId = validated.userId;
  const [catalog, orders, progressRows, favoriteRows] = await Promise.all([
    getSeriesList(userId),
    getCustomerPaymentRows(userId),
    getUserSeriesProgressRows(userId).catch(() => []),
    getUserFavoriteSeriesRows(userId).catch(() => []),
  ]);

  const catalogById = new Map(
    (catalog as Record<string, unknown>[]).map((serie) => [String(serie.id ?? ""), serie]),
  );
  const library = (catalog as Record<string, unknown>[])
    .filter((serie) => serie.has_access === true && !isSeriesFree(serie))
    .map((serie) => ({ ...serie, has_access: true }));
  const favorites = favoriteRows
    .map((row) => catalogById.get(String(row.series_id ?? "")))
    .filter((serie): serie is Record<string, unknown> => Boolean(serie));
  const history = progressRows
    .slice()
    .sort((left, right) => (Date.parse(String(right.last_opened_at ?? "")) || 0) - (Date.parse(String(left.last_opened_at ?? "")) || 0))
    .map((row) => {
      const seriesId = String(row.series_id ?? "");
      const serie = catalogById.get(seriesId);
      return {
        series_id: seriesId,
        title: String(serie?.title ?? row.series_title ?? "Serie"),
        cover_url: serie?.cover_url ?? null,
        completion_percent: Number(row.completion_percent ?? 0) || 0,
        last_position_seconds: Number(row.last_position_seconds ?? 0) || 0,
        duration_seconds: Number(row.duration_seconds ?? 0) || 0,
        completed: row.completed === true,
        last_opened_at: row.last_opened_at ?? null,
        playback_mode: String(serie?.playback_mode ?? row.last_playback_mode ?? ""),
        available: Boolean(serie),
      };
    });
  const serializedOrders = orders.map(serializeCustomerOrder);
  const approvedOrders = serializedOrders.filter((order) => order.status.toLowerCase() === "approved");
  const displayName = [validated.user.first_name, validated.user.last_name]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return json(req, {
    ok: true,
    account: {
      telegram_user_id: userId,
      name: displayName || "Cliente",
      username: String(validated.user.username ?? ""),
      language_code: String(validated.user.language_code ?? ""),
    },
    summary: {
      library_total: library.length,
      orders_total: serializedOrders.length,
      approved_orders_total: approvedOrders.length,
      approved_amount: Number(approvedOrders.reduce((sum, order) => sum + order.amount, 0).toFixed(2)),
      favorites_total: favorites.length,
      history_total: history.length,
    },
    library,
    orders: serializedOrders,
    favorites,
    history,
  });
}

function countByStatus(rows: Record<string, unknown>[]) {
  return rows.reduce((acc: Record<string, number>, row) => {
    const status = String(row.status ?? "unknown").trim().toLowerCase() || "unknown";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function sumApprovedPayments(rows: Record<string, unknown>[]) {
  return Number(
    rows
      .filter((row) => String(row.status ?? "").toLowerCase() === "approved")
      .reduce((sum, row) => sum + (Number(row.amount ?? 0) || 0), 0)
      .toFixed(2),
  );
}

async function getOwnerPaymentRows() {
  try {
    const data = await supabaseFetch(
      `${PAYMENT_ORDERS_TABLE}?select=order_id,user_id,status,payment_method,payment_provider,sales_channel,provider_currency,provider_amount,amount,items,buyer_email,created_at,confirmed_at,mercado_pago_payment_id,telegram_payment_charge_id,delivery_status,delivery_attempts,delivered_item_ids,delivery_started_at,delivery_completed_at,delivery_last_error&order=created_at.desc&limit=100`,
    );
    return Array.isArray(data) ? data as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
}

function isDeliveryProcessingFresh(row: Record<string, unknown>) {
  const status = String(row.delivery_status ?? "pending").trim().toLowerCase();
  const startedAt = Date.parse(String(row.delivery_started_at ?? "")) || 0;
  return status === "processing" && startedAt > Date.now() - 10 * 60 * 1000;
}

function canOwnerRetryOrder(row: Record<string, unknown>) {
  const paymentStatus = String(row.status ?? "").trim().toLowerCase();
  const deliveryStatus = String(row.delivery_status ?? "pending").trim().toLowerCase();
  return paymentStatus === "approved" && deliveryStatus !== "completed" && !isDeliveryProcessingFresh(row);
}

function serializeOwnerPaymentOrder(row: Record<string, unknown>) {
  const rawItems = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];
  const deliveredIds = getDeliveredItemIds(row);
  const items = rawItems.map((item) => {
    const seriesId = String(item.id ?? item.serie_id ?? item.series_id ?? "").trim();
    return {
      series_id: seriesId,
      title: String(item.title ?? item.name ?? "Serie").trim() || "Serie",
      price: Number(item.price ?? 0) || 0,
      quantity: Number(item.quantity ?? 1) || 1,
      delivered: seriesId ? deliveredIds.has(seriesId) : false,
    };
  });

  const orderId = String(row.order_id ?? "").trim();
  return {
    order_id: orderId,
    order_short_id: orderId.slice(0, 8),
    user_id: String(row.user_id ?? ""),
    status: String(row.status ?? "unknown"),
    payment_method: String(row.payment_method ?? "unknown"),
    payment_provider: String(row.payment_provider ?? "unknown"),
    sales_channel: String(row.sales_channel ?? "unknown"),
    provider_currency: String(row.provider_currency ?? ""),
    provider_amount: Number(row.provider_amount ?? 0) || 0,
    amount: Number(row.amount ?? 0) || 0,
    buyer_email: String(row.buyer_email ?? ""),
    created_at: row.created_at ?? null,
    confirmed_at: row.confirmed_at ?? null,
    delivery_status: String(row.delivery_status ?? "pending"),
    delivery_attempts: Number(row.delivery_attempts ?? 0) || 0,
    delivery_started_at: row.delivery_started_at ?? null,
    delivery_completed_at: row.delivery_completed_at ?? null,
    delivery_last_error: String(row.delivery_last_error ?? ""),
    delivered_count: items.filter((item) => item.delivered).length,
    item_count: items.length,
    items,
    can_retry_delivery: canOwnerRetryOrder(row),
    is_processing: isDeliveryProcessingFresh(row),
  };
}

function sortByCreatedAtDesc(rows: Record<string, unknown>[]) {
  return rows.slice().sort((left, right) => {
    const leftTime = Date.parse(String(left.created_at ?? "")) || 0;
    const rightTime = Date.parse(String(right.created_at ?? "")) || 0;
    return rightTime - leftTime;
  });
}

function isTruthyInput(value: unknown) {
  return ["1", "true", "yes", "sim", "on"].includes(String(value ?? "").trim().toLowerCase());
}

function isSeriesActive(row: Record<string, unknown> | null) {
  if (!row) return false;

  const status = String(row.status ?? row.series_status ?? "").trim().toLowerCase();
  if (["inactive", "draft", "archived", "disabled", "hidden", "blocked", "deleted"].includes(status)) {
    return false;
  }

  if (row.is_active != null) {
    return isTruthyInput(row.is_active);
  }
  if (row.active != null) {
    return isTruthyInput(row.active);
  }
  if (row.published != null) {
    return isTruthyInput(row.published);
  }
  if (row.visible != null) {
    return isTruthyInput(row.visible);
  }

  if (!status) return true;
  return status === "published" || status === "active";
}

function logProtectedPlayback(event: string, payload: Record<string, unknown>) {
  try {
    console.info("[PLAYBACK]", event, stringifyJson(payload));
  } catch {
    console.info("[PLAYBACK]", event, payload);
  }
}

function normalizeOwnerPrice(value: unknown, forceFree: boolean) {
  if (forceFree) return 0;
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Number(raw.toFixed(2));
}

const OWNER_SERIES_STATUSES = new Set(["draft", "published", "hidden", "archived"]);
const OWNER_DELIVERY_TYPES = new Set(["telegram", "web", "hybrid"]);

function normalizeOwnerSeriesStatus(value: unknown, fallback = "draft") {
  const normalized = String(value ?? "").trim().toLowerCase();
  return OWNER_SERIES_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizeOwnerDeliveryType(value: unknown, fallback = "telegram") {
  const normalized = String(value ?? "").trim().toLowerCase();
  return OWNER_DELIVERY_TYPES.has(normalized) ? normalized : fallback;
}

function normalizeOwnerOptionalUrl(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function getOwnerSeriesValidationError(row: Record<string, unknown>, targetStatus: string) {
  const title = String(row.title ?? "").trim();
  const description = String(row.description ?? "").trim();
  const hasCover = Boolean(row.cover_url || row.cover_storage_path || row.cover_file_id);
  const hasPlayback = Boolean(extractVideoStoragePath(row) || extractDirectUrl(row) || extractTelegramFileId(row));
  const free = isSeriesFree(row);
  const price = Number(row.price ?? 0);

  if (!title) return "Informe o titulo da serie";
  if (targetStatus !== "published") return "";
  if (!description) return "Informe a descricao antes de publicar";
  if (!hasCover) return "Adicione uma capa antes de publicar";
  if (!hasPlayback) return "Adicione o video principal antes de publicar";
  if (!free && (!Number.isFinite(price) || price <= 0)) return "Informe um preco maior que zero antes de publicar";
  return "";
}

function serializeOwnerSeries(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: String(row.category ?? ""),
    slug: String(row.slug ?? ""),
    alternate_title: String(row.alternate_title ?? ""),
    short_description: String(row.short_description ?? ""),
    tags: normalizeSeriesTags(row.tags),
    language: String(row.language ?? ""),
    subtitle_language: String(row.subtitle_language ?? ""),
    duration_minutes: Number(row.duration_minutes ?? 0) || null,
    release_year: Number(row.release_year ?? 0) || null,
    age_rating: String(row.age_rating ?? ""),
    is_featured: row.is_featured === true,
    is_dubbed: row.is_dubbed === true,
    is_subtitled: row.is_subtitled === true,
    is_new: row.is_new === true,
    is_active: isTruthyInput(row.is_active),
    status: normalizeOwnerSeriesStatus(row.status, "published"),
    content_delivery_type: normalizeOwnerDeliveryType(row.content_delivery_type, "telegram"),
    currency: String(row.currency ?? "BRL"),
    price_cents: Number(row.price_cents ?? Math.round((Number(row.price ?? 0) || 0) * 100)),
    published_at: row.published_at ?? null,
    seo_title: String(row.seo_title ?? ""),
    seo_description: String(row.seo_description ?? ""),
    canonical_url: String(row.canonical_url ?? ""),
    og_title: String(row.og_title ?? ""),
    og_description: String(row.og_description ?? ""),
    og_image_url: String(row.og_image_url ?? ""),
    seo_noindex: row.seo_noindex === true,
    price: Number(row.price ?? 0) || 0,
    created_at: row.created_at ?? null,
    cover_url: row.cover_url ?? null,
    cover_storage_path: row.cover_storage_path ?? null,
    cover_file_id: row.cover_file_id ?? null,
    trailer_url: row.trailer_url ?? null,
    trailer_storage_path: row.trailer_storage_path ?? null,
    trailer_file_id: row.trailer_file_id ?? null,
    video_url: row.video_url ?? null,
    video_storage_path: row.video_storage_path ?? null,
    video_file_id: row.video_file_id ?? null,
    playable_episode_count: Number(row.playable_episode_count ?? 0) || 0,
    episode_file_id: row.episode_file_id ?? null,
    is_free: isSeriesFree(row),
    has_video_url: Boolean(extractVideoStoragePath(row) || extractDirectUrl(row)),
    has_video_file_id: Boolean(extractTelegramFileId(row)),
    has_trailer: Boolean(row.trailer_url || row.trailer_storage_path || row.trailer_file_id),
    has_cover: Boolean(row.cover_url || row.cover_storage_path || row.cover_file_id),
  };
}

async function getOwnerAnalytics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const data = await supabaseFetch(
      `${APP_EVENTS_TABLE}?select=event_name,user_id,series_id,order_id,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=5000`,
    );
    const rows = Array.isArray(data) ? data as Record<string, unknown>[] : [];
    const eventCounts: Record<string, number> = {};
    const usersByEvent: Record<string, Set<string>> = {};
    const uniqueUsers = new Set<string>();

    for (const row of rows) {
      const eventName = String(row.event_name ?? "").trim();
      const eventUser = String(row.user_id ?? "").trim();
      if (!eventName) continue;
      eventCounts[eventName] = (eventCounts[eventName] ?? 0) + 1;
      usersByEvent[eventName] ??= new Set<string>();
      if (eventUser) {
        usersByEvent[eventName].add(eventUser);
        uniqueUsers.add(eventUser);
      }
    }

    const uniqueCount = (eventName: string) => usersByEvent[eventName]?.size ?? 0;
    const checkoutStarted = uniqueCount("checkout_started");
    const cartAbandoned = uniqueCount("cart_abandoned");

    return {
      period_days: 30,
      events_total: rows.length,
      unique_users: uniqueUsers.size,
      event_counts: eventCounts,
      funnel: {
        app_opened: uniqueCount("app_opened"),
        series_viewed: uniqueCount("series_viewed"),
        add_to_cart: uniqueCount("add_to_cart"),
        checkout_started: checkoutStarted,
        payment_created: uniqueCount("payment_created"),
        payment_approved: uniqueCount("payment_approved"),
        delivery_completed: uniqueCount("delivery_completed"),
        cart_abandoned: cartAbandoned,
      },
      abandonment_rate: checkoutStarted > 0
        ? Number(((cartAbandoned / checkoutStarted) * 100).toFixed(1))
        : 0,
    };
  } catch (error) {
    console.warn("[ANALYTICS] Falha ao carregar metricas do proprietario:", error instanceof Error ? error.message : String(error));
    return {
      period_days: 30,
      events_total: 0,
      unique_users: 0,
      event_counts: {},
      funnel: {},
      abandonment_rate: 0,
    };
  }
}

function serializeOwnerCoupon(
  row: Record<string, unknown>,
  redemptions: Record<string, unknown>[],
) {
  const code = String(row.code ?? "").trim();
  const now = Date.now();
  const couponRedemptions = redemptions.filter((entry) => String(entry.coupon_code ?? "") === code);
  const applied = couponRedemptions.filter((entry) => String(entry.status ?? "") === "applied");
  const reserved = couponRedemptions.filter((entry) => (
    String(entry.status ?? "") === "reserved"
    && (Date.parse(String(entry.created_at ?? "")) || 0) > now - 30 * 60 * 1000
  ));
  const startsAt = row.starts_at ? String(row.starts_at) : null;
  const endsAt = row.ends_at ? String(row.ends_at) : null;
  const active = row.active === true;
  const status = !active
    ? "inactive"
    : startsAt && (Date.parse(startsAt) || 0) > now
      ? "scheduled"
      : endsAt && (Date.parse(endsAt) || 0) <= now
        ? "expired"
        : "active";

  return {
    code,
    description: String(row.description ?? ""),
    discount_type: String(row.discount_type ?? "percentage"),
    discount_value: Number(row.discount_value ?? 0) || 0,
    minimum_amount: Number(row.minimum_amount ?? 0) || 0,
    starts_at: startsAt,
    ends_at: endsAt,
    usage_limit: Number(row.usage_limit ?? 0) || null,
    per_user_limit: Number(row.per_user_limit ?? 1) || 1,
    eligible_series_ids: Array.isArray(row.eligible_series_ids) ? row.eligible_series_ids.map(String) : [],
    active,
    status,
    applied_uses: applied.length,
    reserved_uses: reserved.length,
    usage_total: applied.length + reserved.length,
    discount_total: Number(applied.reduce((sum, entry) => sum + (Number(entry.discount_amount ?? 0) || 0), 0).toFixed(2)),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

async function getOwnerCouponDashboard() {
  try {
    const [couponData, redemptionData] = await Promise.all([
      supabaseFetch(`${COUPONS_TABLE}?select=code,description,discount_type,discount_value,minimum_amount,starts_at,ends_at,usage_limit,per_user_limit,eligible_series_ids,active,created_at,updated_at&order=created_at.desc&limit=500`),
      supabaseFetch(`${COUPON_REDEMPTIONS_TABLE}?select=coupon_code,discount_amount,status,created_at&order=created_at.desc&limit=10000`),
    ]);
    const couponRows = Array.isArray(couponData) ? couponData as Record<string, unknown>[] : [];
    const redemptionRows = Array.isArray(redemptionData) ? redemptionData as Record<string, unknown>[] : [];
    const items = couponRows.map((row) => serializeOwnerCoupon(row, redemptionRows));
    return {
      total: items.length,
      active_total: items.filter((item) => item.status === "active").length,
      scheduled_total: items.filter((item) => item.status === "scheduled").length,
      applied_uses: items.reduce((sum, item) => sum + item.applied_uses, 0),
      discount_total: Number(items.reduce((sum, item) => sum + item.discount_total, 0).toFixed(2)),
      items,
    };
  } catch (error) {
    console.warn("[COUPONS] Falha ao carregar painel:", error instanceof Error ? error.message : String(error));
    return { total: 0, active_total: 0, scheduled_total: 0, applied_uses: 0, discount_total: 0, items: [] };
  }
}

async function buildOwnerDashboardPayload(userId: string) {
  const [series, episodes, payments, analytics, coupons] = await Promise.all([
    getSeriesList("", true) as Promise<Record<string, unknown>[]>,
    getEpisodesList().catch(() => [] as Record<string, unknown>[]),
    getOwnerPaymentRows(),
    getOwnerAnalytics(),
    getOwnerCouponDashboard(),
  ]);

  const sortedSeries = sortByCreatedAtDesc(series);
  const hasInternalPlayback = (row: Record<string, unknown>) => Boolean(extractVideoStoragePath(row) || extractDirectUrl(row));
  const needsMigration = (row: Record<string, unknown>) =>
    !hasInternalPlayback(row) && Boolean(extractTelegramFileId(row) || Number(row.playable_episode_count ?? 0) > 0);
  const hasAnyPlayback = (row: Record<string, unknown>) => hasInternalPlayback(row) || needsMigration(row);
  const playableSeries = sortedSeries.filter((row) => hasInternalPlayback(row));
  const migrationNeeded = sortedSeries.filter((row) => needsMigration(row));
  const missingPlayback = sortedSeries.filter((row) => !hasAnyPlayback(row));
  const playableEpisodes = episodes.filter((row) => getEpisodeFileId(row));
  const statusCounts = countByStatus(payments);
  const serializedOrders = payments.map((row) => serializeOwnerPaymentOrder(row));
  const deliveryQueue = serializedOrders.filter((order) => (
    order.status.toLowerCase() === "approved" && order.delivery_status.toLowerCase() !== "completed"
  ));

  return {
    ok: true,
    owner: {
      telegram_user_id: userId,
    },
    catalog: {
      series_total: sortedSeries.length,
      playable_series: playableSeries.length,
      internal_playback_series: playableSeries.length,
      migration_needed: migrationNeeded.length,
      missing_playback: missingPlayback.length,
      episodes_total: episodes.length,
      playable_episodes: playableEpisodes.length,
      series_with_episode_files: new Set(playableEpisodes.map((row) => String(row[EPISODE_SERIES_COLUMN] ?? ""))).size,
    },
    payments: {
      orders_total: payments.length,
      status_counts: statusCounts,
      approved_amount: sumApprovedPayments(payments),
      delivery_queue_total: deliveryQueue.length,
      delivery_failed_total: deliveryQueue.filter((order) => ["failed", "partial", "retry"].includes(order.delivery_status.toLowerCase())).length,
      delivery_processing_total: deliveryQueue.filter((order) => order.is_processing).length,
      delivery_queue: deliveryQueue.slice(0, 20),
      recent_orders: serializedOrders.slice(0, 30),
    },
    analytics,
    coupons,
    series_items: sortedSeries.map((row) => serializeOwnerSeries(row)),
    recent_series: sortedSeries.slice(0, 8).map((row) => serializeOwnerSeries(row)),
  };
}

async function resolveOwnerRequest(body: Record<string, unknown>) {
  let validated: { userId: string };
  try {
    validated = await validateWebAppInitData(String(body.init_data ?? body.initData ?? ""));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message, status: 401 };
  }

  if (String(validated.userId) !== String(OWNER_TELEGRAM_USER_ID)) {
    return { error: "Acesso restrito ao proprietario", status: 403 };
  }

  const hasPasswordConfigured = Boolean(OWNER_AREA_PASSWORD_SHA256 || OWNER_AREA_PASSWORD);
  if (!hasPasswordConfigured) {
    return { error: "Senha do proprietario nao configurada", status: 503 };
  }

  const passwordOk = await validateOwnerPassword(String(body.password ?? ""));
  if (!passwordOk) {
    return { error: "Senha invalida", status: 403 };
  }

  return { userId: validated.userId };
}

async function handleOwnerDashboard(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  const access = await resolveOwnerRequest(body);
  if ("error" in access) {
    return json(req, { error: access.error }, access.status);
  }

  const payload = await buildOwnerDashboardPayload(access.userId);
  return json(req, payload);
}

function normalizeOwnerCouponDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) throw new Error("Informe uma data valida para o cupom");
  return new Date(timestamp).toISOString();
}

function normalizeOwnerCouponLimit(value: unknown, maximum: number) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`Informe um limite inteiro entre 1 e ${maximum}`);
  }
  return parsed;
}

async function buildOwnerCouponPayload(body: Record<string, unknown>) {
  const code = normalizeCouponCode(body.code);
  if (code.length < 3) throw new Error("O codigo precisa ter entre 3 e 32 caracteres");

  const description = String(body.description ?? "").trim().slice(0, 240) || null;
  const discountType = String(body.discount_type ?? "").trim().toLowerCase();
  if (!new Set(["percentage", "fixed"]).has(discountType)) throw new Error("Escolha o tipo de desconto");

  const discountValue = Number(body.discount_value ?? 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0 || discountValue > 10000) {
    throw new Error("Informe um valor de desconto valido");
  }
  if (discountType === "percentage" && (!Number.isInteger(discountValue) || discountValue > 100)) {
    throw new Error("O desconto percentual precisa ser inteiro entre 1 e 100");
  }

  const minimumAmount = Number(body.minimum_amount ?? 0);
  if (!Number.isFinite(minimumAmount) || minimumAmount < 0 || minimumAmount > 100000) {
    throw new Error("Informe um valor minimo valido");
  }

  const startsAt = normalizeOwnerCouponDate(body.starts_at);
  const endsAt = normalizeOwnerCouponDate(body.ends_at);
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw new Error("O encerramento precisa acontecer depois do inicio");
  }

  const usageLimit = normalizeOwnerCouponLimit(body.usage_limit, 1000000);
  const perUserLimit = normalizeOwnerCouponLimit(body.per_user_limit ?? 1, 100) ?? 1;
  const eligibleIds = Array.from(new Set(
    (Array.isArray(body.eligible_series_ids) ? body.eligible_series_ids : [])
      .map((id) => String(id ?? "").trim())
      .filter(Boolean),
  )).slice(0, 50);
  for (const id of eligibleIds) {
    const row = await getSeriesById(id);
    if (!row || isSeriesFree(row)) throw new Error("Selecione apenas series pagas existentes");
  }

  const normalizedValue = Number(discountValue.toFixed(2));
  return {
    code,
    description,
    discount_type: discountType,
    discount_value: normalizedValue,
    minimum_amount: Number(minimumAmount.toFixed(2)),
    starts_at: startsAt,
    ends_at: endsAt,
    usage_limit: usageLimit,
    per_user_limit: perUserLimit,
    eligible_series_ids: eligibleIds,
    active: body.active == null ? true : isTruthyInput(body.active),
    updated_at: new Date().toISOString(),
    discount_percent: discountType === "percentage" ? normalizedValue : null,
    discount_fixed: discountType === "fixed" ? normalizedValue : null,
    valid_until: endsAt,
    max_uses: usageLimit,
  };
}

async function handleOwnerCouponSave(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json(req, { error: "Corpo da requisicao invalido" }, 400);
  const access = await resolveOwnerRequest(body);
  if ("error" in access) return json(req, { error: access.error }, access.status);

  try {
    const payload = await buildOwnerCouponPayload(body);
    const originalCode = normalizeCouponCode(body.original_code);
    const lookupCode = originalCode || payload.code;
    const currentRows = await supabaseFetch(`${COUPONS_TABLE}?select=code&code=eq.${encodeURIComponent(lookupCode)}&limit=1`);
    const current = Array.isArray(currentRows) && currentRows.length > 0;

    if (originalCode && !current) return json(req, { error: "Cupom nao encontrado" }, 404);
    if (!originalCode && current) return json(req, { error: "Ja existe um cupom com este codigo" }, 409);
    if (originalCode && originalCode !== payload.code) {
      const conflict = await supabaseFetch(`${COUPONS_TABLE}?select=code&code=eq.${encodeURIComponent(payload.code)}&limit=1`);
      if (Array.isArray(conflict) && conflict.length) return json(req, { error: "Ja existe um cupom com este codigo" }, 409);
    }

    const saved = current
      ? await supabaseRestRequest(`${COUPONS_TABLE}?code=eq.${encodeURIComponent(lookupCode)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json", prefer: "return=representation" },
          body: stringifyJson(payload),
        })
      : await supabaseRestRequest(COUPONS_TABLE, {
          method: "POST",
          headers: { "content-type": "application/json", prefer: "return=representation" },
          body: stringifyJson([{ ...payload, created_at: new Date().toISOString() }]),
        });
    const coupon = Array.isArray(saved) ? saved[0] : saved;
    return json(req, { ok: true, coupon, dashboard: await buildOwnerDashboardPayload(access.userId) });
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Nao foi possivel salvar o cupom" }, 400);
  }
}

async function handleOwnerCouponAction(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json(req, { error: "Corpo da requisicao invalido" }, 400);
  const access = await resolveOwnerRequest(body);
  if ("error" in access) return json(req, { error: access.error }, access.status);

  const code = normalizeCouponCode(body.code);
  const operation = String(body.operation ?? "").trim().toLowerCase();
  if (!code || !["activate", "deactivate"].includes(operation)) {
    return json(req, { error: "Acao de cupom invalida" }, 400);
  }
  const rows = await supabaseFetch(`${COUPONS_TABLE}?select=code,ends_at&code=eq.${encodeURIComponent(code)}&limit=1`);
  const coupon = Array.isArray(rows) && rows.length ? rows[0] as Record<string, unknown> : null;
  if (!coupon) return json(req, { error: "Cupom nao encontrado" }, 404);
  if (operation === "activate" && coupon.ends_at && (Date.parse(String(coupon.ends_at)) || 0) <= Date.now()) {
    return json(req, { error: "Edite a data final antes de reativar este cupom" }, 409);
  }

  await supabaseRestRequest(`${COUPONS_TABLE}?code=eq.${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: stringifyJson({ active: operation === "activate", updated_at: new Date().toISOString() }),
  });
  return json(req, { ok: true, dashboard: await buildOwnerDashboardPayload(access.userId) });
}

async function verifyApprovedOrderForOwnerRetry(order: Record<string, unknown>) {
  if (String(order.status ?? "").trim().toLowerCase() !== "approved") {
    return { ok: false as const, status: 409, error: "Somente pedidos aprovados podem ser reprocessados" };
  }

  const paymentProvider = String(order.payment_provider ?? "mercado_pago").trim().toLowerCase();
  if (paymentProvider === "telegram_stars") {
    const chargeId = String(order.telegram_payment_charge_id ?? "").trim();
    const currency = String(order.provider_currency ?? "").trim().toUpperCase();
    const providerAmount = Math.round(Number(order.provider_amount ?? 0) || 0);
    if (!chargeId || currency !== "XTR" || providerAmount <= 0) {
      return { ok: false as const, status: 409, error: "Este pedido nao possui comprovante valido do Telegram" };
    }
    return { ok: true as const, source: "telegram_stars" };
  }

  const paymentId = String(order.mercado_pago_payment_id ?? order.external_payment_id ?? "").trim();
  if (!paymentId) {
    return { ok: false as const, status: 409, error: "Este pedido nao possui comprovante de pagamento conciliado" };
  }

  try {
    const payment = await fetchMercadoPagoPayment(paymentId);
    const paymentStatus = normalizeWebhookStatus(payment.status);
    const orderId = String(order.order_id ?? "").trim();
    const externalReference = String(payment.external_reference ?? "").trim();
    const metadata = payment.metadata as Record<string, unknown> | undefined;
    const metadataOrderId = String(metadata?.order_id ?? "").trim();
    const matchesOrder = externalReference === orderId || metadataOrderId === orderId;

    if (paymentStatus !== "approved" || !matchesOrder) {
      return { ok: false as const, status: 409, error: "O Mercado Pago nao confirmou este pedido como aprovado" };
    }

    return { ok: true as const, source: "mercado_pago" };
  } catch (error) {
    console.error("[OWNER][DELIVERY] Falha ao validar pagamento antes do reprocessamento:", error instanceof Error ? error.message : String(error));
    return { ok: false as const, status: 502, error: "Nao foi possivel confirmar o pagamento agora. Tente novamente em instantes" };
  }
}

async function handleOwnerOrderRetry(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json(req, { error: "Corpo da requisicao invalido" }, 400);

  const access = await resolveOwnerRequest(body);
  if ("error" in access) return json(req, { error: access.error }, access.status);

  const orderId = String(body.order_id ?? body.orderId ?? "").trim();
  if (!orderId || orderId.length > 160) {
    return json(req, { error: "Pedido invalido" }, 400);
  }

  const order = await getPaymentOrderById(orderId);
  if (!order) return json(req, { error: "Pedido nao encontrado" }, 404);

  const deliveryStatus = String(order.delivery_status ?? "pending").trim().toLowerCase();
  if (deliveryStatus === "completed") {
    return json(req, { error: "A entrega deste pedido ja foi concluida" }, 409);
  }
  if (isDeliveryProcessingFresh(order)) {
    return json(req, { error: "A entrega ja esta sendo processada" }, 409);
  }

  const paymentVerification = await verifyApprovedOrderForOwnerRetry(order);
  if (!paymentVerification.ok) {
    return json(req, { error: paymentVerification.error }, paymentVerification.status);
  }

  const retryOrder = await updatePaymentOrderRecord(orderId, {
    delivery_status: "retry",
    delivery_last_error: null,
  }) as Record<string, unknown>;
  const summary = await deliverApprovedOrderSeries(retryOrder);
  const updatedOrder = await getPaymentOrderById(orderId) || retryOrder;
  const dashboard = await buildOwnerDashboardPayload(access.userId);

  console.info("[OWNER][DELIVERY] Reprocessamento concluido", stringifyJson({
    order_id: orderId,
    owner_user_id: access.userId,
    payment_verification: paymentVerification.source,
    delivery_status: updatedOrder.delivery_status,
    delivered_now: summary.delivered.length,
    failed_now: summary.failed.length,
  }));

  return json(req, {
    ok: true,
    order: serializeOwnerPaymentOrder(updatedOrder),
    summary,
    dashboard,
  });
}

async function handleOwnerUploadSign(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  const access = await resolveOwnerRequest(body);
  if ("error" in access) {
    return json(req, { error: access.error }, access.status);
  }

  const fieldName = String(body.field_name ?? "").trim();
  const fileName = String(body.file_name ?? "").trim();
  const requestedSeriesId = String(body.series_id ?? body.id ?? "").trim();

  if (!fieldName || !fileName) {
    return json(req, { error: "field_name e file_name sao obrigatorios" }, 400);
  }

  const fieldToBucket: Record<string, { bucket: string; kind: string }> = {
    cover_file: { bucket: SERIES_COVER_BUCKET, kind: "cover" },
    trailer_file: { bucket: SERIES_TRAILER_BUCKET, kind: "trailer" },
    video_file: { bucket: SERIES_VIDEO_BUCKET, kind: "video" },
  };

  const target = fieldToBucket[fieldName];
  if (!target) {
    return json(req, { error: "Tipo de upload nao suportado" }, 400);
  }

  const seriesId = requestedSeriesId || crypto.randomUUID();
  const objectPath = getStorageObjectName(
    seriesId,
    `${target.kind}-${Date.now()}`,
    fileName,
  );
  const signed = await createStorageSignedUploadUrl(target.bucket, objectPath, true);

  return json(req, {
    ok: true,
    series_id: seriesId,
    field_name: fieldName,
    bucket: target.bucket,
    object_path: signed.path,
    upload_url: signed.uploadUrl,
    expires_in_seconds: 2 * 60 * 60,
  });
}

async function handleOwnerBinaryUpload(req: Request) {
  const initData = String(req.headers.get("x-webapp-init-data") ?? "").trim();
  const password = String(req.headers.get("x-owner-password") ?? "").trim();
  const fieldName = String(req.headers.get("x-owner-field-name") ?? "").trim();
  const rawFileName = String(req.headers.get("x-owner-file-name") ?? "").trim();
  const requestedSeriesId = String(req.headers.get("x-owner-series-id") ?? "").trim();
  const fileName = (() => {
    if (!rawFileName) return "";
    try {
      return decodeURIComponent(rawFileName);
    } catch {
      return rawFileName;
    }
  })();

  const access = await resolveOwnerRequest({
    init_data: initData,
    password,
  });
  if ("error" in access) {
    return json(req, { error: access.error }, access.status);
  }

  if (!fieldName || !fileName) {
    return json(req, { error: "field_name e file_name sao obrigatorios" }, 400);
  }

  const fieldToBucket: Record<string, { bucket: string; kind: string }> = {
    cover_file: { bucket: SERIES_COVER_BUCKET, kind: "cover" },
    trailer_file: { bucket: SERIES_TRAILER_BUCKET, kind: "trailer" },
    video_file: { bucket: SERIES_VIDEO_BUCKET, kind: "video" },
  };

  const target = fieldToBucket[fieldName];
  if (!target) {
    return json(req, { error: "Tipo de upload nao suportado" }, 400);
  }

  const seriesId = requestedSeriesId || crypto.randomUUID();
  const objectPath = getStorageObjectName(
    seriesId,
    `${target.kind}-${Date.now()}`,
    fileName,
  );
  const uploaded = await uploadStorageStream(target.bucket, objectPath, req);

  return json(req, {
    ok: true,
    series_id: seriesId,
    field_name: fieldName,
    bucket: target.bucket,
    object_path: uploaded.path,
    public_url: uploaded.publicUrl,
  });
}

async function handleOwnerSeriesCreate(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  const body = Object.fromEntries(form.entries());
  const access = await resolveOwnerRequest(body);
  if ("error" in access) {
    return json(req, { error: access.error }, access.status);
  }

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "Geral").trim() || "Geral";
  const requestedSlug = slugifySeriesTitle(form.get("slug"));
  const alternateTitle = String(form.get("alternate_title") ?? "").trim() || null;
  const shortDescription = String(form.get("short_description") ?? "").trim().slice(0, 220) || null;
  const tags = normalizeSeriesTags(form.get("tags"));
  const language = String(form.get("language") ?? "").trim() || null;
  const subtitleLanguage = String(form.get("subtitle_language") ?? "").trim() || null;
  const durationMinutes = Number(form.get("duration_minutes") ?? 0) || null;
  const releaseYear = Number(form.get("release_year") ?? 0) || null;
  const ageRating = String(form.get("age_rating") ?? "").trim() || null;
  const isFeatured = isTruthyInput(form.get("is_featured"));
  const isDubbed = isTruthyInput(form.get("is_dubbed"));
  const isSubtitled = isTruthyInput(form.get("is_subtitled"));
  const isNew = isTruthyInput(form.get("is_new"));
  const forceFree = isTruthyInput(form.get("is_free"));
  const seriesIdInput = String(form.get("series_id") ?? form.get("id") ?? "").trim();
  const uploadedCoverPath = String(form.get("uploaded_cover_path") ?? "").trim();
  const uploadedTrailerPath = String(form.get("uploaded_trailer_path") ?? "").trim();
  const uploadedVideoPath = String(form.get("uploaded_video_path") ?? "").trim();
  const videoFileIdInput = normalizeTelegramFileIdInput(form.get("video_file_id"));
  const cover = form.get("cover_file");
  const video = form.get("video_file");
  const trailer = form.get("trailer_file");
  const existingRow = seriesIdInput ? await getSeriesById(seriesIdInput) : null;
  const isEdit = Boolean(existingRow);
  const status = normalizeOwnerSeriesStatus(form.get("status"), normalizeOwnerSeriesStatus(existingRow?.status, "published"));
  const deliveryType = normalizeOwnerDeliveryType(
    form.get("content_delivery_type"),
    normalizeOwnerDeliveryType(existingRow?.content_delivery_type, "telegram"),
  );
  const seoTitle = String(form.get("seo_title") ?? "").trim() || null;
  const seoDescription = String(form.get("seo_description") ?? "").trim() || null;
  const canonicalInput = String(form.get("canonical_url") ?? "").trim();
  const ogTitle = String(form.get("og_title") ?? "").trim() || null;
  const ogDescription = String(form.get("og_description") ?? "").trim() || null;
  const ogImageInput = String(form.get("og_image_url") ?? "").trim();
  const canonicalUrl = normalizeOwnerOptionalUrl(canonicalInput);
  const ogImageUrl = normalizeOwnerOptionalUrl(ogImageInput);
  const seoNoindex = isTruthyInput(form.get("seo_noindex"));

  if (!title) {
    return json(req, { error: "Informe o título da série" }, 400);
  }

  if (status === "published" && !description) {
    return json(req, { error: "Informe a descricao antes de publicar" }, 400);
  }

  if (seoTitle && seoTitle.length > 70) {
    return json(req, { error: "O titulo SEO deve ter no maximo 70 caracteres" }, 400);
  }

  if (seoDescription && seoDescription.length > 180) {
    return json(req, { error: "A descricao SEO deve ter no maximo 180 caracteres" }, 400);
  }

  if (canonicalInput && !canonicalUrl) {
    return json(req, { error: "A URL canonica deve usar HTTPS" }, 400);
  }

  if (ogImageInput && !ogImageUrl) {
    return json(req, { error: "A imagem social deve usar uma URL HTTPS" }, 400);
  }

  if (durationMinutes != null && (durationMinutes < 1 || durationMinutes > 1440)) {
    return json(req, { error: "A duracao deve ficar entre 1 e 1440 minutos" }, 400);
  }

  if (releaseYear != null && (releaseYear < 1900 || releaseYear > 2100)) {
    return json(req, { error: "Informe um ano de lancamento valido" }, 400);
  }

  if (status === "published" && !(cover instanceof File) && !uploadedCoverPath) {
    if (!existingRow) {
      return json(req, { error: "Envie a imagem de capa" }, 400);
    }
  }

  if (status === "published" && !(video instanceof File) && !uploadedVideoPath && !videoFileIdInput) {
    if (!existingRow) {
      return json(req, { error: "Envie o vídeo principal da série" }, 400);
    }
  }

  const existingPrice = Number(existingRow?.price ?? 0) || 0;
  const priceInput = String(form.get("price") ?? "").trim();
  const normalizedPrice = priceInput === "" ? existingPrice : normalizeOwnerPrice(priceInput, forceFree);
  const price = forceFree ? 0 : normalizedPrice;

  if (status === "published" && !forceFree && price <= 0) {
    return json(req, { error: "Informe um valor maior que zero para a série paga" }, 400);
  }

  const seriesId = seriesIdInput || String(existingRow?.id ?? "").trim() || crypto.randomUUID();
  const slug = requestedSlug || String(existingRow?.slug ?? "").trim() || `${slugifySeriesTitle(title)}-${seriesId.slice(0, 8)}`;
  const slugOwner = await getSeriesBySlug(slug);
  if (slugOwner && String(slugOwner.id ?? "") !== seriesId) {
    return json(req, { error: "Este endereco amigavel ja esta sendo usado por outra serie" }, 409);
  }
  const coverObjectPath = cover instanceof File && cover.size > 0 ? getStorageObjectName(seriesId, "cover", cover.name || "cover") : "";
  const videoObjectPath = video instanceof File && video.size > 0 ? getStorageObjectName(seriesId, "video", video.name || "video") : "";
  const trailerFile = trailer instanceof File && trailer.size > 0 ? trailer : null;
  const trailerObjectPath = trailerFile ? getStorageObjectName(seriesId, "trailer", trailerFile.name || "trailer") : "";

  const [coverUpload, videoUpload, trailerUpload] = await Promise.all([
    cover instanceof File && cover.size > 0
      ? uploadStorageObject(SERIES_COVER_BUCKET, coverObjectPath, cover)
      : Promise.resolve(null),
    video instanceof File && video.size > 0
      ? uploadStorageObject(SERIES_VIDEO_BUCKET, videoObjectPath, video)
      : Promise.resolve(null),
    trailerFile ? uploadStorageObject(SERIES_TRAILER_BUCKET, trailerObjectPath, trailerFile) : Promise.resolve(null),
  ]);

  const coverUrl = coverUpload?.publicUrl
    || (uploadedCoverPath ? storagePublicUrl(SERIES_COVER_BUCKET, uploadedCoverPath) : "")
    || String(existingRow?.cover_url ?? "").trim()
    || null;
  const coverPath = uploadedCoverPath
    || coverUpload?.path
    || String(existingRow?.cover_storage_path ?? "").trim()
    || null;
  const videoUrl = videoUpload
    ? null
    : uploadedVideoPath
      ? null
    : String(existingRow?.video_url ?? "").trim()
      || null;
  const videoPath = uploadedVideoPath
    || videoUpload?.path
    || String(existingRow?.video_storage_path ?? "").trim()
    || null;
  const trailerUrl = trailerUpload?.publicUrl
    || (uploadedTrailerPath ? storagePublicUrl(SERIES_TRAILER_BUCKET, uploadedTrailerPath) : "")
    || String(existingRow?.trailer_url ?? "").trim()
    || null;
  const trailerPath = uploadedTrailerPath
    || trailerUpload?.path
    || String(existingRow?.trailer_storage_path ?? "").trim()
    || null;

  if (status === "published" && (!coverUrl || (!videoPath && !videoUrl && !videoFileIdInput && !String(existingRow?.[PRIMARY_SERIES_VIDEO_FILE_ID_COLUMN] ?? "").trim()))) {
    return json(req, { error: "A série precisa de capa e vídeo principal" }, 400);
  }

  const rowPayload: Record<string, unknown> = {
    id: seriesId,
    title,
    description,
    category,
    slug,
    alternate_title: alternateTitle,
    short_description: shortDescription,
    tags,
    language,
    subtitle_language: subtitleLanguage,
    duration_minutes: durationMinutes,
    release_year: releaseYear,
    age_rating: ageRating,
    is_featured: isFeatured,
    is_dubbed: isDubbed,
    is_subtitled: isSubtitled,
    is_new: isNew,
    is_active: status === "published",
    status,
    access_type: forceFree ? "free" : "paid",
    content_delivery_type: deliveryType,
    currency: "BRL",
    price_cents: Math.round(price * 100),
    published_at: status === "published" ? (existingRow?.published_at ?? new Date().toISOString()) : existingRow?.published_at ?? null,
    seo_title: seoTitle,
    seo_description: seoDescription,
    canonical_url: canonicalUrl,
    og_title: ogTitle,
    og_description: ogDescription,
    og_image_url: ogImageUrl,
    seo_noindex: seoNoindex,
    price,
    cover_url: coverUrl,
    cover_storage_path: coverPath,
    video_url: videoUrl,
    video_storage_path: videoPath,
    trailer_url: trailerUrl,
    trailer_storage_path: trailerPath,
  };

  rowPayload[PRIMARY_SERIES_VIDEO_FILE_ID_COLUMN] = videoFileIdInput
    || String(existingRow?.[PRIMARY_SERIES_VIDEO_FILE_ID_COLUMN] ?? "").trim()
    || null;

  const saved = await supabaseRestRequest(
    isEdit ? buildSeriesRowFilter(seriesId) : SERIES_TABLE,
    {
      method: isEdit ? "PATCH" : "POST",
      headers: {
        prefer: "return=representation",
        "content-type": "application/json",
      },
      body: JSON.stringify(isEdit ? rowPayload : [rowPayload]),
    },
  ) as Record<string, unknown>[] | Record<string, unknown>;

  const savedRow = Array.isArray(saved) ? saved[0] : saved;
  const freshRow = await getSeriesById(seriesId);
  const finalRow = freshRow && typeof freshRow === "object" ? freshRow : savedRow;
  if (!finalRow || typeof finalRow !== "object") {
    return json(req, { error: "Não foi possível registrar a série" }, 500);
  }

  const previousSlug = String(existingRow?.slug ?? "").trim();
  if (isEdit && previousSlug && slug && previousSlug.toLowerCase() !== slug.toLowerCase()) {
    try {
      await supabaseRestRequest("series_slug_redirects?on_conflict=old_slug", {
        method: "POST",
        headers: {
          prefer: "resolution=merge-duplicates,return=minimal",
          "content-type": "application/json",
        },
        body: JSON.stringify([{ series_id: seriesId, old_slug: previousSlug, new_slug: slug }]),
      });
    } catch (error) {
      console.warn("[CMS] Falha ao registrar redirecionamento de slug:", error instanceof Error ? error.message : String(error));
    }
  }

  const previousCoverPath = String(existingRow?.cover_storage_path ?? "").trim();
  const previousVideoPath = String(existingRow?.video_storage_path ?? "").trim();
  const previousTrailerPath = String(existingRow?.trailer_storage_path ?? "").trim();
  const nextCoverPath = String(coverPath ?? "").trim();
  const nextVideoPath = String(videoPath ?? "").trim();
  const nextTrailerPath = String(trailerPath ?? "").trim();

  for (const cleanup of [
    { bucket: SERIES_COVER_BUCKET, previous: previousCoverPath, next: nextCoverPath },
    { bucket: SERIES_VIDEO_BUCKET, previous: previousVideoPath, next: nextVideoPath },
    { bucket: SERIES_TRAILER_BUCKET, previous: previousTrailerPath, next: nextTrailerPath },
  ]) {
    if (!cleanup.previous || cleanup.previous === cleanup.next) continue;
    try {
      await deleteStorageObject(cleanup.bucket, cleanup.previous);
    } catch {
      // best effort cleanup
    }
  }

  const wasPublished = normalizeOwnerSeriesStatus(existingRow?.status, "published") === "published";
  if (status === "published" && (!isEdit || !wasPublished)) {
    try {
      await postSeriesAnnouncementToChannel(finalRow as Record<string, unknown>);
    } catch (error) {
      console.warn("[CHANNEL] Falha ao anunciar nova série no canal:", error instanceof Error ? error.message : String(error));
    }
  }

  const dashboard = await buildOwnerDashboardPayload(access.userId);
  return json(req, {
    ok: true,
    series: serializeOwnerSeries(finalRow as Record<string, unknown>),
    dashboard,
  }, 201);
}

async function handleOwnerSeriesMigrate(req: Request) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  let body: Record<string, unknown> | null = null;

  if (contentType.includes("application/json")) {
    body = await req.json().catch(() => null) as Record<string, unknown> | null;
  } else {
    const form = await req.formData().catch(() => null);
    body = form ? Object.fromEntries(form.entries()) : null;
  }

  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  const access = await resolveOwnerRequest(body);
  if ("error" in access) {
    return json(req, { error: access.error }, access.status);
  }

  const seriesId = String(body.series_id ?? body.id ?? "").trim();
  if (!seriesId) {
    return json(req, { error: "Informe o id da serie" }, 400);
  }

  const existingRow = await getSeriesById(seriesId);
  if (!existingRow) {
    return json(req, { error: "Serie nao encontrada" }, 404);
  }

  let fileId = extractTelegramFileId(existingRow as Record<string, unknown>);
  if (!fileId) {
    const episodes = await getEpisodesList(seriesId);
    const firstPlayable = getPlayableEpisodesForSeries(episodes, seriesId)[0] ?? null;
    fileId = firstPlayable ? getEpisodeFileId(firstPlayable) : "";
  }
  if (!fileId) {
    return json(req, { error: "Nao foi encontrado File_ID para migrar" }, 400);
  }

  const title = String((existingRow as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? body.title ?? "video");
  const objectPath = getStorageObjectName(seriesId, "video", title || "video");

  let migratedFile: File;
  try {
    migratedFile = await downloadTelegramFileAsVideo(fileId, title);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(
      req,
      {
        error: message,
        type: "internal_player_unavailable",
        title,
        reason: "Este video ainda nao pode ser migrado automaticamente para o player interno.",
      },
      422,
    );
  }

  const uploaded = await uploadStorageObject(SERIES_VIDEO_BUCKET, objectPath, migratedFile);

  const rowPayload: Record<string, unknown> = {
    video_url: null,
    video_storage_path: uploaded.path,
  };

  await supabaseRestRequest(
    buildSeriesRowFilter(seriesId),
    {
      method: "PATCH",
      headers: {
        prefer: "return=representation",
        "content-type": "application/json",
      },
      body: JSON.stringify(rowPayload),
    },
  );

  const freshRow = await getSeriesById(seriesId);
  const dashboard = await buildOwnerDashboardPayload(access.userId);

  return json(req, {
    ok: true,
    series: serializeOwnerSeries((freshRow && typeof freshRow === "object" ? freshRow : existingRow) as Record<string, unknown>),
    dashboard,
    uploaded: {
      bucket: SERIES_VIDEO_BUCKET,
      path: uploaded.path,
    },
  });
}

async function handleOwnerSeriesDelete(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  const access = await resolveOwnerRequest(body);
  if ("error" in access) {
    return json(req, { error: access.error }, access.status);
  }

  const seriesId = String(body.series_id ?? body.id ?? "").trim();
  if (!seriesId) {
    return json(req, { error: "Informe o id da serie" }, 400);
  }

  const existingRow = await getSeriesById(seriesId);
  if (!existingRow) {
    return json(req, { error: "Serie nao encontrada" }, 404);
  }

  await supabaseRestRequest(
    buildSeriesRowFilter(seriesId),
    {
      method: "DELETE",
      headers: {
        prefer: "return=representation",
        "content-type": "application/json",
      },
    },
  );

  await deleteSeriesMediaAssets(existingRow as Record<string, unknown>);

  const dashboard = await buildOwnerDashboardPayload(access.userId);
  return json(req, {
    ok: true,
    dashboard,
  });
}

async function handleOwnerSeriesAction(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  const access = await resolveOwnerRequest(body);
  if ("error" in access) {
    return json(req, { error: access.error }, access.status);
  }

  const seriesId = String(body.series_id ?? body.id ?? "").trim();
  const operation = String(body.operation ?? "").trim().toLowerCase();
  if (!seriesId) return json(req, { error: "Informe o id da serie" }, 400);

  const existingRow = await getSeriesById(seriesId);
  if (!existingRow) return json(req, { error: "Serie nao encontrada" }, 404);

  if (operation === "duplicate") {
    const duplicateId = crypto.randomUUID();
    const originalTitle = String(existingRow.title ?? "Serie").trim() || "Serie";
    const duplicateTitle = `${originalTitle} - copia`;
    const duplicateSlug = `${slugifySeriesTitle(originalTitle)}-copia-${duplicateId.slice(0, 8)}`;
    const duplicate: Record<string, unknown> = {
      id: duplicateId,
      title: duplicateTitle,
      description: String(existingRow.description ?? ""),
      category: String(existingRow.category ?? "Geral") || "Geral",
      slug: duplicateSlug,
      alternate_title: existingRow.alternate_title ?? null,
      short_description: existingRow.short_description ?? null,
      tags: normalizeSeriesTags(existingRow.tags),
      language: existingRow.language ?? null,
      subtitle_language: existingRow.subtitle_language ?? null,
      duration_minutes: existingRow.duration_minutes ?? null,
      release_year: existingRow.release_year ?? null,
      age_rating: existingRow.age_rating ?? null,
      is_featured: false,
      is_dubbed: existingRow.is_dubbed === true,
      is_subtitled: existingRow.is_subtitled === true,
      is_new: false,
      is_active: false,
      status: "draft",
      access_type: String(existingRow.access_type ?? (isSeriesFree(existingRow) ? "free" : "paid")),
      content_delivery_type: normalizeOwnerDeliveryType(existingRow.content_delivery_type, "telegram"),
      currency: "BRL",
      price: Number(existingRow.price ?? 0) || 0,
      price_cents: Number(existingRow.price_cents ?? Math.round((Number(existingRow.price ?? 0) || 0) * 100)),
      cover_url: existingRow.cover_url ?? null,
      cover_storage_path: null,
      video_url: null,
      video_storage_path: null,
      trailer_url: existingRow.trailer_url ?? null,
      trailer_storage_path: null,
      seo_title: null,
      seo_description: null,
      canonical_url: null,
      og_title: null,
      og_description: null,
      og_image_url: existingRow.og_image_url ?? null,
      seo_noindex: true,
      published_at: null,
    };
    duplicate[PRIMARY_SERIES_VIDEO_FILE_ID_COLUMN] = null;

    const inserted = await supabaseRestRequest(SERIES_TABLE, {
      method: "POST",
      headers: { prefer: "return=representation", "content-type": "application/json" },
      body: JSON.stringify([duplicate]),
    }) as Record<string, unknown>[];
    const created = Array.isArray(inserted) ? inserted[0] : null;
    const dashboard = await buildOwnerDashboardPayload(access.userId);
    return json(req, { ok: true, series: created ? serializeOwnerSeries(created) : null, dashboard }, 201);
  }

  if (!OWNER_SERIES_STATUSES.has(operation)) {
    return json(req, { error: "Acao editorial invalida" }, 400);
  }

  const validationError = getOwnerSeriesValidationError(existingRow as Record<string, unknown>, operation);
  if (validationError) return json(req, { error: validationError }, 409);

  const wasPublished = normalizeOwnerSeriesStatus(existingRow.status, "published") === "published";
  const patch: Record<string, unknown> = {
    status: operation,
    is_active: operation === "published",
    seo_noindex: operation === "published" ? existingRow.seo_noindex === true : true,
  };
  if (operation === "published" && !existingRow.published_at) patch.published_at = new Date().toISOString();

  const updatedRows = await supabaseRestRequest(buildSeriesRowFilter(seriesId), {
    method: "PATCH",
    headers: { prefer: "return=representation", "content-type": "application/json" },
    body: JSON.stringify(patch),
  }) as Record<string, unknown>[];
  const updated = Array.isArray(updatedRows) ? updatedRows[0] : null;

  if (operation === "published" && !wasPublished && updated) {
    try {
      await postSeriesAnnouncementToChannel(updated);
    } catch (error) {
      console.warn("[CHANNEL] Falha ao anunciar serie publicada:", error instanceof Error ? error.message : String(error));
    }
  }

  const dashboard = await buildOwnerDashboardPayload(access.userId);
  return json(req, { ok: true, series: updated ? serializeOwnerSeries(updated) : null, dashboard });
}

async function handleSupportSubmit(req: Request) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  let body: Record<string, unknown> | null = null;

  if (contentType.includes("application/json")) {
    body = await req.json().catch(() => null) as Record<string, unknown> | null;
  } else {
    const form = await req.formData().catch(() => null);
    body = form ? Object.fromEntries(form.entries()) : null;
  }

  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  let validated: { userId: string; user: Record<string, unknown> };
  try {
    validated = await validateWebAppInitData(String(body.init_data ?? body.initData ?? "")) as { userId: string; user: Record<string, unknown> };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(req, { error: message }, 401);
  }

  const email = String(body.email ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const description = String(body.description ?? "").trim();
  const context = String(body.context ?? "").trim();
  const user = validated.user || {};
  const telegramUserId = String(validated.userId || user.id || "").trim();
  const telegramName = [String(user.first_name ?? "").trim(), String(user.last_name ?? "").trim()].filter(Boolean).join(" ");
  const telegramUserName = String(user.username ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(req, { error: "Informe um e-mail válido" }, 400);
  }
  if (subject.length < 3) {
    return json(req, { error: "Informe um assunto" }, 400);
  }
  if (description.length < 20) {
    return json(req, { error: "Descreva melhor o problema" }, 400);
  }

  if (!RESEND_API_KEY) {
    return json(req, {
      ok: false,
      error: "Envio automático de e-mail ainda não configurado neste ambiente.",
      mailto_url: buildSupportMailtoUrl({ email, subject, description, context }),
    });
  }

  const sent = await sendSupportEmail({
    email,
    subject,
    description,
    context,
    telegramUserId,
    telegramUserName,
    telegramName,
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false as const, error: message, mailtoUrl: buildSupportMailtoUrl({ email, subject, description, context }) };
  });

  if (!sent.ok) {
    const sentError = "error" in sent ? sent.error : "";
    return json(req, {
      ok: false,
      error: sentError || "Não foi possível enviar o e-mail de suporte.",
      mailto_url: sent.mailtoUrl || buildSupportMailtoUrl({ email, subject, description, context }),
    }, 502);
  }

  return json(req, {
    ok: true,
    support_id: `${Date.now()}-${telegramUserId || "anon"}`,
  });
}

async function handleSupportSubmitV2(req: Request) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  let body: Record<string, unknown> | null = null;

  if (contentType.includes("application/json")) {
    body = await req.json().catch(() => null) as Record<string, unknown> | null;
  } else {
    const form = await req.formData().catch(() => null);
    body = form ? Object.fromEntries(form.entries()) : null;
  }

  if (!body) {
    return json(req, { error: "Corpo da requisicao invalido" }, 400);
  }

  let validated: { userId: string; user: Record<string, unknown> };
  try {
    validated = await validateWebAppInitData(String(body.init_data ?? body.initData ?? "")) as { userId: string; user: Record<string, unknown> };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(req, { error: message }, 401);
  }

  const email = String(body.email ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const description = String(body.description ?? "").trim();
  const context = String(body.context ?? "").trim();
  const user = validated.user || {};
  const telegramUserId = String(validated.userId || user.id || "").trim();
  const telegramName = [String(user.first_name ?? "").trim(), String(user.last_name ?? "").trim()].filter(Boolean).join(" ");
  const telegramUserName = String(user.username ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(req, { error: "Informe um e-mail válido" }, 400);
  }
  if (subject.length < 3) {
    return json(req, { error: "Informe um assunto" }, 400);
  }
  if (description.length < 20) {
    return json(req, { error: "Descreva melhor o problema" }, 400);
  }

  const supportInput = {
    email,
    subject,
    description,
    context,
    telegramUserId,
    telegramUserName,
    telegramName,
  };

  const [emailResult, telegramResult] = await Promise.allSettled([
    RESEND_API_KEY
      ? sendSupportEmail(supportInput)
      : Promise.resolve({ ok: false as const, mailtoUrl: buildSupportMailtoUrl(supportInput) }),
    sendSupportTelegramNotification(supportInput),
  ]);

  const emailSent = emailResult.status === "fulfilled" && Boolean(emailResult.value?.ok);
  const telegramSent = telegramResult.status === "fulfilled" && Boolean(telegramResult.value?.ok);
  const mailtoUrl =
    emailResult.status === "fulfilled" && "mailtoUrl" in emailResult.value
      ? emailResult.value.mailtoUrl
      : buildSupportMailtoUrl(supportInput);

  if (!emailSent && !telegramSent) {
    return json(req, {
      ok: false,
      error: "Não foi possível registrar a solicitação agora.",
      mailto_url: mailtoUrl,
    }, 502);
  }

  return json(req, {
    ok: true,
    support_id: `${Date.now()}-${telegramUserId || "anon"}`,
    email_sent: emailSent,
    telegram_sent: telegramSent,
    mailto_url: emailSent ? undefined : mailtoUrl,
  });
}

export {
  normalizeWebhookStatus,
  validateApprovedPaymentForOrder,
  validateTelegramStarsPaymentForOrder,
};

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/+$/, "");
    const action = url.searchParams.get("action") || (pathname.endsWith("/api") ? url.searchParams.get("action") : null);

    if (action === "series") {
      let userId = "";
      const initData = url.searchParams.get("init_data") || "";
      if (initData) {
        try {
          userId = (await validateWebAppInitData(initData)).userId;
        } catch {
          userId = "";
        }
      }
      const series = await getSeriesList(userId);
      return json(req, series);
    }

    if (action === "series-slug-resolve" && req.method === "GET") {
      return await handleSeriesSlugResolve(req, url);
    }

    if (action === "support-submit" && req.method === "POST") {
      return await handleSupportSubmitV2(req);
    }

    if (action === "stream") {
      return await handleStreamV2(req, url);
    }

    if (action === "deliver-series") {
      return await handleSeriesDelivery(req);
    }

    if (action === "progress-sync") {
      return await handleProgressSync(req);
    }

    if (action === "favorite-sync") {
      return await handleFavoriteSync(req);
    }

    if (action === "customer-area" && req.method === "POST") {
      return await handleCustomerArea(req);
    }

    if (action === "analytics-event" && req.method === "POST") {
      return await handleAnalyticsEvent(req);
    }

    if (action === "playback") {
      const fileId = url.searchParams.get("file_id") || "";
      const title = url.searchParams.get("title") || "";
      if (!fileId) return json(req, { error: "file_id ausente" }, 400);
      if (!(await validatePlaybackToken(fileId, url.searchParams.get("token") || ""))) {
        logProtectedPlayback("playback_denied", { fileId, reason: "playback_token_invalid" });
        return json(req, { error: "Token de playback invalido", code: "playback_token_invalid" }, 403);
      }
      logProtectedPlayback("playback_granted", { fileId, title });
      return await proxyTelegramFile(req, fileId, title);
    }

    if (action === "checkout-create" && req.method === "POST") {
      return await handlePaymentCreate(req);
    }

    if (action === "coupon-validate" && req.method === "POST") {
      return await handleCouponValidate(req);
    }

    if (action === "cart-sync" && req.method === "POST") {
      return await handleCartSync(req);
    }

    if (action === "payment-status" && req.method === "POST") {
      return await handlePaymentStatus(req);
    }

    if (action === "owner-dashboard" && req.method === "POST") {
      return await handleOwnerDashboard(req);
    }

    if (action === "owner-coupon-save" && req.method === "POST") {
      return await handleOwnerCouponSave(req);
    }

    if (action === "owner-coupon-action" && req.method === "POST") {
      return await handleOwnerCouponAction(req);
    }

    if (action === "owner-order-retry" && req.method === "POST") {
      return await handleOwnerOrderRetry(req);
    }

    if (action === "owner-upload-sign") {
      return await handleOwnerUploadSign(req);
    }
    if (action === "owner-upload-binary") {
      return await handleOwnerBinaryUpload(req);
    }

    if (action === "owner-series-save") {
      return await handleOwnerSeriesCreate(req);
    }

    if (action === "owner-series-migrate") {
      return await handleOwnerSeriesMigrate(req);
    }

    if (action === "owner-series-delete") {
      return await handleOwnerSeriesDelete(req);
    }

    if (action === "owner-series-action" && req.method === "POST") {
      return await handleOwnerSeriesAction(req);
    }

    if (action === "mercado-pago-webhook" && req.method === "POST") {
      return await handleMercadoPagoWebhook(req, url);
    }

    if (action === "telegram-webhook-info" && req.method === "GET") {
      return await handleTelegramWebhookInfo(req);
    }

    if (action === "telegram-webhook-repair" && req.method === "POST") {
      return await handleTelegramWebhookRepair(req);
    }

    if (action === "telegram-webhook" && req.method === "POST") {
      return await handleTelegramWebhook(req);
    }

    if (action === "captcha-verify" && req.method === "POST") {
      return await handleCaptchaVerify(req);
    }

    return json(req, { error: "Ação inválida" }, 400);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});

