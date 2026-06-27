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

const apiUrl = getArg('--api', DEFAULT_API_URL);
const asJson = process.argv.includes('--json');

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

if (asJson) {
  process.stdout.write(JSON.stringify({ summary, items: report }, null, 2));
} else {
  console.log('Resumo do playback:');
  console.table(summary);
  console.log('\nSéries sem URL direta:');
  console.table(report.filter((row) => row.playback !== 'direct'));
}
