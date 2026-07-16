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
const TEST_OWNER_ID = '123456789';

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
    video_url: `http://127.0.0.1:${port}/broken-video.mp4`,
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
    price: 5.9,
    cover_url: '',
    has_video_file_id: true,
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
let ownerOrderRetried = false;
let cartServerState = { item_ids: [], coupon_code: '' };
let notificationPreferencesState = {
  payments_enabled: true,
  purchases_enabled: true,
  releases_enabled: false,
  promotions_enabled: false,
  series_available_enabled: false,
  checkout_abandoned_enabled: false,
  referrals_enabled: false,
  marketing_enabled: false,
  notification_channel: 'telegram',
  bot_started_at: '2026-07-11T10:00:00Z',
  marketing_consented_at: null,
  recovery_consented_at: null,
};
let checkoutRequestPayload = null;
let ownerCouponSavePayload = null;
let ownerCouponActionPayload = null;
const deliveryLog = [];
const progressLog = [];

async function waitForNodeCondition(predicate, timeoutMs = 10000, intervalMs = 50) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timeout aguardando condição do teste');
}

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
        const acceptsHtml = !path.extname(url.pathname) || req.headers.accept?.includes('text/html');
        if (acceptsHtml) {
          fs.readFile(path.join(appDir, 'index.html'), (indexError, indexBuffer) => {
            if (indexError) {
              res.writeHead(404);
              res.end('Not found');
              return;
            }
            res.writeHead(200, { 'content-type': mime['.html'] });
            res.end(indexBuffer);
          });
          return;
        }
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

