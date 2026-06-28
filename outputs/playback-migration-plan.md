# Plano de migração de playback

## Resumo

- Séries com URL direta: 0
- Séries que dependem do Telegram: 19
- Séries sem mídia identificada: 0

## Prioridade 1: títulos que já dependem do Telegram

Esses títulos funcionam via abertura no bot e devem ser tratados primeiro se a meta for reduzir atrito no navegador.

| Título | Categoria | Ação recomendada |
| --- | --- | --- |
| Mimada ao Extremo | Romance / Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Noiva Virgem do Alfa (Dublado) | Romance/Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Goleada Pelo Rival Do Meu Irmão (Dublado) | Romance / Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Sem Escapatória do Abraço do Rei Mafioso | Romance / Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Beijando O Irmão Errado (Dublado e Legendado Pt-Br) | Romance / Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Meu Amor Secreto É O Seu Irmão (Legendado PT- BR) | Romance / Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Meu Crush Acha Que Eu Sou Seu Mano (Legendado Pt-Br) | Romance / Comédia | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Reinvindicada pelo Irmão Alfa do Meu Ex (Legendado PT-BR) | Romance / Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Domando meu Bullies (DUBLADO PT-BR) | Romance / Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Beijada por Garras e Presas (Dublado PT-BR) | Romance / Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Encontrei Um Marido Bilionário E Sem Teto Para O Natal | Romance / Drama | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| Coroa Na Poeira- A Ira Imperial (LEGENDADO PT-BR) | Drama / Épico | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
| A Prometida do Príncipe Vampiro (Legendado PT-BR) | Romance / Sobrenatural | Manter no Telegram ou migrar para URL direta quando houver arquivo fonte |
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

## Próximos passos sugeridos

1. Escolher os 3 primeiros títulos da lista `missing` e localizar o arquivo original.
2. Decidir, para cada um, se a reprodução ficará em URL direta ou via Telegram.
3. Reexecutar `node scripts/playback-audit.mjs --json` depois de atualizar o catálogo.
