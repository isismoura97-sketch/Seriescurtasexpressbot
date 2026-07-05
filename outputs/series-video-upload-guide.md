# Guia de upload dos videos

Use preferencialmente o nome do arquivo pelo `ID da serie`.

Formato recomendado:

```text
id-da-serie.mp4
```

Exemplo:

```text
798c4fff-a244-4a46-aed1-eef02e25c76c.mp4
```

## Series gratuitas

| # | Titulo | Preco | Nome do arquivo recomendado |
|---|---|---:|---|
| 1 | Marido "Pobre" Era Bilionario | R$ 0,00 | `814e3fba-38ce-47d5-b554-9e6b26c6eb58.mp4` |
| 2 | O Quaterback Perdido Retorna | R$ 0,00 | `e9ea003f-36fd-4fa7-bb3b-6a8cef7fee15.mp4` |
| 3 | Para Sempre Ao Seu Lado (Dublado E Legendado Pt-Br) | R$ 0,00 | `e991a1ab-9420-482f-9200-3fd6dc616ef6.mp4` |

## Series pagas

| # | Titulo | Preco | Nome do arquivo recomendado |
|---|---|---:|---|
| 1 | Mimada ao Extremo | R$ 5,90 | `180aa764-8fb4-4b8f-a543-cbef94dfa88c.mp4` |
| 2 | Noiva Virgem do Alfa (Dublado) | R$ 5,90 | `af4d0877-d149-43df-b44b-32e566cb8ea5.mp4` |
| 3 | Goleada Pelo Rival Do Meu Irmao (Dublado) | R$ 5,90 | `4588c665-b141-49c9-99a4-b78a6b5de149.mp4` |
| 4 | Sem Escapatoria do Abraco do Rei Mafioso | R$ 5,90 | `68df3824-dc2c-41f4-8772-73a8b7b831e0.mp4` |
| 5 | Beijando O Irmao Errado (Dublado e Legendado Pt-Br) | R$ 5,90 | `a78c0773-fc23-41c2-bb96-c2015196e475.mp4` |
| 6 | Meu Amor Secreto E O Seu Irmao (Legendado PT- BR) | R$ 5,90 | `45cbfa16-24f0-4dfd-9c62-f49642035c8e.mp4` |
| 7 | Meu Crush Acha Que Eu Sou Seu Mano (Legendado Pt-Br) | R$ 5,90 | `59d141b7-ee24-4ca3-962b-f0107102e97d.mp4` |
| 8 | Reinvindicada pelo Irmao Alfa do Meu Ex (Legendado PT-BR) | R$ 5,90 | `c4692345-7f38-4c6f-b704-04cf8e08271d.mp4` |
| 9 | Domando meu Bullies (DUBLADO PT-BR) | R$ 5,90 | `ae43cd54-6628-4863-baef-a3ed16d49644.mp4` |
| 10 | Beijada por Garras e Presas (Dublado PT-BR) | R$ 5,90 | `10acf812-c3f1-4d5e-bcda-a2f162f7f5e3.mp4` |
| 11 | Encontrei Um Marido Bilionario E Sem Teto Para O Natal | R$ 5,90 | `6f877e38-c34f-4874-96a2-8cb300e4e168.mp4` |
| 12 | Coroa Na Poeira- A Ira Imperial (LEGENDADO PT-BR) | R$ 5,90 | `2ecd6c2a-44b3-4fd2-a98e-f98f9ae56004.mp4` |
| 13 | A Prometida do Principe Vampiro (Legendado PT-BR) | R$ 5,90 | `57959b74-900a-4e5c-9f12-063f576147b1.mp4` |
| 14 | Um Negocio com Meu Doador Bilionario | R$ 5,90 | `798c4fff-a244-4a46-aed1-eef02e25c76c.mp4` |
| 15 | Noiva de 90 dias da Mafia | R$ 5,90 | `51e6de57-f10d-4064-b23f-6fcf41327cfe.mp4` |
| 16 | O Segredo Sujo De Meu Meio- Irmao | R$ 5,90 | `2f5efa10-ed3f-4328-865e-b4d488ffd0b9.mp4` |

## Se voce quiser usar o titulo no nome do arquivo

Tambem funciona, por exemplo:

```text
Um Negocio com Meu Doador Bilionario.mp4
```

Mas o nome por `ID` continua sendo o formato mais seguro.

## Proximo passo

Depois de colocar os videos numa pasta, usamos:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bulk-upload-series-videos-to-supabase.mjs --dir "C:\pasta\dos\videos" --apply
```
