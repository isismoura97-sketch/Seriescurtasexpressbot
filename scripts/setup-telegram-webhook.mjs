const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api?action=telegram-webhook';
const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const ALLOW_EMPTY_SECRET = String(process.env.ALLOW_EMPTY_TELEGRAM_WEBHOOK_SECRET || '').toLowerCase() === 'true';

if (!BOT_TOKEN) {
  console.error('Defina TELEGRAM_BOT_TOKEN antes de executar este script.');
  process.exit(1);
}

if (!SECRET_TOKEN && !ALLOW_EMPTY_SECRET) {
  console.error('Defina TELEGRAM_WEBHOOK_SECRET antes de executar este script.');
  console.error('A function rejeita updates sem esse header; registrar o webhook sem secret deixa o bot sem resposta.');
  console.error('Use ALLOW_EMPTY_TELEGRAM_WEBHOOK_SECRET=true apenas se a function tambem estiver sem TELEGRAM_WEBHOOK_SECRET.');
  process.exit(1);
}

const params = new URLSearchParams();
params.set('url', WEBHOOK_URL);

if (SECRET_TOKEN) params.set('secret_token', SECRET_TOKEN);

params.set('allowed_updates', JSON.stringify([
  'message',
  'edited_message',
  'chat_member',
  'chat_join_request',
  'my_chat_member',
  'callback_query',
  'channel_post',
  'edited_channel_post',
]));

const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: {
    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
  },
  body: params,
});

const data = await res.json().catch(() => ({}));

if (!res.ok || !data.ok) {
  console.error('Falha ao configurar o webhook.');
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log('Webhook configurado com sucesso.');
console.log(`URL: ${WEBHOOK_URL}`);

const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
const info = await infoRes.json().catch(() => ({}));

if (info?.ok && info.result) {
  const result = info.result;
  console.log(`Webhook atual: ${result.url || '(vazio)'}`);
  console.log(`Updates pendentes: ${result.pending_update_count ?? 0}`);
  if (result.last_error_message) {
    console.log(`Ultimo erro do Telegram: ${result.last_error_message}`);
  }
}
