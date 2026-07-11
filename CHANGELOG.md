# Changelog

Todas as alteracoes relevantes deste projeto sao registradas neste arquivo.

## Em desenvolvimento

### Adicionado

- Auditoria de arquitetura e plano incremental para operacao web e Telegram.
- Contexto hibrido para navegador comum e Telegram Mini App.
- Rotas publicas para series, categorias, busca, favoritos, ajuda, termos, privacidade e blog.
- Metadados dinamicos, Open Graph, Twitter Cards, Schema.org, robots e sitemap.
- Recomendacoes deterministicas por genero, tags, idioma e tipo de acesso.
- Busca com debounce por titulo, sinopse, genero, tags, idioma e temas.
- Testes funcionais separados para o modo Telegram e o modo web.
- Campos editoriais opcionais para slug, titulo alternativo, resumo, tags, idioma, duracao, ano e classificacao.
- Eventos de analytics para busca, favoritos, abertura de serie gratuita e handoff ao Telegram.

### Corrigido

- Condicao de corrida no smoke test ao aguardar a confirmacao simulada do pagamento.
- Bloqueio indevido do catalogo quando o app era aberto fora do Telegram.
- Caminhos relativos que quebravam CSS, JavaScript e imagens em rotas profundas.

### Alterado

- Header com busca e botao de acesso ao Telegram no navegador.
- Cards pagos usam "Ver detalhes" e deixam o preco para a pagina de decisao.
- Hero usa CTAs objetivos e metadados reais da serie.
- Secao generica "Em Alta" foi renomeada para evitar alegacoes sem dados.
- Rodape passou a usar ano automatico e links institucionais reais.
- Grade de cards e tipografia foram ajustadas para melhorar leitura e responsividade.

### Seguranca

- O catalogo publico nao retorna File_ID, caminhos de Storage ou URLs permanentes de video.
- A leitura direta de `public.series` pela Data API foi removida; o catalogo passa pela Edge Function sanitizada.
- Politica RLS redundante da tabela `series` foi removida e os advisors ficaram sem alertas.

### Preservado

- Validacao de compra no backend.
- Entrega protegida pelo bot.
- Player, favoritos, progresso, pagamentos e area da proprietaria.
