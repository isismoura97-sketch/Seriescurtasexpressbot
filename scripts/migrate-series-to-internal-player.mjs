const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const SERIES_TABLE = String(process.env.SERIES_TABLE || 'series').trim();
const EPISODES_TABLE = String(process.env.EPISODES_TABLE || 'episodes').trim();
const VIDEO_BUCKET = String(process.env.SERIES_VIDEO_BUCKET || 'videos').trim();

function getArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? fallback) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function safeFilename(name) {
  return String(name || 'video')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'video';
}

function inferExtension(filePath = '', contentType = '') {
  const normalizedPath = String(filePath || '').toLowerCase();
  if (normalizedPath.endsWith('.mkv')) return '.mkv';
  if (normalizedPath.endsWith('.mov')) return '.mov';
  if (normalizedPath.endsWith('.webm')) return '.webm';
  if (normalizedPath.endsWith('.avi')) return '.avi';
  if (normalizedPath.endsWith('.mp4')) return '.mp4';

  const normalizedType = String(contentType || '').toLowerCase();
  if (normalizedType.includes('x-matroska')) return '.mkv';
  if (normalizedType.includes('quicktime')) return '.mov';
  if (normalizedType.includes('webm')) return '.webm';
  if (normalizedType.includes('avi')) return '.avi';
  return '.mp4';
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message = data && typeof data === 'object' && 'message' in data
      ? String(data.message)
      : data && typeof data === 'object' && 'error' in data
        ? String(data.error)
        : data && typeof data === 'object' && 'description' in data
          ? String(data.description)
        : `${res.status} ${res.statusText}`.trim();
    throw new Error(message);
  }

  return data;
}

async function supabaseRest(path, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurado');
  }

  return await fetchJson(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
}

async function listSeries() {
  return await supabaseRest(
    `${SERIES_TABLE}?select=id,title,price,video_storage_path,video_url,video_file_id,created_at&order=created_at.asc`,
  );
}

async function listEpisodes() {
  return await supabaseRest(
    `${EPISODES_TABLE}?select=series_id,episode_number,title,file_id,created_at&order=series_id.asc,episode_number.asc,created_at.asc`,
  );
}

async function telegramGetFile(fileId) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`;
  const payload = await fetchJson(url);
  if (!payload?.ok || !payload?.result?.file_path) {
    throw new Error('Telegram nao retornou file_path');
  }
  return payload.result.file_path;
}

async function downloadTelegramVideo(fileId, title = '') {
  const filePath = await telegramGetFile(fileId);
  const upstreamUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const res = await fetch(upstreamUrl);
  if (!res.ok) {
    throw new Error(`Telegram download failed (${res.status})`);
  }

  const contentType = res.headers.get('content-type') || 'video/mp4';
  const extension = inferExtension(filePath, contentType);
  const buffer = Buffer.from(await res.arrayBuffer());

  return {
    filePath,
    contentType,
    extension,
    buffer,
    fileName: `${safeFilename(title || fileId)}${extension}`,
  };
}

async function uploadVideoToStorage(objectPath, file) {
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(VIDEO_BUCKET)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': file.contentType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file.buffer,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Storage upload failed (${res.status})`);
  }

  return objectPath;
}

async function patchSeriesVideo(seriesId, objectPath) {
  const rows = await supabaseRest(
    `${SERIES_TABLE}?id=eq.${encodeURIComponent(seriesId)}`,
    {
      method: 'PATCH',
      headers: {
        prefer: 'return=representation',
      },
      body: JSON.stringify({
        video_storage_path: objectPath,
        video_url: null,
      }),
    },
  );

  return Array.isArray(rows) ? rows[0] || null : rows;
}

function isFree(series) {
  return Number(series?.price || 0) <= 0;
}

function hasInternalStorage(series) {
  return typeof series?.video_storage_path === 'string' && series.video_storage_path.trim().length > 0;
}

