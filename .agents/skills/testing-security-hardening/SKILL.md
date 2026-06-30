---
name: testing-seriescurtasexpress-security
description: Test security hardening changes for the Séries Curtas Express Telegram Mini App. Use when verifying XSS fixes, CSP, SRI, debug logging, or auth changes.
---

# Testing Security Hardening — Séries Curtas Express

## Overview

This app is a **Telegram Mini App** frontend deployed on Vercel. It requires Telegram WebApp context (`window.Telegram.WebApp`) to function. Without it, the app blocks access with "Acesso Negado".

## Key Constraint: Telegram-Only Access

The app validates `tg.initDataUnsafe.user.id` via `sanitizeUserId()`. Outside Telegram, `userId` is `null` and `init()` returns early — no API calls, no catalog, no player. This is **by design** and is itself a security feature to test.

**Workaround options if full-flow testing is needed:**
- Use Telegram's BotFather test environment (requires bot token access)
- Temporarily set `const DEBUG_USER_ID = '12345'` in app.js for local testing only (never commit)
- Test via Telegram on a mobile device by opening the bot's Mini App

## Test Procedure (Browser-Based, Non-Telegram)

### 1. Access Blocking
- Navigate to the production Vercel URL
- Verify hero shows "Acesso Negado" and "Abra este app pelo Telegram."
- Verify catalog grid is empty (no series cards)
- Open Network tab > Fetch/XHR filter: confirm zero API calls to Supabase

### 2. Debug Logging
- Open DevTools Console before/during page load
- Verify zero `app.js` output — only Telegram SDK messages (`[Telegram.WebView] > postEvent` from `telegram-web-app.js`) should appear
- Check that `const DEBUG = false` is set in app.js source

### 3. CSP Meta Tag
- In Console, run: `document.querySelector('meta[http-equiv="Content-Security-Policy"]').content`
- Verify `connect-src` does NOT contain bare `http:`
- Verify `img-src` and `media-src` do NOT contain `*` or bare `http:`
- All should be restricted to `'self'` + known Supabase origins

### 4. SRI Integrity
- In Console, run: `document.querySelector('link[href*="fontawesome"]').outerHTML`
- Verify `integrity="sha384-..."` attribute is present
- Verify `crossorigin="anonymous"` attribute is present
- Visually confirm Font Awesome icons render (moon/cart icons in header)

### 5. innerHTML Safety Audit
- In Console, run:
  ```js
  fetch('app.js').then(r=>r.text()).then(t=>{
    const lines=t.split('\n');
    lines.forEach((l,i)=>{
      if(/\.innerHTML\s*[+=]/.test(l))
        console.log(`Line ${i+1}: ${l.trim()}`)
    })
  })
  ```
- Verify all remaining innerHTML usages are safe: clearing (`= ''`), static strings (icons), or `escapeHtml()`
- No API-controlled data (`serie.title`, `cover_url`, storage paths) should be set via innerHTML

## Vercel Deployment

- Production URL pattern: `https://seriescurtasexpressbot.vercel.app`
- Preview URLs might require Vercel SSO authentication — use the production URL for testing merged changes
- CI checks: Vercel Preview Comments + Vercel deployment (no custom test suite)

## Devin Secrets Needed

None required for browser-based security testing. If full-flow testing inside Telegram is needed, the bot token would be required (not currently stored).
