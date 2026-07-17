# Seriescurtasexpressbot

[![CI](https://github.com/isismoura97-sketch/Seriescurtasexpressbot/actions/workflows/ci.yml/badge.svg)](https://github.com/isismoura97-sketch/Seriescurtasexpressbot/actions/workflows/ci.yml)

Aplicação web estática para o catálogo "Séries Curtas Express", com integração ao Telegram WebApp e consumo de uma função Supabase para catálogo e streaming.

## Estrutura

- `series-app/index.html` - estrutura principal da interface
- `series-app/app.js` - lógica de catálogo, player, carrinho e integração com Telegram
- `series-app/styles.css` - estilos visuais
- `series-app/vercel.json` - configuração de SPA para Vercel
- `docs/architecture-audit.md` - arquitetura, riscos e estratégia incremental
- `docs/PAYMENTS_AND_ENTITLEMENTS.md` - canais de pagamento, conciliação, acessos e operação
- `docs/FUNNEL_ANALYTICS.md` - eventos, idempotência e métricas reais do funil
- `docs/DELIVERY_SECURITY_OPERATIONS_ROADMAP.md` - estado atual e próximas etapas de contas, segurança e operação
- `CHANGELOG.md` - histórico de mudanças relevantes

## Execução local

1. Abra a pasta `series-app`.
2. Sirva os arquivos estáticos com qualquer servidor local.
3. Abra a página em um navegador comum para consultar o catálogo e usar a conta web, ou dentro do Telegram para compras, entrega e vínculo dos acessos existentes.

Exemplo com Python:

```bash
cd series-app
python -m http.server 8000
```

## Observações

- O catálogo funciona dentro e fora do Telegram.
- `window.Telegram.WebApp` identifica o usuário apenas quando o app é aberto pelo Telegram.
- O catálogo é carregado do backend em Supabase.
- Fora do Telegram, páginas, busca e favoritos locais funcionam normalmente; ações privadas levam o usuário ao bot.

## Rotas públicas e SEO

- `/series/[slug]` - detalhes públicos da série
- `/categoria/[slug]` - catálogo filtrado por gênero ou tipo
- `/busca?q=termo` - busca por título, sinopse, gênero, tags, idioma e temas
- `/favoritos` - favoritos sincronizados no Telegram ou mantidos no navegador
- `/ajuda`, `/termos` e `/privacidade` - páginas institucionais
- `/blog` - conteúdo editorial local

Os metadados da página de série incluem canonical, Open Graph, Twitter Cards e Schema.org com dados reais. O sitemap é gerado a partir do catálogo público:

```bash
node scripts/generate-seo-files.mjs
```

Os arquivos resultantes ficam em `series-app/sitemap.xml` e `series-app/series/[slug]/index.html`. As páginas geradas já entregam título, description, canonical, Open Graph e Schema.org no HTML inicial, antes da execução do JavaScript.

O cadastro da série é a fonte de verdade do SEO. O backend gera automaticamente slug, título, descrição, canonical, Open Graph, Twitter Card e Schema.org a partir dos dados reais do catálogo. Campos editoriais preenchidos no CMS funcionam como substituições opcionais, sem apagar a geração automática. O painel mostra prévias para Google e compartilhamento social, indica quais campos são automáticos ou personalizados e permite excluir uma página do sitemap sem remover a série do catálogo.

Ao publicar ou editar o catálogo, regenere os arquivos indexáveis e inclua o resultado no deploy:

```bash
node scripts/generate-seo-files.mjs
```

## Contexto híbrido

`series-app/app.js` expõe internamente uma camada de contexto com:

- `isTelegram`
- `isMobile`
- `user`
- `theme`
- `openTelegramLink`
- `openExternalLink`

O frontend nunca usa o modo web para liberar conteúdo pago. Compra, entrega, progresso remoto e área da proprietária continuam dependendo de `initData` validado pela Edge Function.

## Área da cliente

Quando aberto pelo Telegram, o Mini App disponibiliza:

- `/minha-conta` com o resumo da conta;
- `/minha-biblioteca` com séries compradas e aprovadas;
- `/minhas-compras` com pedidos e estados de pagamento;
- `/historico` com progresso real registrado;
- `/favoritos` com os favoritos já sincronizados.

O endpoint `action=customer-area` aceita duas identidades validadas pelo backend: o `initData` assinado do Telegram ou uma sessão Supabase vinculada previamente ao mesmo Telegram ID. A biblioteca não confia no frontend: apenas compras aprovadas retornam com acesso.

Fora do Telegram, `/minha-conta` oferece cadastro, confirmação de e-mail, login e recuperação de senha. Access token e refresh token ficam em cookies `HttpOnly`, `Secure` e `SameSite=Lax`; não são gravados no `localStorage` nem devolvidos no JSON da API. O vínculo é um-para-um e só ocorre dentro do Mini App após validar simultaneamente a sessão da conta, o e-mail confirmado e o `initData` do Telegram.

As tabelas `customer_accounts`, `customer_account_consents` e `customer_telegram_links` usam RLS e não substituem os Telegram IDs já registrados em pedidos, acessos, favoritos ou progresso. Isso preserva compras existentes e permite que a conta web resolva a mesma biblioteca sem migração destrutiva.

Variáveis necessárias nas funções da Vercel:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

O `SUPABASE_SERVICE_ROLE_KEY` continua restrito ao Supabase e aos processos administrativos. Ele não é necessário nem deve ser configurado no frontend.

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
- `OWNER_TELEGRAM_USER_ID` com o identificador do proprietário
- `OWNER_AREA_PASSWORD` ou `OWNER_AREA_PASSWORD_SHA256` para a senha da área do proprietário

Depois de configurar os secrets, faça o deploy da function `bot-unificado`.

### Garantias de pagamento

- pagamentos Pix usam `X-Idempotency-Key` derivada do pedido;
- apenas o status `approved` pode liberar conteúdo;
- pagamentos apenas autorizados continuam pendentes até a captura;
- valor, moeda, captura e referência são conciliados no backend antes da entrega;
- divergências ficam em `payment_review`, sem liberar a série;
- webhook, consulta de status e entrega continuam idempotentes.

As rotas operacionais `telegram-webhook-info` e `telegram-webhook-repair` exigem o header `x-telegram-bot-api-secret-token` com o valor de `TELEGRAM_WEBHOOK_SECRET`.

## Bot + Mini App

Fluxo integrado atual:

1. o usuário entra no bot
2. o bot oferece `Catálogo`, `Mini App`, `Continuar` e `Recomendações`
3. o Mini App abre o catálogo e o checkout
4. séries com URL direta continuam no player interno
5. séries com mídia assistida são entregues pelo próprio bot no Telegram com proteção de conteúdo
6. o Mini App sincroniza progresso em `user_series_progress`
7. o bot usa esse histórico para `/continuar` e `/recomendar`

### Migração para player interno protegido

Para tentar migrar em lote as séries que hoje ainda dependem de `video_file_id`, use:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TELEGRAM_BOT_TOKEN=... node scripts/migrate-series-to-internal-player.mjs --json
```

O script:

- lê `series` e `episodes`
- tenta baixar a mídia original pelo identificador do Telegram
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

O mini app mostra o painel de gestão apenas para a conta configurada em `OWNER_TELEGRAM_USER_ID`.

O acesso exige duas validações no backend:

1. `initData` válido do Telegram WebApp
2. senha definida em `OWNER_AREA_PASSWORD` ou hash SHA-256 em `OWNER_AREA_PASSWORD_SHA256`

O cadastro também aceita metadados opcionais para descoberta: endereço amigável, título alternativo, resumo, tags, idioma, legenda, duração, ano, classificação, dublagem e destaque editorial. A migration correspondente é `supabase/migrations/20260711024417_add_series_discovery_metadata.sql`.

Por segurança, clientes não leem `public.series` diretamente. A Edge Function monta o catálogo público e remove identificadores, caminhos e URLs internas de vídeo antes de responder.

### Ciclo editorial e SEO

O CMS administrativo permite manter uma série como `Rascunho`, `Publicada`, `Oculta` ou `Arquivada`. Apenas itens publicados e ativos entram no catálogo público. A publicação é validada no backend e exige título, descrição, capa, vídeo e preço positivo quando a série for paga.

Também estão disponíveis:

- duplicação segura como rascunho, sem copiar o vídeo protegido;
- filtros por situação editorial;
- entrega por Telegram, web ou modo híbrido;
- título e descrição SEO;
- canonical, Open Graph, controle `noindex` e inclusão no sitemap;
- geração automática com prévias para Google, Telegram e WhatsApp;
- substituições editoriais opcionais sem duplicar a fonte de verdade;
- histórico de slugs para redirecionar endereços antigos;
- preço em centavos sincronizado com o campo legado `price`.

### Cupons e campanhas

A área da proprietária possui gestão visual de cupons. É possível criar, editar, ativar e encerrar campanhas, configurar desconto percentual ou fixo, compra mínima, período, limite total, limite por cliente e séries pagas elegíveis. As métricas exibem campanhas ativas, usos pagos e desconto concedido sem expor Telegram IDs de clientes.

Todas as ações exigem o mesmo `initData`, Telegram ID proprietário e senha validados no backend. O painel não acessa `public.coupons` diretamente.

As migrations correspondentes são `supabase/migrations/20260711175558_add_series_editorial_lifecycle.sql` e `supabase/migrations/20260711232037_add_series_access_type.sql`.

## Pagamentos

O checkout agora suporta três caminhos:

- `Pix` com QR Code, agora como opção padrão do checkout
- `Mercado Pago` com link de pagamento
- `Checkout no Telegram` com Telegram Stars e confirmação validada pelo backend

O mini app envia o carrinho para a Edge Function `bot-unificado`, que:

1. cria o pedido no Supabase
2. gera a preferência do Mercado Pago ou o Pix
3. devolve o link ou o QR Code para a interface
4. acompanha o status até a confirmação automática

O carrinho autenticado também é sincronizado em `shopping_carts`, permitindo retomar os itens em outra sessão do Telegram. Cupons são validados exclusivamente no backend: o servidor relê os itens e preços do catálogo, calcula subtotal, desconto e total, e reserva o uso de forma atômica antes de chamar o Mercado Pago. O navegador nunca decide o valor final.

As regras de cupons suportam desconto percentual ou fixo, período de validade, valor mínimo, limite global, limite por usuário e séries elegíveis. Resgates aprovados são confirmados pelo webhook; pagamentos rejeitados, cancelados, expirados ou com falha liberam a reserva.

Mesmo se o webhook atrasar, o mini app volta a consultar o pedido e sincroniza o status com o Mercado Pago antes de mostrar o resultado final.

Para o Pix, o fluxo pede e-mail do comprador, porque o Mercado Pago exige isso para gerar o pagamento.

As regras da integração ficam nas migrations `supabase/migrations/20260627224636_mercado_pago_checkout.sql`, `supabase/migrations/20260711235508_add_carts_and_coupons.sql` e `supabase/migrations/20260712162156_add_private_cart_policies.sql`.

### Recuperação de checkout

A recuperação é opcional e fica desativada para cada cliente até haver consentimento na área **Minha conta**. Um pedido só entra na rotina quando continua pendente, ficou sem atividade pelo intervalo configurado, ainda não expirou, não gerou acesso e o usuário já iniciou o bot.

A migration `supabase/migrations/20260715145142_add_checkout_recovery.sql` cria:

- preferências e auditoria de consentimento;
- fila idempotente com uma tentativa por pedido;
- limite entre mensagens do mesmo usuário;
- eventos `checkout_abandoned` e `checkout_recovered`;
- agendamento a cada 15 minutos com `pg_cron` e `pg_net`.

O segredo do agendamento não fica no código. Ele é gerado pela migration, salvo no Supabase Vault e comparado por hash pela Edge Function. Os ajustes operacionais ficam em `CHECKOUT_RECOVERY_DELAY_MINUTES`, `CHECKOUT_RECOVERY_MAX_AGE_HOURS`, `CHECKOUT_RECOVERY_USER_COOLDOWN_HOURS` e `CHECKOUT_RECOVERY_BATCH_SIZE`.

O botão **Continuar compra** abre o pedido no Mini App autenticado. A rotina não aprova pagamentos, não concede acesso e não substitui a confirmação por webhook.

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
