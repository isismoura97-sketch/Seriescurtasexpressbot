const DEFAULT_API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api';

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
  return ['video_file_id', 'file_id', 'telegram_file_id'].some((key) => {
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

const res = await fetch(`${apiUrl}?action=series`);
if (!res.ok) {
  throw new Error(`Falha ao buscar catálogo: HTTP ${res.status}`);
}

const series = await res.json();
const rows = Array.isArray(series) ? series : [];

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
