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
  if (hasDirectPlaybackUrl(row)) return 'direct';
  if (hasTelegramFile(row)) return 'telegram';
  return 'missing';
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
      const title = row?.title ?? '(sem título)';
      const category = row?.category ?? 'sem categoria';
      const telegramFileId = row?.video_file_id || row?.file_id || row?.telegram_file_id || '';

      if (playback === 'direct') return null;

      return {
        id: row?.id ?? '',
        title,
        category,
        playback,
        recommended_path: playback === 'telegram' ? 'manter_no_telegram_ou_migrar_para_url_direta' : 'localizar_arquivo_original_e_preencher_url_ou_file_id',
        video_url: '',
        video_file_id: telegramFileId,
        notes:
          playback === 'telegram'
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
  const headers = [
    'id',
    'title',
    'category',
    'playback',
    'recommended_path',
    'video_url',
    'video_file_id',
    'notes',
  ];

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  return lines.join('\n');
}

const apiUrl = getArg('--api', DEFAULT_API_URL);
const outputPath = getArg('--output', '');

const res = await fetch(`${apiUrl}?action=series`);
if (!res.ok) {
  throw new Error(`Falha ao buscar catálogo: HTTP ${res.status}`);
}

const series = await res.json();
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
