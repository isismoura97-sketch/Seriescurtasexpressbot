# Design QA — plataforma Séries Curtas Express

date: 2026-08-30
reference: conceito visual Neon Observatory (opção 1), com os dados reais do catálogo preservados
scope: refresh visual da plataforma inteira, sem alteração de banners, séries, preços, acesso ou integrações

## Verificação

- A página inicial renderiza somente dois grupos: `Séries Gratuitas` e `Séries Pagas`.
- A antiga faixa automática `Séries LGBTQIA+` não é mais criada pelo renderer.
- Os títulos pagos permanecem juntos no grupo `Séries Pagas`.
- Os filtros de gênero/tema permanecem disponíveis: Todas, Favoritas, Romance, Suspense, Drama, LGBTQIA+, Dubladas e Legendadas.
- O filtro `Romance` foi testado no navegador local e manteve os dois grupos, com os resultados filtrados dentro de cada tipo de acesso.
- A marca visível foi atualizada para `Séries Curtas Express`; `ShortNovelsBot` foi preservado apenas como identificador técnico do bot.
- A página mantém os banners e os dados reais carregados pelo backend: 6 séries gratuitas e 19 séries pagas na verificação inicial.
- A tela principal foi verificada em desktop e em viewport móvel de 390px sem overflow horizontal.
- Não foram observados erros ou warnings no console durante a navegação e o teste do filtro.
- A área do proprietário ganhou o bloco `Estatísticas do Mini App`, com uso total, usuários e sessões, cliques totais, séries exploradas, carrinhos, compras e entregas.
- O detalhamento por série usa os eventos reais e itens de pedidos protegidos pelo backend; a função `bot-unificado` foi publicada sem abrir o `app_events` ao cliente.
- A versão de produção foi verificada com os assets `20260830-04`, marca correta e os dois grupos do catálogo preservados.

final result: passed
