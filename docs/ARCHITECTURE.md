# Arquitetura

## Visao geral

- `series-app/`: Mini App Telegram e aplicacao web publica estaticamente servida pela Vercel.
- `supabase/functions/bot-unificado/`: Edge Function que concentra bot, pagamentos, autorizacao, entrega e agentes Express IA.
- `supabase/migrations/`: mudancas aditivas e versionadas do banco.
- Supabase Database e Storage: catalogo, pedidos, favoritos, progresso, logs e arquivos protegidos.

## Limites

O frontend nunca libera compra ou conteudo pago sozinho. O backend valida Telegram, pedido, pagamento e autorizacao. File_ID, URLs assinadas, caminhos de storage e segredos nao sao expostos ao catalogo publico.

## Express IA

Os agentes sao roteados por nome, flag e limite. Cada agente recebe contexto restrito, possui fallback deterministico e gera logs operacionais. O agente de catalogo executa somente auditorias de leitura; nao aceita SQL, comandos, endpoints ou mutacoes.

## Catalogo LGBTQIA+

O banco guarda marcacao editorial explicita, categorias, tags, descricao interna e avisos. A camada publica remove a descricao interna e filtra somente registros ativos e publicados. A busca conversacional usa um filtro booleano seguro, sem inferencia sobre usuarios.

## Deploy e verificacao

Frontend: Vercel. Backend: Supabase Edge Functions. Antes do deploy, executar os checks de sintaxe, testes Deno, smoke test do Mini App, auditoria de autenticacao e `git diff --check`.
