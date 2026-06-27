const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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
    "access-control-allow-headers": "authorization,apikey,content-type,x-client-info",
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

async function proxyTelegramFile(req: Request, fileId: string, title = "") {
  if (!TELEGRAM_BOT_TOKEN) {
    return json(req, { error: "TELEGRAM_BOT_TOKEN não configurado" }, 500);
  }

  const { file_path } = await telegramGetFile(fileId);
  const upstreamUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file_path}`;
  const range = req.headers.get("range");

  const upstream = await fetch(upstreamUrl, {
    headers: range ? { Range: range } : undefined,
  });

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
    throw new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : `Supabase request failed (${res.status})`,
    );
  }

  return data;
}

async function getSeriesList() {
  const data = await supabaseFetch(`${SERIES_TABLE}?select=*`);
  return Array.isArray(data) ? data : [];
}

async function getSeriesById(seriesId: string) {
  const idColumns = [SERIES_ID_COLUMN, "id", "serie_id"].filter((value, index, arr) => arr.indexOf(value) === index);

  for (const column of idColumns) {
    const data = await supabaseFetch(
      `${SERIES_TABLE}?select=*&${column}=eq.${encodeURIComponent(seriesId)}&limit=1`,
    );
    if (Array.isArray(data) && data.length > 0) return data[0];
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

    return json(req, { error: "Ação inválida" }, 400);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
