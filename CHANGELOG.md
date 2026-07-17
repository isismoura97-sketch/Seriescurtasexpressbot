# Changelog

## 2026-07-17 - Indicações com atribuição real

- A área da cliente ganhou `/indicacoes` com código individual, link compartilhável e contadores de indicações pendentes, confirmadas e revertidas.
- Links do bot usam `start=ref_CODIGO`; links web preservam a indicação até existir uma identidade Telegram validada.
- Autoindicação, código inválido, troca de indicador e atribuição depois da primeira compra aprovada são bloqueados no backend.
- A conversão acontece no banco somente quando `payment_orders.status` muda para `approved`; reembolso ou chargeback revertem a conversão.
- A tabela legada `referrals` foi reaproveitada sem apagar histórico, com nova tabela privada de códigos, RLS, privilégios mínimos e índices.
- Nenhum crédito ou recompensa financeira é criado nesta etapa. A interface informa isso claramente para não prometer benefício inexistente.
- Deep links de séries foram corrigidos de `serie_` para `play_`, alinhando o Mini App ao comando que o bot realmente processa.
- Testes cobrem formato do código, página da cliente, contadores, compartilhamento e regressão completa de pagamento e entrega.

## 2026-07-17 - Portabilidade e exclusão segura da conta

- A área da cliente ganhou uma página de configurações para exportar os próprios dados em JSON.
- A exportação reúne conta, vínculo Telegram, consentimentos, biblioteca, compras, favoritos, histórico, preferências e carrinho sem expor senhas, mídia protegida, URLs de vídeo ou `file_id`.
- A exclusão da conta web exige sessão ativa, confirmação textual exata e nova validação da senha atual no Supabase Auth.
- Após a confirmação, autenticação, consentimentos e vínculo web são removidos e os cookies de sessão são apagados.
- Pedidos, comprovantes, acessos e registros de entrega associados ao Telegram permanecem preservados para suporte, obrigações financeiras e continuidade das compras.
- Novos testes cobrem sanitização da exportação, proxies autenticados e limpeza dos cookies somente após exclusão bem-sucedida.
- Os endpoints de conta compartilham uma única função dinâmica com lista explícita de rotas, mantendo o projeto dentro do limite do plano Hobby da Vercel.
- A rota dinâmica é resolvida antes do fallback público, evitando que chamadas `POST /api/account/*` sejam tratadas como `index.html`.

## 2026-07-17 - Carrinho e preferências sincronizados

- Contas web confirmadas e vinculadas passaram a sincronizar favoritos, carrinho, cupons e preferências com o mesmo Telegram ID usado nas compras.
- O carrinho pode ser preparado no navegador, mas pagamento e liberação continuam obrigatoriamente no fluxo autenticado do Telegram.
- O bot reconhece o deep link `start=cart` e abre o Mini App diretamente com os itens persistidos.
- Usuários sem conta vinculada permanecem no fluxo público anterior, sem bloqueio do catálogo nem alteração da entrega.
- Novos testes cobrem proxy autenticado, ausência de tokens nas respostas e handoff completo entre web e Telegram.

## 2026-07-16 - Conta web e vínculo seguro com Telegram

- Área da cliente passou a oferecer cadastro, confirmação de e-mail, login, recuperação e troca de senha também no navegador.
- Sessões web usam endpoints same-origin e cookies `HttpOnly`, `Secure` e `SameSite=Lax`, sem tokens no `localStorage` ou nas respostas JSON.
- Contas, consentimentos e vínculos Telegram foram separados em tabelas com RLS e privilégios mínimos.
- Vínculo exige conta ativa, e-mail confirmado, sessão Supabase válida e `initData` assinado pelo Telegram.
- Compras, acessos, favoritos, progresso, pagamento e entrega existentes continuam identificados pelo mesmo Telegram ID, sem migração destrutiva.
- Testes automatizados cobrem cookies, isolamento de origem, ausência de vazamento de tokens e regressões do Mini App.

## 2026-07-15 - SEO automatico orientado pelo catalogo

- Cadastro da serie passou a gerar slug, titulo, descricao, canonical, Open Graph, Twitter Card e Schema.org automaticamente.
- CMS ganhou indicacao de campos automaticos ou personalizados, previa para Google e compartilhamento social e restauracao segura dos valores automaticos.
- Inclusao no sitemap pode ser controlada separadamente do estado editorial e do `noindex`.
- Paginas estaticas e sitemap passaram a consumir o SEO resolvido pelo backend, mantendo o catalogo como fonte de verdade.
- Dados estruturados omitem informacoes inexistentes e so publicam oferta quando a serie e paga e possui preco real.
- Duas series publicadas que ainda nao tinham pagina estatica foram adicionadas ao conjunto indexavel.
- Canonical incorreto e titulo social herdado entre os dois cadastros mais recentes foram reparados sem alterar descricao, capa, preco ou entrega.
- Testes Deno e smoke funcional cobrem o novo fluxo sem alterar pagamento, acesso ou entrega.

## 2026-07-15 - Recuperação consentida de checkout

- Pedidos pendentes passam a ter janela de recuperação e expiração explícitas.
- Rotina agendada no Supabase detecta abandono após inatividade e processa no máximo uma tentativa por pedido.
- Envio exige início prévio do bot, consentimento ativo, checkout válido, ausência de acesso e intervalo por usuário.
- Segredo do agendamento é gerado no banco, armazenado no Vault e validado por hash.
- Área da cliente ganhou preferências de lembrete, canal, novidades e opt-out de marketing com trilha de auditoria.
- Retomadas pelo botão do bot registram `checkout_recovered` sem confundir polling normal com recuperação.
- Painel da proprietária passou a mostrar abandono e recuperação de checkout.

## 2026-07-15 - Analytics confiável do funil

- Eventos passaram a registrar identificador idempotente, origem e canal de venda.
- Transições terminais de pagamento e entrega não são mais duplicadas por replay de webhook.
- Abandono de carrinho passou a ser contado uma vez por versão do carrinho e deixa de ser ativo quando há compra posterior.
- Painel da proprietária ganhou taxas entre etapas, conversão por canal e desempenho real por série.
- Agregação do funil foi isolada em função testável e coberta por testes Deno.

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
# 2026-07-14 - Pagamentos por contexto e acessos normalizados

- Telegram Stars passou a ser o único método oferecido dentro do Telegram para bens digitais.
- O backend agora valida pre-checkout, pagamento confirmado e estorno do Telegram antes de alterar o acesso.
- Pedidos passaram a registrar canal, provedor, moeda e identificadores externos de forma unificada.
- Itens de pedido e acessos foram normalizados sem remover os campos legados.
- Checkouts pendentes equivalentes são reutilizados para evitar cobranças duplicadas.
- Reembolso e chargeback revogam o acesso; reprocessamento exige comprovante conciliado.
- O painel e a área da cliente recebem metadados do provedor sem expor credenciais.
- A suíte funcional foi atualizada para simular faturas em Stars.
