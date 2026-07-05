# Seriescurtasexpressbot

[![CI](https://github.com/isismoura97-sketch/Seriescurtasexpressbot/actions/workflows/ci.yml/badge.svg)](https://github.com/isismoura97-sketch/Seriescurtasexpressbot/actions/workflows/ci.yml)

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
- entregar séries via bot em `action=deliver-series`
- salvar progresso do Mini App em `action=progress-sync`

Secrets necessários no Supabase:

- `TELEGRAM_BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADO_PAGO_ACCESS_TOKEN` para criar link de pagamento e Pix
- `MERCADO_PAGO_WEBHOOK_SECRET` para validar o webhook do Mercado Pago
- `MERCADO_PAGO_PIX_KEY` para fallback do Pix estático
- `MERCADO_PAGO_PIX_COPY` com o código "copia e cola" do Pix
- `MERCADO_PAGO_PIX_QR_CODE_BASE64` com o QR Code em base64, caso você queira mostrar o mesmo QR no mini app
- `SERIES_WEBAPP_URL` com a URL principal do mini app, por exemplo `https://seriescurtasexpressbot.vercel.app/`
- `PAYMENT_ORDERS_TABLE` com o nome da tabela de pedidos, padrão `payment_orders`
- `USER_SERIES_PROGRESS_TABLE` com o nome da tabela de progresso, padrão `user_series_progress`
- `SERIES_TABLE` se o nome da tabela não for `series`
- `SERIES_ID_COLUMN` se o identificador não for `id`
- `SERIES_TITLE_COLUMN` se o título não estiver em `title`
- `EPISODES_TABLE` com a tabela de episódios, padrão `episodes`
- `EPISODE_SERIES_COLUMN` com a coluna que liga episódio à série, padrão `series_id`
- `EPISODE_VIDEO_FILE_ID_COLUMNS` com colunas de File_ID nos episódios, padrão `file_id,video_file_id,telegram_file_id`
- `SERIES_VIDEO_URL_COLUMNS` com uma lista separada por vírgulas para URLs diretas
- `SERIES_VIDEO_FILE_ID_COLUMNS` com uma lista separada por vírgulas para IDs do Telegram
- `OWNER_TELEGRAM_USER_ID` com o ID do proprietário, padrão `1048601631`
- `OWNER_AREA_PASSWORD` ou `OWNER_AREA_PASSWORD_SHA256` para a senha da área do proprietário

Depois de configurar os secrets, faça o deploy da function `bot-unificado`.

## Bot + Mini App

Fluxo integrado atual:

1. o usuário entra no bot
2. o bot oferece `Catálogo`, `Mini App`, `Continuar` e `Recomendações`
3. o Mini App abre o catálogo e o checkout
4. séries com URL direta continuam no player interno
5. séries com `File_ID` são entregues pelo próprio bot no Telegram com `protect_content`
6. o Mini App sincroniza progresso em `user_series_progress`
7. o bot usa esse histórico para `/continuar` e `/recomendar`

### Migração para player interno protegido

Para tentar migrar em lote as séries que hoje ainda dependem de `video_file_id`, use:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TELEGRAM_BOT_TOKEN=... node scripts/migrate-series-to-internal-player.mjs --json
```

O script:

- lê `series` e `episodes`
- tenta baixar o vídeo original pelo `File_ID` do Telegram
- envia o arquivo para o bucket `videos`
- grava apenas `video_storage_path` para que o playback use URL assinada temporária

Limite importante:

- se o Telegram responder `Bad Request: file is too big`, a migração automática não consegue concluir
- nesses casos, o caminho correto passa a ser enviar o arquivo original pelo painel do proprietário para o Supabase Storage

Mesmo após a migração, as séries pagas continuam protegidas:

- o backend verifica o pagamento antes de gerar a URL assinada do vídeo
- sem pagamento aprovado, o endpoint `action=stream` responde com `payment_required`

### Upload em lote dos vídeos originais

Se você já tiver os arquivos originais no computador, o caminho mais rápido é subir tudo em lote para o Supabase Storage:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bulk-upload-series-videos-to-supabase.mjs --dir "C:\\pasta\\dos\\videos"
```

Modo de teste:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bulk-upload-series-videos-to-supabase.mjs --dir "C:\\pasta\\dos\\videos"
```

Aplicando de verdade:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bulk-upload-series-videos-to-supabase.mjs --dir "C:\\pasta\\dos\\videos" --apply
```

Regras de correspondência:

- nome do arquivo começando com o `id` da série
- ou nome do arquivo igual ao título da série
- ou correspondência aproximada quando houver apenas uma candidata

Exemplos de arquivo:

- `798c4fff-a244-4a46-aed1-eef02e25c76c.mp4`
- `Um Negócio com Meu Doador Bilionário.mp4`

Depois do upload, o script:

- envia o vídeo para o bucket `videos`
- grava `video_storage_path`
- limpa `video_url` pública para priorizar a reprodução protegida

Assim o player interno passa a usar o Supabase diretamente, e as séries pagas continuam bloqueadas até a confirmação do pagamento.

## Área do proprietário

O mini app mostra um botão de coroa apenas para o Telegram ID configurado em `OWNER_TELEGRAM_USER_ID`.

O acesso exige duas validações no backend:

1. `initData` válido do Telegram WebApp
2. senha definida em `OWNER_AREA_PASSWORD` ou hash SHA-256 em `OWNER_AREA_PASSWORD_SHA256`

Se a senha própria ainda não estiver definida, a function usa `TELEGRAM_WEBHOOK_SECRET` como fallback temporário. Recomenda-se configurar `OWNER_AREA_PASSWORD` separado para produção.

## Pagamentos

O checkout agora suporta três caminhos:

- `Pix` com QR Code, agora como opção padrão do checkout
- `Mercado Pago` com link de pagamento
- `Checkout no Telegram`, que mantém a jornada no mini app usando a preferência do Mercado Pago e confirma automaticamente pelo webhook

O mini app envia o carrinho para a Edge Function `bot-unificado`, que:

1. cria o pedido no Supabase
2. gera a preferência do Mercado Pago ou o Pix
3. devolve o link ou o QR Code para a interface
4. acompanha o status até a confirmação automática

Mesmo se o webhook atrasar, o mini app volta a consultar o pedido e sincroniza o status com o Mercado Pago antes de mostrar o resultado final.

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
Se quiser a leitura completa do catálogo, incluindo séries pagas que o endpoint público pode ocultar, use `--linked`.

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