async function installRoutes(page, options = {}) {
  const telegramEnabled = options.telegram !== false;
  await page.route('https://telegram.org/js/telegram-web-app.js', async (route) => {
    await route.fulfill({
      contentType: 'text/javascript',
      body: telegramEnabled ? `
        window.Telegram = {
          WebApp: {
            initData: 'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Teste%22%7D',
            initDataUnsafe: { user: { id: 123456789, first_name: 'Teste' } },
            ready() {},
            expand() {},
            requestFullscreen() { return Promise.resolve(); },
            sendData(payload) { window.__sentData = payload; },
            openTelegramLink(url) { window.__openedTelegramLink = url; },
            openLink(url) { window.__openedLink = url; },
            openInvoice(url, callback) { window.__openedInvoice = url; setTimeout(() => callback?.('paid'), 0); },
          }
        };
      ` : 'window.Telegram = undefined;',
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
          body: JSON.stringify({ url: `http://127.0.0.1:${port}/broken-video.mp4` }),
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
      checkoutRequestPayload = route.request().postDataJSON?.() || {};
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          order: {
            order_id: 'order-test',
            status: 'pending_payment',
            payment_method: 'telegram_checkout',
            payment_provider: 'telegram_stars',
            provider_currency: 'XTR',
            provider_amount: 45,
            subtotal: 5.9,
            discount_amount: 0.59,
            coupon_code: 'TESTE10',
            amount: 5.31,
            checkout_url: 'https://t.me/$test-invoice',
            items: [{ id: 'paid-series', title: 'Serie Paga', price: 5.9, quantity: 1 }],
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
            delivery_status: 'completed',
            payment_method: 'telegram_checkout',
            payment_provider: 'telegram_stars',
            provider_currency: 'XTR',
            provider_amount: 45,
            subtotal: 5.9,
            discount_amount: 0.59,
            coupon_code: 'TESTE10',
            amount: 5.31,
            items: [{ id: 'paid-series', title: 'Serie Paga', price: 5.9, quantity: 1 }],
          },
        }),
      });
      return;
    }

    if (action === 'deliver-series') {
      const payload = route.request().postDataJSON?.() || {};
      const seriesId = String(payload.series_id || payload.serie_id || '');
      if (seriesId === 'paid-series' && !paidGranted) {
        await route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Pagamento necessario para liberar esta serie.', code: 'payment_required' }),
        });
        return;
      }

      deliveryLog.push({ seriesId, deliveredAt: Date.now() });
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          delivery: {
            series_id: seriesId,
            title: seriesId,
            delivery_type: 'telegram_file',
            source: seriesId === 'episode-video' ? 'episode' : 'series',
            sent_to_chat_id: TEST_OWNER_ID,
          },
        }),
      });
      return;
    }

    if (action === 'progress-sync') {
      const payload = route.request().postDataJSON?.() || {};
      progressLog.push(payload);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          progress: {
            user_id: TEST_OWNER_ID,
            series_id: String(payload.series_id || ''),
            last_event: String(payload.event_type || 'progress'),
          },
        }),
      });
      return;
    }

    if (action === 'cart-sync') {
      const payload = route.request().postDataJSON?.() || {};
      if (payload.operation === 'save') {
        cartServerState = {
          item_ids: Array.isArray(payload.item_ids) ? payload.item_ids : [],
          coupon_code: String(payload.coupon_code || ''),
        };
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, cart: cartServerState }),
      });
      return;
    }

    if (action === 'coupon-validate') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          coupon: {
            code: 'TESTE10',
            description: 'Cupom funcional de teste',
            subtotal: 5.9,
            discountAmount: 0.59,
            total: 5.31,
          },
        }),
      });
      return;
    }

    if (action === 'analytics-event') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      return;
    }

    if (action === 'customer-area') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          account: { telegram_user_id: TEST_OWNER_ID, name: 'Isis Teste', username: 'isisteste', language_code: 'pt-br' },
          summary: { library_total: 1, orders_total: 1, approved_orders_total: 1, approved_amount: 5.9, favorites_total: 1, history_total: 1 },
          library: [{ ...fixtureSeries.find((serie) => serie.id === 'paid-series'), has_access: true }],
          orders: [{
            order_id: 'customer-order-test', status: 'approved', payment_method: 'pix_qr', amount: 5.9,
            created_at: '2026-07-11T12:00:00Z', confirmed_at: '2026-07-11T12:01:00Z', delivery_status: 'completed',
            items: [{ series_id: 'paid-series', title: 'Pago Protegido', price: 5.9 }],
          }],
          favorites: [fixtureSeries.find((serie) => serie.id === 'direct-ok')],
          history: [{
            series_id: 'direct-ok', title: 'Direto Funcional', cover_url: svgCover('Direto', '#1A2744'),
            completion_percent: 42, last_position_seconds: 420, duration_seconds: 1000,
            completed: false, last_opened_at: '2026-07-11T12:00:00Z', playback_mode: 'direct', available: true,
          }],
          notification_preferences: notificationPreferencesState,
        }),
      });
      return;
    }

    if (action === 'notification-preferences') {
      const payload = route.request().postDataJSON() || {};
      if (payload.operation === 'save') {
        notificationPreferencesState = {
          ...notificationPreferencesState,
          ...payload,
          recovery_consented_at: payload.checkout_abandoned_enabled ? '2026-07-11T12:10:00Z' : null,
        };
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, preferences: notificationPreferencesState }),
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
            series_total: 3,
            playable_series: 2,
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
              status: 'published',
              content_delivery_type: 'web',
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
              status: 'draft',
              content_delivery_type: 'telegram',
              price: 0,
              created_at: '2026-06-29T11:00:00Z',
              cover_url: svgCover('Migrar', '#113322'),
              has_cover: true,
              has_trailer: false,
              has_video_url: false,
              has_video_file_id: false,
              video_file_id: 'TG_MIGRATE',
            },
            {
              id: 'paid-owner-series',
              title: 'Serie Paga Elegivel',
              description: 'Serie paga usada para validar campanhas direcionadas.',
              category: 'Romance',
              status: 'published',
              content_delivery_type: 'telegram',
              price: 5.9,
              created_at: '2026-07-01T12:00:00Z',
              cover_url: svgCover('Paga', '#552211'),
              has_cover: true,
              has_trailer: false,
              has_video_url: false,
              has_video_file_id: true,
              video_file_id: 'TG_PAID_OWNER',
            },
          ];
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          catalog,
          payments: {
            orders_total: 1,
            approved_amount: 5.9,
            status_counts: { approved: 1 },
            delivery_queue_total: ownerOrderRetried ? 0 : 1,
            delivery_failed_total: ownerOrderRetried ? 0 : 1,
            delivery_processing_total: 0,
            delivery_queue: ownerOrderRetried ? [] : [{
              order_id: 'order-failed-test', order_short_id: 'order-fa', user_id: TEST_OWNER_ID,
              buyer_email: 'cliente@example.com', status: 'approved', payment_method: 'pix_qr', amount: 5.9,
              created_at: '2026-07-10T12:00:00Z', delivery_status: 'failed', delivery_attempts: 1,
              delivery_last_error: 'Falha temporaria no Telegram', delivered_count: 0, item_count: 1,
              items: [{ series_id: 'paid-series', title: 'Pago Protegido', price: 5.9, delivered: false }],
              can_retry_delivery: true, is_processing: false,
            }],
            recent_orders: [{
              order_id: 'order-failed-test', order_short_id: 'order-fa', user_id: TEST_OWNER_ID,
              buyer_email: 'cliente@example.com', status: 'approved', payment_method: 'pix_qr', amount: 5.9,
              created_at: '2026-07-10T12:00:00Z', delivery_status: ownerOrderRetried ? 'completed' : 'failed',
              delivery_attempts: ownerOrderRetried ? 2 : 1,
              delivery_last_error: ownerOrderRetried ? '' : 'Falha temporaria no Telegram',
              delivered_count: ownerOrderRetried ? 1 : 0, item_count: 1,
              items: [{ series_id: 'paid-series', title: 'Pago Protegido', price: 5.9, delivered: ownerOrderRetried }],
              can_retry_delivery: false, is_processing: false,
            }],
          },
          analytics: {
            period_days: 30,
            events_total: 12,
            unique_users: 3,
            cart_abandonment_rate: 25,
            abandonment_rate: 25,
            funnel: { app_opened: 3, series_viewed: 3, add_to_cart: 2, checkout_started: 2, payment_approved: 1, purchase_completed: 1, delivery_completed: 1, cart_abandoned: 1 },
            conversion_rates: { app_to_series: 100, series_to_cart: 66.7, cart_to_checkout: 100, checkout_to_purchase: 50, purchase_to_delivery: 100 },
            channels: { telegram: { events: 12, unique_users: 3, checkout_started: 2, purchase_completed: 1, checkout_conversion_rate: 50 } },
            top_series: [{ series_id: 'paid-series', views: 3, cart_additions: 2, purchases: 1 }],
          },
          coupons: {
            total: 1,
            active_total: 1,
            scheduled_total: 0,
            applied_uses: 2,
            discount_total: 1.18,
            items: [{
              code: 'CLIENTE10', description: 'Campanha de clientes', discount_type: 'percentage', discount_value: 10,
              minimum_amount: 5.9, starts_at: null, ends_at: null, usage_limit: 100, per_user_limit: 1,
              eligible_series_ids: [], active: true, status: 'active', applied_uses: 2, reserved_uses: 0,
              usage_total: 2, discount_total: 1.18, created_at: '2026-07-12T12:00:00Z', updated_at: '2026-07-12T12:00:00Z',
            }],
          },
          series_items: seriesItems,
          recent_series: seriesItems,
        }),
      });
      return;
    }

    if (action === 'owner-order-retry') {
      ownerOrderRetried = true;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          order: { order_id: 'order-failed-test', delivery_status: 'completed' },
          summary: { delivered: [{ seriesId: 'paid-series', title: 'Pago Protegido' }], failed: [] },
          dashboard: {
            catalog: {
              series_total: 2, playable_series: 2, internal_playback_series: 2, migration_needed: 0,
              missing_playback: 0, episodes_total: 1, playable_episodes: 1, series_with_episode_files: 1,
            },
            payments: {
              orders_total: 1, approved_amount: 5.9, status_counts: { approved: 1 },
              delivery_queue_total: 0, delivery_failed_total: 0, delivery_processing_total: 0, delivery_queue: [],
              recent_orders: [{
                order_id: 'order-failed-test', order_short_id: 'order-fa', user_id: TEST_OWNER_ID,
                buyer_email: 'cliente@example.com', status: 'approved', payment_method: 'pix_qr', amount: 5.9,
                created_at: '2026-07-10T12:00:00Z', delivery_status: 'completed', delivery_attempts: 2,
                delivery_last_error: '', delivered_count: 1, item_count: 1,
                items: [{ series_id: 'paid-series', title: 'Pago Protegido', price: 5.9, delivered: true }],
                can_retry_delivery: false, is_processing: false,
              }],
            },
            analytics: {
              period_days: 30, events_total: 12, unique_users: 3, cart_abandonment_rate: 25, abandonment_rate: 25,
              funnel: { app_opened: 3, series_viewed: 3, add_to_cart: 2, checkout_started: 2, payment_approved: 1, purchase_completed: 1, delivery_completed: 1, cart_abandoned: 1 },
              conversion_rates: { app_to_series: 100, series_to_cart: 66.7, cart_to_checkout: 100, checkout_to_purchase: 50, purchase_to_delivery: 100 },
              channels: { telegram: { events: 12, unique_users: 3, checkout_started: 2, purchase_completed: 1, checkout_conversion_rate: 50 } },
              top_series: [{ series_id: 'paid-series', views: 3, cart_additions: 2, purchases: 1 }],
            },
            series_items: [],
            recent_series: [],
          },
        }),
      });
      return;
    }

    if (action === 'owner-coupon-save') {
      ownerCouponSavePayload = route.request().postDataJSON?.() || {};
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, coupon: ownerCouponSavePayload }) });
      return;
    }

    if (action === 'owner-coupon-action') {
      ownerCouponActionPayload = route.request().postDataJSON?.() || {};
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
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
              approved_amount: 5.9,
              status_counts: { approved: 1 },
              delivery_queue_total: 1,
              delivery_failed_total: 1,
              delivery_processing_total: 0,
              delivery_queue: [{
                order_id: 'order-failed-test', order_short_id: 'order-fa', user_id: TEST_OWNER_ID,
                buyer_email: 'cliente@example.com', status: 'approved', payment_method: 'pix_qr', amount: 5.9,
                created_at: '2026-07-10T12:00:00Z', delivery_status: 'failed', delivery_attempts: 1,
                delivery_last_error: 'Falha temporaria no Telegram', delivered_count: 0, item_count: 1,
                items: [{ series_id: 'paid-series', title: 'Pago Protegido', price: 5.9, delivered: false }],
                can_retry_delivery: true, is_processing: false,
              }],
              recent_orders: [],
            },
            analytics: {
              period_days: 30,
              events_total: 12,
              unique_users: 3,
              cart_abandonment_rate: 25,
              abandonment_rate: 25,
              funnel: { app_opened: 3, series_viewed: 3, add_to_cart: 2, checkout_started: 2, payment_approved: 1, purchase_completed: 1, delivery_completed: 1, cart_abandoned: 1 },
              conversion_rates: { app_to_series: 100, series_to_cart: 66.7, cart_to_checkout: 100, checkout_to_purchase: 50, purchase_to_delivery: 100 },
              channels: { telegram: { events: 12, unique_users: 3, checkout_started: 2, purchase_completed: 1, checkout_conversion_rate: 50 } },
              top_series: [{ series_id: 'paid-series', views: 3, cart_additions: 2, purchases: 1 }],
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

  await page.route(`http://127.0.0.1:${port}/broken-video.mp4`, async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'video/mp4',
      body: '',
    });
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
    if (message.includes('ERR_NETWORK_CHANGED')) return;
    errors.push(message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Unexpected end of input')) return;
      if (text.includes('ERR_NETWORK_CHANGED')) return;
      if (text.includes('404 (Not Found)')) return;
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
      groupTitles: [...document.querySelectorAll('#catalogGrid .catalog-group-title')].map((node) => node.textContent?.trim() || ''),
      groupCounts: [...document.querySelectorAll('#catalogGrid .catalog-group-count')].map((node) => node.textContent?.trim() || ''),
      paidCardAction: document.querySelector('#catalogGrid .card[data-id="paid-series"] .card-cart-btn')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      topBadges: document.querySelectorAll('#catalogGrid .badge-gratis-landscape, #catalogGrid .badge-telegram-landscape, #catalogGrid .badge-locked-landscape, #catalogGrid .badge-unavailable-landscape').length,
      lockedPaidPlayback: document.querySelector('#catalogGrid .card[data-id="paid-series"]')?.dataset.playback || '',
      missingPlayback: document.querySelector('#catalogGrid .card[data-id="missing-video"]')?.dataset.playback || '',
      starsActive: document.querySelector('[data-payment-method="telegram_checkout"]')?.classList.contains('active'),
      webMethodsHidden: [...document.querySelectorAll('[data-payment-method="pix_qr"], [data-payment-method="mercado_pago_link"]')].every((node) => node.hidden),
      appJs: [...document.scripts].find((script) => {
        const pathname = new URL(script.src, location.href).pathname;
        return pathname.endsWith('/app.min.js') || pathname.endsWith('/app.js');
      })?.src || '',
      welcomeLogo: document.querySelector('.player-loading-logo')?.getAttribute('src') || '',
      playerControls: Boolean(document.querySelector('#playerControls')),
      playerSeekInput: Boolean(document.querySelector('#playerSeekInput')),
      playerVolumeInput: Boolean(document.querySelector('#playerVolumeInput')),
      supportButton: Boolean(document.querySelector('#supportBtn')),
      supportOverlay: Boolean(document.querySelector('#supportOverlay')),
      supportForm: Boolean(document.querySelector('#supportForm')),
      coverFallbacks: [
        document.querySelector('#catalogGrid .card[data-id="814e3fba-38ce-47d5-b554-9e6b26c6eb58"] img')?.getAttribute('src') || '',
        document.querySelector('#catalogGrid .card[data-id="e9ea003f-36fd-4fa7-bb3b-6a8cef7fee15"] img')?.getAttribute('src') || '',
      ],
    }));

    await page.locator('#catalogGrid .card[data-id="direct-ok"]').click();
    await waitForNodeCondition(() => deliveryLog.length >= 1);
    const directDeliveryState = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      modal: document.querySelector('#modalOverlay')?.classList.contains('active'),
    }));

    await page.evaluate(() => window.openPlayer('direct-ok', 'Direto Funcional'));
    await page.waitForFunction(() => document.querySelector('#mainVideo')?.style.display === 'block', null, { timeout: 10000 });
    await page.waitForTimeout(800);
    const directState = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      videoDisplay: document.querySelector('#mainVideo')?.style.display,
      muted: document.querySelector('#mainVideo')?.muted,
      poster: document.querySelector('#mainVideo')?.getAttribute('poster') || '',
      playerError: document.querySelector('#playerError')?.classList.contains('active'),
      controlsActive: document.querySelector('#playerControls')?.offsetParent !== null,
    }));
    await page.evaluate(() => window.closePlayer());

    await page.evaluate(() => window.openPlayer('direct-fallback', 'Direto com Fallback'));
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
    await waitForNodeCondition(() => deliveryLog.length >= 2);
    const storageDeliveryState = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
    }));

    await page.evaluate(() => window.openPlayer('storage-direct', 'Storage Assinado'));
    await page.waitForFunction(() => document.querySelector('#mainVideo')?.style.display === 'block', null, { timeout: 10000 });
    const storageState = await page.evaluate(() => ({
      playback: document.querySelector('#catalogGrid .card[data-id="storage-direct"]')?.dataset.playback || '',
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      videoDisplay: document.querySelector('#mainVideo')?.style.display,
      playerError: document.querySelector('#playerError')?.classList.contains('active'),
    }));
    await page.evaluate(() => window.closePlayer());

    await page.locator('#catalogGrid .card[data-id="telegram-only"]').click();
    await waitForNodeCondition(() => deliveryLog.length >= 3);
    const telegramDeliveryState = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
    }));

    await page.evaluate(() => window.openPlayer('telegram-only', 'Somente Telegram'));
    await page.waitForTimeout(400);
    const telegramProtectedFallback = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      state: document.querySelector('#playerOverlay')?.getAttribute('data-state') || '',
      errorActive: document.querySelector('#playerError')?.classList.contains('active'),
      title: document.querySelector('#playerErrorTitle')?.textContent?.trim() || '',
      button: document.querySelector('#playerErrorAction')?.textContent?.trim() || '',
    }));
    await page.evaluate(() => window.closePlayer());

    await page.locator('#catalogGrid .card[data-id="episode-video"]').click();
    await waitForNodeCondition(() => deliveryLog.length >= 4);
    const episodeDeliveryState = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
    }));

    await page.evaluate(() => window.openPlayer('episode-video', 'Video em Episodio'));
    await page.waitForFunction(() => document.querySelector('#mainVideo')?.style.display === 'block', null, { timeout: 10000 });
    const episodePlayback = await page.evaluate(() => ({
      overlay: document.querySelector('#playerOverlay')?.classList.contains('active'),
      state: document.querySelector('#playerOverlay')?.getAttribute('data-state') || '',
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
    await page.locator('#modalActions button').first().click();
    await page.waitForFunction(() => (
      document.querySelector('#cartDrawer')?.classList.contains('active')
      || !document.querySelector('#modalOverlay')?.classList.contains('active')
    ), null, { timeout: 10000 });
    const cartAlreadyOpen = await page.evaluate(() => document.querySelector('#cartDrawer')?.classList.contains('active'));
    if (!cartAlreadyOpen) {
      await page.locator('#cartBtn').click();
    }
    await page.fill('#cartCouponInput', 'teste10');
    await page.locator('#cartCouponBtn').click();
    await page.waitForFunction(() => document.querySelector('#cartCouponStatus')?.textContent?.includes('TESTE10'));
    const couponState = await page.evaluate(() => ({
      status: document.querySelector('#cartCouponStatus')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      subtotal: document.querySelector('#cartSubtotal')?.textContent?.trim() || '',
      discount: document.querySelector('#cartDiscount')?.textContent?.trim() || '',
      total: document.querySelector('#cartTotal')?.textContent?.trim() || '',
      discountVisible: document.querySelector('#cartDiscountRow')?.hidden === false,
    }));
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
    await page.waitForFunction(() => (
      document.querySelector('#catalogGrid .card[data-id="paid-series"] .card-cart-btn')
        ?.textContent?.includes('Receber no Telegram')
    ), null, { timeout: 10000 });
    const paidCardAfterPayment = await page.evaluate(() => ({
      action: document.querySelector('#catalogGrid .card[data-id="paid-series"] .card-cart-btn')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    }));

    await page.evaluate(() => window.toggleCart(false));
    await page.waitForFunction(() => (
      !document.querySelector('#cartDrawer')?.classList.contains('active')
      && !document.querySelector('#modalOverlay')?.classList.contains('active')
    ), null, { timeout: 10000 });
    await page.locator('#catalogGrid .card[data-id="paid-series"]').click();
    await waitForNodeCondition(() => deliveryLog.length >= 5);
    const paidAfterPayment = {
      action: await page.evaluate(() => document.querySelector('#catalogGrid .card[data-id="paid-series"] .card-cart-btn')?.textContent?.replace(/\s+/g, ' ').trim() || ''),
      deliveries: deliveryLog.length,
      overlay: await page.evaluate(() => document.querySelector('#playerOverlay')?.classList.contains('active')),
      modal: await page.evaluate(() => document.querySelector('#modalOverlay')?.classList.contains('active')),
      playerError: await page.evaluate(() => document.querySelector('#playerError')?.classList.contains('active')),
    };

    await page.locator('#accountBtn').click();
    await page.waitForSelector('.customer-shell', { timeout: 10000 });
    const customerOverviewState = await page.evaluate(() => ({
      path: location.pathname,
      title: document.querySelector('.customer-hero h1')?.textContent?.trim() || '',
      summaryCards: document.querySelectorAll('.customer-summary-card').length,
      libraryCards: document.querySelectorAll('.customer-series-card').length,
      accountVisible: document.querySelector('#accountBtn')?.hidden === false,
      preferenceForm: Boolean(document.querySelector('[data-notification-preferences-form]')),
    }));
    await page.check('[name="checkout_abandoned_enabled"]');
    await page.locator('[data-notification-preferences-form] button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('.customer-preference-status')?.textContent?.includes('salvas'));
    customerOverviewState.recoveryPreferenceSaved = notificationPreferencesState.checkout_abandoned_enabled === true;
    await page.locator('.customer-nav-link[href="/minha-biblioteca"]').click();
    await page.waitForFunction(() => location.pathname === '/minha-biblioteca');
    const customerLibraryState = await page.evaluate(() => ({
      path: location.pathname,
      cards: document.querySelectorAll('.customer-series-card').length,
      action: document.querySelector('[data-customer-series-id="paid-series"]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    }));
    await page.locator('.customer-nav-link[href="/minhas-compras"]').click();
    await page.waitForFunction(() => location.pathname === '/minhas-compras');
    const customerOrdersState = await page.evaluate(() => ({
      path: location.pathname,
      cards: document.querySelectorAll('.customer-order-card').length,
      paid: document.querySelector('.customer-status-approved')?.textContent?.trim() || '',
    }));
    await page.locator('.customer-nav-link[href="/historico"]').click();
    await page.waitForFunction(() => location.pathname === '/historico');
    const customerHistoryState = await page.evaluate(() => ({
      path: location.pathname,
      cards: document.querySelectorAll('.customer-history-card').length,
      progressWidth: document.querySelector('.customer-progress span')?.style.width || '',
    }));

    await page.locator('#ownerBtn').click();
    await page.fill('#ownerPasswordInput', 'owner-test');
    await page.locator('#ownerLoginBtn').click();
    await page.waitForFunction(() => document.querySelector('#ownerDashboard')?.hidden === false, null, { timeout: 10000 });
    const ownerState = await page.evaluate(() => ({
      visible: document.querySelector('#ownerOverlay')?.classList.contains('active'),
      text: document.querySelector('#ownerDashboard')?.textContent?.replace(/\s+/g, ' ').trim(),
      statusField: document.querySelector('#ownerSeriesForm [name="status"]')?.value || '',
      deliveryField: document.querySelector('#ownerSeriesForm [name="content_delivery_type"]')?.value || '',
      seoField: Boolean(document.querySelector('#ownerSeriesForm [name="seo_title"]')),
      seoGenerateButton: Boolean(document.querySelector('[data-owner-generate-seo]')),
      seoRestoreButton: Boolean(document.querySelector('[data-owner-restore-seo]')),
      seoPreviewCount: document.querySelectorAll('.owner-seo-preview').length,
      seoSitemapChecked: Boolean(document.querySelector('#ownerSeriesForm [name="seo_sitemap_enabled"]')?.checked),
      editorialButtons: document.querySelectorAll('[data-owner-editorial-action]').length,
      statusPills: document.querySelectorAll('.owner-pill-status').length,
      couponForm: Boolean(document.querySelector('#ownerCouponForm')),
      couponCards: document.querySelectorAll('.owner-coupon-card').length,
      couponText: document.querySelector('.owner-coupon-section')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    }));

    await page.fill('#ownerCouponForm [name="code"]', 'novo15');
    await page.selectOption('#ownerCouponForm [name="discount_type"]', 'percentage');
    await page.fill('#ownerCouponForm [name="discount_value"]', '15');
    await page.fill('#ownerCouponForm [name="minimum_amount"]', '5.90');
    await page.fill('#ownerCouponForm [name="usage_limit"]', '50');
    await page.check('#ownerCouponForm [name="eligible_series_ids"][value="paid-owner-series"]');
    await page.locator('#ownerCouponForm button[type="submit"]').click();
    await waitForNodeCondition(() => ownerCouponSavePayload !== null);
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('[data-owner-coupon-action="deactivate"]').click();
    await waitForNodeCondition(() => ownerCouponActionPayload !== null);

    await page.locator('[data-owner-migrate-priority]').click();
    await page.waitForTimeout(1200);
    const migratedOwnerState = await page.evaluate(() => ({
      visible: document.querySelector('#ownerOverlay')?.classList.contains('active'),
      text: document.querySelector('#ownerDashboard')?.textContent?.replace(/\s+/g, ' ').trim(),
    }));

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('[data-owner-order-retry="order-failed-test"]').first().click();
    await page.waitForFunction(() => document.querySelector('#ownerDashboard')?.textContent?.includes('Nenhuma entrega precisa de intervenção'), null, { timeout: 10000 });
    const ownerRetryState = await page.evaluate(() => ({
      text: document.querySelector('#ownerDashboard')?.textContent?.replace(/\s+/g, ' ').trim(),
      retryButton: Boolean(document.querySelector('[data-owner-order-retry="order-failed-test"]')),
    }));

    const webDeliveryCountBefore = deliveryLog.length;
    const webPage = await browser.newPage();
    webPage.on('pageerror', (err) => errors.push(`web: ${err.message || err}`));
    await webPage.addInitScript(() => {
      window.open = (url) => {
        window.__webOpenedUrl = String(url || '');
        return null;
      };
    });
    await installRoutes(webPage, { telegram: false });
    await webPage.goto(`http://127.0.0.1:${port}/series/direto-funcional`, { waitUntil: 'domcontentloaded' });
    await webPage.waitForSelector('#modalOverlay.active', { timeout: 10000 });
    const webRouteState = await webPage.evaluate(() => ({
      runtime: document.documentElement.dataset.runtime,
      title: document.title,
      modalTitle: document.querySelector('#modalTitle')?.textContent?.trim() || '',
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      telegramButtonVisible: document.querySelector('#openTelegramBtn')?.hidden === false,
      structuredType: JSON.parse(document.querySelector('#seriesStructuredData')?.textContent || '{}')['@type'],
    }));
    await webPage.locator('.modal-close').click();
    await webPage.fill('#headerSearchInput', 'Somente Telegram');
    await webPage.waitForTimeout(350);
    const webSearchState = await webPage.evaluate(() => ({
      path: `${location.pathname}${location.search}`,
      cards: document.querySelectorAll('#catalogGrid .card').length,
    }));
    await webPage.fill('#headerSearchInput', '');
    await webPage.waitForTimeout(350);
    await webPage.locator('#catalogGrid .card[data-id="direct-ok"] .card-favorite-btn').click();
    await webPage.locator('.category-chip[data-category="favorites"]').click();
    const webFavoritesState = await webPage.evaluate(() => ({
      path: location.pathname,
      cards: document.querySelectorAll('#catalogGrid .card').length,
      favoriteActive: document.querySelector('#catalogGrid .card[data-id="direct-ok"] .card-favorite-btn')?.classList.contains('active'),
    }));
    await webPage.locator('.category-chip[data-category="all"]').click();
    await webPage.locator('#catalogGrid .card[data-id="paid-series"]').click();
    const webPaidState = await webPage.evaluate(() => ({
      path: location.pathname,
      action: document.querySelector('#modalActions button')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    }));
    await webPage.locator('#modalActions button').first().click();
    const webTelegramOpenState = await webPage.evaluate(() => window.__webOpenedUrl || '');
    await webPage.goto(`http://127.0.0.1:${port}/privacidade`, { waitUntil: 'domcontentloaded' });
    await webPage.waitForSelector('#contentPage:not([hidden])', { timeout: 10000 });
    const webContentState = await webPage.evaluate(() => ({
      title: document.title,
      heading: document.querySelector('#contentPage h1')?.textContent?.trim() || '',
      catalogHidden: document.querySelector('#catalogSection')?.hidden === true,
    }));
    await webPage.goto(`http://127.0.0.1:${port}/minha-conta`, { waitUntil: 'domcontentloaded' });
    await webPage.waitForSelector('[data-customer-open-telegram]', { timeout: 10000 });
    const webCustomerState = await webPage.evaluate(() => ({
      path: location.pathname,
      heading: document.querySelector('#contentPage h1')?.textContent?.trim() || '',
      telegramAction: document.querySelector('[data-customer-open-telegram]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    }));
    await webPage.close();

    const sitemapText = fs.readFileSync(path.join(appDir, 'sitemap.xml'), 'utf8');
    const robotsText = fs.readFileSync(path.join(appDir, 'robots.txt'), 'utf8');
    const generatedSeriesPageText = fs.readFileSync(path.join(appDir, 'series', 'a-prometida-do-principe-vampiro-legendado-pt-br', 'index.html'), 'utf8');

    const failures = [];
    if (initial.cards !== fixtureSeries.length) failures.push(`catalog cards: ${initial.cards}`);
    if (!initial.starsActive || !initial.webMethodsHidden) failures.push('Telegram Stars not enforced inside Telegram');
    if (!initial.appJs.includes('20260715-03')) failures.push('cache version not updated');
    if (!initial.welcomeLogo.includes('assets/logo-welcome.png')) failures.push('player logo asset missing');
    if (!initial.playerControls || !initial.playerSeekInput || !initial.playerVolumeInput) failures.push('player controls missing');
    if (!initial.supportButton || !initial.supportOverlay || !initial.supportForm) failures.push('support ui missing');
    if (!initial.groupTitles.includes('Séries Gratuitas') || !initial.groupTitles.includes('Séries Pagas')) failures.push(`catalog groups missing: ${initial.groupTitles.join(', ')}`);
    if (!initial.groupCounts.includes('8 títulos') || !initial.groupCounts.includes('1 título')) failures.push(`catalog group counts unexpected: ${initial.groupCounts.join(', ')}`);
    if (!initial.paidCardAction.includes('Ver detalhes')) failures.push(`paid card action before payment: ${initial.paidCardAction}`);
    if (initial.topBadges !== 0) failures.push(`cover badge count: ${initial.topBadges}`);
    if (initial.lockedPaidPlayback !== 'locked') failures.push(`locked playback state: ${initial.lockedPaidPlayback}`);
    if (initial.missingPlayback !== 'missing') failures.push(`missing playback state: ${initial.missingPlayback}`);
    if (deliveryLog.length !== 5) failures.push(`delivery count mismatch: ${deliveryLog.length}`);
    if (deliveryLog.filter((entry) => entry.seriesId === 'direct-ok').length !== 1 || directDeliveryState.overlay || directDeliveryState.modal) failures.push('direct telegram delivery failed');
    if (!directState.overlay || directState.videoDisplay !== 'block' || directState.playerError || directState.muted || !directState.controlsActive) failures.push('direct player failed');
    if (!progressLog.some((entry) => entry.series_id === 'direct-ok' && entry.event_type === 'telegram_delivery')) failures.push('direct telegram progress sync failed');
    if (deliveryLog.filter((entry) => entry.seriesId === 'storage-direct').length !== 1 || storageDeliveryState.overlay) failures.push('storage telegram delivery failed');
    if (storageState.playback !== 'direct' || !storageState.overlay || storageState.videoDisplay !== 'block' || storageState.playerError) failures.push('storage signed player failed');
    const normalizedFallbackTitle = (fallbackBeforeClick.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!normalizedFallbackTitle.includes('Erro ao reproduzir')) failures.push('protected fallback title failed');
    if (fallbackAfterClick.sent || fallbackAfterClick.opened) failures.push('fallback should not open telegram');
    const normalizedProtectedTitle = (telegramProtectedFallback.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const telegramFallbackButton = telegramProtectedFallback.button || '';
    if (deliveryLog.filter((entry) => entry.seriesId === 'telegram-only').length !== 1 || telegramDeliveryState.overlay) failures.push('telegram-only delivery failed');
    if (!telegramProtectedFallback.overlay || telegramProtectedFallback.state !== 'unavailable' || !telegramProtectedFallback.errorActive || !normalizedProtectedTitle.includes('Video') || (!telegramFallbackButton.includes('Receber no Telegram') && !telegramFallbackButton.includes('Gerenciar vídeo'))) failures.push('telegram-only protected fallback failed');
    if (!progressLog.some((entry) => entry.series_id === 'telegram-only' && entry.event_type === 'telegram_delivery')) failures.push('telegram-only progress sync failed');
    if (deliveryLog.filter((entry) => entry.seriesId === 'episode-video').length !== 1 || episodeDeliveryState.overlay) failures.push('episode telegram delivery failed');
    if (!episodePlayback.overlay || episodePlayback.state !== 'playing' || episodePlayback.videoDisplay !== 'block' || episodePlayback.playerError) failures.push('episode internal playback failed');
    if (!progressLog.some((entry) => entry.series_id === 'episode-video' && entry.event_type === 'opened')) failures.push('episode playback progress sync failed');
    const normalizedMissingAction = (missingModal.action || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!normalizedMissingAction.includes('VIDEO INDISPONIVEL')) failures.push('missing video state failed');
    if (!initial.coverFallbacks[0].includes('assets/covers/marido-pobre-bilionario.webp')) failures.push('marido cover fallback failed');
    if (!initial.coverFallbacks[1].includes('assets/covers/o-quaterback-perdido-retorna.webp')) failures.push('quarterback cover fallback failed');
    if (!paidBeforePayment.modalActive || paidBeforePayment.playerActive || !paidBeforePayment.modalAction) failures.push('paid series pre-payment gating failed');
    const normalizedCouponState = Object.fromEntries(
      Object.entries(couponState).map(([key, value]) => [key, typeof value === 'string' ? value.replace(/\s/g, ' ') : value]),
    );
    if (!normalizedCouponState.status.includes('TESTE10') || normalizedCouponState.subtotal !== 'R$ 5,90' || !normalizedCouponState.discount.includes('R$ 0,59') || normalizedCouponState.total !== 'R$ 5,31' || !normalizedCouponState.discountVisible) failures.push(`coupon UI failed: ${JSON.stringify(couponState)}`);
    if (checkoutRequestPayload?.coupon_code !== 'TESTE10' || 'total' in (checkoutRequestPayload || {})) failures.push(`checkout coupon payload failed: ${JSON.stringify(checkoutRequestPayload)}`);
    if (checkoutRequestPayload?.payment_method !== 'telegram_checkout') failures.push('Telegram checkout method not submitted');
    if (!paidCardAfterPayment.action.includes('Receber no Telegram')) failures.push(`paid card action after payment: ${paidCardAfterPayment.action}`);
    if (!paidAfterPayment.action.includes('Receber no Telegram') || paidAfterPayment.overlay || paidAfterPayment.modal || paidAfterPayment.playerError || deliveryLog.filter((entry) => entry.seriesId === 'paid-series').length !== 1) failures.push('paid series telegram delivery failed');
    if (customerOverviewState.path !== '/minha-conta' || !customerOverviewState.title.includes('Isis') || customerOverviewState.summaryCards !== 4 || customerOverviewState.libraryCards !== 1 || !customerOverviewState.accountVisible || !customerOverviewState.preferenceForm || !customerOverviewState.recoveryPreferenceSaved) failures.push(`customer overview failed: ${JSON.stringify(customerOverviewState)}`);
    if (customerLibraryState.path !== '/minha-biblioteca' || customerLibraryState.cards !== 1 || !customerLibraryState.action.includes('Receber no Telegram')) failures.push(`customer library failed: ${JSON.stringify(customerLibraryState)}`);
    if (customerOrdersState.path !== '/minhas-compras' || customerOrdersState.cards !== 1 || customerOrdersState.paid !== 'Pago') failures.push(`customer orders failed: ${JSON.stringify(customerOrdersState)}`);
    if (customerHistoryState.path !== '/historico' || customerHistoryState.cards !== 1 || customerHistoryState.progressWidth !== '42%') failures.push(`customer history failed: ${JSON.stringify(customerHistoryState)}`);
    if (!ownerState.visible
      || (!ownerState.text.includes('Área de gestão') && !ownerState.text.includes('Visão geral'))
      || !ownerState.text.includes('Conversão e abandono')
      || !ownerState.text.includes('Checkout → compra')
      || !ownerState.text.includes('Conversão por canal')) failures.push('owner area failed');
    if (!ownerState.seoField || !ownerState.seoGenerateButton || !ownerState.seoRestoreButton || ownerState.seoPreviewCount < 2 || !ownerState.seoSitemapChecked || !ownerState.statusField || !ownerState.deliveryField || ownerState.editorialButtons < 2 || ownerState.statusPills < 2) failures.push(`owner CMS lifecycle failed: ${JSON.stringify(ownerState)}`);
    if (!ownerState.couponForm || ownerState.couponCards !== 1 || !ownerState.couponText.includes('CLIENTE10')) failures.push(`owner coupon UI failed: ${JSON.stringify(ownerState)}`);
    if (ownerCouponSavePayload?.code !== 'NOVO15' || ownerCouponSavePayload?.discount_type !== 'percentage' || Number(ownerCouponSavePayload?.discount_value) !== 15 || Number(ownerCouponSavePayload?.usage_limit) !== 50 || ownerCouponSavePayload?.eligible_series_ids?.[0] !== 'paid-owner-series') failures.push(`owner coupon save failed: ${JSON.stringify(ownerCouponSavePayload)}`);
    if (ownerCouponActionPayload?.code !== 'CLIENTE10' || ownerCouponActionPayload?.operation !== 'deactivate') failures.push(`owner coupon action failed: ${JSON.stringify(ownerCouponActionPayload)}`);
    if (!migratedOwnerState.visible || (!migratedOwnerState.text.includes('Prontas2') && !migratedOwnerState.text.includes('Em fila0'))) failures.push('owner migration failed');
    if (!ownerOrderRetried || ownerRetryState.retryButton || !ownerRetryState.text.includes('Nenhuma entrega precisa de intervenção')) failures.push('owner delivery retry failed');
    if (webRouteState.runtime !== 'web' || !webRouteState.telegramButtonVisible || webRouteState.modalTitle !== 'Direto Funcional' || !webRouteState.title.includes('Direto Funcional') || !webRouteState.canonical.endsWith('/series/direto-funcional') || webRouteState.structuredType !== 'Movie') failures.push('public series route failed');
    if (webSearchState.path !== '/busca?q=Somente%20Telegram' || webSearchState.cards !== 1) failures.push(`public search failed: ${JSON.stringify(webSearchState)}`);
    if (webFavoritesState.path !== '/favoritos' || webFavoritesState.cards !== 1 || !webFavoritesState.favoriteActive) failures.push(`public favorites failed: ${JSON.stringify(webFavoritesState)}`);
    if (!webPaidState.path.includes('/series/serie-paga') || !webPaidState.action.includes('Comprar por R$ 5,90')) failures.push(`public paid details failed: ${JSON.stringify(webPaidState)}`);
    if (!webTelegramOpenState.includes('t.me/ShortNovelsBot') || deliveryLog.length !== webDeliveryCountBefore) failures.push('public Telegram handoff failed');
    if (!webContentState.title.includes('Política de privacidade') || webContentState.heading !== 'Política de privacidade' || !webContentState.catalogHidden) failures.push(`public content page failed: ${JSON.stringify(webContentState)}`);
    if (webCustomerState.path !== '/minha-conta' || webCustomerState.heading !== 'Abra pelo Telegram' || !webCustomerState.telegramAction.includes('Abrir no Telegram')) failures.push(`web customer fallback failed: ${JSON.stringify(webCustomerState)}`);
    if (!sitemapText.includes('/series/') || !sitemapText.includes('/blog/o-que-sao-series-curtas-verticais') || !robotsText.includes('Sitemap:')) failures.push('SEO files failed');
    if (!generatedSeriesPageText.includes('<title>A Prometida do Príncipe Vampiro') || !generatedSeriesPageText.includes('property="og:title"') || !generatedSeriesPageText.includes('"@type":"Movie"')) failures.push('pre-rendered series SEO failed');
    if (errors.length) failures.push(`console errors: ${errors.join(' | ')}`);

    const result = {
      ok: failures.length === 0,
      failures,
      checks: {
        initial,
        directDeliveryState,
        directState,
        storageState,
        storageDeliveryState,
        fallbackBeforeClick,
        fallbackAfterClick,
        telegramDeliveryState,
        telegramProtectedFallback,
        episodeDeliveryState,
        episodePlayback,
        missingModal,
        paidBeforePayment,
        couponState,
        checkoutRequestPayload,
        checkoutState,
        paidCardAfterPayment,
        paidAfterPayment,
        customerOverviewState,
        customerLibraryState,
        customerOrdersState,
        customerHistoryState,
        ownerState,
        ownerCouponSavePayload,
        ownerCouponActionPayload,
        migratedOwnerState,
        ownerRetryState,
        webRouteState,
        webSearchState,
        webFavoritesState,
        webPaidState,
        webTelegramOpenState,
        webContentState,
        webCustomerState,
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
