# Auditoria de arquitetura

## Visao geral

O Series Curtas Express e uma aplicacao estatica hospedada na Vercel. A interface usa HTML, CSS e JavaScript sem framework e consome uma Supabase Edge Function escrita em TypeScript para Deno.

## Arquitetura atual

- Frontend: `series-app/index.html`, `series-app/styles.css` e `series-app/app.js`.
- Hospedagem: Vercel com fallback de SPA definido em `series-app/vercel.json`.
- Backend: `supabase/functions/bot-unificado/index.ts`.
- Banco: PostgreSQL do Supabase acessado somente pelo backend com REST.
- Storage: buckets de capas, trailers e videos. O bucket de videos e privado.
- Identidade: Telegram WebApp `initData`, validado no backend para operacoes privadas.
- Pagamento: Mercado Pago, Pix e checkout iniciado pelo Telegram.
- Entrega: bot do Telegram com `protect_content=true` e controle de itens ja entregues.
- Estado do usuario: favoritos e progresso no Supabase para usuarios Telegram; `localStorage` como fallback local.
- Testes: verificacao de sintaxe, type-check Deno, smoke test Playwright e auditoria de playback no GitHub Actions.

## Pontos fortes

- Stack simples, barata e compativel com Vercel.
- Autorizacao de compra e midia feita no backend.
- URLs de video protegidas e temporarias.
- Fluxo de entrega idempotente, com fila operacional e reprocessamento seguro.
- Catalogo e area da proprietaria usam a mesma fonte de dados.
- CI cobre os fluxos mais sensiveis do Mini App.

## Dividas tecnicas

- A aplicacao bloqueia todo o catalogo quando nao existe usuario Telegram.
- Nao ha modelo unico para contexto Telegram/navegador.
- URLs publicas ainda nao representam busca, categoria e serie.
- Metadados SEO sao estaticos e nao acompanham a serie aberta.
- A busca considera apenas parte dos dados disponiveis.
- A Edge Function concentra Telegram, pagamento, catalogo, administracao e moderacao.
- Parte dos campos editoriais desejados ainda nao existe no banco.

## Riscos e limites

- Compras, entregas, progresso remoto e area da proprietaria devem continuar exigindo `initData` valido.
- Conteudo pago nunca pode ser liberado por estado local ou parametro de URL.
- Rotas amigaveis precisam usar caminhos absolutos para CSS, JavaScript e imagens.
- Selos como "Em alta" ou "Mais assistida" so podem aparecer com dados objetivos.
- SEO dinamico no cliente melhora compartilhamento e navegacao, mas HTML pre-renderizado sera uma evolucao posterior para indexacao ideal.

## Estrategia incremental

1. Estabilizar, documentar e preservar os testes atuais.
2. Criar uma camada de contexto para Telegram e navegador comum.
3. Permitir catalogo publico sem conceder acesso privado.
4. Adicionar rotas amigaveis, busca e detalhes com History API.
5. Melhorar CTAs, responsividade e acessibilidade.
6. Adicionar metadados, dados estruturados, sitemap e robots.
7. Evoluir o modelo editorial e pre-renderizacao sem migracao destrutiva.

## Criterios de aceite

- O catalogo abre dentro e fora do Telegram.
- Operacoes privadas continuam bloqueadas sem `initData` valido.
- Rotas publicas recarregam sem perder CSS ou JavaScript.
- Series pagas exibem preco antes do checkout.
- Busca e filtros sao acessiveis e representados na URL.
- Testes existentes e novos testes hibridos passam.
# Sprint 2 - Administração e CMS

Implementado em 11/07/2026:

- ciclo editorial não destrutivo para séries;
- validação de publicação no backend;
- duplicação como rascunho sem replicar mídia protegida;
- SEO administrável e redirecionamento de slug;
- preço em centavos sincronizado com o modelo legado;
- filtros e ações editoriais no painel da proprietária;
- RLS e revogação de acesso público para a tabela de redirecionamentos.

Trade-off: a autenticação administrativa continua vinculada ao Telegram, evitando introduzir uma segunda pilha de autenticação web nesta etapa. Uma conta web independente deve ser avaliada apenas quando houver necessidade operacional comprovada.

# Sprint 3 - Área da cliente

Implementado em 11/07/2026:

- visão geral da conta;
- biblioteca de compras aprovadas;
- histórico de pedidos e pagamentos;
- histórico real de progresso;
- integração dos favoritos existentes;
- endpoint privado autenticado por `initData`;
- fallback para abertura no Telegram em navegadores comuns.

Trade-off: nesta etapa, a identidade da cliente continua sendo o Telegram ID validado. Não foi adicionada autenticação web separada, evitando custo, duplicação de contas e risco de divergência entre compras web e Telegram.
