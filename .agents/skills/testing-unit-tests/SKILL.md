---
name: testing-unit-tests
description: Test the Jest unit test suite and utility functions for the Séries Curtas Express Telegram Mini App. Use when verifying test infrastructure, utility function refactoring, or coverage changes.
---

# Testing the Unit Test Suite

## Overview
This repo is a Telegram Mini App (TMA) that requires the Telegram WebApp SDK context to run in a browser. Browser-based E2E testing is not possible without Telegram authentication. Testing is shell-based via Jest.

## Running Tests

```bash
cd series-app/.. # repo root (contains package.json)
npm test         # runs jest --coverage
```

Expected output: All tests pass with coverage report showing ≥85% statements, ≥90% lines.

## Key Testing Considerations

### Telegram Mini App Constraints
- The app requires `window.Telegram.WebApp` to initialize
- `sanitizeUserId` only accepts numeric IDs matching `/^\d{1,20}$/`
- Test setup must use a numeric user ID (e.g., `'12345678'`), NOT alphanumeric strings
- Without a valid userId, the app shows "Acesso Negado" and returns early from init

### Vercel Preview Deploy
- Preview deploys exist but show "Acesso Negado" without Telegram context
- The preview URL pattern: `seriescurtasexpressbot-git-<branch>-isismoura97-sketchs-projects.vercel.app`
- Useful only for checking that static assets load; not for functional testing

### Test Architecture
- `series-app/__tests__/utils.test.js` — pure function tests (no DOM needed)
- `series-app/__tests__/app.test.js` — DOM integration tests using jsdom
- `series-app/utils.js` — extracted utilities with conditional CommonJS exports
- `series-app/app.js` — main app, uses utils as globals (browser script-tag pattern)

### How Tests Load the App
1. `beforeEach` builds a minimal DOM matching `index.html` structure
2. Utils are loaded into `global` scope via `require('../utils')`
3. `loadApp()` uses `jest.isolateModules` to get fresh app state per test
4. Mock `window.Telegram` with numeric user ID
5. Mock `fetch` to control API responses

### Direct Utility Verification
Beyond running `npm test`, verify utilities directly for adversarial edge cases:

```bash
node -e "
const { isFreePrice, formatPrice, canAddToCart, calculateCartTotal } = require('./series-app/utils');
// Verify isFreePrice handles NaN (the key consistency fix)
console.log(isFreePrice('abc'));  // should be true
console.log(isFreePrice(''));     // should be true
// Verify consistency: formatPrice('abc') === 'GRÁTIS' ↔ isFreePrice('abc') === true
console.log(formatPrice('abc') === 'GRÁTIS' && isFreePrice('abc') === true);
"
```

### Checking for Inline Duplicates
After refactoring app.js to use utilities, verify no old inline patterns remain:

```bash
grep -c 'Number(serie.price) === 0' series-app/app.js        # should be 0
grep -c 'cart.some(item => item.id === serie.id)' series-app/app.js  # should be 0
grep -c 'cart.reduce((sum, item)' series-app/app.js           # should be 0
```

## Common Issues
- If tests fail with "Acesso Negado" in hero text: the mock Telegram user ID is not numeric
- If `getCoverUrl` tests are missing: it was moved from utils.js to app.js (with sanitizeUrl) in the security hardening PR
- If coverage drops significantly: check if new app.js functions were added without corresponding test coverage

## Devin Secrets Needed
None — this is a client-side app with mocked API calls. No real credentials required for testing.
