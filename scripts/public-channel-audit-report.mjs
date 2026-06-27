const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const AUDIT_TABLE = process.env.PUBLIC_CHANNEL_AUDIT_TABLE || 'public_channel_member_audit';

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const decisionArg = args.find((arg) => arg.startsWith('--decision='));
const sinceArg = args.find((arg) => arg.startsWith('--since='));
const jsonMode = args.includes('--json');
const limit = Math.max(1, Number(limitArg?.split('=')[1] || '100') || 100);
const decision = decisionArg?.split('=')[1]?.trim() || '';
const since = sinceArg?.split('=')[1]?.trim() || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para consultar a auditoria.');
  process.exit(1);
}

const params = new URLSearchParams();
params.set('select', 'created_at,chat_id,chat_username,chat_title,user_id,username,display_name,is_bot,joined,decision,analysis_mode,score,reasons,strong_signals,profile_photos');
params.set('order', 'created_at.desc');
params.set('limit', String(limit));

if (decision) {
  params.set('decision', `eq.${decision}`);
}

if (since) {
  params.set('created_at', `gte.${since}`);
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/${AUDIT_TABLE}?${params.toString()}`, {
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    accept: 'application/json',
  },
});

const data = await res.json().catch(() => []);

if (!res.ok) {
  console.error('Falha ao consultar a auditoria.');
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

if (jsonMode) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

if (!Array.isArray(data) || data.length === 0) {
  console.log('Nenhum registro encontrado na auditoria do canal público.');
  process.exit(0);
}

const summary = data.reduce(
  (acc, row) => {
    const key = String(row.decision || 'unknown');
    acc.total += 1;
    acc.byDecision[key] = (acc.byDecision[key] || 0) + 1;
    if (row.is_bot) acc.bots += 1;
    if (Number(row.score || 0) >= 75) acc.highRisk += 1;
    return acc;
  },
  { total: 0, bots: 0, highRisk: 0, byDecision: {} },
);

console.log(`# Auditoria do canal público`);
console.log(`- Total de registros: ${summary.total}`);
console.log(`- Contas marcadas como bot: ${summary.bots}`);
console.log(`- Registros de alto risco: ${summary.highRisk}`);
console.log(`- Decisões: ${Object.entries(summary.byDecision).map(([key, value]) => `${key}=${value}`).join(', ') || 'nenhuma'}`);
console.log('');
console.log('| Data | Usuário | Username | Decisão | Score | Motivos |');
console.log('| --- | --- | --- | --- | ---: | --- |');

for (const row of data) {
  const label = row.display_name || row.username || String(row.user_id);
  const reasons = Array.isArray(row.reasons) ? row.reasons.join('; ') : '';
  console.log(
    `| ${String(row.created_at || '')} | ${String(label).replaceAll('|', '\\|')} | ${String(row.username || '').replaceAll('|', '\\|')} | ${String(row.decision || '')} | ${row.score ?? ''} | ${String(reasons).replaceAll('|', '\\|')} |`,
  );
}
