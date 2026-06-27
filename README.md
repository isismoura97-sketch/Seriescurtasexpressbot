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
- `SERIES_TABLE` se o nome da tabela não for `series`
- `SERIES_ID_COLUMN` se o identificador não for `id`
- `SERIES_TITLE_COLUMN` se o título não estiver em `title`
- `SERIES_VIDEO_URL_COLUMNS` com uma lista separada por vírgulas para URLs diretas
- `SERIES_VIDEO_FILE_ID_COLUMNS` com uma lista separada por vírgulas para IDs do Telegram

Depois de configurar os secrets, faça o deploy da function `bot-unificado`.

## Verificação anti-bot no canal

Para usar o CAPTCHA de entrada, o canal precisa aceitar inscrições por convite com aprovação de entrada. Em canal público, qualquer pessoa pode entrar por link direto e o CAPTCHA não consegue bloquear antes da entrada.

Passos recomendados:

1. Configure o canal como privado ou use links de convite com `creates_join_request=true`.
2. Aponte o webhook do bot para a function:

```bash
https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api?action=telegram-webhook
```

3. Defina os secrets opcionais:

- `TELEGRAM_WEBHOOK_SECRET` para validar o webhook do Telegram
- `TELEGRAM_CAPTCHA_SECRET` para assinar o desafio
- `CAPTCHA_WEBAPP_URL` para a Mini App de verificação

4. Use a página de verificação hospedada em:

```bash
https://seriescurtasexpressbot.vercel.app/verify.html
```

Quando um usuário solicitar entrada, o bot abre a verificação humana e só aprova após a resposta correta.

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
