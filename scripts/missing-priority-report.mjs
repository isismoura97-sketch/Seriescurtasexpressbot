import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api';
const SUPABASE_CLI = 'supabase';
const DEFAULT_INPUT = 'outputs/migration-template.csv';

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers || headers.length === 0) return [];

  headers[0] = headers[0].replace(/^\uFEFF/, '').trim();
  for (let i = 1; i < headers.length; i += 1) {
    headers[i] = headers[i].trim();
  }

  return dataRows
    .filter((values) => values.some((value) => value !== ''))
    .map((values) => {
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = values[index] ?? '';
      });
      return entry;
    });
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
  const tempDir = mkdtempSync(join(tmpdir(), 'missing-priority-'));
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

async function loadRows(useLinked) {
  if (!useLinked) {
    const inputPath = getArg('--input', DEFAULT_INPUT);
    const { readFile } = await import('node:fs/promises');
    const input = await readFile(inputPath, 'utf8');
    return parseCsv(input);
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

  const combined = seriesRows.map((row) => ({
    ...row,
    ...(episodeMap.get(String(row.id ?? '').trim()) || {
      episode_count: 0,
      playable_episode_count: 0,
      episode_file_id: null,
      episode_title: null,
      episode_number: null,
    }),
  }));

  return combined.map((row) => ({
    id: row.id ?? '',
    title: row.title ?? '(sem título)',
    category: row.category ?? '',
    playback: Number(row.playable_episode_count || 0) > 0 || typeof row.video_file_id === 'string' && row.video_file_id.trim() ? 'telegram' : 'missing',
    episode_count: row.episode_count ?? 0,
    playable_episode_count: row.playable_episode_count ?? 0,
    episode_file_id: row.episode_file_id ?? '',
    video_file_id: row.video_file_id ?? '',
  }));
}

function renderTable(title, items) {
  const lines = [
    `## ${title}`,
    '',
    '| Título | Categoria | Recomendação |',
    '| --- | --- | --- |',
  ];

  if (!items.length) {
    lines.push('| - | - | Nenhum item nesta categoria |');
    lines.push('');
    return lines.join('\n');
  }

  for (const row of items) {
    lines.push(`| ${row.title.replaceAll('|', '\\|')} | ${String(row.category || 'sem categoria').replaceAll('|', '\\|')} | Localizar a mídia original e preencher \`video_url\` ou \`video_file_id\` |`);
  }

  lines.push('');
  return lines.join('\n');
}

const useLinked = process.argv.includes('--linked');
const rows = await loadRows(useLinked);
const missing = rows.filter((row) => row.playback === 'missing');
const withCategory = missing.filter((row) => String(row.category ?? '').trim().length > 0);
const withoutCategory = missing.filter((row) => String(row.category ?? '').trim().length === 0);

const output = [
  '# Prioridade de migração para títulos sem mídia',
  '',
  'Critério usado:',
  '',
  '- Primeiro os títulos com categoria preenchida, porque têm metadados mais completos e são mais fáceis de validar',
  '- Depois os títulos sem categoria, que exigem um pouco mais de conferência manual',
  '',
  `Total de itens sem mídia: ${missing.length}`,
  '',
  renderTable('Wave 1: categoria preenchida', withCategory),
  renderTable('Wave 2: categoria ausente', withoutCategory),
  '## Observação',
  '',
  'Essa ordem não mede audiência; ela prioriza facilidade de execução e menor risco de inconsistência de cadastro.',
  '',
].join('\n');

const outputPath = getArg('--output', null);
if (outputPath) {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `\ufeff${output}\n`, 'utf8');
} else {
  process.stdout.write(output);
}
