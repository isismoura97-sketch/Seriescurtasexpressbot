const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const CAPTCHA_SECRET = Deno.env.get("TELEGRAM_CAPTCHA_SECRET") ?? TELEGRAM_BOT_TOKEN;
const CAPTCHA_WEBAPP_URL = Deno.env.get("CAPTCHA_WEBAPP_URL") ?? "https://seriescurtasexpressbot.vercel.app/verify.html";
const CAPTCHA_MAX_AGE_SECONDS = Number(Deno.env.get("CAPTCHA_MAX_AGE_SECONDS") ?? "600");
const WEBAPP_MAX_AGE_SECONDS = Number(Deno.env.get("WEBAPP_MAX_AGE_SECONDS") ?? "600");
const SERIES_WEBAPP_URL = Deno.env.get("SERIES_WEBAPP_URL") ?? "https://seriescurtasexpressbot.vercel.app/";
const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") ?? "";
const MERCADO_PAGO_WEBHOOK_SECRET = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET") ?? "";
const MERCADO_PAGO_PIX_KEY = Deno.env.get("MERCADO_PAGO_PIX_KEY") ?? "";
const MERCADO_PAGO_PIX_COPY = Deno.env.get("MERCADO_PAGO_PIX_COPY") ?? "";
const MERCADO_PAGO_PIX_QR_CODE_BASE64 = Deno.env.get("MERCADO_PAGO_PIX_QR_CODE_BASE64") ?? "";
const PAYMENT_ORDERS_TABLE = Deno.env.get("PAYMENT_ORDERS_TABLE") ?? "payment_orders";
const OWNER_TELEGRAM_USER_ID = Deno.env.get("OWNER_TELEGRAM_USER_ID") ?? "1048601631";
const OWNER_AREA_PASSWORD = Deno.env.get("OWNER_AREA_PASSWORD") ?? "";
const OWNER_AREA_PASSWORD_SHA256 = Deno.env.get("OWNER_AREA_PASSWORD_SHA256") ?? "";
const SERIES_COVER_BUCKET = Deno.env.get("SERIES_COVER_BUCKET") ?? "covers";
const SERIES_TRAILER_BUCKET = Deno.env.get("SERIES_TRAILER_BUCKET") ?? "trailers";
const SERIES_VIDEO_BUCKET = Deno.env.get("SERIES_VIDEO_BUCKET") ?? "videos";
const PUBLIC_CHANNEL_USERNAME = Deno.env.get("PUBLIC_CHANNEL_USERNAME") ?? "";
const PUBLIC_CHANNEL_ID = Deno.env.get("PUBLIC_CHANNEL_ID") ?? "";
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
const EPISODE_VIDEO_FILE_ID_COLUMNS = (Deno.env.get("EPISODE_VIDEO_FILE_ID_COLUMNS") ?? "file_id,video_file_id,telegram_file_id")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,apikey,content-type,x-client-info,range,x-webapp-init-data,x-request-id",
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
    expires_at: Math.floor(Date.now() / 1000) + 600,
  });
  url.searchParams.set("token", token);
  return url.toString();
}

function buildSeriesLaunchUrl(seriesId: string) {
  const url = new URL(SERIES_WEBAPP_URL);
  url.searchParams.set("play", seriesId);
  return url.toString();
}

function telegramApiUrl(path: string) {
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${path}`;
}

function normalizeHandle(value: unknown) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
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

function getStorageObjectName(seriesId: string, kind: string, fileName: string) {
  const cleanedSeriesId = String(seriesId || "series").trim() || "series";
  const cleanedKind = String(kind || "media").trim() || "media";
  return `${cleanedSeriesId}/${cleanedKind}-${safeFilename(fileName || cleanedKind)}`;
}

async function uploadStorageObject(bucket: string, objectPath: string, file: File) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado");
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")}`;

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

  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")}`;

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

function normalizeCheckoutMethod(value: unknown): CheckoutMethod {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pix" || normalized === "pix_qr" || normalized === "pix-qr") return "pix_qr";
  if (normalized === "telegram" || normalized === "telegram_checkout" || normalized === "telegram-checkout") return "telegram_checkout";
  return "mercado_pago_link";
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
  items: Array<{ id: string; title: string; quantity: number; price: number; cover_url: string | null }>;
  buyerEmail?: string | null;
  buyerName?: string | null;
  description: string;
  status?: string;
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
        checkout_mode: "telegram",
        currency: "BRL",
        amount: Number(entry.amount.toFixed(2)),
        items: entry.items,
        buyer_email: entry.buyerEmail ?? null,
        buyer_name: entry.buyerName ?? null,
        description: entry.description,
        external_reference: entry.orderId,
      },
    ]),
  });

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
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

