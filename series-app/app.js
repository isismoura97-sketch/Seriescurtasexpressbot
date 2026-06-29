/**
 * Séries Curtas Express - Mini App Telegram
 * Versão 3.5 - Pix Prioritário e Webhook Robusto
 */

'use strict';

// ==================== CONFIGURAÇÃO ====================
const DEBUG = false;
const BUILD_VERSION = '20260628-05';
const TELEGRAM_BOT_USERNAME = 'ShortNovelsBot';
const OWNER_TELEGRAM_USER_ID = '1048601631';
let tg = null;
let userId = null;
const APP_LAUNCH_SERIE_ID = new URLSearchParams(window.location.search).get('play')
    || new URLSearchParams(window.location.search).get('serie_id')
    || '';
const APP_LAUNCH_PAYMENT_ORDER_ID = new URLSearchParams(window.location.search).get('payment_order_id') || '';
const API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api';
const SUPABASE_PROJECT_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co';
const PAYMENT_METHOD_STORAGE_KEY = 'checkout_payment_method';
const BUYER_EMAIL_STORAGE_KEY = 'checkout_buyer_email';
const ACTIVE_PAYMENT_ORDER_STORAGE_KEY = 'checkout_active_order';
const STATIC_PIX_QR_IMAGE_URL = `assets/pix-qr.png?v=${BUILD_VERSION}`;
const COVER_FALLBACKS = {
    '814e3fba-38ce-47d5-b554-9e6b26c6eb58': `assets/covers/marido-pobre-bilionario.webp?v=${BUILD_VERSION}`,
    'e9ea003f-36fd-4fa7-bb3b-6a8cef7fee15': `assets/covers/o-quaterback-perdido-retorna.webp?v=${BUILD_VERSION}`,
};

function sanitizeUserId(raw) {
    if (raw == null) return null;
    const str = String(raw);
    if (/^\d{1,20}$/.test(str)) return str;
    return null;
}

function resolveTelegramContext() {
    tg = window.Telegram?.WebApp ?? null;
    userId = sanitizeUserId(tg?.initDataUnsafe?.user?.id);
}

let allSeries = [];
let cart = [];
let currentSearchTerm = '';
let currentCategory = 'all';
let selectedPaymentMethod = localStorage.getItem(PAYMENT_METHOD_STORAGE_KEY) || 'pix_qr';
let buyerEmail = localStorage.getItem(BUYER_EMAIL_STORAGE_KEY) || '';
let activePaymentOrder = null;
let paymentStatusTimer = null;
let paymentStatusLoading = false;
if (!['mercado_pago_link', 'pix_qr', 'telegram_checkout'].includes(selectedPaymentMethod)) {
    selectedPaymentMethod = 'pix_qr';
}
try {
    cart = JSON.parse(localStorage.getItem('cart_series')) || [];
} catch (e) {
    console.warn('[CART] Falha ao restaurar carrinho do localStorage:', e.message);
    cart = [];
}

let currentHeroIndex = 0;
let heroInterval = null;
let playerRetryData = null;
let playerVideoEventsBound = false;

// ==================== SHARED UTILITIES ====================
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFBMjc0NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNGRkQ3MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TZW0gQ2FwYTwvdGV4dD48L3N2Zz4=';

function isFree(serie) {
    const price = Number(serie.price);
    return price === 0 || serie.price === null || serie.price === undefined;
}

function hasSeriesAccess(serie) {
    return isFree(serie) || serie?.has_access === true;
}

function normalizeId(value) {
    if (value == null) return '';
    return String(value);
}

function sameId(a, b) {
    return normalizeId(a) === normalizeId(b);
}

function saveCart(context = 'CART') {
    try {
        localStorage.setItem('cart_series', JSON.stringify(cart));
        return true;
    } catch (e) {
        console.warn(`[${context}] Falha ao salvar carrinho no localStorage:`, e.message);
        return false;
    }
}

function resetVideo() {
    DOM.mainVideo.pause();
    DOM.mainVideo.src = '';
    DOM.mainVideo.removeAttribute('src');
}

function handleSeriesClick(serie) {
    const playbackMode = getPlaybackMode(serie);

    if (hasSeriesAccess(serie)) {
        if (playbackMode === 'direct') {
            openPlayer(serie.id, serie.title);
            return;
        }

        if (playbackMode === 'telegram') {
            openPlayer(serie.id, serie.title);
            return;
        }

        showToast('Essa série ainda não possui vídeo disponível', 'info');
    }

    openModal(serie);
}

// ==================== CACHE DOM =====================
const DOM = {
    playerOverlay: document.getElementById('playerOverlay'),
    mainVideo: document.getElementById('mainVideo'),
    playerTitle: document.getElementById('playerTitle'),
    playerKicker: document.getElementById('playerKicker'),
    playerMeta: document.getElementById('playerMeta'),
    playerAccessChip: document.getElementById('playerAccessChip'),
    playerLoading: document.getElementById('playerLoading'),
    playerError: document.getElementById('playerError'),
    watermarkId: document.getElementById('watermarkId'),
    cartOverlay: document.getElementById('cartOverlay'),
    cartDrawer: document.getElementById('cartDrawer'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    paymentMethods: Array.from(document.querySelectorAll('[data-payment-method]')),
    buyerEmailField: document.getElementById('buyerEmailField'),
    buyerEmailInput: document.getElementById('buyerEmailInput'),
    paymentSummaryPanel: document.getElementById('paymentSummaryPanel'),
    paymentSummaryStatus: document.getElementById('paymentSummaryStatus'),
    paymentSummaryDetails: document.getElementById('paymentSummaryDetails'),
    paymentSummaryActions: document.getElementById('paymentSummaryActions'),
    cartBadge: document.getElementById('cartBadge'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalImg: document.getElementById('modalImg'),
    modalTitle: document.getElementById('modalTitle'),
    modalPrice: document.getElementById('modalPrice'),
    modalDesc: document.getElementById('modalDesc'),
    telegramGuide: document.getElementById('telegramGuide'),
    modalActions: document.getElementById('modalActions'),
    heroImg: document.getElementById('heroImg'),
    heroTitle: document.getElementById('heroTitle'),
    heroDesc: document.getElementById('heroDesc'),
    heroBadge: document.getElementById('heroBadge'),
    heroPlayBtn: document.getElementById('heroPlayBtn'),
    catalogGrid: document.getElementById('catalogGrid'),
    netflixScroll: document.getElementById('netflixScroll'),
    telegramScroll: document.getElementById('telegramScroll'),
    telegramRow: document.getElementById('telegramRow'),
    telegramRowCount: document.getElementById('telegramRowCount'),
    searchInput: document.getElementById('searchInput'),
    toastContainer: document.getElementById('toastContainer'),
    header: document.getElementById('header'),
    themeIcon: document.getElementById('themeIcon'),
    ownerBtn: document.getElementById('ownerBtn'),
    ownerOverlay: document.getElementById('ownerOverlay'),
    ownerCloseBtn: document.getElementById('ownerCloseBtn'),
    ownerLoginForm: document.getElementById('ownerLoginForm'),
    ownerPasswordInput: document.getElementById('ownerPasswordInput'),
    ownerLoginBtn: document.getElementById('ownerLoginBtn'),
    ownerStatus: document.getElementById('ownerStatus'),
    ownerDashboard: document.getElementById('ownerDashboard')
};

// ==================== UTILITIES ====================
function debugLog(...args) {
    if (DEBUG) console.log(...args);
}

function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return url;
    } catch (_) {}
    if (url.startsWith('data:image/')) return url;
    return '';
}

function withCacheBuster(url) {
    try {
        const parsed = new URL(url);
        parsed.searchParams.set('cb', BUILD_VERSION);
        return parsed.toString();
    } catch (_) {
        return url;
    }
}

