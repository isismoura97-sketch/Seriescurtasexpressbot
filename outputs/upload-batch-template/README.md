# Modelo da pasta de videos

Use uma pasta local com os videos originais e escolha um destes formatos de nome:

## Formato recomendado

- `id-da-serie.mp4`

Exemplos:

- `814e3fba-38ce-47d5-b554-9e6b26c6eb58.mp4`
- `798c4fff-a244-4a46-aed1-eef02e25c76c.mp4`

## Formato alternativo

- `titulo-da-serie.mp4`

Exemplos:

- `Marido "Pobre" Era Bilionário.mp4`
- `Um Negócio com Meu Doador Bilionário.mp4`

## Extensoes aceitas

- `.mp4`
- `.m4v`
- `.mov`
- `.mkv`
- `.webm`
- `.avi`

## Arquivos de apoio

Guia visual mais organizado:

- [series-video-upload-guide.md](C:/Users/isism/Documents/Codex/2026-06-26/use-github-linear-ou-meus-logs/outputs/series-video-upload-guide.md)

CSV bruto:

- [series-video-upload-template.csv](C:/Users/isism/Documents/Codex/2026-06-26/use-github-linear-ou-meus-logs/outputs/series-video-upload-template.csv)

## Como rodar o upload em lote

Dry run:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bulk-upload-series-videos-to-supabase.mjs --dir "C:\pasta\dos\videos"
```

Aplicando de verdade:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bulk-upload-series-videos-to-supabase.mjs --dir "C:\pasta\dos\videos" --apply
```