async function fetchMercadoPagoPayment(paymentId: string) {
  return await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(paymentId)}`) as Record<string, unknown>;
}

async function sendPaymentCreatedMessage(order: Record<string, unknown>) {
  const chatId = String(order.chat_id ?? order.user_id ?? "");
  if (!chatId) return;

  const method = normalizeCheckoutMethod(order.payment_method);
  const amount = Number(order.amount ?? 0);
  const amountText = formatCurrencyBRL(amount);
  const shortOrderId = String(order.order_id ?? "").slice(0, 8);
  const baseLines = [
    "Pedido criado com sucesso.",
    `Pedido: ${shortOrderId}`,
    `Pagamento: ${amountText}`,
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

  baseLines.push("O checkout foi iniciado dentro do Telegram.");
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: baseLines.join("\n"),
    reply_markup: JSON.stringify({
      inline_keyboard: [[{ text: "Abrir catálogo", web_app: { url: SERIES_WEBAPP_URL } }]],
    }),
  });
}

async function sendPaymentConfirmationMessage(order: Record<string, unknown>, payment: Record<string, unknown>) {
  const chatId = String(order.chat_id ?? order.user_id ?? "");
  if (!chatId) return;

  const method = normalizeCheckoutMethod(order.payment_method);
  const amount = Number(order.amount ?? 0);
  const amountText = formatCurrencyBRL(amount);
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
    "Pagamento confirmado com sucesso.",
    `Pedido: ${shortOrderId}`,
    `Valor: ${amountText}`,
    `Método: ${method === "pix_qr" ? "Pix" : "Mercado Pago"}`,
  ];

  if (statusDetail) {
    lines.push(`Detalhe: ${statusDetail}`);
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
  if (status === "authorized") return "approved";
  if (status === "in_process") return "pending";
  if (status === "in_mediation") return "pending";
  return status;
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

async function applyMercadoPagoPaymentState(order: Record<string, unknown>, payment: Record<string, unknown>, webhookPayload: unknown) {
  const previousStatus = String(order.status ?? "");
  const currentStatus = normalizeWebhookStatus(payment.status);
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
    nextPatch.error_message = null;
  } else if (currentStatus === "rejected") {
    nextPatch.rejected_at = new Date().toISOString();
  } else if (currentStatus === "cancelled" || currentStatus === "canceled") {
    nextPatch.canceled_at = new Date().toISOString();
  }

  const orderId = String(order.order_id ?? "").trim();
  const updatedOrder = orderId
    ? await updatePaymentOrderRecord(orderId, nextPatch) as Record<string, unknown>
    : order;

  if (currentStatus === "approved" && previousStatus !== "approved") {
    await sendPaymentConfirmationMessage(updatedOrder, payment);
  }

  return updatedOrder;
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

  const items = normalizeCheckoutItems(body.items);
  if (!items.length) {
    return json(req, { error: "Carrinho vazio" }, 400);
  }

  const paymentMethod = normalizeCheckoutMethod(body.payment_method ?? body.method ?? body.checkout_method);
  const buyerEmail = String(body.buyer_email ?? body.email ?? "").trim();
  const buyerName = String(body.buyer_name ?? body.name ?? "").trim();
  const amount = calculateCheckoutTotal(items);
  const description = buildCheckoutDescription(items);
  const orderId = crypto.randomUUID();
  const chatId = String(body.chat_id ?? userId);

  if (paymentMethod === "pix_qr" && !buyerEmail) {
    return json(req, { error: "Informe um e-mail válido para gerar o Pix." }, 400);
  }

  let order = await createPaymentOrderRecord({
    orderId,
    userId,
    chatId,
    paymentMethod,
    amount,
    items,
    buyerEmail: buyerEmail || null,
    buyerName: buyerName || null,
    description,
    status: "created",
  });

  try {
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
      items,
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
  if (paymentId && String(order.status ?? "").toLowerCase() !== "approved") {
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
    const currentStatus = normalizeWebhookStatus(payment.status);

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

function withTelegramUrlFallbackButtons(payload: Record<string, string | number | boolean>) {
  const replyMarkup = typeof payload.reply_markup === "string" ? payload.reply_markup : "";
  if (!replyMarkup) return payload;

  try {
    const parsed = JSON.parse(replyMarkup) as Record<string, unknown>;
    const keyboard = parsed.inline_keyboard;
    if (!Array.isArray(keyboard)) return payload;

    const existingUrls = new Set<string>();
    const webAppUrls: string[] = [];

    for (const row of keyboard) {
      if (!Array.isArray(row)) continue;
      for (const button of row) {
        if (!button || typeof button !== "object") continue;
        const candidate = button as Record<string, unknown>;
        const url = typeof candidate.url === "string" ? candidate.url : "";
        const webApp = candidate.web_app as Record<string, unknown> | undefined;
        const webAppUrl = typeof webApp?.url === "string" ? webApp.url : "";
        if (url) existingUrls.add(url);
        if (webAppUrl) webAppUrls.push(webAppUrl);
      }
    }

    for (const url of webAppUrls) {
      if (!existingUrls.has(url)) {
        keyboard.push([{ text: "Abrir no navegador", url }]);
        existingUrls.add(url);
      }
    }

    return { ...payload, reply_markup: stringifyJson(parsed) };
  } catch {
    return payload;
  }
}

async function telegramRequest(method: string, payload: Record<string, string | number | boolean>) {
  const finalPayload = withTelegramUrlFallbackButtons(payload);
  const res = await fetch(telegramApiUrl(method), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams(
      Object.entries(finalPayload).reduce<Record<string, string>>((acc, [key, value]) => {
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
      { command: "menu", description: "Mostrar opcoes" },
      { command: "ajuda", description: "Receber ajuda" },
    ]),
  });

  await telegramRequest("setChatMenuButton", {
    menu_button: stringifyJson({
      type: "web_app",
      text: "Abrir catalogo",
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

  const configuredHash = OWNER_AREA_PASSWORD_SHA256.trim().toLowerCase();
  if (configuredHash) {
    return constantTimeEqual(await sha256Hex(submitted), configuredHash);
  }

  const configuredPassword = OWNER_AREA_PASSWORD || TELEGRAM_WEBHOOK_SECRET;
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

async function handleTelegramUserMessage(req: Request, update: Record<string, unknown>) {
  const message = getUpdateMessage(update);
  if (!message) {
    return json(req, { ok: true, ignored: true });
  }

  const chat = message.chat as Record<string, unknown> | undefined;
  const chatType = typeof chat?.type === "string" ? chat.type : "";
  const chatId = chat?.id as string | number | undefined;
  if (chatId == null) {
    return json(req, { ok: true, ignored: true });
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
    await sendBotWelcomeMessage(chatId);
    return json(req, { ok: true, action: "start_welcome_sent" });
  }

  if (/^(?:\/menu|menu|\/catalogo|catalogo|\/catálogo|catálogo|\/ajuda|ajuda|\/help|help)$/i.test(text)) {
    await sendBotWelcomeMessage(chatId);
    return json(req, { ok: true, action: "menu_sent" });
  }

  if (chatType === "private" && text) {
    await sendBotWelcomeMessage(chatId);
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
        type: "telegram_file",
        file_id: fileId,
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
        type: "telegram_file",
        file_id: fileId,
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
        type: "telegram_file",
        file_id: fileId,
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

async function sendCheckoutAck(chatId: string | number, itemCount: number, total: string) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: `Recebemos seu carrinho com ${itemCount} item${itemCount === 1 ? "" : "s"} no total de ${total}.`,
    reply_markup: JSON.stringify({
      inline_keyboard: [[{
        text: "Abrir catálogo",
        web_app: { url: SERIES_WEBAPP_URL },
      }]],
    }),
  });
}

async function sendBotWelcomeMessage(chatId: string | number) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: [
      "Bem-vindo ao Séries Express.",
      "Abra o catálogo para ver as séries gratuitas e as séries com liberação por pagamento.",
      "Se você já começou uma série, também pode reabri-la pelo mini app.",
    ].join("\n"),
    reply_markup: JSON.stringify({
      inline_keyboard: [[{ text: "Abrir catálogo", web_app: { url: SERIES_WEBAPP_URL } }]],
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

  const channelPostUpdate = getUpdateChannelPost(update);
  if (channelPostUpdate) {
    const channel = channelPostUpdate.message.chat as Record<string, unknown> | undefined;
    if (channel && isTargetPublicChannel(channel)) {
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

async function handleTelegramWebhookInfo(req: Request) {
  if (!TELEGRAM_BOT_TOKEN) {
    return json(req, { ok: false, error: "TELEGRAM_BOT_TOKEN nao configurado" }, 500);
  }

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
  const series = Array.isArray(data) ? data as Record<string, unknown>[] : [];

  let episodes: Record<string, unknown>[] = [];
  try {
    episodes = await getEpisodesList();
  } catch {
    episodes = [];
  }

  const accessibleIds = userId ? await getAccessibleSeriesIds(userId) : new Set<string>();

  return series.map((row) => {
    const seriesId = String(row[SERIES_ID_COLUMN] ?? row.id ?? "");
    const episodeData = buildEpisodeAugmentation(episodes, seriesId);
    const free = isSeriesFree(row);
    const hasAccess = includeProtected || free || accessibleIds.has(seriesId);
    const output: Record<string, unknown> = {
      ...row,
      ...episodeData,
      is_free: free,
      has_access: hasAccess,
    };

    if (!hasAccess) {
      for (const key of [...SERIES_VIDEO_URL_COLUMNS, ...SERIES_VIDEO_FILE_ID_COLUMNS]) {
        delete output[key];
      }
      delete output.episode_file_id;
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
  const price = Number(row.price ?? 0);
  return Number.isFinite(price) ? price : 0;
}

function isSeriesFree(row: Record<string, unknown>) {
  return getSeriesPrice(row) <= 0;
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

async function getAccessibleSeriesIds(userId: string) {
  const [orders, purchases] = await Promise.all([
    getApprovedPaymentOrderRows(userId),
    getApprovedPurchaseRows(userId),
  ]);

  const ids = new Set<string>();
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

async function resolveTelegramPlayback(req: Request, fileId: string, title: string) {
  try {
    await telegramGetFile(fileId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("file is too big")) {
      return json(req, {
        type: "telegram_file",
        file_id: fileId,
        title,
        reason: "Este vÃ­deo Ã© grande demais para o player do navegador. Abra no Telegram para assistir.",
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
          type: "telegram_file",
          file_id: fileId,
          title: (row as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? title,
          reason: "Este vídeo é grande demais para o player do navegador. Abra no Telegram para assistir.",
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

  if (!isSeriesFree(row as Record<string, unknown>)) {
    let userId = "";
    try {
      const initData = url.searchParams.get("init_data") || "";
      const validated = await validateWebAppInitData(initData);
      userId = validated.userId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json(req, { error: message, code: "telegram_auth_required" }, 401);
    }

    if (!(await userHasPaidForSeries(userId, serieId))) {
      return json(req, { error: "Pagamento necessario para assistir esta serie.", code: "payment_required" }, 402);
    }
  }

  const seriesTitle = String((row as Record<string, unknown>)[SERIES_TITLE_COLUMN] ?? title);
  const directUrl = extractDirectUrl(row as Record<string, unknown>);
  if (directUrl) {
    return json(req, { url: directUrl, type: "direct", title: seriesTitle });
  }

  const fileId = extractTelegramFileId(row as Record<string, unknown>);
  if (fileId) {
    return await resolveTelegramPlayback(req, fileId, seriesTitle);
  }

  const episode = await getFirstEpisodeFileForSeries(serieId);
  if (episode?.fileId) {
    const episodeTitle = episode.title ? `${seriesTitle} - ${episode.title}` : seriesTitle;
    return await resolveTelegramPlayback(req, episode.fileId, episodeTitle);
  }

  return json(req, { error: "Video nao disponivel" }, 404);
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
      `${PAYMENT_ORDERS_TABLE}?select=order_id,status,payment_method,amount,created_at,confirmed_at&order=created_at.desc&limit=100`,
    );
    return Array.isArray(data) ? data as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
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

function normalizeOwnerPrice(value: unknown, forceFree: boolean) {
  if (forceFree) return 0;
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Number(raw.toFixed(2));
}

function serializeOwnerSeries(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: String(row.category ?? ""),
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
    is_free: isSeriesFree(row),
    has_video_url: Boolean(extractDirectUrl(row)),
    has_video_file_id: Boolean(extractTelegramFileId(row)),
    has_trailer: Boolean(row.trailer_url || row.trailer_storage_path || row.trailer_file_id),
    has_cover: Boolean(row.cover_url || row.cover_storage_path || row.cover_file_id),
  };
}

async function buildOwnerDashboardPayload(userId: string) {
  const [series, episodes, payments] = await Promise.all([
    getSeriesList("", true) as Promise<Record<string, unknown>[]>,
    getEpisodesList().catch(() => [] as Record<string, unknown>[]),
    getOwnerPaymentRows(),
  ]);

  const sortedSeries = sortByCreatedAtDesc(series);
  const hasSeriesPlayback = (row: Record<string, unknown>) =>
    Boolean(extractDirectUrl(row) || extractTelegramFileId(row) || Number(row.playable_episode_count ?? 0) > 0);
  const playableSeries = sortedSeries.filter((row) => hasSeriesPlayback(row));
  const missingPlayback = sortedSeries.filter((row) => !hasSeriesPlayback(row));
  const playableEpisodes = episodes.filter((row) => getEpisodeFileId(row));
  const statusCounts = countByStatus(payments);

  return {
    ok: true,
    owner: {
      telegram_user_id: userId,
    },
    catalog: {
      series_total: sortedSeries.length,
      playable_series: playableSeries.length,
      missing_playback: missingPlayback.length,
      episodes_total: episodes.length,
      playable_episodes: playableEpisodes.length,
      series_with_episode_files: new Set(playableEpisodes.map((row) => String(row[EPISODE_SERIES_COLUMN] ?? ""))).size,
    },
    payments: {
      orders_total: payments.length,
      status_counts: statusCounts,
      approved_amount: sumApprovedPayments(payments),
      recent_orders: payments.slice(0, 8).map((row) => ({
        order_id: String(row.order_id ?? "").slice(0, 8),
        status: row.status ?? null,
        payment_method: row.payment_method ?? null,
        amount: Number(row.amount ?? 0) || 0,
        created_at: row.created_at ?? null,
        confirmed_at: row.confirmed_at ?? null,
      })),
    },
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

  const hasPasswordConfigured = Boolean(OWNER_AREA_PASSWORD_SHA256 || OWNER_AREA_PASSWORD || TELEGRAM_WEBHOOK_SECRET);
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
  const forceFree = isTruthyInput(form.get("is_free"));
  const seriesIdInput = String(form.get("series_id") ?? form.get("id") ?? "").trim();
  const cover = form.get("cover_file");
  const video = form.get("video_file");
  const trailer = form.get("trailer_file");
  const existingRow = seriesIdInput ? await getSeriesById(seriesIdInput) : null;
  const isEdit = Boolean(existingRow);

  if (!title) {
    return json(req, { error: "Informe o título da série" }, 400);
  }

  if (!description) {
    return json(req, { error: "Informe a descrição da série" }, 400);
  }

  if (!(cover instanceof File)) {
    if (!existingRow) {
      return json(req, { error: "Envie a imagem de capa" }, 400);
    }
  }

  if (!(video instanceof File)) {
    if (!existingRow) {
      return json(req, { error: "Envie o vídeo principal da série" }, 400);
    }
  }

  const existingPrice = Number(existingRow?.price ?? 0) || 0;
  const priceInput = String(form.get("price") ?? "").trim();
  const normalizedPrice = priceInput === "" ? existingPrice : normalizeOwnerPrice(priceInput, forceFree);
  const price = forceFree ? 0 : normalizedPrice;

  if (!forceFree && price <= 0 && !isEdit) {
    return json(req, { error: "Informe um valor maior que zero para a série paga" }, 400);
  }

  const seriesId = seriesIdInput || String(existingRow?.id ?? "").trim() || crypto.randomUUID();
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
    || String(existingRow?.cover_url ?? "").trim()
    || null;
  const coverPath = coverUpload?.path
    || String(existingRow?.cover_storage_path ?? "").trim()
    || null;
  const videoUrl = videoUpload?.publicUrl
    || String(existingRow?.video_url ?? "").trim()
    || null;
  const videoPath = videoUpload?.path
    || String(existingRow?.video_storage_path ?? "").trim()
    || null;
  const trailerUrl = trailerUpload?.publicUrl
    || String(existingRow?.trailer_url ?? "").trim()
    || null;
  const trailerPath = trailerUpload?.path
    || String(existingRow?.trailer_storage_path ?? "").trim()
    || null;

  if (!coverUrl || !videoUrl) {
    return json(req, { error: "A série precisa de capa e vídeo principal" }, 400);
  }

  const rowPayload: Record<string, unknown> = {
    id: seriesId,
    title,
    description,
    category,
    price,
    cover_url: coverUrl,
    cover_storage_path: coverPath,
    video_url: videoUrl,
    video_storage_path: videoPath,
    trailer_url: trailerUrl,
    trailer_storage_path: trailerPath,
  };

  const saved = await supabaseRestRequest(
    isEdit ? `${SERIES_TABLE}?id=eq.${encodeURIComponent(seriesId)}` : SERIES_TABLE,
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

  const dashboard = await buildOwnerDashboardPayload(access.userId);
  return json(req, {
    ok: true,
    series: serializeOwnerSeries(finalRow as Record<string, unknown>),
    dashboard,
  }, 201);
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

  await deleteSeriesMediaAssets(existingRow as Record<string, unknown>);

  await supabaseRestRequest(
    `${SERIES_TABLE}?id=eq.${encodeURIComponent(seriesId)}`,
    {
      method: "DELETE",
      headers: {
        prefer: "return=representation",
        "content-type": "application/json",
      },
    },
  );

  const dashboard = await buildOwnerDashboardPayload(access.userId);
  return json(req, {
    ok: true,
    dashboard,
  });
}

Deno.serve(async (req) => {
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

    if (action === "stream") {
      return await handleStreamV2(req, url);
    }

    if (action === "playback") {
      const fileId = url.searchParams.get("file_id") || "";
      const title = url.searchParams.get("title") || "";
      if (!fileId) return json(req, { error: "file_id ausente" }, 400);
      if (!(await validatePlaybackToken(fileId, url.searchParams.get("token") || ""))) {
        return json(req, { error: "Token de playback invalido", code: "playback_token_invalid" }, 403);
      }
      return await proxyTelegramFile(req, fileId, title);
    }

    if (action === "checkout-create") {
      return await handlePaymentCreate(req);
    }

    if (action === "payment-status") {
      return await handlePaymentStatus(req);
    }

    if (action === "owner-dashboard") {
      return await handleOwnerDashboard(req);
    }

    if (action === "owner-series-save") {
      return await handleOwnerSeriesCreate(req);
    }

    if (action === "owner-series-delete") {
      return await handleOwnerSeriesDelete(req);
    }

    if (action === "mercado-pago-webhook") {
      return await handleMercadoPagoWebhook(req, url);
    }

    if (action === "telegram-webhook-info") {
      return await handleTelegramWebhookInfo(req);
    }

    if (action === "telegram-webhook-repair") {
      return await handleTelegramWebhookRepair(req);
    }

    if (action === "telegram-webhook") {
      return await handleTelegramWebhook(req);
    }

    if (action === "captcha-verify") {
      return await handleCaptchaVerify(req);
    }

    return json(req, { error: "Ação inválida" }, 400);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