function setPlayerErrorView({ iconClass, iconColor, title, description, buttonHtml, buttonHandler }) {
    const icon = document.getElementById('playerErrorIcon')?.querySelector('i');
    const titleNode = document.getElementById('playerErrorTitle');
    const descNode = document.getElementById('playerErrorDesc');
    const button = document.getElementById('playerErrorAction');

    if (icon) {
        icon.className = iconClass;
        icon.style.color = iconColor;
    }

    if (titleNode) {
        titleNode.textContent = title;
    }

    if (descNode) {
        descNode.textContent = description;
    }

    if (button) {
        button.innerHTML = buttonHtml;
        button.onclick = buttonHandler;
    }
}

function openTelegramPlayback(serieId, title, telegramFileId) {
    const safeTitle = title || 'esta série';
    const payload = JSON.stringify({
        action: 'play_video',
        serie_id: serieId,
        file_id: telegramFileId,
        title
    });

    try {
        if (tg && typeof tg.sendData === 'function') {
            tg.sendData(payload);
            showToast(`Enviando "${safeTitle}" para o Telegram...`, 'success');
            closePlayer();
            return true;
        }
    } catch (err) {
        console.warn('[PLAYER] Falha ao enviar dados ao Telegram:', err.message);
    }

    const startPayload = encodeURIComponent(`play_${serieId || telegramFileId}`);
    const deepLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${startPayload}`;

    try {
        if (tg && typeof tg.openTelegramLink === 'function') {
            tg.openTelegramLink(deepLink);
        } else {
            window.open(deepLink, '_blank', 'noopener,noreferrer');
        }
        showToast(`Abrindo "${safeTitle}" no Telegram...`, 'info');
        closePlayer();
        return true;
    } catch (err) {
        console.warn('[PLAYER] Falha ao abrir Telegram:', err.message);
        return false;
    }
}

function bindPlayerVideoEvents() {
    if (playerVideoEventsBound || !DOM.mainVideo) return;
    playerVideoEventsBound = true;

    DOM.mainVideo.addEventListener('loadeddata', () => {
        DOM.playerLoading?.classList.remove('active');
    });

    DOM.mainVideo.addEventListener('error', () => {
        if (DOM.playerOverlay?.classList.contains('active')) {
            showPlayerError();
        }
    });
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    debugLog(`[FETCH] ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const method = String(options.method || 'GET').toUpperCase();
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const hasContentType = Object.keys(headers).some(key => key.toLowerCase() === 'content-type');

    if (method !== 'GET' && method !== 'HEAD' && options.body != null && !hasContentType) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const res = await fetch(url, {
            cache: 'no-store',
            ...options,
            signal: controller.signal,
            headers
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (_) {}
            const error = new Error(data?.error || data?.message || `HTTP ${res.status}`);
            error.status = res.status;
            error.code = data?.code || '';
            error.data = data;
            throw error;
        }

        if (res.status === 204) return null;

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await res.json();
        }

        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (_) {
            return text;
        }

    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            showToast('Tempo de conexão esgotado', 'error');
            throw new Error('Timeout');
        }
        showToast('Erro de conexão', 'error');
        throw err;
    }
}

function formatPrice(price) {
    if (isFree({ price }) || isNaN(Number(price))) return 'GRÁTIS';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(price));
}

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const container = DOM.toastContainer;
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function savePaymentPrefs() {
    try {
        localStorage.setItem(PAYMENT_METHOD_STORAGE_KEY, selectedPaymentMethod);
        localStorage.setItem(BUYER_EMAIL_STORAGE_KEY, buyerEmail);
    } catch (e) {
        console.warn('[PAYMENT] Falha ao salvar preferências:', e.message);
    }
}

function isAwaitingPayment(order) {
    if (!order) return false;
    const status = String(order.status || '').toLowerCase();
    return ['created', 'pending', 'pending_payment', 'in_process', 'pending_review'].includes(status);
}

function getPaymentMethodLabel(method = selectedPaymentMethod) {
    switch (method) {
        case 'pix_qr':
            return 'Pix com QR Code';
        case 'telegram_checkout':
            return 'Checkout no Telegram';
        case 'mercado_pago_link':
        default:
            return 'Link Mercado Pago';
    }
}

function restoreActivePaymentOrder() {
    try {
        const raw = localStorage.getItem(ACTIVE_PAYMENT_ORDER_STORAGE_KEY);
        activePaymentOrder = raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('[PAYMENT] Falha ao restaurar pedido ativo:', e.message);
        activePaymentOrder = null;
    }
}

function saveActivePaymentOrder(order) {
    activePaymentOrder = order || null;
    try {
        if (activePaymentOrder) {
            localStorage.setItem(ACTIVE_PAYMENT_ORDER_STORAGE_KEY, JSON.stringify(activePaymentOrder));
        } else {
            localStorage.removeItem(ACTIVE_PAYMENT_ORDER_STORAGE_KEY);
        }
    } catch (e) {
        console.warn('[PAYMENT] Falha ao salvar pedido ativo:', e.message);
    }
}

function clearActivePaymentOrder() {
    saveActivePaymentOrder(null);
    stopPaymentStatusPolling();
    renderPaymentSummary(null);
}

function stopPaymentStatusPolling() {
    if (paymentStatusTimer) {
        clearInterval(paymentStatusTimer);
        paymentStatusTimer = null;
    }
}

function startPaymentStatusPolling(orderId) {
    stopPaymentStatusPolling();
    if (!orderId) return;
    paymentStatusTimer = setInterval(() => {
        refreshPaymentStatus(orderId, false);
    }, 7000);
}

function setCheckoutLoading(isLoading) {
    if (!DOM.checkoutBtn) return;
    DOM.checkoutBtn.disabled = isLoading;
    DOM.checkoutBtn.innerHTML = isLoading
        ? '<i class="fas fa-spinner fa-spin"></i> Processando...'
        : isAwaitingPayment(activePaymentOrder)
            ? '<i class="fas fa-credit-card"></i> Ver pagamento'
            : '<i class="fas fa-check"></i> Finalizar Compra';
}

function updatePaymentMethodUI() {
    DOM.paymentMethods?.forEach((button) => {
        const active = (button.dataset.paymentMethod || '') === selectedPaymentMethod;
        button.classList.toggle('active', active);
    });

    if (DOM.buyerEmailField) {
        DOM.buyerEmailField.hidden = selectedPaymentMethod !== 'pix_qr';
    }

    if (DOM.buyerEmailInput && buyerEmail) {
        DOM.buyerEmailInput.value = buyerEmail;
    }

    if (DOM.buyerEmailInput) {
        DOM.buyerEmailInput.required = selectedPaymentMethod === 'pix_qr';
    }
}

function sanitizeCheckoutItems(items) {
    return items.map((item) => ({
        id: normalizeId(item.id),
        title: item.title || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        cover_url: getCoverUrl(item),
    }));
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
}

function setPaymentSummaryLoading(message = 'Consultando pagamento...') {
    if (DOM.paymentSummaryStatus) {
        DOM.paymentSummaryStatus.textContent = message;
    }
}

