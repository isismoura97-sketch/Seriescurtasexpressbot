# Changelog

## 2026-07-12 - Revisão de estabilidade e segurança

- corrigida a liberação indevida de pagamentos apenas autorizados e ainda não capturados;
- adicionada conciliação de valor, moeda, captura e referência antes da entrega;
- adicionada idempotência obrigatória na criação do Pix;
- protegidas as rotas operacionais de consulta e reparo do webhook do Telegram;
- corrigido polling infinito e checkout travado em pagamentos rejeitados ou sob revisão;
- corrigida a ordem de exclusão para não apagar mídia antes da confirmação no banco;
- removidos handlers JavaScript inline e endurecida a CSP;
- adicionados testes Deno de conciliação e cobertura de cupom direcionado a série paga;
- adicionados índices para chaves estrangeiras apontadas pelo advisor do Supabase.

Todas as alteracoes relevantes deste projeto sao registradas neste arquivo.

## Em desenvolvimento

### Adicionado

- Carrinho persistente por Telegram ID, sincronizado pelo backend.
- Cupons percentuais ou fixos com validade, elegibilidade e limites de uso.
- Reserva atômica de cupom vinculada ao pedido e ao ciclo real do pagamento.
- Subtotal, desconto e cupom registrados no histórico de pedidos.
- Gestão visual de cupons no painel da proprietária, com criação, edição, ativação e encerramento.
- Métricas agregadas de campanhas sem exposição de dados dos clientes.

- Área da cliente com visão geral, biblioteca, compras e histórico.
- Endpoint privado consolidado para dados da conta autenticada pelo Telegram.
- Navegação responsiva da conta e fallback seguro fora do Telegram.
- Biblioteca formada somente por acessos aprovados no backend.

- Ciclo editorial no CMS com rascunho, publicação, ocultação e arquivamento.
- Ações administrativas protegidas para duplicar e alterar a situação de séries.
- SEO administrável por série, com canonical, Open Graph e `noindex`.
- Histórico e resolução pública de slugs alterados.
- Forma de entrega editorial por Telegram, web ou modo híbrido.
- Sincronização segura entre `price` e `price_cents`.

- Auditoria de arquitetura e plano incremental para operacao web e Telegram.
- Contexto hibrido para navegador comum e Telegram Mini App.
- Rotas publicas para series, categorias, busca, favoritos, ajuda, termos, privacidade e blog.
- Metadados dinamicos, Open Graph, Twitter Cards, Schema.org, robots e sitemap.
- HTML pre-renderizado por serie para indexadores e previews de compartilhamento.
- Recomendacoes deterministicas por genero, tags, idioma e tipo de acesso.
- Busca com debounce por titulo, sinopse, genero, tags, idioma e temas.
- Testes funcionais separados para o modo Telegram e o modo web.
- Campos editoriais opcionais para slug, titulo alternativo, resumo, tags, idioma, duracao, ano e classificacao.
- Eventos de analytics para busca, favoritos, abertura de serie gratuita e handoff ao Telegram.

### Corrigido

- Checkout e carrinho remoto agora removem séries que já possuem acesso aprovado, evitando compra duplicada.

- Série oculta podia continuar ativa quando `is_active` estivesse verdadeiro.
- Rascunhos não são mais anunciados automaticamente no canal.
- Validação de slug duplicado agora ocorre antes do upload de mídia.

- Condicao de corrida no smoke test ao aguardar a confirmacao simulada do pagamento.
- Bloqueio indevido do catalogo quando o app era aberto fora do Telegram.
- Caminhos relativos que quebravam CSS, JavaScript e imagens em rotas profundas.

### Alterado

- Checkout passou a aceitar somente itens e cupom do frontend; o total final é recalculado no servidor.
- Carrinho ganhou resumo de subtotal, desconto e total com layout responsivo.

- Header com busca e botao de acesso ao Telegram no navegador.
- Cards pagos usam "Ver detalhes" e deixam o preco para a pagina de decisao.
- Hero usa CTAs objetivos e metadados reais da serie.
- Secao generica "Em Alta" foi renomeada para evitar alegacoes sem dados.
- Rodape passou a usar ano automatico e links institucionais reais.
- Grade de cards e tipografia foram ajustadas para melhorar leitura e responsividade.

### Seguranca

- Tabelas de carrinho e resgate de cupons permanecem privadas, com RLS, políticas de negação e privilégios públicos revogados.
- Função de reserva de cupom pode ser executada apenas por `service_role` e usa bloqueio transacional contra excesso de usos simultâneos.
- Ações administrativas de cupons exigem Telegram ID proprietário, `initData` válido e senha conferida no backend.

- Dados da cliente são filtrados pelo Telegram ID extraído do `initData` validado.
- A área da cliente não retorna File_ID, URL protegida ou detalhes internos do Mercado Pago.
- A entrega pela biblioteca reaproveita a validação server-side de acesso.

- Publicação exige validação server-side de título, descrição, capa, vídeo e preço.
- Ações editoriais exigem `initData`, conta proprietária e senha validados no backend.
- Tabela de redirecionamentos permanece privada com RLS e privilégios públicos revogados.

- O catalogo publico nao retorna File_ID, caminhos de Storage ou URLs permanentes de video.
- A leitura direta de `public.series` pela Data API foi removida; o catalogo passa pela Edge Function sanitizada.
- Politica RLS redundante da tabela `series` foi removida e os advisors ficaram sem alertas.

### Preservado

- Validacao de compra no backend.
- Entrega protegida pelo bot.
- Player, favoritos, progresso, pagamentos e area da proprietaria.
