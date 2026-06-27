const DEFAULT_INPUT = 'outputs/migration-template.csv';
const DEFAULT_OUTPUT = null;

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

const inputPath = getArg('--input', DEFAULT_INPUT);
const outputPath = getArg('--output', DEFAULT_OUTPUT);
const { mkdir, readFile, writeFile } = await import('node:fs/promises');
const { dirname } = await import('node:path');
const input = await readFile(inputPath, 'utf8');
const rows = parseCsv(input);

const missing = rows.filter((row) => row.playback === 'missing');

const withCategory = missing.filter((row) => String(row.category ?? '').trim().length > 0);
const withoutCategory = missing.filter((row) => String(row.category ?? '').trim().length === 0);

function renderTable(title, items) {
  const lines = [
    `## ${title}`,
    '',
    '| Título | Categoria | Recomendação |',
    '| --- | --- | --- |',
  ];

  for (const row of items) {
    lines.push(`| ${row.title.replaceAll('|', '\\|')} | ${String(row.category || 'sem categoria').replaceAll('|', '\\|')} | Localizar a mídia original e preencher \`video_url\` ou \`video_file_id\` |`);
  }

  lines.push('');
  return lines.join('\n');
}

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

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${output}\n`, 'utf8');
} else {
  process.stdout.write(output);
}