function renderPaymentSummary(order) {
    if (!DOM.paymentSummaryPanel || !DOM.paymentSummaryDetails || !DOM.paymentSummaryActions || !DOM.paymentSummaryStatus) {
        return;
    }

    if (!order) {
        DOM.paymentSummaryPanel.hidden = true;
        DOM.paymentSummaryDetails.innerHTML = '';
        DOM.paymentSummaryActions.innerHTML = '';
        DOM.paymentSummaryStatus.textContent = '';
        setCheckoutLoading(false);
        return;
    }

    const method = order.payment_method || selectedPaymentMethod;
    const amount = Number(order.amount || 0);
    const status = String(order.status || 'created');
    const shortOrderId = String(order.order_id || '').slice(0, 8);
    const statusLabel = status === 'approved'
        ? 'Pago'
        : status === 'pending_payment' || status === 'created'
            ? 'Aguardando pagamento'
            : status;

    DOM.paymentSummaryPanel.hidden = false;
    DOM.paymentSummaryStatus.innerHTML = `
        <strong>${escapeHtml(statusLabel)}</strong>
        <div class="payment-subtitle">${escapeHtml(getPaymentMethodLabel(method))} • Pedido ${escapeHtml(shortOrderId || '---')}</div>
    `;

    const details = [];
    details.push(`<div class="payment-detail"><span>Total</span><strong>${escapeHtml(formatPrice(amount))}</strong></div>`);

    if (order.checkout_url) {
        details.push(`<div class="payment-detail"><span>Mercado Pago</span><strong>Página disponível</strong></div>`);
    }

    if (order.pix_qr_code) {
        details.push(`<div class="payment-detail"><span>Pix</span><strong>Código gerado</strong></div>`);
        const qrBase64 = String(order.pix_qr_code_base64 || '').trim();
        const qrCode = String(order.pix_qr_code || '').trim();
        const qrImageUrl = String(order.pix_qr_image_url || '').trim() || STATIC_PIX_QR_IMAGE_URL;
        if (qrBase64) {
            details.push(`
                <div class="payment-qr">
                    <img src="data:image/png;base64,${qrBase64}" alt="QR Code do Pix">
                </div>
            `);
        } else if (qrImageUrl) {
            details.push(`
                <div class="payment-qr">
                    <img src="${escapeHtml(qrImageUrl)}" alt="QR Code do Pix">
                </div>
            `);
        }
        if (qrCode) {
            details.push(`
                <div class="payment-code">
                    <textarea readonly>${escapeHtml(qrCode)}</textarea>
                </div>
            `);
        }
    }

    DOM.paymentSummaryDetails.innerHTML = details.join('');
    DOM.paymentSummaryActions.innerHTML = '';

    const openButton = document.createElement('button');
    openButton.className = 'btn btn-primary';
    if (method === 'pix_qr') {
        openButton.innerHTML = '<i class="fas fa-qrcode"></i> Copiar código Pix';
        openButton.addEventListener('click', async () => {
            if (order.pix_qr_code) {
                await copyToClipboard(order.pix_qr_code);
                showToast('Código Pix copiado!', 'success');
            }
        });
    } else if (method === 'telegram_checkout') {
        openButton.innerHTML = '<i class="fab fa-telegram"></i> Abrir bot';
        openButton.addEventListener('click', () => {
            openTelegramBotLink(`https://t.me/${TELEGRAM_BOT_USERNAME}`);
        });
    } else {
        openButton.innerHTML = '<i class="fas fa-arrow-up-right-from-square"></i> Abrir página Mercado Pago';
        openButton.addEventListener('click', () => {
            if (order.checkout_url) {
                openExternalLink(order.checkout_url);
            }
        });
    }

    DOM.paymentSummaryActions.appendChild(openButton);

    if (order.checkout_url) {
        const copyLinkButton = document.createElement('button');
        copyLinkButton.className = 'btn btn-secondary';
        copyLinkButton.innerHTML = '<i class="fas fa-copy"></i> Copiar link Mercado Pago';
        copyLinkButton.addEventListener('click', async () => {
            await copyToClipboard(order.checkout_url);
            showToast('Link de pagamento copiado!', 'success');
        });
        DOM.paymentSummaryActions.appendChild(copyLinkButton);
    }

    if (order.ticket_url) {
        const ticketButton = document.createElement('button');
        ticketButton.className = 'btn btn-secondary';
        ticketButton.innerHTML = '<i class="fas fa-receipt"></i> Abrir comprovante';
        ticketButton.addEventListener('click', () => openExternalLink(order.ticket_url));
        DOM.paymentSummaryActions.appendChild(ticketButton);
    }

    setCheckoutLoading(status !== 'approved');
}

async function copyToClipboard(text) {
    if (!text) return false;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        tempInput.remove();
        return true;
    } catch (e) {
        console.warn('[PAYMENT] Falha ao copiar texto:', e.message);
        return false;
    }
}

