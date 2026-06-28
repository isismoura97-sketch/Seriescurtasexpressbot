import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright nao encontrado. Rode em um ambiente com o pacote playwright disponivel.');
  process.exit(1);
}

const root = process.cwd();
const appDir = path.join(root, 'series-app');
const port = Number(process.env.MINIAPP_CHECK_PORT || 8137);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const fixtureSeries = [
  {
    id: 'direct-ok',
    title: 'Direto Funcional',
    description: 'Video direto de teste.',
    category: 'Drama',
    price: 0,
    cover_url: svgCover('Direto', '#1A2744'),
    video_url: 'https://example.com/direct-ok.mp4',
  },
  {
    id: 'direct-fallback',
    title: 'Direto com Fallback',
    description: 'Falha no video direto, mas tem Telegram.',
    category: 'Romance',
    price: 0,
    cover_url: svgCover('Fallback', '#281663'),
    video_url: 'https://example.com/broken.mp4',
    telegram_file_id: 'TG_FALLBACK',
  },
  {
    id: 'telegram-only',
    title: 'Somente Telegram',
    description: 'Arquivo grande via Telegram.',
    category: 'Suspense',
    price: 0,
    cover_url: '',
    telegram_file_id: 'TG_ONLY',
  },
  {
    id: 'episode-video',
    title: 'Video em Episodio',
    description: 'Serie com file_id vindo de episodes.',
    category: 'Drama',
    price: 0,
    cover_url: '',
    episode_file_id: 'TG_EPISODE',
    playable_episode_count: 1,
  },
  {
    id: 'missing-video',
    title: 'Sem Video',
    description: 'Sem midia cadastrada.',
    category: 'Drama',
    price: 0,
    cover_url: '',
  },
  {
    id: 'paid-series',
    title: 'Serie Paga',
    description: 'Compra de teste.',
    category: 'Romance',
    price: 19.9,
    cover_url: '',
    telegram_file_id: 'TG_PAID',
  },
];

let paidGranted = false;

