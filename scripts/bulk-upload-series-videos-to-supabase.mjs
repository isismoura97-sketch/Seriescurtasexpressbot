import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SERIES_TABLE = String(process.env.SERIES_TABLE || 'series').trim();
const VIDEO_BUCKET = String(process.env.SERIES_VIDEO_BUCKET || 'videos').trim();

const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.mkv', '.webm', '.avi']);
const UUID_PREFIX_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function getArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? fallback) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenizeForMatch(value) {
  const stopWords = new Set(['a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das', 'e', 'pt', 'br']);
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !stopWords.has(token));
}

function scoreTokenSimilarity(left, right) {
  const leftTokens = tokenizeForMatch(left);
  const rightTokens = tokenizeForMatch(right);
  if (!leftTokens.length || !rightTokens.length) return 0;

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }

  return intersection / Math.max(leftSet.size, rightSet.size);
}

function safeFilename(name) {
  return String(name || 'video')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'video';
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.mkv') return 'video/x-matroska';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.avi') return 'video/x-msvideo';
  return 'video/mp4';
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
    const detail = data && typeof data === 'object' && 'message' in data
      ? String(data.message)
      : data && typeof data === 'object' && 'error' in data
        ? String(data.error)
        : `${res.status} ${res.statusText}`.trim();
    throw new Error(detail);
  }

  return data;
}

async function supabaseRest(pathname, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }

  return await fetchJson(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
}

async function supabaseStorage(pathname, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }

  return await fetchJson(`${SUPABASE_URL}/storage/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      accept: 'application/json',
      ...(init.headers || {}),
    },
  });
}

async function listSeries() {
  return await supabaseRest(`${SERIES_TABLE}?select=id,title,price,video_storage_path,video_url,video_file_id,created_at&order=created_at.asc`);
}

async function getBucketDetails() {
  return await supabaseStorage(`bucket/${encodeURIComponent(VIDEO_BUCKET)}`);
}

async function uploadToStorage(seriesId, filePath) {
  const fileName = path.basename(filePath);
  const objectPath = `${seriesId}/video-${safeFilename(fileName)}`;
  const storagePath = objectPath.split('/').map(encodeURIComponent).join('/');
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(VIDEO_BUCKET)}/${storagePath}`;
  const fileStream = createReadStream(filePath);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': getContentType(filePath),
      'x-upsert': 'true',
    },
    body: fileStream,
    duplex: 'half',
  });

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error(
        'Supabase bloqueou o upload por limite de tamanho (HTTP 413). Ajuste o limite global de upload em Storage Settings e, se necessario, o limite do bucket.',
      );
    }
    throw new Error(text || `Storage upload failed (${res.status})`);
  }

  return objectPath;
}

