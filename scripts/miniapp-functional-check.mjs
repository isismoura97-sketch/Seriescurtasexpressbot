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
    id: 'storage-direct',
    title: 'Storage Assinado',
    description: 'Video enviado pelo painel do proprietario.',
    category: 'Drama',
    price: 0,
    cover_url: svgCover('Storage', '#113322'),
    video_storage_path: 'storage-direct/video.mp4',
    has_video_url: true,
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
    video_file_id: 'TG_PAID',
  },
  {
    id: '814e3fba-38ce-47d5-b554-9e6b26c6eb58',
    title: 'Marido "Pobre" Era Bilionário',
    description: 'Capa com fallback local.',
    category: 'Romance',
    price: 0,
    cover_url: 'https://uyyeascxvnrkjtlygdoe.supabase.co',
    video_file_id: 'TG_MARIDO',
  },
  {
    id: 'e9ea003f-36fd-4fa7-bb3b-6a8cef7fee15',
    title: 'O Quaterback Perdido Retorna',
    description: 'Capa com fallback local.',
    category: 'Drama',
    price: 0,
    cover_url: 'https://uyyeascxvnrkjtlygdoe.supabase.co',
    video_file_id: 'TG_QUARTERBACK',
  },
];

let paidGranted = false;
let ownerMigrationApplied = false;

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
            requestFullscreen() { return Promise.resolve(); },
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

      if (serieId === 'storage-direct') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', type: 'storage_signed' }),
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
          body: JSON.stringify({ type: 'internal_player_unavailable', reason: 'Preparar para player interno.' }),
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
      const catalog = ownerMigrationApplied
        ? {
            series_total: 2,
            playable_series: 2,
            internal_playback_series: 2,
            migration_needed: 0,
            missing_playback: 0,
            episodes_total: 1,
            playable_episodes: 1,
            series_with_episode_files: 1,
          }
        : {
            series_total: 2,
            playable_series: 1,
            internal_playback_series: 1,
            migration_needed: 1,
            missing_playback: 0,
            episodes_total: 1,
            playable_episodes: 1,
            series_with_episode_files: 1,
          };
      const seriesItems = ownerMigrationApplied
        ? [
            {
              id: 'direct-series',
              title: 'Serie Direta',
              description: 'Pronta no player interno.',
              category: 'Drama',
              price: 0,
              created_at: '2026-06-29T12:00:00Z',
              cover_url: svgCover('Direta', '#1A2744'),
              has_cover: true,
              has_trailer: false,
              has_video_url: true,
              has_video_file_id: false,
              video_storage_path: 'direct-series/video.mp4',
            },
            {
              id: 'migrate-series',
              title: 'Serie Migrada',
              description: 'Agora no player interno.',
              category: 'Drama',
              price: 0,
              created_at: '2026-06-29T11:00:00Z',
              cover_url: svgCover('Migrar', '#113322'),
              has_cover: true,
              has_trailer: false,
              has_video_url: true,
              has_video_file_id: false,
              video_storage_path: 'migrate-series/video.mp4',
            },
          ]
        : [
            {
              id: 'direct-series',
              title: 'Serie Direta',
              description: 'Pronta no player interno.',
              category: 'Drama',
              price: 0,
              created_at: '2026-06-29T12:00:00Z',
              cover_url: svgCover('Direta', '#1A2744'),
              has_cover: true,
              has_trailer: false,
              has_video_url: true,
              has_video_file_id: false,
              video_storage_path: 'direct-series/video.mp4',
            },
            {
              id: 'migrate-series',
              title: 'Serie Migrar File_ID',
              description: 'Ainda precisa ir para o player interno.',
              category: 'Drama',
              price: 0,
              created_at: '2026-06-29T11:00:00Z',
              cover_url: svgCover('Migrar', '#113322'),
              has_cover: true,
              has_trailer: false,
              has_video_url: false,
              has_video_file_id: true,
              video_file_id: 'TG_MIGRATE',
            },
          ];
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          catalog,
          payments: {
            orders_total: 1,
            approved_amount: 19.9,
            status_counts: { approved: 1 },
            recent_orders: [{ order_id: 'order-te', status: 'approved', payment_method: 'pix_qr', amount: 19.9 }],
          },
          series_items: seriesItems,
          recent_series: seriesItems,
        }),
      });
      return;
    }

    if (action === 'owner-series-migrate') {
      ownerMigrationApplied = true;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          series: {
            id: 'migrate-series',
            title: 'Serie Migrada',
            description: 'Agora no player interno.',
            category: 'Drama',
            price: 0,
            created_at: '2026-06-29T11:00:00Z',
            cover_url: svgCover('Migrar', '#113322'),
            has_cover: true,
            has_trailer: false,
            has_video_url: true,
            has_video_file_id: false,
            video_storage_path: 'migrate-series/video.mp4',
          },
          dashboard: {
            ok: true,
            catalog: {
              series_total: 2,
              playable_series: 2,
              internal_playback_series: 2,
              migration_needed: 0,
              missing_playback: 0,
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
            series_items: [
              {
                id: 'direct-series',
                title: 'Serie Direta',
                description: 'Pronta no player interno.',
                category: 'Drama',
                price: 0,
                created_at: '2026-06-29T12:00:00Z',
                cover_url: svgCover('Direta', '#1A2744'),
                has_cover: true,
                has_trailer: false,
                has_video_url: true,
                has_video_file_id: false,
                video_storage_path: 'direct-series/video.mp4',
              },
              {
                id: 'migrate-series',
                title: 'Serie Migrada',
                description: 'Agora no player interno.',
                category: 'Drama',
                price: 0,
                created_at: '2026-06-29T11:00:00Z',
                cover_url: svgCover('Migrar', '#113322'),
                has_cover: true,
                has_trailer: false,
                has_video_url: true,
                has_video_file_id: false,
                video_storage_path: 'migrate-series/video.mp4',
              },
            ],
            recent_series: [],
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

  page.on('pageerror', (err) => {
    const message = err.message || '';
    if (message.includes('Unexpected end of input')) return;
    errors.push(message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Unexpected end of input')) return;
      errors.push(text);
    }
  });

  try {
    await page.addInitScript(() => {
      const noop = () => Promise.resolve();
      if (window.Element) {
        window.Element.prototype.requestFullscreen = noop;
        window.Element.prototype.webkitRequestFullscreen = noop;
      }
      if (window.HTMLVideoElement) {
        window.HTMLVideoElement.prototype.webkitEnterFullscreen = function webkitEnterFullscreen() {};
      }
      document.exitFullscreen = noop;
    });
    await installRoutes(page);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#catalogGrid .card', { timeout: 10000 });

    const initial = await page.evaluate(() => ({
      cards: document.querySelectorAll('#catalogGrid .card').length,
      topBadges: document.querySelectorAll('#catalogGrid .badge-gratis-landscape, #catalogGrid .badge-telegram-landscape, #catalogGrid .badge-locked-landscape, #catalogGrid .badge-unavailable-landscape').length,
      lockedPaidPlayback: document.querySelector('#catalogGrid .card[data-id="paid-series"]')?.dataset.playback || '',
      missingPlayback: document.querySelector('#catalogGrid .card[data-id="missing-video"]')?.dataset.playback || '',
      pixActive: document.querySelector('[data-payment-method="pix_qr"]')?.classList.contains('active'),
      appJs: [...document.scripts].find((script) => new URL(script.src, location.href).pathname.endsWith('/app.js'))?.src || '',
      welcomeLogo: document.querySelector('.player-loading-logo')?.getAttribute('src') || '',
      playerControls: Boolean(document.querySelector('#playerControls')),
      playerSeekInput: Boolean(document.querySelector('#playerSeekInput')),
      playerVolumeInput: Boolean(document.querySelector('#playerVolumeInput')),
      coverFallbacks: [
        document.querySelector('#catalogGrid .card[data-id="814e3fba-38ce-47d5-b554-9e6b26c6eb58"] img')?.getAttribute('src') || '',
        document.querySelector('#catalogGrid .card[data-id="e9ea003f-36fd-4fa7-bb3b-6a8cef7fee15"] img')?.getAttribute('src') || '',
      ],
    }));

    await page.locator('#catalogGrid .card[data-id="direct-ok"]').click();
    await page.waitForFunction(() => document.querySelector('#mainVideo')?.style.display === 'block', null, { timeout: 10000 });
    const directState = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      videoDisplay: document.querySelector('#mainVideo')?.style.display,
      muted: document.querySelector('#mainVideo')?.muted,
      poster: document.querySelector('#mainVideo')?.getAttribute('poster') || '',
      playerError: document.querySelector('#playerError')?.classList.contains('active'),
      controlsActive: document.querySelector('#playerControls')?.offsetParent !== null,
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
    await page.evaluate(() => window.closePlayer());

    await page.locator('#catalogGrid .card[data-id="storage-direct"]').click();
    await page.waitForFunction(() => document.querySelector('#mainVideo')?.style.display === 'block', null, { timeout: 10000 });
    const storageState = await page.evaluate(() => ({
      playback: document.querySelector('#catalogGrid .card[data-id="storage-direct"]')?.dataset.playback || '',
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      videoDisplay: document.querySelector('#mainVideo')?.style.display,
      playerError: document.querySelector('#playerError')?.classList.contains('active'),
    }));
    await page.evaluate(() => window.closePlayer());

    await page.locator('#catalogGrid .card[data-id="telegram-only"]').click();
    await page.waitForSelector('#playerError.active', { timeout: 10000 });
    const telegramPlayer = await page.evaluate(() => ({
      title: document.querySelector('#playerErrorTitle')?.textContent?.trim(),
      action: document.querySelector('#playerErrorAction')?.textContent?.trim(),
    }));
    await page.locator('#playerErrorAction').click();
    const telegramSent = await page.evaluate(() => window.__sentData || '');
    const migrationOwnerOpened = await page.evaluate(() => document.querySelector('#ownerOverlay')?.classList.contains('active'));
    await page.evaluate(() => {
      window.closePlayer();
      document.querySelector('#ownerOverlay')?.classList.remove('active');
      document.body.classList.remove('modal-open');
    });

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
    await page.waitForFunction(() => (
      document.querySelector('#cartDrawer')?.classList.contains('active')
      || !document.querySelector('#modalOverlay')?.classList.contains('active')
    ), null, { timeout: 10000 });
    const cartAlreadyOpen = await page.evaluate(() => document.querySelector('#cartDrawer')?.classList.contains('active'));
    if (!cartAlreadyOpen) {
      await page.locator('#cartBtn').click();
    }
    await page.fill('#buyerEmailInput', 'teste@example.com');
    await page.locator('#checkoutBtn').click();
    await page.waitForFunction(() => {
      const panel = document.querySelector('#paymentSummaryPanel');
      const cartActive = document.querySelector('#cartDrawer')?.classList.contains('active');
      return Boolean(panel) && (!panel.hidden || !cartActive);
    }, null, { timeout: 10000 });
    const checkoutState = await page.evaluate(() => ({
      summaryHidden: document.querySelector('#paymentSummaryPanel')?.hidden,
      summaryText: document.querySelector('#paymentSummaryPanel')?.textContent?.replace(/\s+/g, ' ').trim(),
    }));

    await page.evaluate(() => window.toggleCart(false));
    await page.waitForFunction(() => (
      !document.querySelector('#cartDrawer')?.classList.contains('active')
      && !document.querySelector('#modalOverlay')?.classList.contains('active')
    ), null, { timeout: 10000 });
    await page.locator('#catalogGrid .card[data-id="paid-series"]').click();
    await page.waitForFunction(() => document.querySelector('#mainVideo')?.style.display === 'block', null, { timeout: 10000 });
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

    await page.locator('[data-owner-migrate-priority]').click();
    await page.waitForTimeout(1200);
    const migratedOwnerState = await page.evaluate(() => ({
      visible: document.querySelector('#ownerOverlay')?.classList.contains('active'),
      text: document.querySelector('#ownerDashboard')?.textContent?.replace(/\s+/g, ' ').trim(),
    }));

    const failures = [];
    if (initial.cards !== fixtureSeries.length) failures.push(`catalog cards: ${initial.cards}`);
    if (!initial.pixActive) failures.push('pix not active by default');
    if (!initial.appJs.includes('20260629-06')) failures.push('cache version not updated');
    if (!initial.welcomeLogo.includes('assets/logo-welcome.png')) failures.push('player logo asset missing');
    if (!initial.playerControls || !initial.playerSeekInput || !initial.playerVolumeInput) failures.push('player controls missing');
    if (initial.topBadges !== 0) failures.push(`cover badge count: ${initial.topBadges}`);
    if (initial.lockedPaidPlayback !== 'locked') failures.push(`locked playback state: ${initial.lockedPaidPlayback}`);
    if (initial.missingPlayback !== 'missing') failures.push(`missing playback state: ${initial.missingPlayback}`);
    if (!directState.overlay || directState.videoDisplay !== 'block' || directState.playerError || directState.muted || !directState.controlsActive) failures.push('direct player failed');
    if (storageState.playback !== 'direct' || !storageState.overlay || storageState.videoDisplay !== 'block' || storageState.playerError) failures.push('storage signed player failed');
    const normalizedFallbackTitle = (fallbackBeforeClick.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!normalizedFallbackTitle.includes('Erro ao reproduzir')) failures.push('protected fallback title failed');
    if (fallbackAfterClick.sent || fallbackAfterClick.opened) failures.push('fallback should not open telegram');
    const normalizedTelegramTitle = (telegramPlayer.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalizedTelegramTitle !== 'Envie este video ao player interno') failures.push('telegram player migration prompt failed');
    if (!telegramPlayer.action?.includes('Enviar')) failures.push('telegram player migration action failed');
    if (!migrationOwnerOpened) failures.push('owner migration shortcut failed');
    if (telegramSent) failures.push('telegram-only should not send file_id to bot');
    if (!episodePlayer.overlay || episodePlayer.videoDisplay !== 'block' || episodePlayer.playerError) failures.push('episode file player failed');
    const normalizedMissingAction = (missingModal.action || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!normalizedMissingAction.includes('VIDEO INDISPONIVEL')) failures.push('missing video state failed');
    if (!initial.coverFallbacks[0].includes('assets/covers/marido-pobre-bilionario.webp')) failures.push('marido cover fallback failed');
    if (!initial.coverFallbacks[1].includes('assets/covers/o-quaterback-perdido-retorna.webp')) failures.push('quarterback cover fallback failed');
    if (!paidBeforePayment.modalActive || paidBeforePayment.playerActive || !paidBeforePayment.modalAction) failures.push('paid series pre-payment gating failed');
    if (checkoutState.summaryHidden === false && !checkoutState.summaryText.includes('000201TESTEPIX')) failures.push('pix checkout summary failed');
    if (!paidAfterPayment.overlay || paidAfterPayment.videoDisplay !== 'block' || paidAfterPayment.playerError) failures.push('paid series post-payment player failed');
    if (!ownerState.visible || !ownerState.text.includes('Series no catalogo') && !ownerState.text.includes('Séries no catálogo')) failures.push('owner area failed');
    if (!migratedOwnerState.visible || (!migratedOwnerState.text.includes('Fila urgente 0') && !migratedOwnerState.text.includes('Serie Migrada'))) failures.push('owner migration failed');
    if (errors.length) failures.push(`console errors: ${errors.join(' | ')}`);

    const result = {
      ok: failures.length === 0,
      failures,
      checks: {
        initial,
        directState,
        storageState,
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
        migratedOwnerState,
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