function buildEpisodeMap(episodes) {
  const map = new Map();

  for (const episode of Array.isArray(episodes) ? episodes : []) {
    const seriesId = String(episode?.series_id || '').trim();
    const fileId = String(episode?.file_id || '').trim();
    if (!seriesId || !fileId || map.has(seriesId)) continue;

    map.set(seriesId, {
      fileId,
      title: String(episode?.title || '').trim(),
      episodeNumber: episode?.episode_number ?? null,
    });
  }

  return map;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TELEGRAM_BOT_TOKEN) {
    throw new Error('Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e TELEGRAM_BOT_TOKEN antes de executar.');
  }

  const onlyFree = hasFlag('--only-free');
  const onlyPaid = hasFlag('--only-paid');
  const targetSeriesId = getArg('--series-id', '').trim();
  const maxItems = Number.parseInt(getArg('--max', '0'), 10) || 0;
  const jsonOutput = hasFlag('--json');

  const [seriesRows, episodeRows] = await Promise.all([listSeries(), listEpisodes()]);
  const episodeMap = buildEpisodeMap(episodeRows);

  let candidates = (Array.isArray(seriesRows) ? seriesRows : []).map((series) => {
    const seriesId = String(series?.id || '').trim();
    const seriesFileId = String(series?.video_file_id || '').trim();
    const episodeInfo = episodeMap.get(seriesId) || null;

    return {
      id: seriesId,
      title: String(series?.title || '').trim(),
      price: Number(series?.price || 0),
      isFree: isFree(series),
      alreadyInternal: hasInternalStorage(series),
      storagePath: String(series?.video_storage_path || '').trim(),
      source: seriesFileId ? 'series' : episodeInfo?.fileId ? 'episode' : 'none',
      fileId: seriesFileId || episodeInfo?.fileId || '',
      episodeTitle: episodeInfo?.title || '',
    };
  });

  if (targetSeriesId) {
    candidates = candidates.filter((entry) => entry.id === targetSeriesId);
  }
  if (onlyFree) {
    candidates = candidates.filter((entry) => entry.isFree);
  }
  if (onlyPaid) {
    candidates = candidates.filter((entry) => !entry.isFree);
  }
  if (maxItems > 0) {
    candidates = candidates.slice(0, maxItems);
  }

  const results = [];

  for (const candidate of candidates) {
    if (candidate.alreadyInternal) {
      results.push({
        id: candidate.id,
        title: candidate.title,
        price: candidate.price,
        status: 'skipped',
        reason: 'already_internal',
        storagePath: candidate.storagePath,
      });
      continue;
    }

    if (!candidate.fileId) {
      results.push({
        id: candidate.id,
        title: candidate.title,
        price: candidate.price,
        status: 'skipped',
        reason: 'missing_file_id',
      });
      continue;
    }

    try {
      const file = await downloadTelegramVideo(candidate.fileId, candidate.title || candidate.episodeTitle || candidate.id);
      const objectPath = `${candidate.id}/video-${safeFilename(candidate.title || candidate.id)}${file.extension}`;
      await uploadVideoToStorage(objectPath, file);
      const updated = await patchSeriesVideo(candidate.id, objectPath);

      results.push({
        id: candidate.id,
        title: candidate.title,
        price: candidate.price,
        status: 'migrated',
        source: candidate.source,
        storagePath: objectPath,
        verified: String(updated?.video_storage_path || '').trim() === objectPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        id: candidate.id,
        title: candidate.title,
        price: candidate.price,
        status: 'failed',
        source: candidate.source,
        reason: message,
      });
    }
  }

  const summary = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {
    migrated: 0,
    failed: 0,
    skipped: 0,
  });

  const output = {
    totalCandidates: candidates.length,
    summary,
    results,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`Candidatas avaliadas: ${output.totalCandidates}`);
  console.log(`Migradas: ${summary.migrated} | Falhas: ${summary.failed} | Puladas: ${summary.skipped}`);
  for (const item of results) {
    const reason = item.reason ? ` | ${item.reason}` : '';
    const storage = item.storagePath ? ` | ${item.storagePath}` : '';
    console.log(`- [${item.status}] ${item.title}${storage}${reason}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