async function patchSeriesPlayback(seriesId, objectPath) {
  const rows = await supabaseRest(`${SERIES_TABLE}?id=eq.${encodeURIComponent(seriesId)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      video_storage_path: objectPath,
      video_url: null,
    }),
  });

  return Array.isArray(rows) ? rows[0] || null : rows;
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    files.push(fullPath);
  }

  return files;
}

function matchFileToSeries(filePath, seriesRows) {
  const baseName = path.basename(filePath, path.extname(filePath));
  const normalizedBase = normalizeText(baseName);
  const uuidPrefix = baseName.match(UUID_PREFIX_RE)?.[0] || '';

  if (uuidPrefix) {
    const direct = seriesRows.find((row) => String(row.id || '').toLowerCase() === uuidPrefix.toLowerCase());
    if (direct) {
      return { type: 'id', series: direct };
    }
  }

  const exactTitle = seriesRows.find((row) => normalizeText(row.title) === normalizedBase);
  if (exactTitle) {
    return { type: 'title', series: exactTitle };
  }

  const fuzzyMatches = seriesRows.filter((row) => {
    const normalizedTitle = normalizeText(row.title);
    return normalizedTitle && (normalizedBase.includes(normalizedTitle) || normalizedTitle.includes(normalizedBase));
  });

  if (fuzzyMatches.length === 1) {
    return { type: 'fuzzy', series: fuzzyMatches[0] };
  }

  const scoredMatches = seriesRows
    .map((row) => ({
      row,
      score: scoreTokenSimilarity(baseName, row.title),
    }))
    .filter((entry) => entry.score >= 0.6)
    .sort((left, right) => right.score - left.score);

  if (scoredMatches.length === 1) {
    return { type: 'token_fuzzy', series: scoredMatches[0].row };
  }

  if (scoredMatches.length > 1 && scoredMatches[0].score > scoredMatches[1].score) {
    return { type: 'token_fuzzy', series: scoredMatches[0].row };
  }

  return { type: fuzzyMatches.length > 1 ? 'ambiguous' : 'none', series: null, candidates: fuzzyMatches };
}

async function main() {
  const targetDir = path.resolve(getArg('--dir', ''));
  const apply = hasFlag('--apply');
  const onlyPaid = hasFlag('--only-paid');
  const onlyFree = hasFlag('--only-free');
  const overwrite = hasFlag('--overwrite');

  if (!getArg('--dir', '')) {
    throw new Error('Use --dir com a pasta onde estao os videos originais.');
  }

  const dirStats = await stat(targetDir).catch(() => null);
  if (!dirStats?.isDirectory()) {
    throw new Error(`Pasta invalida: ${targetDir}`);
  }

  const loadedSeries = await listSeries();
  const bucket = await getBucketDetails().catch(() => null);
  const bucketLimitBytes = Number(bucket?.file_size_limit || 0);
  let seriesRows = Array.isArray(loadedSeries) ? loadedSeries : [];
  if (onlyPaid) {
    seriesRows = seriesRows.filter((row) => Number(row?.price || 0) > 0);
  }
  if (onlyFree) {
    seriesRows = seriesRows.filter((row) => Number(row?.price || 0) <= 0);
  }

  const files = await walkFiles(targetDir);
  const report = {
    totalFiles: files.length,
    bucket: bucket ? {
      id: bucket.id,
      public: Boolean(bucket.public),
      fileSizeLimit: bucket.file_size_limit ?? null,
      allowedMimeTypes: Array.isArray(bucket.allowed_mime_types) ? bucket.allowed_mime_types : null,
    } : null,
    matched: [],
    unmatchedFiles: [],
    skippedSeries: [],
  };

  for (const filePath of files) {
    const match = matchFileToSeries(filePath, seriesRows);
    if (!match.series) {
      console.error(`[SKIP] Sem correspondencia: ${filePath}`);
      report.unmatchedFiles.push({
        file: filePath,
        reason: match.type,
        candidates: Array.isArray(match.candidates) ? match.candidates.map((row) => row.title) : [],
      });
      continue;
    }

    const alreadyInternal = typeof match.series.video_storage_path === 'string' && match.series.video_storage_path.trim().length > 0;
    if (alreadyInternal && !overwrite) {
      console.error(`[SKIP] Ja possui player interno: ${match.series.title}`);
      report.skippedSeries.push({
        file: filePath,
        id: match.series.id,
        title: match.series.title,
        reason: 'already_internal',
      });
      continue;
    }

    const row = {
      file: filePath,
      id: String(match.series.id || ''),
      title: String(match.series.title || ''),
      price: Number(match.series.price || 0),
      matchType: match.type,
      fileSizeBytes: dirStats.size,
    };

    const fileStats = await stat(filePath);
    row.fileSizeBytes = Number(fileStats.size || 0);

    if (bucketLimitBytes > 0 && row.fileSizeBytes > bucketLimitBytes) {
      console.error(`[SKIP] Excede limite do bucket: ${row.title}`);
      report.skippedSeries.push({
        ...row,
        reason: 'bucket_file_size_limit',
        bucketFileSizeLimit: bucketLimitBytes,
      });
      continue;
    }

    if (!apply) {
      console.error(`[DRY RUN] ${row.title} <= ${filePath}`);
      report.matched.push({
        ...row,
        status: 'dry_run',
      });
      continue;
    }

    try {
      console.error(`[UPLOAD] ${row.title} <= ${filePath}`);
      const objectPath = await uploadToStorage(row.id, filePath);
      await patchSeriesPlayback(row.id, objectPath);
      console.error(`[OK] ${row.title} -> ${objectPath}`);
      report.matched.push({
        ...row,
        status: 'uploaded',
        objectPath,
      });
    } catch (error) {
      console.error(`[FAIL] ${row.title}: ${error instanceof Error ? error.message : String(error)}`);
      report.matched.push({
        ...row,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
