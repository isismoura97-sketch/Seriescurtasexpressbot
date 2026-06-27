# Seriescurtasexpressbot

Aplicação web estática para o catálogo "Séries Curtas Express", com integração ao Telegram WebApp e consumo de uma função Supabase para catálogo e streaming.

## Estrutura

- `series-app/index.html` - estrutura principal da interface
- `series-app/app.js` - lógica de catálogo, player, carrinho e integração com Telegram
- `series-app/styles.css` - estilos visuais
- `series-app/vercel.json` - configuração de SPA para Vercel

## Execução local

1. Abra a pasta `series-app`.
2. Sirva os arquivos estáticos com qualquer servidor local.
3. Abra a página dentro do Telegram WebApp para liberar o acesso completo.

Exemplo com Python:

```bash
cd series-app
python -m http.server 8000
```

## Observações

- O app depende de `window.Telegram.WebApp` para identificar o usuário.
- O catálogo é carregado do backend em Supabase.
- Fora do Telegram, o app exibe "Acesso Negado" por design.

## Backend Supabase

Há uma Edge Function preparada em `supabase/functions/bot-unificado/index.ts` para:

- retornar a lista de séries em `action=series`
- resolver `action=stream` para uma `url` reproduzível
- fazer proxy de arquivos do Telegram em `action=playback`

Secrets necessários no Supabase:

- `TELEGRAM_BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SERIES_WEBAPP_URL` com a URL principal do mini app, por exemplo `https://seriescurtasexpressbot.vercel.app/`
- `SERIES_TABLE` se o nome da tabela não for `series`
- `SERIES_ID_COLUMN` se o identificador não for `id`
- `SERIES_TITLE_COLUMN` se o título não estiver em `title`
- `SERIES_VIDEO_URL_COLUMNS` com uma lista separada por vírgulas para URLs diretas
- `SERIES_VIDEO_FILE_ID_COLUMNS` com uma lista separada por vírgulas para IDs do Telegram

Depois de configurar os secrets, faça o deploy da function `bot-unificado`.

## Canal público e anti-bot

O canal público pode continuar sendo a vitrine do projeto. Nesse modo, o bot não bloqueia a entrada antes do usuário entrar pelo `@username`, então a defesa passa a ser monitoramento e expulsão automática dos casos mais suspeitos.

Fluxo recomendado:

1. Mantenha o canal público para divulgação.
2. Configure o bot como administrador com permissão para banir membros.
3. Aponte o webhook do bot para a function:

```bash
https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api?action=telegram-webhook
```

4. Defina estes secrets/variáveis:

- `TELEGRAM_WEBHOOK_SECRET` para validar o webhook do Telegram
- `PUBLIC_CHANNEL_USERNAME` com o `@username` do canal público
- `PUBLIC_CHANNEL_ID` se você preferir validar pelo ID numérico
- `PUBLIC_CHANNEL_ALERT_CHAT_ID` para receber alertas de suspeitos
- `PUBLIC_CHANNEL_STRICTNESS` para ajustar a agressividade da heurística (`conservative`, `balanced` ou `strict`). O padrão atual é `conservative` para reduzir falso positivo.
- `PUBLIC_CHANNEL_AUTO_BAN=true` para banir automaticamente
- `PUBLIC_CHANNEL_AUTO_BAN=false` se você quiser começar só em modo de alerta

O bot precisa ser administrador do canal com permissão para banir membros. Sem isso ele consegue detectar, mas não consegue expulsar.

Sugestão prática:

- `conservative` como padrão mais seguro para o canal público
- `balanced` para um meio-termo
- `strict` para expulsar mais agressivamente contas suspeitas

Neste ajuste, o banimento automático só acontece quando há combinação de sinais fortes de automação, e não apenas por ausência de foto, `@username` ou código de idioma.

5. Use o script de webhook com atualização de eventos:

```bash
TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/setup-telegram-webhook.mjs
```

O script registra `chat_member` no webhook, que é o evento usado para detectar novas entradas no canal público.

O CAPTCHA continua disponível como opção complementar para fluxos de convite controlado, mas no canal público a proteção principal passa a ser a expulsão automática de contas claramente suspeitas.

Quando o bot recebe o comando do mini app para reproduzir uma série, ele responde com um botão que reabre o app direto no título escolhido. Isso evita o fluxo silencioso em que o Telegram recebia o comando, mas não mostrava nenhuma ação visível para o usuário.

## Auditoria de playback

Se quiser revisar rapidamente quais séries já têm URL direta e quais ainda dependem do Telegram, rode:

```bash
node scripts/playback-audit.mjs
```

Use `--json` para obter um relatório estruturado e `--plan` para gerar um plano de migração em Markdown.

Para gerar uma planilha CSV com os títulos que ainda precisam de atenção:

```bash
node scripts/export-migration-template.mjs --output outputs/migration-template.csv
```

Depois de preencher o CSV, você pode testar o que seria aplicado sem gravar nada:

```bash
node scripts/import-migration-template.mjs --input outputs/migration-template.csv
```

Para enviar as alterações ao Supabase, adicione `--apply` e configure `SUPABASE_SERVICE_ROLE_KEY`.
Se a coluna da chave primária não for `id`, passe `--id-column` com o nome correto.

Para gerar uma prioridade de migração dos itens sem mídia:

```bash
node scripts/missing-priority-report.mjs --output outputs/missing-priority.md
```
