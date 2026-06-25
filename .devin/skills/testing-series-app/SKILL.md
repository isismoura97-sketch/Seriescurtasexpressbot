---
name: testing-series-curtas-express
description: Test the Séries Curtas Express Telegram Mini App end-to-end. Use when verifying UI, error handling, or API integration changes.
---

# Testing Séries Curtas Express

## Architecture Overview

- **Frontend-only** app: plain HTML/JS/CSS in `series-app/` directory
- **No build process** — serve directly with any static file server
- **Telegram Mini App** — requires Telegram SDK context for full functionality
- **Backend**: Supabase Edge Functions at `https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado`
- **Deployment**: Vercel (auto-deploys from main, preview deploys on PRs)

## Environment Setup

```bash
cd series-app
python3 -m http.server 8080
# App available at http://localhost:8080
```

## Key Constraint: Telegram Context

The app requires `window.Telegram.WebApp` context to function fully:
- `sanitizeUserId()` validates that `tg?.initDataUnsafe?.user?.id` is a 1-20 digit string
- If `userId` is null, the app shows "Acesso Negado" and returns early from `init()`
- `setupEventListeners()` does NOT run without valid userId
- However, all JS is still loaded and window-exported functions are callable

### What's Accessible Without Telegram Context

- `window.checkout()` — tests checkout error handling
- `window.toggleCart(open)` — opens/closes cart drawer
- `window.openModal(serie)` — opens series detail modal
- `window.closeModal()` — closes modal
- `window.searchSeries(query)` — filters series
- `openPlayer(serieId, title)` — opens video player (accessible from console scope)
- `toggleTheme()` — toggles light/dark theme (accessible from console scope)
- `updateCartUI()` — updates cart badge/drawer (accessible from console scope)
- `cart` variable — directly manipulable from console

### What Requires Telegram Context

- Full catalog loading (needs valid userId for API requests)
- Series purchase flow end-to-end
- `tg.sendData()` for checkout completion
- `tg.close()` after successful purchase

## Testing Error Handling Paths

### Checkout Without Telegram (Critical Path)
```js
// Add item to cart
cart.push({id: 'test-1', title: 'Série Teste', price: 19.90});
updateCartUI();
// Call checkout — should show error toast, NOT clear cart
window.checkout();
// Verify: cart.length should still be 1
```

### Corrupted localStorage Recovery
```js
localStorage.setItem('cart_series', '{broken json!!');
// Reload page, check console for: [CART] Falha ao restaurar carrinho do localStorage:
```

### Player Fetch Error
```js
openPlayer('fake-series-id', 'Test Title');
// Should show player error UI with "Erro ao reproduzir o vídeo" + retry button
```

### Empty Cart Guard
```js
cart = []; updateCartUI();
window.checkout();
// Should show toast: "Carrinho vazio!"
```

### Intercepting Toasts for Verification
Toasts auto-dismiss quickly. To verify toast content:
```js
const origToast = showToast;
let lastMsg = null;
showToast = function(msg, type) { lastMsg = msg; console.log('[TEST]', msg, type); return origToast(msg, type); };
// ... trigger action ...
console.log('Toast was:', lastMsg);
```

## Vercel Preview Access

Vercel previews might require Vercel team authentication. If blocked:
1. Try accessing the preview URL directly (sometimes public)
2. If auth wall appears, fall back to local serving (`python3 -m http.server`)
3. The code is identical — local testing is equally valid for JS behavior

## Console Log Prefixes

All error handling uses module-prefixed console messages:
- `[CART]` — cart localStorage operations
- `[THEME]` — theme localStorage operations  
- `[PLAYER]` — video player operations
- `[CHECKOUT]` — checkout/purchase operations
- `[MODAL]` — modal display operations

## Devin Secrets Needed

No secrets are required for testing error handling paths. The app's API calls to Supabase use public endpoints that return 404 for invalid series IDs (useful for testing error paths).

For full end-to-end testing with real data, you would need Telegram Bot context (not currently available outside Telegram client).