function svgCover(label, color) {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="${encodeURIComponent(color)}"/><text x="50%" y="50%" fill="%23FFD700" text-anchor="middle">${encodeURIComponent(label)}</text></svg>`;
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith('/_vercel/') || url.pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    const requested = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
    const filePath = path.normalize(path.join(appDir, requested));

    if (!filePath.startsWith(appDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, buffer) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      res.writeHead(200, { 'content-type': mime[path.extname(filePath)] || 'application/octet-stream' });
      res.end(buffer);
    });
  });
}

function listen(server) {
  return new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
}

async function installRoutes(page) {
  await page.route('https://telegram.org/js/telegram-web-app.js', async (route) => {
    await route.fulfill({
      contentType: 'text/javascript',
      body: `
        window.Telegram = {
          WebApp: {
            initData: 'user=%7B%22id%22%3A1048601631%2C%22first_name%22%3A%22Teste%22%7D',
            initDataUnsafe: { user: { id: 1048601631, first_name: 'Teste' } },
            ready() {},
            expand() {},
            sendData(payload) { window.__sentData = payload; },
            openTelegramLink(url) { window.__openedTelegramLink = url; },
            openLink(url) { window.__openedLink = url; }
          }
        };
      `,
    });
  });

  await page.route('https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api**', async (route) => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');

    if (action === 'series') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixtureSeries) });
      return;
    }

    if (action === 'stream') {
      const serieId = url.searchParams.get('serie_id');
      if (serieId === 'direct-ok') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' }),
        });
        return;
      }

      if (serieId === 'direct-fallback') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ url: 'https://example.com/does-not-exist.mp4' }),
        });
        return;
      }

      if (serieId === 'telegram-only') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ type: 'telegram_file', file_id: 'TG_ONLY', reason: 'Abra no Telegram.' }),
        });
        return;
      }

      if (serieId === 'episode-video') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', type: 'telegram_proxy' }),
        });
        return;
      }

      if (serieId === 'paid-series') {
        if (!paidGranted) {
          await route.fulfill({
            status: 402,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Pagamento necessario para assistir esta serie.', code: 'payment_required' }),
          });
          return;
        }

        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', type: 'telegram_proxy' }),
        });
        return;
      }

      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Video indisponivel' }) });
      return;
    }

    if (action === 'checkout-create') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          order: {
            order_id: 'order-test',
            status: 'pending',
            payment_method: 'pix_qr',
            pix_qr_code: '000201TESTEPIX',
            pix_qr_code_base64: '',
            checkout_url: 'https://mp.test/checkout',
            items: [{ id: 'paid-series', title: 'Serie Paga', price: 19.9, quantity: 1 }],
          },
        }),
      });
      return;
    }

    if (action === 'payment-status') {
      paidGranted = true;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          order: {
            order_id: 'order-test',
            status: 'approved',
            payment_method: 'pix_qr',
            pix_qr_code: '000201TESTEPIX',
            amount: 19.9,
            items: [{ id: 'paid-series', title: 'Serie Paga', price: 19.9, quantity: 1 }],
          },
        }),
      });
      return;
    }

    if (action === 'owner-dashboard') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          catalog: {
            series_total: 6,
            playable_series: 5,
            missing_playback: 1,
            episodes_total: 1,
            playable_episodes: 1,
            series_with_episode_files: 1,
          },
          payments: {
            orders_total: 1,
            approved_amount: 19.9,
            status_counts: { approved: 1 },
            recent_orders: [{ order_id: 'order-te', status: 'approved', payment_method: 'pix_qr', amount: 19.9 }],
          },
        }),
      });
      return;
    }

    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'unknown action' }) });
  });
}

async function main() {
  const server = createServer();
  await listen(server);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    await installRoutes(page);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#catalogGrid .card', { timeout: 10000 });

    const initial = await page.evaluate(() => ({
      cards: document.querySelectorAll('#catalogGrid .card').length,
      telegramCards: document.querySelectorAll('.badge-telegram-landscape').length,
      missingCards: document.querySelectorAll('.badge-unavailable-landscape').length,
      pixActive: document.querySelector('[data-payment-method="pix_qr"]')?.classList.contains('active'),
      appJs: [...document.scripts].find((script) => new URL(script.src, location.href).pathname.endsWith('/app.js'))?.src || '',
    }));

    await page.locator('#catalogGrid .card[data-id="direct-ok"]').click();
    await page.waitForFunction(() => document.querySelector('#mainVideo')?.style.display === 'block', null, { timeout: 10000 });
    const directState = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      videoDisplay: document.querySelector('#mainVideo')?.style.display,
      playerError: document.querySelector('#playerError')?.classList.contains('active'),
    }));
    await page.evaluate(() => window.closePlayer());

    await page.locator('#catalogGrid .card[data-id="direct-fallback"]').click();
    await page.waitForSelector('#playerError.active', { timeout: 15000 });
    const fallbackBeforeClick = await page.evaluate(() => ({
      title: document.querySelector('#playerErrorTitle')?.textContent?.trim(),
      button: document.querySelector('#playerErrorAction')?.textContent?.trim(),
    }));
    await page.locator('#playerErrorAction').click();
    const fallbackAfterClick = await page.evaluate(() => ({
      sent: window.__sentData || '',
      opened: window.__openedTelegramLink || '',
    }));

    await page.locator('#catalogGrid .card[data-id="telegram-only"]').click();
    await page.waitForSelector('#playerError.active', { timeout: 10000 });
    const telegramPlayer = await page.evaluate(() => ({
      title: document.querySelector('#playerErrorTitle')?.textContent?.trim(),
      action: document.querySelector('#playerErrorAction')?.textContent?.trim(),
    }));
    await page.locator('#playerErrorAction').click();
    const telegramSent = await page.evaluate(() => window.__sentData || '');

    await page.locator('#catalogGrid .card[data-id="episode-video"]').click();
    await page.waitForFunction(() => document.querySelector('#mainVideo')?.style.display === 'block', null, { timeout: 10000 });
    const episodePlayer = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      videoDisplay: document.querySelector('#mainVideo')?.style.display,
      playerError: document.querySelector('#playerError')?.classList.contains('active'),
    }));
    await page.evaluate(() => window.closePlayer());

    await page.locator('#catalogGrid .card[data-id="missing-video"]').click();
    await page.waitForSelector('#modalOverlay.active', { timeout: 10000 });
    const missingModal = await page.evaluate(() => ({
      action: document.querySelector('#modalActions button')?.textContent?.trim(),
    }));
    await page.evaluate(() => window.closeModal());

    await page.locator('#catalogGrid .card[data-id="paid-series"]').click();
    await page.waitForSelector('#modalOverlay.active', { timeout: 10000 });
    const paidBeforePayment = await page.evaluate(() => ({
      modalActive: document.querySelector('#modalOverlay')?.classList.contains('active'),
      playerActive: document.querySelector('#playerOverlay')?.classList.contains('active'),
      modalAction: document.querySelector('#modalActions button')?.textContent?.trim(),
    }));
    await page.locator('#modalActions button').click();
    await page.locator('#cartBtn').click();
    await page.fill('#buyerEmailInput', 'teste@example.com');
    await page.locator('#checkoutBtn').click();
    await page.waitForFunction(() => document.querySelector('#paymentSummaryPanel')?.hidden === false, null, { timeout: 10000 });
    const checkoutState = await page.evaluate(() => ({
      summaryHidden: document.querySelector('#paymentSummaryPanel')?.hidden,
      summaryText: document.querySelector('#paymentSummaryPanel')?.textContent?.replace(/\s+/g, ' ').trim(),
    }));

    await page.evaluate(() => window.toggleCart(false));
    await page.locator('#catalogGrid .card[data-id="paid-series"]').click();
    await page.waitForFunction(() => document.querySelector('#playerOverlay')?.classList.contains('active') === true, null, { timeout: 10000 });
    const paidAfterPayment = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      videoDisplay: document.querySelector('#mainVideo')?.style.display,
      playerError: document.querySelector('#playerError')?.classList.contains('active'),
    }));
    await page.evaluate(() => window.closePlayer());

    await page.locator('#ownerBtn').click();
    await page.fill('#ownerPasswordInput', 'owner-test');
    await page.locator('#ownerLoginBtn').click();
    await page.waitForFunction(() => document.querySelector('#ownerDashboard')?.hidden === false, null, { timeout: 10000 });
    const ownerState = await page.evaluate(() => ({
      visible: document.querySelector('#ownerOverlay')?.classList.contains('active'),
      text: document.querySelector('#ownerDashboard')?.textContent?.replace(/\s+/g, ' ').trim(),
    }));

    const failures = [];
    if (initial.cards !== fixtureSeries.length) failures.push(`catalog cards: ${initial.cards}`);
    if (!initial.pixActive) failures.push('pix not active by default');
    if (!initial.appJs.includes('20260628-03')) failures.push('cache version not updated');
    if (!directState.overlay || directState.videoDisplay !== 'block' || directState.playerError) failures.push('direct player failed');
    if (fallbackBeforeClick.title !== 'Abra no Telegram') failures.push('fallback title failed');
    if (!fallbackAfterClick.sent.includes('TG_FALLBACK')) failures.push('fallback telegram send failed');
    if (!['Reprodução via Telegram', 'Abra no Telegram'].includes(telegramPlayer.title)) failures.push('telegram player fallback failed');
    if (!telegramSent.includes('TG_ONLY')) failures.push('telegram modal send failed');
    if (!episodePlayer.overlay || episodePlayer.videoDisplay !== 'block' || episodePlayer.playerError) failures.push('episode file player failed');
    const normalizedMissingAction = (missingModal.action || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!normalizedMissingAction.includes('VIDEO INDISPONIVEL')) failures.push('missing video state failed');
    if (!paidBeforePayment.modalActive || paidBeforePayment.playerActive || !paidBeforePayment.modalAction) failures.push('paid series pre-payment gating failed');
    if (checkoutState.summaryHidden === false && !checkoutState.summaryText.includes('000201TESTEPIX')) failures.push('pix checkout summary failed');
    if (!paidAfterPayment.overlay || paidAfterPayment.videoDisplay !== 'block' || paidAfterPayment.playerError) failures.push('paid series post-payment player failed');
    if (!ownerState.visible || !ownerState.text.includes('Series no catalogo') && !ownerState.text.includes('Séries no catálogo')) failures.push('owner area failed');
    if (errors.length) failures.push(`console errors: ${errors.join(' | ')}`);

    const result = {
      ok: failures.length === 0,
      failures,
      checks: {
        initial,
        directState,
        fallbackBeforeClick,
        fallbackAfterClick,
        telegramPlayer,
        telegramSent: Boolean(telegramSent),
        episodePlayer,
        missingModal,
        paidBeforePayment,
        checkoutState,
        paidAfterPayment,
        ownerState,
      },
    };

    console.log(JSON.stringify(result, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
