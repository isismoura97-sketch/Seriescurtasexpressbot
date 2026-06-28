const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api?action=telegram-webhook';
const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET || '';

if (!BOT_TOKEN) {
  console.error('Defina TELEGRAM_BOT_TOKEN antes de executar este script.');
  process.exit(1);
}

const params = new URLSearchParams();
params.set('url', WEBHOOK_URL);

if (SECRET_TOKEN) {
  params.set('secret_token', SECRET_TOKEN);
}

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
