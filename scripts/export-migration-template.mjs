import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api';
const SUPABASE_CLI = 'supabase';

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

function isLockedContent(row) {
  return row?.has_access === false && Number(row?.price || 0) > 0;
}

function classify(row) {
  if (isLockedContent(row)) return 'locked';
  if (hasDirectPlaybackUrl(row)) return 'direct';
  if (hasTelegramFile(row)) return 'telegram';
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
  const tempDir = mkdtempSync(join(tmpdir(), 'migration-template-'));
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

  try { unlinkSync(tempSqlPath); } catch {}
  try { rmSync(tempDir, { recursive: true, force: true }); } catch {}

  if (result.error) {
    throw new Error(`Falha ao executar Supabase CLI: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`Supabase CLI retornou código ${result.status}${stderr ? `: ${stderr}` : ''}`);
  }

  return parseJsonOutput(result.stdout || '[]', 'Supabase CLI');
}

async function loadCatalog(useLinked) {
  if (!useLinked) {
    const res = await fetch(`${DEFAULT_API_URL}?action=series`);
    if (!res.ok) {
      throw new Error(`Falha ao buscar catálogo: HTTP ${res.status}`);
    }
    const series = await res.json();
    return Array.isArray(series) ? series : [];
  }

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

  return seriesRows.map((row) => ({
    ...row,
    ...(episodeMap.get(String(row.id ?? '').trim()) || {
      episode_count: 0,
      playable_episode_count: 0,
      episode_file_id: null,
      episode_title: null,
      episode_number: null,
    }),
  }));
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r;]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function buildRows(series) {
  return series
    .map((row) => {
      const playback = classify(row);
      if (playback === 'direct' || playback === 'locked') return null;

      const title = row?.title ?? '(sem título)';
      const category = row?.category ?? 'sem categoria';
      const telegramFileId = row?.video_file_id || row?.file_id || row?.telegram_file_id || row?.episode_file_id || '';

      return {
        id: row?.id ?? '',
        title,
        category,
        playback,
        recommended_path: playback === 'telegram' ? 'manter_no_telegram_ou_migrar_para_url_direta' : 'localizar_arquivo_original_e_preencher_url_ou_file_id',
        video_url: '',
        video_file_id: telegramFileId,
        notes: playback === 'telegram'
          ? 'Já depende do Telegram; bom candidato para migrar para URL direta quando houver arquivo fonte.'
          : 'Sem mídia identificada; precisa localizar a fonte original primeiro.',
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const order = { telegram: 0, missing: 1, direct: 2 };
      const playbackDiff = (order[a.playback] ?? 9) - (order[b.playback] ?? 9);
      if (playbackDiff !== 0) return playbackDiff;
      return a.title.localeCompare(b.title, 'pt-BR');
    });
}

function toCsv(rows) {
  const headers = ['id', 'title', 'category', 'playback', 'recommended_path', 'video_url', 'video_file_id', 'notes'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  return lines.join('\n');
}

const outputPath = getArg('--output', '');
const useLinked = process.argv.includes('--linked');
const series = await loadCatalog(useLinked);
const rows = Array.isArray(series) ? buildRows(series) : [];
const csv = toCsv(rows);

if (outputPath) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, `\ufeff${csv}\n`, 'utf8');
  console.log(`Template salvo em ${outputPath}`);
  console.log(`Linhas exportadas: ${rows.length}`);
} else {
  process.stdout.write(csv);
}
