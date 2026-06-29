import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api';
const SUPABASE_CLI = 'supabase';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url, init = {}, options = {}) {
  const retries = Number.isFinite(Number(options.retries)) ? Math.max(1, Math.floor(Number(options.retries))) : 3;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Math.max(1000, Math.floor(Number(options.timeoutMs))) : 15000;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          ...(init.headers || {}),
        },
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ''}`);
      }
      return text.trim() ? JSON.parse(text) : [];
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await sleep(500 * attempt);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError || 'Falha de rede'));
}

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function hasDirectPlaybackUrl(row) {
  return ['video_url', 'stream_url', 'media_url', 'url'].some((key) => {
    const value = row?.[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

function hasTelegramFile(row) {
  if (Number(row?.playable_episode_count || 0) > 0) return true;

  return ['video_file_id', 'file_id', 'telegram_file_id', 'episode_file_id'].some((key) => {
    const value = row?.[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

function classify(row) {
  const direct = hasDirectPlaybackUrl(row);
  const telegram = hasTelegramFile(row);

  if (direct) return 'direct';
  if (telegram) return 'telegram';
  return 'missing';
}

function parseJsonOutput(stdout, context) {
  try {
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed?.rows) ? parsed.rows : Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error(`Falha ao interpretar resposta JSON de ${context}: ${error.message}`);
  }
}

function runSupabaseQuery(sql) {
  const tempDir = mkdtempSync(join(tmpdir(), 'playback-audit-'));
  const tempSqlPath = join(tempDir, 'query.sql');
  writeFileSync(tempSqlPath, sql, 'utf8');

  const result = spawnSync(
    SUPABASE_CLI,
    ['db', 'query', '--linked', '--output', 'json', '-f', tempSqlPath],
    {
      encoding: 'utf8',
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  try {
    unlinkSync(tempSqlPath);
  } catch {}
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  if (result.error) {
    throw new Error(`Falha ao executar Supabase CLI: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`Supabase CLI retornou código ${result.status}${stderr ? `: ${stderr}` : ''}`);
  }

  return parseJsonOutput(result.stdout || '[]', 'Supabase CLI');
}

