const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const CAPTCHA_SECRET = Deno.env.get("TELEGRAM_CAPTCHA_SECRET") ?? TELEGRAM_BOT_TOKEN;
const CAPTCHA_WEBAPP_URL = Deno.env.get("CAPTCHA_WEBAPP_URL") ?? "https://seriescurtasexpressbot.vercel.app/verify.html";
const CAPTCHA_MAX_AGE_SECONDS = Number(Deno.env.get("CAPTCHA_MAX_AGE_SECONDS") ?? "600");
const WEBAPP_MAX_AGE_SECONDS = Number(Deno.env.get("WEBAPP_MAX_AGE_SECONDS") ?? "600");
const PUBLIC_CHANNEL_USERNAME = Deno.env.get("PUBLIC_CHANNEL_USERNAME") ?? "";
const PUBLIC_CHANNEL_ID = Deno.env.get("PUBLIC_CHANNEL_ID") ?? "";
const PUBLIC_CHANNEL_MIN_SCORE = Number(Deno.env.get("PUBLIC_CHANNEL_MIN_SCORE") ?? "80");
const PUBLIC_CHANNEL_ALERT_CHAT_ID = Deno.env.get("PUBLIC_CHANNEL_ALERT_CHAT_ID") ?? "";
const PUBLIC_CHANNEL_AUTO_BAN = (Deno.env.get("PUBLIC_CHANNEL_AUTO_BAN") ?? "true").toLowerCase() !== "false";
const FUNCTION_NAME = "bot-unificado";
const SERIES_TABLE = Deno.env.get("SERIES_TABLE") ?? "series";
const SERIES_ID_COLUMN = Deno.env.get("SERIES_ID_COLUMN") ?? "id";
const SERIES_TITLE_COLUMN = Deno.env.get("SERIES_TITLE_COLUMN") ?? "title";
const SERIES_VIDEO_URL_COLUMNS = (Deno.env.get("SERIES_VIDEO_URL_COLUMNS") ?? "video_url,stream_url,media_url,url")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SERIES_VIDEO_FILE_ID_COLUMNS = (Deno.env.get("SERIES_VIDEO_FILE_ID_COLUMNS") ?? "video_file_id,file_id,telegram_file_id")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "authorization,apikey,content-type,x-client-info,range",
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

function telegramApiUrl(path: string) {
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${path}`;
}

function normalizeHandle(value: unknown) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

function isTargetPublicChannel(chat: Record<string, unknown> | undefined) {
  if (!chat || chat.type !== "channel") return false;

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

async function analyzePublicChannelJoin(user: Record<string, unknown>) {
  const reasons: string[] = [];
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
    score += 8;
    reasons.push("Sem @username");
  } else {
    if (username.length < 5 || username.length > 24) {
      score += 12;
      reasons.push("Username fora do padrão comum");
    }

    if (looksRandomText(username)) {
      score += 18;
      reasons.push("Username parece gerado automaticamente");
    }

    if (/(.)\1{3,}/.test(username)) {
      score += 12;
      reasons.push("Username com repetição excessiva");
    }
  }

  if (displayName) {
    if (displayName.length < 6) {
      score += 8;
      reasons.push("Nome muito curto");
    }

    if (looksRandomText(displayName.replace(/\s+/g, ""))) {
      score += 14;
      reasons.push("Nome parece aleatório");
    }
  } else {
    score += 10;
    reasons.push("Sem nome exibido");
  }

  if (!languageCode) {
    score += 4;
    reasons.push("Sem código de idioma");
  }

  try {
    profilePhotos = await getTelegramUserProfilePhotoCount(user.id as string | number);
    if (profilePhotos === 0) {
      score += 10;
      reasons.push("Sem foto de perfil");
    }
  } catch {
    score += 5;
    reasons.push("Não foi possível verificar foto de perfil");
  }

  if (firstName && lastName && looksRandomText(`${firstName}${lastName}`)) {
    score += 12;
    reasons.push("Nome completo parece aleatório");
  }

  return {
    score,
    reasons,
    isBot,
    profilePhotos,
    username: username || null,
    displayName: displayName || null,
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

  const joinRequest = getUpdateChatJoinRequest(update);
  if (!joinRequest) {
    const chatMemberUpdate = getUpdateChatMember(update);
    if (!chatMemberUpdate) {
      return json(req, { ok: true, ignored: true });
    }

    if (!chatMemberUpdate.joined) {
      return json(req, { ok: true, ignored: true });
    }

    const analysis = await analyzePublicChannelJoin(chatMemberUpdate.user);
    const shouldBan = analysis.isBot || analysis.score >= PUBLIC_CHANNEL_MIN_SCORE;
    const safeName = chatMemberUpdate.displayName || chatMemberUpdate.userName || String(chatMemberUpdate.userId);

    if (shouldBan && PUBLIC_CHANNEL_AUTO_BAN) {
      await banPublicChannelMember(chatMemberUpdate.chatId, chatMemberUpdate.userId);
      await sendModerationAlert(
        [
          `Expulsão automática no canal público: ${safeName}`,
          `Score: ${analysis.score}`,
          `Motivos: ${analysis.reasons.join("; ") || "sem motivos adicionais"}`,
        ].join("\n"),
      );
      return json(req, {
        ok: true,
        action: "auto_banned",
        score: analysis.score,
      });
    }

    if (analysis.score >= Math.max(50, PUBLIC_CHANNEL_MIN_SCORE - 20)) {
      await sendModerationAlert(
        [
          `Novo inscrito suspeito no canal público: ${safeName}`,
          `Score: ${analysis.score}`,
          `Motivos: ${analysis.reasons.join("; ") || "sem motivos adicionais"}`,
        ].join("\n"),
      );
    }

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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado");
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      accept: "application/json",
    },
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

async function getSeriesList() {
  const data = await supabaseFetch(`${SERIES_TABLE}?select=*`);
  return Array.isArray(data) ? data : [];
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

function extractDirectUrl(row: Record<string, unknown>) {
  for (const key of SERIES_VIDEO_URL_COLUMNS) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function extractTelegramFileId(row: Record<string, unknown>) {
  for (const key of SERIES_VIDEO_FILE_ID_COLUMNS) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/+$/, "");
    const action = url.searchParams.get("action") || (pathname.endsWith("/api") ? url.searchParams.get("action") : null);

    if (action === "series") {
      const series = await getSeriesList();
      return json(req, series);
    }

    if (action === "stream") {
      return await handleStream(req, url);
    }

    if (action === "playback") {
      const fileId = url.searchParams.get("file_id") || "";
      const title = url.searchParams.get("title") || "";
      if (!fileId) return json(req, { error: "file_id ausente" }, 400);
      return await proxyTelegramFile(req, fileId, title);
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
