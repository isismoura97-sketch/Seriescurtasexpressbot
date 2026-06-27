# Plano de migração de playback

Resumo atual do catálogo:

- Séries com URL direta: 0
- Séries que dependem do Telegram: 6
- Séries sem mídia identificada: 13

## Prioridade 1: títulos que já dependem do Telegram

Esses títulos já têm caminho de reprodução, mas hoje exigem abertura no bot.

| Título | Categoria | Ação recomendada |
| --- | --- | --- |
| Um Negócio com Meu Doador Bilionário | Romance/ Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Marido "Pobre" Era Bilionário | romance | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| O Quaterback Perdido Retorna | Romance | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Noiva de 90 dias da Máfia | sem categoria | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| O Segredo Sujo De Meu Meio- Irmão | sem categoria | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Para Sempre Ao Seu Lado (Dublado E Legendado Pt-Br) | sem categoria | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |

## Prioridade 2: títulos sem mídia identificada

Esses itens precisam de uma origem de vídeo antes de reproduzir no app.

| Título | Categoria | Ação recomendada |
| --- | --- | --- |
| A Prometida do Príncipe Vampiro (Legendado PT-BR) | Romance / Sobrenatural | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Noiva Virgem do Alfa (Dublado) | Romance/Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Meu Amor Secreto É O Seu Irmão (Legendado PT- BR) | Romance / Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Domando meu Bullies (DUBLADO PT-BR) | Romance / Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Encontrei Um Marido Bilionário E Sem Teto Para O Natal | Romance / Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Coroa Na Poeira- A Ira Imperial (LEGENDADO PT-BR) | Drama / Épico | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Meu Crush Acha Que Eu Sou Seu Mano (Legendado Pt-Br) | Romance / Comédia | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Beijada por Garras e Presas (Dublado PT-BR) | Romance / Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Reinvindicada pelo Irmão Alfa do Meu Ex (Legendado PT-BR) | Romance / Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Goleada Pelo Rival Do Meu Irmão (Dublado) | Romance / Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Sem Escapatória do Abraço do Rei Mafioso | Romance / Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Beijando O Irmão Errado (Dublado e Legendado Pt-Br) | Romance / Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |
| Mimada ao Extremo | Romance / Drama | Localizar o arquivo original e preencher `video_url` ou `video_file_id` |

## Ordem prática sugerida

1. Escolher os 3 primeiros títulos da lista `missing` e localizar o arquivo original.
2. Decidir, para cada um, se a reprodução ficará em URL direta ou via Telegram.
3. Reexecutar `node scripts/playback-audit.mjs --json` depois de atualizar o catálogo.

## Observação

Se o objetivo for reduzir a dependência do Telegram, o melhor ganho vem de preencher `video_url` em vez de `video_file_id`, porque o player do navegador consegue tocar URLs diretas sem precisar abrir o bot.