async function runSupabaseRestQuery(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado');
  }

  const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/rest/v1/${path}`;
  return await fetchJsonWithRetry(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
    },
  }, {
    retries: 3,
    timeoutMs: 15000,
  });
}

async function loadLinkedCatalog() {
  const seriesRows = runSupabaseQuery('select * from public.series order by created_at asc;');
  const episodeRows = runSupabaseQuery(
    'select series_id, episode_number, title, file_id, preview_file_id, created_at from public.episodes order by series_id, episode_number asc nulls last, created_at asc;',
  );

  const episodeMap = new Map();
  for (const episode of episodeRows) {
    const seriesId = String(episode.series_id ?? '').trim();
    if (!seriesId) continue;

    const current = episodeMap.get(seriesId) || {
      episode_count: 0,
      playable_episode_count: 0,
      episode_file_id: null,
      episode_title: null,
      episode_number: null,
    };

    current.episode_count += 1;
    if (typeof episode.file_id === 'string' && episode.file_id.trim()) {
      current.playable_episode_count += 1;
      if (!current.episode_file_id) {
        current.episode_file_id = episode.file_id.trim();
        current.episode_title = typeof episode.title === 'string' ? episode.title : null;
        current.episode_number = episode.episode_number ?? null;
      }
    }

    episodeMap.set(seriesId, current);
  }

  return seriesRows.map((row) => {
    const seriesId = String(row.id ?? '').trim();
    const episodeData = episodeMap.get(seriesId) || {
      episode_count: 0,
      playable_episode_count: 0,
      episode_file_id: null,
      episode_title: null,
      episode_number: null,
    };

    return {
      ...row,
      ...episodeData,
    };
  });
}

async function loadServiceRoleCatalog() {
  const [seriesRows, episodeRows] = await Promise.all([
    runSupabaseRestQuery('series?select=*'),
    runSupabaseRestQuery('episodes?select=series_id,episode_number,title,file_id,preview_file_id,created_at'),
  ]);

  const episodeMap = new Map();
  for (const episode of Array.isArray(episodeRows) ? episodeRows : []) {
    const seriesId = String(episode.series_id ?? '').trim();
    if (!seriesId) continue;

    const current = episodeMap.get(seriesId) || {
      episode_count: 0,
      playable_episode_count: 0,
      episode_file_id: null,
      episode_title: null,
      episode_number: null,
    };

    current.episode_count += 1;
    if (typeof episode.file_id === 'string' && episode.file_id.trim()) {
      current.playable_episode_count += 1;
      if (!current.episode_file_id) {
        current.episode_file_id = episode.file_id.trim();
        current.episode_title = typeof episode.title === 'string' ? episode.title : null;
        current.episode_number = episode.episode_number ?? null;
      }
    }

    episodeMap.set(seriesId, current);
  }

  return (Array.isArray(seriesRows) ? [...seriesRows] : [])
    .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
    .map((row) => {
      const seriesId = String(row.id ?? '').trim();
      const episodeData = episodeMap.get(seriesId) || {
        episode_count: 0,
        playable_episode_count: 0,
        episode_file_id: null,
        episode_title: null,
        episode_number: null,
      };

      return {
        ...row,
        ...episodeData,
      };
    });
}

function buildPlanMarkdown(report, summary) {
  const telegramItems = report.filter((row) => row.playback === 'telegram');
  const missingItems = report.filter((row) => row.playback === 'missing');

  const lines = [
    '# Plano de migração de playback',
    '',
    '## Resumo',
    '',
    `- Séries com URL direta: ${summary.direct}`,
    `- Séries que dependem do Telegram: ${summary.telegram}`,
    `- Séries sem mídia identificada: ${summary.missing}`,
    '',
    '## Prioridade 1: títulos que já dependem do Telegram',
    '',
    'Esses títulos funcionam via abertura no bot e devem ser tratados primeiro se a meta for reduzir atrito no navegador.',
    '',
    '| Título | Categoria | Ação recomendada |',
    '| --- | --- | --- |',
    ...telegramItems.map((row) => `| ${row.title.replaceAll('|', '\\|')} | ${String(row.category ?? 'sem categoria').replaceAll('|', '\\|')} | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |`),
    '',
    '## Prioridade 2: títulos sem mídia identificada',
    '',
    'Esses itens precisam de uma origem de vídeo antes de reproduzir no app.',
    '',
    '| Título | Categoria | Ação recomendada |',
    '| --- | --- | --- |',
    ...missingItems.map((row) => `| ${row.title.replaceAll('|', '\\|')} | ${String(row.category ?? 'sem categoria').replaceAll('|', '\\|')} | Localizar o arquivo original e preencher ` + '`video_url`' + ` ou ` + '`video_file_id`' + ` |`),
    '',
    '## Próximos passos sugeridos',
    '',
    '1. Escolher os 3 primeiros títulos da lista `missing` e localizar o arquivo original.',
    '2. Decidir, para cada um, se a reprodução ficará em URL direta ou via Telegram.',
    '3. Reexecutar `node scripts/playback-audit.mjs --json` depois de atualizar o catálogo.',
  ];

  return lines.join('\n');
}

const apiUrl = getArg('--api', DEFAULT_API_URL);
const asJson = process.argv.includes('--json');
const asPlan = process.argv.includes('--plan');
const useLinkedDb = process.argv.includes('--linked');
const useServiceRole = process.argv.includes('--service-role');

const rows = useServiceRole
  ? await loadServiceRoleCatalog()
  : useLinkedDb
  ? await loadLinkedCatalog()
  : await (async () => {
      const series = await fetchJsonWithRetry(`${apiUrl}?action=series`, {}, {
        retries: 3,
        timeoutMs: 15000,
      });
      return Array.isArray(series) ? series : [];
    })();

const report = rows.map((row) => ({
  id: row.id ?? null,
  title: row.title ?? '(sem título)',
  category: row.category ?? null,
  playback: classify(row),
}));

const summary = report.reduce((acc, row) => {
  acc[row.playback] = (acc[row.playback] || 0) + 1;
  return acc;
}, { direct: 0, telegram: 0, missing: 0 });

if (asPlan) {
  process.stdout.write(buildPlanMarkdown(report, summary));
} else if (asJson) {
  process.stdout.write(JSON.stringify({ summary, items: report }, null, 2));
} else {
  console.log('Resumo do playback:');
  console.table(summary);
  console.log('\nSéries sem URL direta:');
  console.table(report.filter((row) => row.playback !== 'direct'));
}