function openExternalLink(url) {
    if (!url) return;
    try {
        if (tg && typeof tg.openLink === 'function') {
            tg.openLink(url);
            return;
        }
    } catch (e) {
        console.warn('[PAYMENT] Falha ao abrir link no Telegram:', e.message);
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}

function openTelegramBotLink(url) {
    if (!url) return;
    try {
        if (tg && typeof tg.openTelegramLink === 'function') {
            tg.openTelegramLink(url);
            return;
        }
    } catch (e) {
        console.warn('[PAYMENT] Falha ao abrir link do Telegram:', e.message);
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}

async function requestJson(url, payload, timeout = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
        }
        return data;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function requestPaymentCreate(payload) {
    return await requestJson(`${API_URL}?action=checkout-create`, payload, 25000);
}

async function requestPaymentStatus(payload) {
    return await requestJson(`${API_URL}?action=payment-status`, payload, 15000);
}

async function requestOwnerSeriesSave(formData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const res = await fetch(`${API_URL}?action=owner-series-save`, {
            method: 'POST',
            cache: 'no-store',
            body: formData,
            signal: controller.signal
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
        }
        return data;
    } finally {
        clearTimeout(timeoutId);
    }
}

function markOrderItemsAsPurchased(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    if (!items.length) return;

    const purchasedIds = new Set(items.map((item) => normalizeId(item.id || item.serie_id || item.series_id)).filter(Boolean));
    if (!purchasedIds.size) return;

    allSeries = allSeries.map((serie) => (
        purchasedIds.has(normalizeId(serie.id))
            ? { ...serie, has_access: true }
            : serie
    ));
    refreshCatalog();
}

async function requestOwnerDashboard(password) {
    return await requestJson(`${API_URL}?action=owner-dashboard`, {
        init_data: tg?.initData || '',
        password
    }, 20000);
}

function isOwnerUser() {
    return normalizeId(userId) === OWNER_TELEGRAM_USER_ID;
}

function updateOwnerVisibility() {
    if (DOM.ownerBtn) {
        DOM.ownerBtn.hidden = !isOwnerUser();
    }
}

function setOwnerStatus(message = '', type = '') {
    if (!DOM.ownerStatus) return;
    DOM.ownerStatus.textContent = message;
    DOM.ownerStatus.className = `owner-status ${type}`.trim();
}

function setOwnerUploadStatus(message = '', type = '') {
    const status = document.getElementById('ownerUploadStatus');
    if (!status) return;
    status.textContent = message;
    status.className = `owner-status ${type}`.trim();
}

function getTrailerUrl(serie) {
    if (!serie) return '';

    if (typeof serie.trailer_url === 'string' && serie.trailer_url.trim()) {
        return sanitizeUrl(serie.trailer_url.trim());
    }
    if (typeof serie.trailer_storage_path === 'string' && serie.trailer_storage_path.trim()) {
        return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/trailers/${encodeURI(serie.trailer_storage_path)}`;
    }
    return '';
}

function formatOwnerDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Data indisponível';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function wireOwnerUploadForm() {
    const form = document.getElementById('ownerSeriesForm');
    const freeToggle = document.getElementById('ownerSeriesFree');
    const priceInput = document.getElementById('ownerSeriesPrice');

    if (freeToggle && priceInput) {
        const syncPriceState = () => {
            const isFree = Boolean(freeToggle.checked);
            priceInput.disabled = isFree;
            priceInput.required = !isFree;
            if (isFree) {
                priceInput.value = '0';
            }
        };

        freeToggle.onchange = syncPriceState;
        syncPriceState();
    }

    if (form) {
        form.onsubmit = submitOwnerSeriesUpload;
    }
}

function openOwnerArea() {
    if (!isOwnerUser()) {
        showToast('Área restrita ao proprietário', 'error');
        return;
    }

    DOM.ownerOverlay?.classList.add('active');
    document.body.classList.add('modal-open');
    setOwnerStatus('Digite a senha para carregar os dados.', '');
    DOM.ownerPasswordInput?.focus();
}

function closeOwnerArea() {
    DOM.ownerOverlay?.classList.remove('active');
    if (!DOM.cartDrawer?.classList.contains('active') && !DOM.modalOverlay?.classList.contains('active')) {
        document.body.classList.remove('modal-open');
    }
}

function formatOwnerCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function renderOwnerDashboard(data) {
    if (!DOM.ownerDashboard) return;

    const catalog = data?.catalog || {};
    const payments = data?.payments || {};
    const recentSeries = Array.isArray(data?.recent_series) ? data.recent_series : [];
    const statusCounts = payments.status_counts || {};
    const recentOrders = Array.isArray(payments.recent_orders) ? payments.recent_orders : [];

    const statusRows = Object.entries(statusCounts)
        .map(([status, count]) => `
            <div class="owner-list-row">
                <span>${escapeHtml(status)}</span>
                <strong>${escapeHtml(String(count))}</strong>
            </div>
        `)
        .join('') || '<div class="owner-list-row"><span>Nenhum pedido registrado</span><strong>0</strong></div>';

    const recentRows = recentOrders
        .map((order) => `
            <div class="owner-list-row">
                <span>${escapeHtml(order.order_id || '---')} • ${escapeHtml(order.payment_method || '---')} • ${escapeHtml(order.status || '---')}</span>
                <strong>${escapeHtml(formatOwnerCurrency(order.amount))}</strong>
            </div>
        `)
        .join('') || '<div class="owner-list-row"><span>Nenhum pedido recente</span><strong>-</strong></div>';

    const recentSeriesRows = recentSeries
        .map((serie) => {
            const trailerLabel = serie.has_trailer ? 'Trailer' : 'Sem trailer';
            const videoLabel = serie.has_video_url || serie.has_video_file_id ? 'Vídeo OK' : 'Sem vídeo';
            const coverLabel = serie.has_cover ? 'Capa OK' : 'Sem capa';
            const freeLabel = serie.is_free ? 'Grátis' : formatPrice(serie.price);
            return `
                <article class="owner-series-row">
                    <div class="owner-series-row-main">
                        <strong>${escapeHtml(serie.title || 'Sem título')}</strong>
                        <span>${escapeHtml([serie.category || 'Geral', freeLabel, formatOwnerDate(serie.created_at)].join(' • '))}</span>
                        <p>${escapeHtml(serie.description || 'Sem descrição')}</p>
                    </div>
                    <div class="owner-series-row-tags">
                        <span class="owner-pill">${escapeHtml(coverLabel)}</span>
                        <span class="owner-pill">${escapeHtml(videoLabel)}</span>
                        <span class="owner-pill">${escapeHtml(trailerLabel)}</span>
                    </div>
                </article>
            `;
        })
        .join('') || '<div class="owner-list-row"><span>Nenhuma série cadastrada ainda</span><strong>-</strong></div>';

    DOM.ownerDashboard.innerHTML = `
        <div class="owner-metrics">
            <div class="owner-card">
                <span>Séries no catálogo</span>
                <strong>${escapeHtml(String(catalog.series_total ?? 0))}</strong>
            </div>
            <div class="owner-card">
                <span>Séries com player</span>
                <strong>${escapeHtml(String(catalog.playable_series ?? 0))}</strong>
            </div>
            <div class="owner-card">
                <span>Episódios com File_ID</span>
                <strong>${escapeHtml(String(catalog.playable_episodes ?? 0))}</strong>
            </div>
        </div>
        <div class="owner-section">
            <h3>Nova série</h3>
            <form class="owner-upload-form" id="ownerSeriesForm" enctype="multipart/form-data">
                <div class="owner-upload-grid">
                    <label class="payment-field">
                        <span>Título</span>
                        <input type="text" name="title" placeholder="Nome da série" required>
                    </label>
                    <label class="payment-field">
                        <span>Categoria</span>
                        <input type="text" name="category" placeholder="Romance, Drama..." value="Geral" required>
                    </label>
                    <label class="payment-field owner-upload-span-2">
                        <span>Descrição</span>
                        <textarea name="description" rows="4" placeholder="Descreva a série" required></textarea>
                    </label>
                    <label class="owner-upload-toggle">
                        <input type="checkbox" name="is_free" id="ownerSeriesFree">
                        <span>Marcar como série gratuita</span>
                    </label>
                    <label class="payment-field">
                        <span>Preço</span>
                        <input type="number" name="price" id="ownerSeriesPrice" min="0" step="0.01" placeholder="0,00" value="0">
                    </label>
                    <label class="payment-field">
                        <span>Capa</span>
                        <input type="file" name="cover_file" accept="image/*" required>
                    </label>
                    <label class="payment-field">
                        <span>Trailer opcional</span>
                        <input type="file" name="trailer_file" accept="video/*">
                    </label>
                    <label class="payment-field">
                        <span>Vídeo completo</span>
                        <input type="file" name="video_file" accept="video/*" required>
                    </label>
                </div>
                <div class="owner-upload-actions">
                    <button class="btn btn-primary" type="submit">
                        <i class="fas fa-cloud-arrow-up"></i> Publicar série
                    </button>
                    <p class="owner-upload-note">O trailer é opcional. Se não houver trailer, basta deixar o campo vazio.</p>
                </div>
                <div class="owner-status" id="ownerUploadStatus"></div>
            </form>
        </div>
        <div class="owner-section">
            <h3>Saúde do Catálogo</h3>
            <div class="owner-list">
                <div class="owner-list-row"><span>Séries sem player</span><strong>${escapeHtml(String(catalog.missing_playback ?? 0))}</strong></div>
                <div class="owner-list-row"><span>Episódios cadastrados</span><strong>${escapeHtml(String(catalog.episodes_total ?? 0))}</strong></div>
                <div class="owner-list-row"><span>Séries com episódios em vídeo</span><strong>${escapeHtml(String(catalog.series_with_episode_files ?? 0))}</strong></div>
            </div>
        </div>
        <div class="owner-section">
            <h3>Pagamentos</h3>
            <div class="owner-list">
                <div class="owner-list-row"><span>Pedidos registrados</span><strong>${escapeHtml(String(payments.orders_total ?? 0))}</strong></div>
                <div class="owner-list-row"><span>Total aprovado</span><strong>${escapeHtml(formatOwnerCurrency(payments.approved_amount))}</strong></div>
                ${statusRows}
            </div>
        </div>
        <div class="owner-section">
            <h3>Séries recentes</h3>
            <div class="owner-series-list">${recentSeriesRows}</div>
        </div>
        <div class="owner-section">
            <h3>Pedidos Recentes</h3>
            <div class="owner-list">${recentRows}</div>
        </div>
    `;
    DOM.ownerDashboard.hidden = false;
    wireOwnerUploadForm();
}

async function submitOwnerLogin(event) {
    event?.preventDefault();
    if (!isOwnerUser()) return;

    const password = String(DOM.ownerPasswordInput?.value || '');
    if (!password) {
        setOwnerStatus('Informe a senha.', 'error');
        return;
    }

    if (DOM.ownerLoginBtn) {
        DOM.ownerLoginBtn.disabled = true;
        DOM.ownerLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    }
    setOwnerStatus('Validando acesso...', '');

    try {
        const data = await requestOwnerDashboard(password);
        renderOwnerDashboard(data);
        setOwnerStatus('Acesso validado.', 'success');
    } catch (error) {
        DOM.ownerDashboard.hidden = true;
        setOwnerStatus(error.message || 'Não foi possível abrir a área do proprietário.', 'error');
    } finally {
        if (DOM.ownerLoginBtn) {
            DOM.ownerLoginBtn.disabled = false;
            DOM.ownerLoginBtn.innerHTML = '<i class="fas fa-lock-open"></i> Entrar';
        }
    }
}

async function submitOwnerSeriesUpload(event) {
    event?.preventDefault();
    if (!isOwnerUser()) return;

    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;

    const formData = new FormData(form);
    formData.set('init_data', tg?.initData || '');
    formData.set('password', String(DOM.ownerPasswordInput?.value || ''));

    const submitButton = form.querySelector('button[type="submit"]');
    const previousLabel = submitButton?.innerHTML || '';

    try {
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
        }
        setOwnerUploadStatus('Enviando arquivos para o Supabase...', '');

        const payload = await requestOwnerSeriesSave(formData);
        const created = payload?.series || null;
        const dashboard = payload?.dashboard || null;

        if (created) {
            allSeries = [created, ...allSeries.filter((serie) => !sameId(serie.id, created.id))];
            refreshCatalog();
            initHero();
        }

        if (dashboard) {
            renderOwnerDashboard(dashboard);
        }

        setOwnerUploadStatus('Série publicada com sucesso.', 'success');

        form.reset();
        const freeToggle = document.getElementById('ownerSeriesFree');
        const priceInput = document.getElementById('ownerSeriesPrice');
        if (freeToggle instanceof HTMLInputElement && priceInput instanceof HTMLInputElement) {
            freeToggle.checked = false;
            priceInput.disabled = false;
            priceInput.required = true;
            priceInput.value = '0';
        }

        showToast('Série publicada com sucesso!', 'success');
    } catch (error) {
        setOwnerUploadStatus(error.message || 'Não foi possível publicar a série.', 'error');
        showToast(error.message || 'Falha ao publicar a série.', 'error');
    } finally {
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = false;
            submitButton.innerHTML = previousLabel || '<i class="fas fa-cloud-arrow-up"></i> Publicar série';
        }
    }
}

async function refreshPaymentStatus(orderId, shouldToast = true) {
    if (!orderId || paymentStatusLoading) return;
    paymentStatusLoading = true;

    try {
        const data = await requestPaymentStatus({
            init_data: tg?.initData || '',
            order_id: orderId
        });

        const order = data?.order || null;
        if (!order) return;

        saveActivePaymentOrder(order);
        renderPaymentSummary(order);

        const status = String(order.status || '');
        if (status === 'approved') {
            markOrderItemsAsPurchased(order);
            cart = [];
            saveCart('PAYMENT_APPROVED');
            updateCartUI();
            showToast('Pagamento confirmado! Seu acesso está pronto.', 'success');
            clearActivePaymentOrder();
            toggleCart(false);
            closeModal();
        } else if (status === 'rejected' || status === 'cancelled' || status === 'canceled' || status === 'expired') {
            stopPaymentStatusPolling();
            renderPaymentSummary(order);
            if (shouldToast) {
                showToast('Pagamento não concluído. Você pode tentar novamente.', 'error');
            }
        } else if (!paymentStatusTimer) {
            startPaymentStatusPolling(String(order.order_id || orderId || ''));
        }
    } catch (e) {
        debugLog('[PAYMENT] Status ainda não disponível ou indisponível:', e.message);
    } finally {
        paymentStatusLoading = false;
    }
}

// =================== FUNÇÃO CRÍTICA: OBTER URL DA CAPA ====================
function getCoverUrl(serie) {
    if (!serie) return PLACEHOLDER_IMAGE;
    
    let raw = null;
    if (serie.cover_url && serie.cover_url !== 'null' && serie.cover_url !== null) {
        raw = serie.cover_url;
    } else if (serie.cover_storage_path && serie.cover_storage_path !== 'null') {
        raw = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/covers/${encodeURI(serie.cover_storage_path)}`;
    } else if (serie.cover_path && serie.cover_path !== 'null') {
        raw = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/covers/${encodeURI(serie.cover_path)}`;
    }

    const seriesId = normalizeId(serie.id);
    const fallback = COVER_FALLBACKS[seriesId] || '';
    const normalizedRaw = String(raw || '').trim().replace(/\/+$/, '');
    const normalizedProject = SUPABASE_PROJECT_URL.replace(/\/+$/, '');
    if (normalizedRaw === normalizedProject && fallback) {
        return fallback;
    }

    const safe = raw ? sanitizeUrl(raw) : '';
    return safe || fallback || PLACEHOLDER_IMAGE;
}

function hasDirectPlaybackUrl(serie) {
    if (!serie) return false;

    return ['video_url', 'stream_url', 'media_url', 'url', 'video', 'stream', 'media', 'playback_url'].some(key => {
        const value = serie[key];
        return typeof value === 'string' && value.trim() && sanitizeUrl(value.trim());
    });
}

function getTelegramFileId(serie) {
    if (!serie) return '';

    for (const key of [
        'video_file_id',
        'file_id',
        'telegram_file_id',
        'episode_file_id',
        'preview_file_id',
        'videoFileId',
        'telegramFileId',
        'fileId',
        'previewFileId',
        'playback_file_id',
        'media_file_id',
    ]) {
        const value = serie[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }

    return '';
}

function findSeriesById(serieId) {
    return allSeries.find((serie) => sameId(serie.id, serieId)) || null;
}

function getPlaybackMode(serie) {
    if (hasDirectPlaybackUrl(serie)) return 'direct';
    if (getTelegramFileId(serie) || Number(serie?.playable_episode_count || 0) > 0) return 'telegram';
    return 'missing';
}

// ==================== INICIALIZAÇÃO ====================
async function init() {
    resolveTelegramContext();
    bindPlayerVideoEvents();
    restoreActivePaymentOrder();

    if (tg) {
        tg.ready();
        tg.expand();
    }

    applyTheme();
    updatePaymentMethodUI();
    updateOwnerVisibility();

    if (!userId) {
        if (DOM.heroTitle) DOM.heroTitle.textContent = 'Acesso Negado';
        if (DOM.heroDesc) DOM.heroDesc.textContent = 'Abra este app pelo Telegram.';
        return;
    }

    try {
        const url = new URL(API_URL);
        url.searchParams.set('action', 'series');
        if (tg?.initData) {
            url.searchParams.set('init_data', tg.initData);
        }
        const data = await fetchWithTimeout(withCacheBuster(url.toString()));
        allSeries = Array.isArray(data) ? data : [];
        debugLog(`[INIT] ${allSeries.length} éries carregadas`);

        renderNetflixRow(allSeries);
        refreshCatalog();
        initHero();
        updateCartUI();
        renderPaymentSummary(activePaymentOrder);

        if (isAwaitingPayment(activePaymentOrder)) {
            startPaymentStatusPolling(String(activePaymentOrder.order_id || ''));
            refreshPaymentStatus(String(activePaymentOrder.order_id || ''), false);
        }

        if (APP_LAUNCH_SERIE_ID) {
            const targetSerie = allSeries.find((serie) => sameId(serie.id, APP_LAUNCH_SERIE_ID));
            if (targetSerie) {
                setTimeout(() => {
                    if (hasSeriesAccess(targetSerie)) {
                        openPlayer(targetSerie.id, targetSerie.title);
                    } else {
                        openModal(targetSerie);
                    }
                }, 250);
            }
        }

        if (APP_LAUNCH_PAYMENT_ORDER_ID) {
            refreshPaymentStatus(APP_LAUNCH_PAYMENT_ORDER_ID, false);
        }
    } catch (err) {
        if (DOM.heroTitle) DOM.heroTitle.textContent = "Erro de Conexão";
        if (DOM.heroDesc) DOM.heroDesc.textContent = "Não foi possível carregar o catálogo.";
    }

    setupEventListeners();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function setupEventListeners() {
    window.addEventListener('scroll', () => {
        DOM.header?.classList.toggle('scrolled', window.scrollY > 50);
    });

    document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);
    DOM.ownerBtn?.addEventListener('click', openOwnerArea);
    DOM.ownerCloseBtn?.addEventListener('click', closeOwnerArea);
    DOM.ownerLoginForm?.addEventListener('submit', submitOwnerLogin);
    DOM.ownerOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'ownerOverlay') closeOwnerArea();
    });
    document.getElementById('cartBtn')?.addEventListener('click', () => toggleCart(true));
    DOM.checkoutBtn?.addEventListener('click', checkout);
    DOM.cartOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'cartOverlay') toggleCart(false);
    });

    DOM.paymentMethods?.forEach((button) => {
        button.addEventListener('click', () => {
            selectedPaymentMethod = button.dataset.paymentMethod || 'mercado_pago_link';
            savePaymentPrefs();
            updatePaymentMethodUI();
            if (selectedPaymentMethod === 'pix_qr') {
                DOM.buyerEmailInput?.focus();
            }
        });
    });

    DOM.buyerEmailInput?.addEventListener('input', (e) => {
        buyerEmail = String(e.target.value || '').trim();
        savePaymentPrefs();
    });

    DOM.searchInput?.addEventListener('input', (e) => searchSeries(e.target.value.trim()));

    document.querySelectorAll('.category-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const category = chip.dataset.category || 'all';
            filterCategory(category);
        });
    });

    document.querySelectorAll('.player-back, .player-close').forEach(btn => {
        btn.addEventListener('click', closePlayer);
    });

    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    DOM.modalOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (DOM.playerOverlay?.classList.contains('active')) closePlayer();
            else if (DOM.ownerOverlay?.classList.contains('active')) closeOwnerArea();
            else if (DOM.modalOverlay?.classList.contains('active')) closeModal();
            else if (DOM.cartDrawer?.classList.contains('active')) toggleCart(false);
        }
    });
}

// ==================== TEMA ====================
function applyTheme() {
    let isLight = false;
    try {
        isLight = localStorage.getItem('theme_series') === 'light';
    } catch (e) {
        console.warn('[THEME] Falha ao ler tema do localStorage:', e.message);
    }
    document.body.classList.toggle('light-mode', isLight);
    if (DOM.themeIcon) {
        DOM.themeIcon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    try {
        localStorage.setItem('theme_series', isLight ? 'light' : 'dark');
    } catch (e) {
        console.warn('[THEME] Falha ao salvar tema no localStorage:', e.message);
    }
    applyTheme();
    showToast(isLight ? 'Tema Claro ativado' : 'Tema Escuro ativado', 'success');
}

// =================== HERO ====================
function initHero() {
    if (!allSeries.length) return;
    currentHeroIndex = 0;
    updateHero(currentHeroIndex);
    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        currentHeroIndex = (currentHeroIndex + 1) % allSeries.length;
        updateHero(currentHeroIndex);
    }, 6000);
}

function updateHero(index) {
    const serie = allSeries[index];
    if (!serie || !DOM.heroTitle) return;

    DOM.heroTitle.textContent = serie.title || 'Destaque';
    DOM.heroDesc.textContent = serie.description || 'Uma história emocionante...';
    DOM.heroImg.src = getCoverUrl(serie);
    DOM.heroImg.alt = serie.title || '';

    const free = isFree(serie);
    DOM.heroBadge.className = free ? 'hero-badge-free' : 'hero-badge';
    DOM.heroBadge.innerHTML = free 
        ? '<i class="fas fa-gift"></i> GRÁTIS' 
        : '<i class="fas fa-fire"></i> Destaque da Semana';

    DOM.heroPlayBtn.style.display = 'inline-flex';
    DOM.heroPlayBtn.onclick = () => handleSeriesClick(serie);
}

// ==================== RENDERIZAÇÃO ====================
function renderNetflixRow(series) {
    const container = DOM.netflixScroll;
    const row = document.getElementById('netflixRow');
    if (!container || !row) return;
    container.innerHTML = '';
    if (!series.length) {
        row.style.display = 'none';
        return;
    }
    series.slice(0, 10).forEach(s => container.appendChild(createCard(s, true)));
    row.style.display = 'block';
}

function renderTelegramRow(series) {
    const container = DOM.telegramScroll;
    const row = DOM.telegramRow;
    if (!container || !row) return;

    const telegramSeries = series.filter(item => getPlaybackMode(item) === 'telegram');
    container.innerHTML = '';

    if (!telegramSeries.length) {
        row.style.display = 'none';
        return;
    }

    telegramSeries.slice(0, 6).forEach(s => container.appendChild(createCard(s, true)));
    if (DOM.telegramRowCount) {
        DOM.telegramRowCount.textContent = `${telegramSeries.length} título${telegramSeries.length === 1 ? '' : 's'}`;
    }
    row.style.display = 'block';
}

function renderGrid(series) {
    const grid = DOM.catalogGrid;
    if (!grid) return;
    grid.innerHTML = '';
    if (!series.length) {
        grid.innerHTML = '<p style="text-align:center; color:var(--gray); padding:40px 0;">Nenhuma série encontrada.</p>';
        return;
    }
    series.forEach(s => grid.appendChild(createCard(s, false)));
}

function getVisibleSeries() {
    let filtered = allSeries.slice();

    if (currentCategory === 'telegram') {
        filtered = filtered.filter(s => getPlaybackMode(s) === 'telegram');
    } else if (currentCategory !== 'all') {
        filtered = filtered.filter(s => s.category?.toLowerCase() === currentCategory);
    }

    if (currentSearchTerm) {
        filtered = filtered.filter(s => s.title?.toLowerCase().includes(currentSearchTerm));
    }

    return filtered;
}

function refreshCatalog() {
    renderGrid(getVisibleSeries());
    renderTelegramRow(getVisibleSeries());
}

function createCard(serie, isNetflix = false) {
    const card = document.createElement('div');
    card.className = isNetflix ? 'netflix-card' : 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const playbackMode = getPlaybackMode(serie);
    const telegramOnly = playbackMode === 'telegram';
    const missingPlayback = playbackMode === 'missing';
    card.dataset.id = normalizeId(serie.id);
    card.dataset.playback = playbackMode;
    card.setAttribute(
        'aria-label',
        missingPlayback
            ? `Abrir ${serie.title || 'série'} - vídeo indisponível`
            : telegramOnly
            ? `Abrir ${serie.title || 'série'} - reprodução via Telegram`
            : `Abrir ${serie.title || 'série'}`
    );

    const free = isFree(serie);
    const coverUrl = getCoverUrl(serie);
    const cover = document.createElement('div');
    cover.className = isNetflix ? 'netflix-cover' : 'card-cover';

    if (free) {
        const badge = document.createElement('div');
        badge.className = 'badge-gratis-landscape';
        badge.innerHTML = '<i class="fas fa-gift"></i> GRÁTIS';
        cover.appendChild(badge);
    }

    if (telegramOnly) {
        const badge = document.createElement('div');
        badge.className = 'badge-telegram-landscape';
        badge.innerHTML = '<i class="fab fa-telegram"></i> TELEGRAM';
        cover.appendChild(badge);
    }

    if (missingPlayback) {
        const badge = document.createElement('div');
        badge.className = 'badge-unavailable-landscape';
        badge.innerHTML = '<i class="fas fa-ban"></i> SEM VÍDEO';
        cover.appendChild(badge);
    }

    const img = document.createElement('img');
    img.src = coverUrl;
    img.alt = serie.title || '';
    img.loading = 'lazy';
    img.onerror = function() { this.src = PLACEHOLDER_IMAGE; };
    cover.appendChild(img);
    card.appendChild(cover);

    const infoDiv = document.createElement('div');
    infoDiv.className = isNetflix ? 'netflix-info' : 'card-info';
    const titleDiv = document.createElement('div');
    titleDiv.className = isNetflix ? 'netflix-title' : 'card-title';
    titleDiv.textContent = serie.title || '';
    infoDiv.appendChild(titleDiv);

    if (!free) {
        const actions = document.createElement('div');
        actions.className = 'card-actions';
        const buyBtn = document.createElement('button');
        buyBtn.type = 'button';
        buyBtn.className = 'card-cart-btn';
        buyBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Carrinho';
        buyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addToCart(serie);
        });
        actions.appendChild(buyBtn);
        infoDiv.appendChild(actions);
    }
    card.appendChild(infoDiv);

    card.addEventListener('click', () => handleSeriesClick(serie));
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSeriesClick(serie);
        }
    });

    return card;
}

// =================== PLAYER - CORRIGIDO (@444 FIX) ===================
async function openPlayer(serieId, title) {
    if (!DOM.playerOverlay || !DOM.mainVideo || !DOM.playerLoading || !DOM.playerError) {
        console.error('[PLAYER] Elementos DOM do player não encontrados');
        showToast('Erro interno: player indisponível', 'error');
        return;
    }

    const sourceSerie = findSeriesById(serieId);
    playerRetryData = {
        id: serieId,
        title: title || sourceSerie?.title || 'Reproduzir',
        telegramFileId: getTelegramFileId(sourceSerie),
    };
    const playbackMode = getPlaybackMode(sourceSerie);
    const hasAccess = hasSeriesAccess(sourceSerie);
    const isDirect = playbackMode === 'direct';
    const isTelegramPlayback = playbackMode === 'telegram';
    const isFreeContent = isFree(sourceSerie);

    DOM.playerOverlay.classList.add('active');
    DOM.playerLoading.classList.add('active');
    DOM.playerError.classList.remove('active');
    DOM.mainVideo.style.display = 'none';
    if (DOM.playerTitle) DOM.playerTitle.textContent = title || 'Reproduzir';
    if (DOM.playerKicker) {
        DOM.playerKicker.innerHTML = isTelegramPlayback
            ? '<i class="fas fa-satellite-dish"></i> Reprodução pelo Telegram'
            : hasAccess
                ? '<i class="fas fa-circle-check"></i> Reprodução liberada'
                : '<i class="fas fa-film"></i> Carregando mídia';
    }
    if (DOM.playerMeta) {
        DOM.playerMeta.textContent = isTelegramPlayback
            ? 'Se o navegador travar, use o botão para abrir a reprodução no bot.'
            : isFreeContent
                ? 'Conteúdo gratuito com acesso direto no player.'
                : 'Conteúdo liberado após pagamento confirmado.';
    }
    if (DOM.playerAccessChip) {
        DOM.playerAccessChip.innerHTML = isTelegramPlayback
            ? '<i class="fab fa-telegram"></i> Telegram'
            : isFreeContent
                ? '<i class="fas fa-gift"></i> GRÁTIS'
                : hasAccess
                    ? '<i class="fas fa-unlock"></i> LIBERADO'
                    : '<i class="fas fa-lock"></i> PAGO';
    }
    if (DOM.watermarkId) DOM.watermarkId.textContent = userId || '---';

    resetVideo();

    try {
        const url = new URL(API_URL);
        url.searchParams.set('action', 'stream');
        url.searchParams.set('serie_id', serieId);
        if (tg?.initData) {
            url.searchParams.set('init_data', tg.initData);
        }

        const data = await fetchWithTimeout(withCacheBuster(url.toString()));
        
        if (data.url) {
            const safeVideoUrl = sanitizeUrl(data.url);
            if (!safeVideoUrl) throw new Error('URL de vídeo invalida');
            DOM.mainVideo.setAttribute('src', safeVideoUrl);
            DOM.mainVideo.style.display = 'block';
            
            const playPromise = DOM.mainVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('[PLAYER] Autoplay bloqueado:', err.name);
                    showToast('Toque no vídeo para reproduzir', 'info');
                });
            }
        } else if ((data.type === 'telegram_file' || data.file_id) && data.file_id) {
            playerRetryData = { id: serieId, title: title || sourceSerie?.title || 'Reproduzir', telegramFileId: data.file_id };
            const telegramDescription = data.reason || 'Este título usa um arquivo do Telegram. Abra no bot para continuar a reprodução.';
            DOM.mainVideo.style.display = 'none';
            setPlayerErrorView({
                iconClass: 'fab fa-telegram',
                iconColor: '#2AABEE',
                title: 'Reprodução via Telegram',
                description: telegramDescription,
                buttonHtml: '<i class="fab fa-telegram"></i> Abrir no Telegram',
                buttonHandler: () => openTelegramPlayback(serieId, title, data.file_id)
            });
            DOM.playerError.classList.add('active');
            return;
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('URL de vídeo não retornada');
        }
    } catch (err) {
        if (err.status === 402 || err.code === 'payment_required') {
            closePlayer();
            if (sourceSerie) openModal(sourceSerie);
            showToast('Finalize o pagamento para assistir esta série.', 'info');
            return;
        }
        showPlayerError();
    }
}

function showPlayerError() {
    DOM.playerLoading.classList.remove('active');
    DOM.mainVideo.style.display = 'none';
    const telegramFileId = playerRetryData?.telegramFileId || '';
    const canFallbackToTelegram = Boolean(telegramFileId);
    setPlayerErrorView({
        iconClass: 'fas fa-exclamation-triangle',
        iconColor: '#ff4444',
        title: canFallbackToTelegram ? 'Abra no Telegram' : 'Erro ao reproduzir o vídeo',
        description: canFallbackToTelegram
            ? 'A reprodução direta falhou, mas este título pode continuar no Telegram.'
            : 'Tente novamente. Se o erro persistir, o player pode depender de abertura no Telegram.',
        buttonHtml: canFallbackToTelegram
            ? '<i class="fab fa-telegram"></i> Abrir no Telegram'
            : '<i class="fas fa-redo"></i> Tentar Novamente',
        buttonHandler: canFallbackToTelegram
            ? () => openTelegramPlayback(playerRetryData.id, playerRetryData.title, telegramFileId)
            : retryPlayer
    });
    DOM.playerError.classList.add('active');
}

function retryPlayer() {
    if (!playerRetryData) return;

    if (playerRetryData.telegramFileId) {
        openTelegramPlayback(playerRetryData.id, playerRetryData.title, playerRetryData.telegramFileId);
        return;
    }

    openPlayer(playerRetryData.id, playerRetryData.title);
}

function closePlayer() {
    resetVideo();
    DOM.playerOverlay.classList.remove('active');
    DOM.playerError.classList.remove('active');
    DOM.playerLoading.classList.remove('active');
    if (DOM.playerMeta) DOM.playerMeta.textContent = 'Abra diretamente no player.';
}

// =================== MODAL ====================
function openModal(serie) {
    if (!serie) return;
    if (!DOM.modalOverlay || !DOM.modalImg || !DOM.modalTitle || !DOM.modalDesc || !DOM.modalPrice || !DOM.modalActions) {
        console.error('[MODAL] Elementos DOM do modal não encontrados');
        showToast('Erro interno: modal indisponível', 'error');
        return;
    }
    DOM.modalImg.src = getCoverUrl(serie);
    DOM.modalTitle.textContent = serie.title || 'Série';
    
    const free = isFree(serie);
    const hasAccess = hasSeriesAccess(serie);
    const playbackMode = getPlaybackMode(serie);
    const telegramFileId = getTelegramFileId(serie);
    const trailerUrl = getTrailerUrl(serie);
    if (DOM.telegramGuide) {
        DOM.telegramGuide.hidden = playbackMode !== 'telegram';
    }

    const baseDescription = serie.description || 'Sem descrição disponível.';
    DOM.modalDesc.textContent = playbackMode === 'telegram'
        ? `${baseDescription} Este título é grande demais para tocar no navegador, então vamos abrir no Telegram.`
        : baseDescription;

    if (!free && hasAccess) {
        DOM.modalPrice.innerHTML = '<span class="free-badge"><i class="fas fa-unlock"></i> ACESSO LIBERADO</span>';
    } else if (free && playbackMode === 'telegram') {
        DOM.modalPrice.innerHTML = '<span class="telegram-badge"><i class="fab fa-telegram"></i> ASSISTIR NO TELEGRAM</span>';
    } else {
        DOM.modalPrice.innerHTML = free 
            ? '<span class="free-badge"><i class="fas fa-gift"></i> GRÁTIS</span>'
            : `<span>${formatPrice(serie.price)}</span>`;
    }

    DOM.modalActions.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = free ? 'btn btn-free' : 'btn btn-primary';

    if (!free && hasAccess && playbackMode !== 'missing') {
        btn.className = 'btn btn-free';
        btn.innerHTML = '<i class="fas fa-play"></i> ASSISTIR AGORA';
    } else if (free && playbackMode === 'direct') {
        btn.className = 'btn btn-free';
        btn.innerHTML = '<i class="fas fa-play"></i> ASSISTIR AGORA';
    } else if (free && playbackMode === 'telegram') {
        btn.className = 'btn btn-telegram';
        btn.innerHTML = '<i class="fab fa-telegram"></i> ABRIR NO TELEGRAM';
    } else if (free) {
        btn.className = 'btn btn-secondary';
        btn.innerHTML = '<i class="fas fa-ban"></i> VÍDEO INDISPONÍVEL';
    } else {
        btn.innerHTML = '<i class="fas fa-cart-plus"></i> Adicionar ao Carrinho';
    }
    
    btn.onclick = () => {
        closeModal();
        if (!free && hasAccess && playbackMode !== 'missing') {
            openPlayer(serie.id, serie.title);
        } else if (free && playbackMode === 'direct') {
            openPlayer(serie.id, serie.title);
        } else if (free && playbackMode === 'telegram') {
            if (telegramFileId) {
                openTelegramPlayback(serie.id, serie.title, telegramFileId);
            } else {
                showToast('Este título será encaminhado ao Telegram para abrir o bot correto.', 'info');
                openPlayer(serie.id, serie.title);
            }
        } else if (free) {
            showToast('Essa série ainda não possui vídeo disponível', 'info');
        } else {
            addToCart(serie);
        }
    };
    
    DOM.modalActions.appendChild(btn);

    if (trailerUrl) {
        const trailerBtn = document.createElement('button');
        trailerBtn.className = 'btn btn-secondary';
        trailerBtn.innerHTML = '<i class="fas fa-film"></i> Ver trailer';
        trailerBtn.onclick = () => {
            closeModal();
            window.open(trailerUrl, '_blank', 'noopener,noreferrer');
        };
        DOM.modalActions.appendChild(trailerBtn);
    }

    DOM.modalOverlay.classList.add('active');
    document.body.classList.add('modal-open');
}

function closeModal() {
    DOM.modalOverlay?.classList.remove('active');
    if (!DOM.cartDrawer?.classList.contains('active')) {
        document.body.classList.remove('modal-open');
    }
}

// =================== CARRINHO ====================
function toggleCart(open) {
    if (!DOM.cartDrawer || !DOM.cartOverlay) {
        console.error('[CART] Elementos DOM do carrinho não encontrados');
        return;
    }
    const isOpen = typeof open === 'boolean' ? open : !DOM.cartDrawer.classList.contains('active');
    DOM.cartOverlay.classList.toggle('active', isOpen);
    DOM.cartDrawer.classList.toggle('active', isOpen);
    if (!DOM.modalOverlay?.classList.contains('active')) {
        document.body.classList.toggle('modal-open', isOpen);
    }
    if (isOpen) updateCartUI();
}

function updateCartUI() {
    const container = DOM.cartItems;

    if (DOM.cartBadge) {
        DOM.cartBadge.textContent = cart.length;
        DOM.cartBadge.style.display = cart.length > 0 ? 'flex' : 'none';
    }

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px; color:var(--gray);">
                <i class="fas fa-shopping-basket" style="font-size:48px; opacity:0.3; margin-bottom:16px"></i>
                <p>Seu carrinho está vazio</p>
            </div>`;
        if (DOM.cartTotal) {
            DOM.cartTotal.textContent = 'R$ 0,00';
        }
    } else {
        let total = 0;
        container.innerHTML = '';
        cart.forEach(item => {
            total += parseFloat(item.price) || 0;
            const div = document.createElement('div');
            div.className = 'cart-item';

            const cartImg = document.createElement('img');
            cartImg.src = getCoverUrl(item);
            cartImg.alt = item.title || '';
            cartImg.onerror = function() { this.src = PLACEHOLDER_IMAGE; };
            div.appendChild(cartImg);

            const info = document.createElement('div');
            info.className = 'cart-item-info';
            const titleDiv = document.createElement('div');
            titleDiv.className = 'cart-item-title';
            titleDiv.textContent = item.title || '';
            const priceDiv = document.createElement('div');
            priceDiv.className = 'cart-item-price';
            priceDiv.textContent = formatPrice(item.price);
            info.appendChild(titleDiv);
            info.appendChild(priceDiv);
            div.appendChild(info);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'cart-item-remove';
            removeBtn.setAttribute('aria-label', 'Remover');
            removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
            div.appendChild(removeBtn);
            removeBtn.addEventListener('click', () => removeFromCart(item.id));
            container.appendChild(div);
        });

        if (DOM.cartTotal) {
            DOM.cartTotal.textContent = formatPrice(total);
        }
    }

    if (DOM.checkoutBtn) {
        const hasPendingOrder = isAwaitingPayment(activePaymentOrder);
        DOM.checkoutBtn.disabled = !cart.length && !hasPendingOrder;
        DOM.checkoutBtn.innerHTML = hasPendingOrder
            ? '<i class="fas fa-credit-card"></i> Ver pagamento'
            : '<i class="fas fa-check"></i> Finalizar Compra';
    }

    renderPaymentSummary(activePaymentOrder);
}

function addToCart(serie) {
    if (!serie || cart.some(item => sameId(item.id, serie.id))) {
        showToast('Já está no carrinho!', 'error');
        return;
    }
    cart.push(serie);
    if (!saveCart()) {
        showToast('Item adicionado, mas não será salvo entre sessões', 'error');
    }
    updateCartUI();
    toggleCart(true);
    showToast('Adicionado ao carrinho!', 'success');
}

function removeFromCart(id) {
    cart = cart.filter(item => !sameId(item.id, id));
    saveCart();
    updateCartUI();
}

function checkout() {
    if (isAwaitingPayment(activePaymentOrder)) {
        showToast('Você já tem um pagamento em aberto. Consulte o painel abaixo.', 'info');
        toggleCart(true);
        return;
    }

    if (!cart.length) return showToast('Carrinho vazio!', 'error');

    const checkoutItems = sanitizeCheckoutItems(cart);
    const buyerEmailValue = String(DOM.buyerEmailInput?.value || buyerEmail || '').trim();

    if (selectedPaymentMethod === 'pix_qr' && (!buyerEmailValue || (DOM.buyerEmailInput && !DOM.buyerEmailInput.checkValidity()))) {
        showToast('Informe um e-mail válido para gerar o Pix.', 'error');
        DOM.buyerEmailInput?.focus();
        return;
    }

    buyerEmail = buyerEmailValue;
    savePaymentPrefs();
    setCheckoutLoading(true);

    requestPaymentCreate({
        init_data: tg?.initData || '',
        payment_method: selectedPaymentMethod,
        buyer_email: buyerEmail || '',
        buyer_name: tg?.initDataUnsafe?.user?.first_name || '',
        items: checkoutItems,
        total: getCartTotal(),
    }).then((data) => {
        const order = data?.order || null;
        if (!order) {
            throw new Error('Pedido não retornado');
        }

        saveActivePaymentOrder(order);
        renderPaymentSummary(order);
        if (String(order.status || '') === 'approved') {
            markOrderItemsAsPurchased(order);
        } else if (order.status) {
            startPaymentStatusPolling(String(order.order_id || ''));
            refreshPaymentStatus(String(order.order_id || ''), false);
        }
        cart = [];
        saveCart('CHECKOUT');
        updateCartUI();
        showToast('Pedido criado. Acompanhe o pagamento abaixo.', 'success');

        if (selectedPaymentMethod !== 'pix_qr' && order.checkout_url) {
            openExternalLink(order.checkout_url);
        }
    }).catch((err) => {
        console.error('[CHECKOUT] Falha ao criar pedido:', err.message);
        showToast(err.message || 'Erro ao finalizar compra. Tente novamente.', 'error');
    }).finally(() => {
        setCheckoutLoading(false);
    });
}

// ==================== FILTROS ====================
function filterCategory(category) {
    currentCategory = (category || 'all').trim().toLowerCase();
    refreshCatalog();
}

function searchSeries(term) {
    currentSearchTerm = (term || '').trim().toLowerCase();
    refreshCatalog();
}

// =================== EXPORT GLOBAL }
window.retryPlayer = retryPlayer;
window.toggleCart = toggleCart;
window.openModal = openModal;
window.closeModal = closeModal;
window.checkout = checkout;
window.searchSeries = searchSeries;


