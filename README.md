# Seriescurtasexpressbot

Aplicação web estática para o catálogo "Séries Curtas Express", com integração ao Telegram WebApp e consumo de uma função Supabase para catálogo e streaming.

## Estrutura

- `series-app/index.html` - estrutura principal da interface
- `series-app/app.js` - lógica de catálogo, player, carrinho e integração com Telegram
- `series-app/styles.css` - estilos visuais
- `series-app/vercel.json` - configuração de SPA para Vercel

## Execução local

1. Abra a pasta `series-app`.
2. Sirva os arquivos estáticos com qualquer servidor local.
3. Abra a página dentro do Telegram WebApp para liberar o acesso completo.

Exemplo com Python:

```bash
cd series-app
python -m http.server 8000
```

## Observações

- O app depende de `window.Telegram.WebApp` para identificar o usuário.
- O catálogo é carregado do backend em Supabase.
- Fora do Telegram, o app exibe "Acesso Negado" por design.
