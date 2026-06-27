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
- `MERCADO_PAGO_ACCESS_TOKEN` para criar link de pagamento e Pix
- `MERCADO_PAGO_WEBHOOK_SECRET` se você quiser validar eventos do provedor no futuro
- `SERIES_WEBAPP_URL` com a URL principal do mini app, por exemplo `https://seriescurtasexpressbot.vercel.app/`
- `PAYMENT_ORDERS_TABLE` com o nome da tabela de pedidos, padrão `payment_orders`
- `SERIES_TABLE` se o nome da tabela não for `series`
- `SERIES_ID_COLUMN` se o identificador não for `id`
- `SERIES_TITLE_COLUMN` se o título não estiver em `title`
- `SERIES_VIDEO_URL_COLUMNS` com uma lista separada por vírgulas para URLs diretas
- `SERIES_VIDEO_FILE_ID_COLUMNS` com uma lista separada por vírgulas para IDs do Telegram

Depois de configurar os secrets, faça o deploy da function `bot-unificado`.

## Pagamentos

O checkout agora suporta três caminhos:

- `Mercado Pago` com link de pagamento
- `Pix` com QR Code
- `Checkout no Telegram`, que mantém a jornada dentro do mini app e confirma automaticamente pelo webhook

O mini app envia o carrinho para a Edge Function `bot-unificado`, que:

1. cria o pedido no Supabase
2. gera a preferência do Mercado Pago ou o Pix
3. devolve o link ou o QR Code para a interface
4. acompanha o status até a confirmação automática

Para o Pix, o fluxo pede e-mail do comprador, porque o Mercado Pago exige isso para gerar o pagamento.

As regras da integração ficam na migration `supabase/migrations/20260627224636_mercado_pago_checkout.sql`.

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
- `PUBLIC_CHANNEL_ALLOWLIST_USER_IDS` com IDs de usuários confiáveis separados por vírgula
- `PUBLIC_CHANNEL_ALLOWLIST_USERNAMES` com `@usernames` confiáveis separados por vírgula
- `PUBLIC_CHANNEL_AUDIT_TABLE` com o nome da tabela de auditoria, padrão `public_channel_member_audit`
- `PUBLIC_CHANNEL_POST_AUDIT_TABLE` com o nome da tabela de posts do canal, padrão `public_channel_post_audit`

O bot precisa ser administrador do canal com permissão para banir membros. Sem isso ele consegue detectar, mas não consegue expulsar.

Sugestão prática:

- `conservative` como padrão mais seguro para o canal público
- `balanced` para um meio-termo
- `strict` para expulsar mais agressivamente contas suspeitas

Neste ajuste, o banimento automático só acontece quando há combinação de sinais fortes de automação, e não apenas por ausência de foto, `@username` ou código de idioma.
Se você já sabe quais contas são legítimas, coloque-as na allowlist para impedir qualquer ação automática nelas.

5. Use o script de webhook com atualização de eventos:

```bash
TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/setup-telegram-webhook.mjs
```

O script registra `chat_member` no webhook, que é o evento usado para detectar novas entradas no canal público.

O CAPTCHA continua disponível como opção complementar para fluxos de convite controlado, mas no canal público a proteção principal passa a ser a expulsão automática de contas claramente suspeitas.

Quando o bot recebe o comando do mini app para reproduzir uma série, ele responde com um botão que reabre o app direto no título escolhido. Isso evita o fluxo silencioso em que o Telegram recebia o comando, mas não mostrava nenhuma ação visível para o usuário.

Se o `@RellshortsGratuitoBot` estiver publicando conteúdo no canal, o bot consegue registrar os `channel_post` daqui para frente. O que não dá para fazer é ler o conteúdo interno/privado desse outro bot ou recuperar histórico que ele não publicou no canal.

### Auditoria de entradas

A partir desta atualização, cada nova entrada no canal público passa a ser registrada em `public_channel_member_audit`. Isso permite consultar:

- contas allowlisted
- contas sinalizadas
- contas banidas automaticamente
- tentativas que falharam por falta de permissão ou erro da API

Para gerar um relatório local:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/public-channel-audit-report.mjs --limit=100
```

Use `--json` se quiser a saída estruturada.

Observação importante: entradas antigas só aparecerão se o bot já estivesse recebendo o evento `chat_member` e gravando a auditoria naquele momento. Se isso ainda não estava ativo, a primeira linha histórica começa a partir desta versão.

A migration que cria a tabela está em `supabase/migrations/20260627212449_public_channel_audit_log.sql`. Aplique-a no Supabase SQL Editor ou com `supabase db push` quando o projeto estiver linkado ao seu ambiente local.

A migration que cria a tabela de posts do canal está em `supabase/migrations/20260627213733_public_channel_post_audit.sql`.

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

## Preset equilibrado

Se quiser usar o canal público com um equilíbrio bom entre proteção e redução de falso positivo, use estes valores como base:

```env
PUBLIC_CHANNEL_STRICTNESS=balanced
PUBLIC_CHANNEL_AUTO_BAN=true
PUBLIC_CHANNEL_ALERT_CHAT_ID=<chat_id_de_alerta>
PUBLIC_CHANNEL_ALLOWLIST_USER_IDS=<ids_confiáveis_separados_por_vírgula>
PUBLIC_CHANNEL_ALLOWLIST_USERNAMES=<usernames_confiáveis_separados_por_vírgula>
```

Esse preset mantém o monitoramento ativo, mas evita banir por sinais isolados ou por conta com perfil simples.
