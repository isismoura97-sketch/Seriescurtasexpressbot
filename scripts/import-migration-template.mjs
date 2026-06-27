const DEFAULT_INPUT = 'outputs/migration-template.csv';
const DEFAULT_API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co';
const DEFAULT_TABLE = 'series';
const DEFAULT_ID_COLUMN = 'id';

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
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

function toBool(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildUpdate(row) {
  const update = {};
  if (toBool(row.video_url)) update.video_url = row.video_url.trim();
  if (toBool(row.video_file_id)) update.video_file_id = row.video_file_id.trim();
  return update;
}

function formatRow(row) {
  return `${row.id} | ${row.title} | ${row.playback} | ${row.video_url ? 'video_url' : ''}${row.video_url && row.video_file_id ? '+' : ''}${row.video_file_id ? 'video_file_id' : ''}`;
}

const inputPath = getArg('--input', DEFAULT_INPUT);
const apiUrl = getArg('--api', DEFAULT_API_URL);
const table = getArg('--table', DEFAULT_TABLE);
const idColumn = getArg('--id-column', DEFAULT_ID_COLUMN);
const applyChanges = hasFlag('--apply');
const dryRun = !applyChanges;

const { readFile } = await import('node:fs/promises');
const input = await readFile(inputPath, 'utf8');
const rows = parseCsv(input);

const invalidIdRows = rows.filter((row) => (row.playback === 'telegram' || row.playback === 'missing') && !(typeof row.id === 'string' && row.id.trim().length > 0));

const actionable = rows
  .filter((row) => row.playback === 'telegram' || row.playback === 'missing')
  .filter((row) => typeof row.id === 'string' && row.id.trim().length > 0)
  .map((row) => ({
    ...row,
    update: buildUpdate(row),
  }));

const readyToApply = actionable.filter((row) => Object.keys(row.update).length > 0);
const pending = actionable.filter((row) => Object.keys(row.update).length === 0);

console.log(`Linhas lidas: ${rows.length}`);
console.log(`Prontas para aplicar: ${readyToApply.length}`);
console.log(`Ainda vazias: ${pending.length}`);

if (invalidIdRows.length) {
  console.log(`Linhas ignoradas por falta de id: ${invalidIdRows.length}`);
}

if (pending.length) {
  console.log('\nPendentes:');
  pending.forEach((row) => console.log(`- ${formatRow(row)}`));
}

if (invalidIdRows.length) {
  console.log('\nSem id válido:');
  invalidIdRows.forEach((row) => console.log(`- ${row.title || '(sem título)'}`));
}

if (dryRun) {
  console.log('\nModo dry-run. Nenhuma alteração foi enviada.');
  console.log('Use --apply para gravar as mudanças no Supabase.');
} else {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceRole) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado');
  }

  for (const row of readyToApply) {
    const endpoint = new URL(`/rest/v1/${table}`, apiUrl);
    endpoint.searchParams.set(idColumn, `eq.${row.id}`);

    const res = await fetch(endpoint.toString(), {
      method: 'PATCH',
      headers: {
        apikey: serviceRole,
        authorization: `Bearer ${serviceRole}`,
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: JSON.stringify(row.update),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Falha ao atualizar ${row.id}: HTTP ${res.status} ${body}`);
    }
  }

  console.log(`\nAtualizações enviadas com sucesso para ${readyToApply.length} linha(s).`);
}
