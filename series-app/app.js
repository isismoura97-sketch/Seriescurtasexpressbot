/**
 * Séries Curtas Express - Mini App Telegram
 * Versão 3.6 - Entrega Protegida via Telegram
 */

'use strict';

window.si = window.si || function () {
    (window.siq = window.siq || []).push(arguments);
};

// ==================== CONFIGURAÇÃO ====================
const DEBUG = false;
const BUILD_VERSION = '20260715-02';
const TELEGRAM_BOT_USERNAME = 'ShortNovelsBot';
const OWNER_INTERNAL_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;
const OWNER_LOGO_IMAGE = `/assets/logo-welcome.png?v=${BUILD_VERSION}`;
const TELEGRAM_BOT_LINK = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
let tg = null;
let userId = null;
const APP_LAUNCH_SERIE_ID = new URLSearchParams(window.location.search).get('play')
    || new URLSearchParams(window.location.search).get('serie_id')
    || '';
const APP_LAUNCH_PAYMENT_ORDER_ID = new URLSearchParams(window.location.search).get('payment_order_id') || '';
const APP_LAUNCH_CHECKOUT_RECOVERY = new URLSearchParams(window.location.search).get('checkout_recovery') === '1';
const API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api';
const SUPABASE_PROJECT_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co';
const PAYMENT_METHOD_STORAGE_KEY = 'checkout_payment_method';
const BUYER_EMAIL_STORAGE_KEY = 'checkout_buyer_email';
const ACTIVE_PAYMENT_ORDER_STORAGE_KEY = 'checkout_active_order';
const FAVORITES_STORAGE_KEY = 'series_favorites';
const CART_UPDATED_AT_STORAGE_KEY = 'cart_updated_at';
const CART_ABANDONMENT_REPORTED_AT_STORAGE_KEY = 'cart_abandonment_reported_at';
const ANALYTICS_SESSION_STORAGE_KEY = 'analytics_session_id';
const ANALYTICS_ENDPOINT = `${API_URL}?action=analytics-event`;
const STATIC_PIX_QR_IMAGE_URL = `/assets/pix-qr.png?v=${BUILD_VERSION}`;
const SUPPORT_INBOX_EMAIL = 'isismoura97@gmail.com';
const COVER_FALLBACKS = {
    '814e3fba-38ce-47d5-b554-9e6b26c6eb58': `/assets/covers/marido-pobre-bilionario.webp?v=${BUILD_VERSION}`,
    'e9ea003f-36fd-4fa7-bb3b-6a8cef7fee15': `/assets/covers/o-quaterback-perdido-retorna.webp?v=${BUILD_VERSION}`,
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
    const isTelegram = Boolean(tg?.initData && userId);
    appContext = {
        isTelegram,
        isMobile: window.matchMedia('(max-width: 767px)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),
        user: isTelegram ? tg.initDataUnsafe.user : null,
        theme: isTelegram ? String(tg.colorScheme || 'dark') : (document.body.classList.contains('light-mode') ? 'light' : 'dark'),
        openTelegramLink: openTelegramBotLink,
        openExternalLink,
    };
    document.documentElement.dataset.runtime = isTelegram ? 'telegram' : 'web';
    document.body.classList.toggle('runtime-telegram', isTelegram);
    document.body.classList.toggle('runtime-web', !isTelegram);
}

let appContext = {
    isTelegram: false,
    isMobile: false,
    user: null,
    theme: 'dark',
    openTelegramLink: openTelegramBotLink,
    openExternalLink,
};

function getTelegramContext() {
    return { ...appContext };
}

function slugify(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100);
}

function getSeriesSlug(serie) {
    return String(serie?.slug || '').trim() || slugify(serie?.title || serie?.id || 'serie');
}

function buildTelegramSeriesLink(serie) {
    const seriesId = normalizeId(serie?.id);
    return `${TELEGRAM_BOT_LINK}${seriesId ? `?start=serie_${encodeURIComponent(seriesId)}` : ''}`;
}

let allSeries = [];
let cart = [];
let activeCoupon = null;
let cartSyncTimer = null;
let currentSearchTerm = '';
let currentCategory = 'all';
let searchDebounceTimer = null;
let selectedPaymentMethod = localStorage.getItem(PAYMENT_METHOD_STORAGE_KEY) || 'pix_qr';
let buyerEmail = localStorage.getItem(BUYER_EMAIL_STORAGE_KEY) || '';
let activePaymentOrder = null;
let paymentStatusTimer = null;
let paymentStatusLoading = false;
const deliveryInFlightIds = new Set();
let activeSeriesProgressMeta = null;
let lastProgressSyncAt = 0;
let lastProgressSnapshotKey = '';
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
let favoriteSeriesIds = new Set();
let playerResumeAppliedSeriesId = '';
let ownerSeriesCatalog = [];
let ownerSeriesEditId = '';
let ownerCoverPreviewObjectUrl = '';
let ownerDashboardSnapshot = null;
let ownerSeriesSearchTerm = '';
let ownerSeriesFilterMode = 'all';
let ownerCouponEditCode = '';
let ownerSessionAuthorized = false;
let supportRequestPending = false;
let customerAreaSnapshot = null;
let customerAreaLoadedAt = 0;
const ownerOrderRetryInFlightIds = new Set();

function getAnalyticsSessionId() {
    try {
        let sessionId = localStorage.getItem(ANALYTICS_SESSION_STORAGE_KEY);
        if (!sessionId) {
            sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(ANALYTICS_SESSION_STORAGE_KEY, sessionId);
        }
        return sessionId;
    } catch (_) {
        return '';
    }
}

function trackAnalyticsEvent(eventName, details = {}) {
    if (!userId || !tg?.initData || !eventName) return;
    const payload = {
        init_data: tg.initData,
        event_id: details.event_id || details.eventId || globalThis.crypto?.randomUUID?.()
            || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        event_name: eventName,
        series_id: details.series_id || details.seriesId || '',
        order_id: details.order_id || details.orderId || '',
        session_id: getAnalyticsSessionId(),
        metadata: details.metadata || {},
    };
    fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        cache: 'no-store',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
    }).catch((error) => debugLog('[ANALYTICS] Evento não enviado:', error?.message || error));
}

function trackStaleCartAbandonment() {
    if (!cart.length || !userId) return;
    let updatedAt = 0;
    try {
        updatedAt = Number(localStorage.getItem(CART_UPDATED_AT_STORAGE_KEY) || 0);
    } catch (_) {
        return;
    }
    let reportedAt = 0;
    try {
        reportedAt = Number(localStorage.getItem(CART_ABANDONMENT_REPORTED_AT_STORAGE_KEY) || 0);
    } catch (_) {
        return;
    }
    if (!updatedAt || reportedAt >= updatedAt || Date.now() - updatedAt < 30 * 60 * 1000) return;
    trackAnalyticsEvent('cart_abandoned', {
        event_id: `cart-abandoned:${userId}:${updatedAt}`,
        metadata: { item_count: cart.length, reason: 'stale_cart' },
    });
    try {
        localStorage.setItem(CART_ABANDONMENT_REPORTED_AT_STORAGE_KEY, String(updatedAt));
    } catch (_) {
        // analytics is best effort
    }
}

// ==================== SHARED UTILITIES ====================
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFBMjc0NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNGRkQ3MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TZW0gQ2FwYTwvdGV4dD48L3N2Zz4=';

function isFree(serie) {
    if (!serie) return false;
    const accessType = String(serie.access_type || '').trim().toLowerCase();
    if (accessType === 'free') return true;
    if (accessType === 'paid') return false;
    return getSeriesPriceValue(serie) <= 0;
}

function getSeriesCurrency(serie) {
    const currency = String(serie?.currency || '').trim().toUpperCase();
    return currency || 'BRL';
}

function getSeriesPriceValue(serie) {
    if (!serie) return 0;
    const cents = Number(serie.price_cents);
    if (Number.isFinite(cents) && cents > 0) {
        return Number((cents / 100).toFixed(2));
    }
    const raw = Number(serie.price);
    if (Number.isFinite(raw) && raw > 0) {
        return Number(raw.toFixed(2));
    }
    const accessType = String(serie.access_type || '').trim().toLowerCase();
    if (accessType === 'paid') {
        return 5.9;
    }
    return 0;
}

function hasSeriesAccess(serie) {
    return isFree(serie) || serie?.has_access === true || isOwnerUser();
}

function hasKnownPlayback(serie) {
    return Boolean(
        serie?.has_playback ||
        serie?.has_video_url ||
        serie?.has_video_file_id ||
        hasDirectPlaybackUrl(serie) ||
        getTelegramFileId(serie) ||
        Number(serie?.playable_episode_count || 0) > 0
    );
}

function isPlaybackLocked(serie) {
    return Boolean(serie && !hasSeriesAccess(serie) && !isFree(serie) && hasKnownPlayback(serie));
}

function normalizeId(value) {
    if (value == null) return '';
    return String(value);
}

function sameId(a, b) {
    return normalizeId(a) === normalizeId(b);
}

function restoreFavoriteSeries() {
    try {
        const raw = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
        favoriteSeriesIds = new Set(Array.isArray(raw) ? raw.map(normalizeId).filter(Boolean) : []);
    } catch (_) {
        favoriteSeriesIds = new Set();
    }
}

function saveFavoriteSeries() {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favoriteSeriesIds)));
        return true;
    } catch (_) {
        return false;
    }
}

function isFavoriteSeries(serieId) {
    return favoriteSeriesIds.has(normalizeId(serieId));
}

function applySeriesUserStatePatch(serieId, patch = {}) {
    const normalizedId = normalizeId(serieId);
    if (!normalizedId || !patch || typeof patch !== 'object') return;
    allSeries = allSeries.map((serie) => (
        sameId(serie.id, normalizedId)
            ? { ...serie, ...patch }
            : serie
    ));
}

function syncFavoriteStateToSeries(serieId, isFavorite) {
    applySeriesUserStatePatch(serieId, {
        is_favorite: Boolean(isFavorite),
    });
}

function applyProgressStateToSeries(serieId, progress) {
    if (!progress || typeof progress !== 'object') return;
    applySeriesUserStatePatch(serieId, {
        last_position_seconds: Number(progress.last_position_seconds ?? progress.position_seconds ?? 0) || 0,
        duration_seconds: Number(progress.duration_seconds ?? progress.duration ?? 0) || 0,
        completion_percent: Number(progress.completion_percent ?? progress.progress_percent ?? 0) || 0,
        last_event: String(progress.last_event ?? progress.event_type ?? '').trim(),
        last_playback_mode: String(progress.last_playback_mode ?? progress.playback_mode ?? '').trim(),
        completed: progress.completed === true,
        has_progress: true,
        last_opened_at: progress.last_opened_at || progress.updated_at || null,
    });
}

function getSeriesResumeSeconds(serie) {
    const seconds = Number(serie?.last_position_seconds ?? 0);
    if (!Number.isFinite(seconds) || seconds <= 5) return 0;
    if (serie?.completed === true) return 0;
    const completion = Number(serie?.completion_percent ?? 0);
    if (Number.isFinite(completion) && completion >= 95) return 0;
    return seconds;
}

function hydrateFavoriteSeriesFromCatalog(series) {
    const serverFavorites = Array.isArray(series)
        ? series
            .filter((serie) => serie?.is_favorite === true)
            .map((serie) => normalizeId(serie.id))
            .filter(Boolean)
        : [];

    const localFavorites = Array.from(favoriteSeriesIds);
    favoriteSeriesIds = new Set([...serverFavorites, ...localFavorites].filter(Boolean));
    saveFavoriteSeries();

    const pendingRemoteFavorites = localFavorites.filter((serieId) => !serverFavorites.includes(serieId));
    if (pendingRemoteFavorites.length && userId && tg?.initData) {
        void syncLocalFavoritesToBackend(pendingRemoteFavorites);
    }
}

async function syncLocalFavoritesToBackend(seriesIds = []) {
    const uniqueIds = Array.from(new Set((Array.isArray(seriesIds) ? seriesIds : []).map(normalizeId).filter(Boolean)));
    if (!uniqueIds.length || !userId || !tg?.initData) return;

    for (const serieId of uniqueIds) {
        try {
            await requestFavoriteSync({
                init_data: tg.initData,
                series_id: serieId,
                is_favorite: true,
            });
            syncFavoriteStateToSeries(serieId, true);
        } catch (error) {
            debugLog('[FAVORITES] Falha ao sincronizar favorito local:', error?.message || error);
        }
    }
}

async function toggleFavoriteSeries(serie) {
    const serieId = normalizeId(serie?.id);
    if (!serieId) return;
    const nextFavoriteState = !isFavoriteSeries(serieId);
    if (!nextFavoriteState) {
        favoriteSeriesIds.delete(serieId);
        saveFavoriteSeries();
        syncFavoriteStateToSeries(serieId, false);
        showToast('Removida das favoritas.', 'info');
    } else {
        favoriteSeriesIds.add(serieId);
        trackAnalyticsEvent('favorite_added', { series_id: serieId });
        saveFavoriteSeries();
        syncFavoriteStateToSeries(serieId, true);
        showToast('Adicionada às favoritas.', 'success');
    }
    refreshCatalog();
    if (DOM.modalOverlay?.classList.contains('active') && serie) {
        openModal(serie);
    }

    if (!userId || !tg?.initData) return;

    try {
        await requestFavoriteSync({
            init_data: tg.initData,
            series_id: serieId,
            is_favorite: nextFavoriteState,
        });
    } catch (error) {
        debugLog('[FAVORITES] Falha ao salvar favorito no Telegram:', error?.message || error);
        showToast('Favorito salvo neste aparelho. A sincronização com sua conta será tentada novamente.', 'info');
    }
}

function saveCart(context = 'CART') {
    try {
        localStorage.setItem('cart_series', JSON.stringify(cart));
        if (cart.length) {
            localStorage.setItem(CART_UPDATED_AT_STORAGE_KEY, String(Date.now()));
        } else {
            localStorage.removeItem(CART_UPDATED_AT_STORAGE_KEY);
            localStorage.removeItem(CART_ABANDONMENT_REPORTED_AT_STORAGE_KEY);
        }
        return true;
    } catch (e) {
        console.warn(`[${context}] Falha ao salvar carrinho no localStorage:`, e.message);
        return false;
    }
}

function resetVideo() {
    DOM.mainVideo.pause();
    DOM.mainVideo.src = '';
    DOM.mainVideo.removeAttribute('poster');
    DOM.mainVideo.removeAttribute('src');
    DOM.mainVideo.load();
}

function setPlayerLoadingView(title = 'Abrindo agora', subtitle = 'Seu vídeo está entrando...') {
    if (DOM.playerLoadingTitle) DOM.playerLoadingTitle.textContent = title;
    if (DOM.playerLoadingSubtitle) DOM.playerLoadingSubtitle.textContent = subtitle;
}

function handleSeriesClick(serie) {
    if (!serie) return;
    trackAnalyticsEvent('series_viewed', { series_id: serie.id });
    if (isFree(serie)) trackAnalyticsEvent('free_series_opened', { series_id: serie.id });
    if (!appContext.isTelegram) {
        openSeriesDetails(serie);
        return;
    }
    if (hasSeriesAccess(serie) && getPlaybackMode(serie) !== 'missing') {
        if (isOwnerUser()) {
            void openPlayer(serie.id, serie.title || 'Reproduzir');
            return;
        }
        void deliverSeriesToTelegram(serie);
        return;
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
    playerLoadingTitle: document.getElementById('playerLoadingTitle'),
    playerLoadingSubtitle: document.getElementById('playerLoadingSubtitle'),
    playerError: document.getElementById('playerError'),
    playerControls: document.getElementById('playerControls'),
    playerSeekInput: document.getElementById('playerSeekInput'),
    playerCurrentTime: document.getElementById('playerCurrentTime'),
    playerDuration: document.getElementById('playerDuration'),
    playerPlayBtn: document.getElementById('playerPlayBtn'),
    playerVolumeInput: document.getElementById('playerVolumeInput'),
    playerMuteBtn: document.getElementById('playerMuteBtn'),
    playerFullscreenBtn: document.getElementById('playerFullscreenBtn'),
    playerShareBtn: document.getElementById('playerShareBtn'),
    cartOverlay: document.getElementById('cartOverlay'),
    cartDrawer: document.getElementById('cartDrawer'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    cartDiscount: document.getElementById('cartDiscount'),
    cartDiscountRow: document.getElementById('cartDiscountRow'),
    cartCouponInput: document.getElementById('cartCouponInput'),
    cartCouponBtn: document.getElementById('cartCouponBtn'),
    cartCouponStatus: document.getElementById('cartCouponStatus'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    paymentMethods: Array.from(document.querySelectorAll('[data-payment-method]')),
    buyerEmailField: document.getElementById('buyerEmailField'),
    buyerEmailInput: document.getElementById('buyerEmailInput'),
    paymentSummaryPanel: document.getElementById('paymentSummaryPanel'),
    paymentSummaryStatus: document.getElementById('paymentSummaryStatus'),
    paymentSummaryDetails: document.getElementById('paymentSummaryDetails'),
    paymentSummaryActions: document.getElementById('paymentSummaryActions'),
    cartBadge: document.getElementById('cartBadge'),
    cartBtn: document.getElementById('cartBtn'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalImg: document.getElementById('modalImg'),
    modalTitle: document.getElementById('modalTitle'),
    modalPrice: document.getElementById('modalPrice'),
    modalDesc: document.getElementById('modalDesc'),
    modalSeriesMeta: document.getElementById('modalSeriesMeta'),
    relatedSeriesSection: document.getElementById('relatedSeriesSection'),
    relatedSeriesGrid: document.getElementById('relatedSeriesGrid'),
    telegramGuide: document.getElementById('telegramGuide'),
    modalActions: document.getElementById('modalActions'),
    heroImg: document.getElementById('heroImg'),
    heroTitle: document.getElementById('heroTitle'),
    heroDesc: document.getElementById('heroDesc'),
    heroBadge: document.getElementById('heroBadge'),
    heroPlayBtn: document.getElementById('heroPlayBtn'),
    heroDetailsBtn: document.getElementById('heroDetailsBtn'),
    heroMeta: document.getElementById('heroMeta'),
    catalogGrid: document.getElementById('catalogGrid'),
    netflixScroll: document.getElementById('netflixScroll'),
    telegramScroll: document.getElementById('telegramScroll'),
    telegramRow: document.getElementById('telegramRow'),
    telegramRowCount: document.getElementById('telegramRowCount'),
    searchInput: document.getElementById('searchInput'),
    toastContainer: document.getElementById('toastContainer'),
    header: document.getElementById('header'),
    hero: document.querySelector('.hero'),
    netflixRow: document.getElementById('netflixRow'),
    catalogSection: document.getElementById('catalogSection'),
    contentPage: document.getElementById('contentPage'),
    themeIcon: document.getElementById('themeIcon'),
    supportBtn: document.getElementById('supportBtn'),
    accountBtn: document.getElementById('accountBtn'),
    openTelegramBtn: document.getElementById('openTelegramBtn'),
    headerSearchInput: document.getElementById('headerSearchInput'),
    currentYear: document.getElementById('currentYear'),
    ownerBtn: document.getElementById('ownerBtn'),
    ownerOverlay: document.getElementById('ownerOverlay'),
    ownerCloseBtn: document.getElementById('ownerCloseBtn'),
    ownerLoginForm: document.getElementById('ownerLoginForm'),
    ownerPasswordInput: document.getElementById('ownerPasswordInput'),
    ownerLoginBtn: document.getElementById('ownerLoginBtn'),
    ownerStatus: document.getElementById('ownerStatus'),
    ownerDashboard: document.getElementById('ownerDashboard'),
    supportOverlay: document.getElementById('supportOverlay'),
    supportCloseBtn: document.getElementById('supportCloseBtn'),
    supportForm: document.getElementById('supportForm'),
    supportEmailInput: document.getElementById('supportEmailInput'),
    supportSubjectInput: document.getElementById('supportSubjectInput'),
    supportDescriptionInput: document.getElementById('supportDescriptionInput'),
    supportContextInput: document.getElementById('supportContextInput'),
    supportSubmitBtn: document.getElementById('supportSubmitBtn'),
    supportCancelBtn: document.getElementById('supportCancelBtn'),
    supportStatus: document.getElementById('supportStatus')
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
    const panel = document.querySelector('.player-error-panel');

    if (panel) {
        panel.classList.remove('is-protected');
    }

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

function showProtectedPlayerBlock(title = 'Conteúdo protegido', description = 'Acesso não autorizado.') {
    DOM.playerLoading?.classList.remove('active');
    if (DOM.mainVideo) {
        DOM.mainVideo.pause();
        DOM.mainVideo.style.display = 'none';
    }
    if (DOM.playerOverlay) {
        DOM.playerOverlay.dataset.state = 'blocked';
    }
    const panel = document.querySelector('.player-error-panel');
    if (panel) {
        panel.classList.add('is-protected');
    }
    setPlayerErrorView({
        iconClass: 'fas fa-shield-halved',
        iconColor: '#ffffff',
        title,
        description,
        buttonHtml: '<i class="fas fa-arrow-left"></i> Voltar',
        buttonHandler: closePlayer
    });
    DOM.playerError?.classList.add('active');
}

function isAccessDeniedError(error) {
    const status = Number(error?.status || 0);
    const code = String(error?.code || '').trim().toLowerCase();
    return status === 401
        || status === 402
        || status === 403
        || code === 'payment_required'
        || code === 'telegram_auth_required'
        || code === 'playback_token_invalid'
        || code === 'series_inactive'
        || code === 'access_denied'
        || code === 'unauthorized';
}

function buildSeriesPageUrl(serieOrId) {
    const serie = typeof serieOrId === 'object' ? serieOrId : findSeriesById(serieOrId);
    if (serie) return new URL(`/series/${getSeriesSlug(serie)}`, window.location.origin).toString();
    const baseUrl = new URL('/', window.location.origin);
    if (serieOrId) baseUrl.searchParams.set('play', normalizeId(serieOrId));
    return baseUrl.toString();
}

function findSeriesBySlug(slug) {
    const normalized = slugify(decodeURIComponent(String(slug || '')));
    return allSeries.find((serie) => getSeriesSlug(serie) === normalized) || null;
}

function setMetaContent(selector, content) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute('content', String(content || ''));
}

function updatePageMetadata(serie = null) {
    const siteName = 'Séries Curtas Express';
    const title = serie ? String(serie.seo_title || `${serie.title} — Série Curta Completa`).slice(0, 70) : siteName;
    const description = serie
        ? String(serie.seo_description || serie.short_description || serie.description || `Conheça ${serie.title}, uma série curta completa.`).slice(0, 180)
        : 'Descubra séries curtas completas, gratuitas e premium, com acesso pelo Telegram.';
    const canonical = serie ? (sanitizeUrl(serie.canonical_url) || buildSeriesPageUrl(serie)) : new URL('/', window.location.origin).toString();
    const image = serie ? (sanitizeUrl(serie.og_image_url) || getCoverUrl(serie)) : new URL('/assets/logo-welcome.png', window.location.origin).toString();
    const socialTitle = serie ? String(serie.og_title || title) : title;
    const socialDescription = serie ? String(serie.og_description || description) : description;

    document.title = title;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', socialTitle);
    setMetaContent('meta[property="og:description"]', socialDescription);
    setMetaContent('meta[property="og:url"]', canonical);
    setMetaContent('meta[property="og:image"]', image);
    setMetaContent('meta[name="twitter:title"]', socialTitle);
    setMetaContent('meta[name="twitter:description"]', socialDescription);
    setMetaContent('meta[name="twitter:image"]', image);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    setMetaContent('meta[name="robots"]', serie?.seo_noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large');

    const schemaNode = document.getElementById('seriesStructuredData');
    if (!schemaNode) return;
    if (!serie) {
        schemaNode.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: siteName, url: canonical });
        return;
    }
    const genres = normalizeSeriesTerms(serie.genre || serie.genres || serie.category);
    const durationMinutes = Number(serie.duration_minutes || serie.durationMinutes || 0);
    schemaNode.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Movie',
        name: String(serie.title || ''),
        description,
        image,
        genre: genres.length ? genres : undefined,
        inLanguage: String(serie.language || serie.audio_language || 'pt-BR'),
        duration: durationMinutes > 0 ? `PT${Math.round(durationMinutes)}M` : undefined,
        url: canonical,
        offers: isFree(serie) ? undefined : {
            '@type': 'Offer',
            price: getSeriesPriceValue(serie).toFixed(2),
            priceCurrency: getSeriesCurrency(serie),
            availability: 'https://schema.org/InStock',
            url: canonical,
        },
    });
}

function openSeriesDetails(serie, options = {}) {
    if (!serie) return;
    if (options.updateHistory !== false) {
        history.pushState({ route: 'series', seriesId: normalizeId(serie.id) }, '', `/series/${getSeriesSlug(serie)}`);
    }
    updatePageMetadata(serie);
    openModal(serie);
}

const STATIC_CONTENT_PAGES = {
    '/ajuda': {
        title: 'Ajuda',
        description: 'Encontre orientações sobre catálogo, pagamento e entrega das séries.',
        body: `<p class="content-page-kicker">Atendimento</p><h1>Como podemos ajudar?</h1><p>Use o suporte para informar seu e-mail, o assunto e os detalhes do problema. Se a solicitação envolver uma compra, inclua o identificador do pedido.</p><div class="content-page-actions"><button type="button" class="btn btn-primary" data-open-support><i class="fas fa-headset"></i> Abrir suporte</button><a class="btn btn-secondary" href="https://t.me/${TELEGRAM_BOT_USERNAME}"><i class="fab fa-telegram"></i> Abrir bot</a></div>`,
    },
    '/termos': {
        title: 'Termos de uso',
        description: 'Termos de uso do catálogo Séries Curtas Express.',
        body: '<p class="content-page-kicker">Informações legais</p><h1>Termos de uso</h1><h2>Acesso ao serviço</h2><p>O catálogo pode ser consultado publicamente. Compras, entregas e recursos vinculados à conta exigem acesso pelo Telegram.</p><h2>Conteúdo e disponibilidade</h2><p>A disponibilidade das séries pode mudar por motivos técnicos, editoriais ou de licenciamento. O preço é informado antes da confirmação da compra.</p><h2>Suporte</h2><p>Em caso de falha de pagamento ou entrega, envie uma solicitação pelo suporte com os dados do pedido.</p>',
    },
    '/privacidade': {
        title: 'Política de privacidade',
        description: 'Como o Séries Curtas Express utiliza dados necessários para operar o serviço.',
        body: '<p class="content-page-kicker">Privacidade</p><h1>Política de privacidade</h1><h2>Dados utilizados</h2><p>Quando aberto pelo Telegram, o serviço utiliza o identificador validado da conta para registrar favoritos, progresso, compras e entregas. No navegador, favoritos podem permanecer somente neste dispositivo.</p><h2>Pagamentos</h2><p>Dados de pagamento são processados pelo Mercado Pago. O sistema registra apenas os dados necessários para acompanhar o pedido e confirmar a entrega.</p><h2>Contato</h2><p>Solicitações relacionadas a dados e privacidade podem ser enviadas para <a href="mailto:${SUPPORT_INBOX_EMAIL}">${SUPPORT_INBOX_EMAIL}</a>.</p>',
    },
    '/blog': {
        title: 'Blog',
        description: 'Guias sobre séries curtas, microdramas e como escolher o próximo título.',
        body: '<p class="content-page-kicker">Guias</p><h1>Universo das séries curtas</h1><div class="blog-list"><a href="/blog/o-que-sao-series-curtas-verticais"><strong>O que são séries curtas verticais?</strong><span>Entenda o formato dos microdramas e por que ele funciona tão bem no celular.</span></a></div>',
    },
    '/blog/o-que-sao-series-curtas-verticais': {
        title: 'O que são séries curtas verticais?',
        description: 'Entenda o formato das séries curtas verticais e dos microdramas feitos para celular.',
        body: '<p class="content-page-kicker">Guia de formato</p><h1>O que são séries curtas verticais?</h1><p>Séries curtas verticais, também chamadas de microdramas, são histórias divididas em cenas rápidas e pensadas principalmente para a tela do celular. Elas usam ritmo direto, conflitos claros e episódios breves.</p><h2>Como assistir</h2><p>No Séries Curtas Express, alguns títulos reúnem todos os episódios em um único vídeo. A página de cada série informa se o acesso é gratuito ou pago antes de levar você ao Telegram.</p><h2>Como escolher uma série</h2><p>Use a busca por gênero ou tema, como romance, máfia, fantasia e suspense. Na página do título, consulte a sinopse e as recomendações relacionadas.</p>',
    },
};

function setCatalogPageVisibility(visible) {
    if (DOM.hero) DOM.hero.hidden = !visible;
    if (DOM.netflixRow) DOM.netflixRow.hidden = !visible;
    if (DOM.catalogSection) DOM.catalogSection.hidden = !visible;
    if (DOM.contentPage) DOM.contentPage.hidden = visible;
}

function renderStaticContentPage(path) {
    const page = STATIC_CONTENT_PAGES[path];
    if (!page || !DOM.contentPage) return false;
    setCatalogPageVisibility(false);
    DOM.contentPage.innerHTML = `<article class="content-page-card">${page.body}</article>`;
    DOM.contentPage.querySelector('[data-open-support]')?.addEventListener('click', openSupportForm);
    document.title = `${page.title} — Séries Curtas Express`;
    setMetaContent('meta[name="description"]', page.description);
    const canonical = new URL(path, window.location.origin).toString();
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    setMetaContent('meta[property="og:title"]', document.title);
    setMetaContent('meta[property="og:description"]', page.description);
    setMetaContent('meta[property="og:url"]', canonical);
    return true;
}

function renderNotFoundPage() {
    if (!DOM.contentPage) return;
    setCatalogPageVisibility(false);
    DOM.contentPage.innerHTML = '<article class="content-page-card content-page-empty"><p class="content-page-kicker">Erro 404</p><h1>Página não encontrada</h1><p>O endereço pode ter mudado ou não existe.</p><a class="btn btn-primary" href="/"><i class="fas fa-arrow-left"></i> Voltar ao catálogo</a></article>';
    document.title = 'Página não encontrada — Séries Curtas Express';
    setMetaContent('meta[name="robots"]', 'noindex,follow');
}

const CUSTOMER_ROUTES = new Set(['/minha-conta', '/minha-biblioteca', '/minhas-compras', '/historico']);

function requestCustomerArea() {
    return requestJson(`${API_URL}?action=customer-area`, {
        init_data: tg?.initData || '',
    }, 20000);
}

function requestNotificationPreferences(operation = 'get', preferences = {}) {
    return requestJson(`${API_URL}?action=notification-preferences`, {
        init_data: tg?.initData || '',
        operation,
        ...preferences,
    }, 15000);
}

function getCustomerOrderStatusMeta(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return { label: 'Pago', className: 'approved' };
    if (['rejected', 'cancelled', 'canceled', 'expired', 'failed'].includes(normalized)) return { label: 'Não aprovado', className: 'failed' };
    return { label: 'Aguardando pagamento', className: 'pending' };
}

function formatCustomerDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Data indisponível';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function renderCustomerNav(path) {
    const links = [
        ['/minha-conta', 'Visão geral', 'fa-user'],
        ['/minha-biblioteca', 'Biblioteca', 'fa-play'],
        ['/minhas-compras', 'Compras', 'fa-receipt'],
        ['/historico', 'Histórico', 'fa-clock-rotate-left'],
        ['/favoritos', 'Favoritos', 'fa-heart'],
    ];
    return `<nav class="customer-nav" aria-label="Área da cliente">${links.map(([href, label, icon]) => `
        <a href="${href}" class="customer-nav-link ${path === href ? 'active' : ''}"><i class="fas ${icon}"></i> ${label}</a>
    `).join('')}</nav>`;
}

function renderCustomerSeriesCard(serie, actionLabel = 'Receber no Telegram') {
    const cover = sanitizeUrl(getCoverUrl(serie)) || PLACEHOLDER_IMAGE;
    const priceLabel = isFree(serie) ? 'Grátis' : formatPrice(serie);
    return `
        <article class="customer-series-card">
            <img src="${escapeAttr(cover)}" alt="Capa de ${escapeAttr(serie?.title || 'série')}" loading="lazy">
            <div class="customer-series-copy">
                <span>${escapeHtml(priceLabel)}</span>
                <h3>${escapeHtml(serie?.title || 'Série')}</h3>
                <p>${escapeHtml(serie?.short_description || serie?.description || 'Disponível na sua conta.')}</p>
                <button type="button" class="btn btn-primary" data-customer-series-id="${escapeAttr(String(serie?.id || ''))}">
                    <i class="fab fa-telegram"></i> ${escapeHtml(actionLabel)}
                </button>
            </div>
        </article>
    `;
}

function renderCustomerOrder(order) {
    const status = getCustomerOrderStatusMeta(order?.status);
    const titles = (Array.isArray(order?.items) ? order.items : []).map((item) => item?.title).filter(Boolean).join(', ');
    return `
        <article class="customer-order-card">
            <div class="customer-order-head">
                <div><span>Pedido ${escapeHtml(String(order?.order_id || '').slice(0, 8))}</span><strong>${escapeHtml(formatCustomerDate(order?.created_at))}</strong></div>
                <span class="customer-status customer-status-${escapeAttr(status.className)}">${escapeHtml(status.label)}</span>
            </div>
            <p>${escapeHtml(titles || 'Itens do pedido')}</p>
            <div class="customer-order-footer"><strong>${escapeHtml(formatOwnerCurrency(order?.amount || 0))}</strong><span>${escapeHtml(String(order?.payment_method || '').replaceAll('_', ' '))}</span></div>
        </article>
    `;
}

function renderCustomerNotificationPreferences(preferences = {}) {
    const checked = (key) => preferences?.[key] === true ? ' checked' : '';
    const marketingEnabled = preferences?.marketing_enabled === true;
    const channel = preferences?.notification_channel === 'none' ? 'none' : 'telegram';
    return `
        <section class="customer-section customer-preferences-section">
            <div class="customer-section-head"><div><span>Comunicações</span><h2>Preferências de notificação</h2></div><i class="fas fa-bell" aria-hidden="true"></i></div>
            <form class="customer-preferences-form" data-notification-preferences-form>
                <label class="customer-preference-row customer-preference-channel">
                    <span><strong>Canal</strong><small>Escolha onde receber comunicações opcionais.</small></span>
                    <select name="notification_channel" aria-label="Canal de notificações">
                        <option value="telegram"${channel === 'telegram' ? ' selected' : ''}>Telegram</option>
                        <option value="none"${channel === 'none' ? ' selected' : ''}>Nenhum</option>
                    </select>
                </label>
                <label class="customer-preference-row">
                    <span><strong>Lembrete de compra incompleta</strong><small>No máximo uma mensagem por pedido elegível, respeitando o limite entre lembretes.</small></span>
                    <input type="checkbox" name="checkout_abandoned_enabled"${checked('checkout_abandoned_enabled')}>
                </label>
                <label class="customer-preference-row">
                    <span><strong>Novidades e comunicações de catálogo</strong><small>Ative para escolher os assuntos que deseja receber.</small></span>
                    <input type="checkbox" name="marketing_enabled"${checked('marketing_enabled')} data-marketing-master>
                </label>
                <div class="customer-preference-options" data-marketing-options${marketingEnabled ? '' : ' hidden'}>
                    <label><input type="checkbox" name="releases_enabled"${checked('releases_enabled')}> Novas séries</label>
                    <label><input type="checkbox" name="promotions_enabled"${checked('promotions_enabled')}> Promoções</label>
                    <label><input type="checkbox" name="series_available_enabled"${checked('series_available_enabled')}> Série disponível</label>
                    <label><input type="checkbox" name="referrals_enabled"${checked('referrals_enabled')}> Indicações</label>
                </div>
                <div class="customer-preference-note"><i class="fas fa-shield-halved"></i><span>Confirmações de pagamento, compra e entrega são mensagens essenciais do serviço.</span></div>
                <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> Salvar preferências</button>
                <p class="customer-preference-status" role="status" aria-live="polite"></p>
            </form>
        </section>
    `;
}

function wireCustomerAreaActions() {
    document.querySelectorAll('[data-customer-series-id]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.onclick = () => {
            const serie = findSeriesById(button.dataset.customerSeriesId || '');
            if (!serie) return showToast('Esta série não está disponível agora.', 'info');
            if (!appContext.isTelegram) return openTelegramBotLink(buildTelegramSeriesLink(serie));
            return deliverSeriesToTelegram(serie);
        };
    });
    DOM.contentPage?.querySelectorAll('a[href^="/"]').forEach((link) => {
        if (!(link instanceof HTMLAnchorElement)) return;
        link.onclick = (event) => {
            event.preventDefault();
            history.pushState({ route: 'customer' }, '', link.getAttribute('href') || '/minha-conta');
            void applyPublicRoute();
        };
    });

    const preferenceForm = DOM.contentPage?.querySelector('[data-notification-preferences-form]');
    const marketingMaster = preferenceForm?.querySelector('[data-marketing-master]');
    const marketingOptions = preferenceForm?.querySelector('[data-marketing-options]');
    if (marketingMaster instanceof HTMLInputElement && marketingOptions instanceof HTMLElement) {
        marketingMaster.addEventListener('change', () => {
            marketingOptions.hidden = !marketingMaster.checked;
        });
    }
    if (preferenceForm instanceof HTMLFormElement) {
        preferenceForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = preferenceForm.querySelector('button[type="submit"]');
            const status = preferenceForm.querySelector('.customer-preference-status');
            const formData = new FormData(preferenceForm);
            const payload = {
                notification_channel: String(formData.get('notification_channel') || 'telegram'),
                checkout_abandoned_enabled: formData.has('checkout_abandoned_enabled'),
                marketing_enabled: formData.has('marketing_enabled'),
                releases_enabled: formData.has('releases_enabled'),
                promotions_enabled: formData.has('promotions_enabled'),
                series_available_enabled: formData.has('series_available_enabled'),
                referrals_enabled: formData.has('referrals_enabled'),
            };
            if (submitButton instanceof HTMLButtonElement) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            }
            if (status instanceof HTMLElement) status.textContent = '';
            try {
                const response = await requestNotificationPreferences('save', payload);
                customerAreaSnapshot = {
                    ...(customerAreaSnapshot || {}),
                    notification_preferences: response.preferences || payload,
                };
                customerAreaLoadedAt = Date.now();
                if (status instanceof HTMLElement) status.textContent = 'Preferências salvas.';
                showToast('Preferências atualizadas.', 'success');
            } catch (error) {
                if (status instanceof HTMLElement) status.textContent = error.message || 'Não foi possível salvar.';
                showToast(error.message || 'Não foi possível salvar as preferências.', 'error');
            } finally {
                if (submitButton instanceof HTMLButtonElement) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fas fa-floppy-disk"></i> Salvar preferências';
                }
            }
        });
    }
}

function renderCustomerArea(path, data) {
    if (!DOM.contentPage) return;
    const account = data?.account || {};
    const summary = data?.summary || {};
    const library = Array.isArray(data?.library) ? data.library : [];
    const orders = Array.isArray(data?.orders) ? data.orders : [];
    const history = Array.isArray(data?.history) ? data.history : [];
    const notificationPreferences = data?.notification_preferences || {};
    const firstName = String(account.name || 'Cliente').split(/\s+/)[0];
    let body = '';

    if (path === '/minha-biblioteca') {
        body = `<section class="customer-section"><div class="customer-section-head"><div><span>Seus acessos</span><h2>Minha biblioteca</h2></div><strong>${library.length} títulos</strong></div><div class="customer-series-grid">${library.map((serie) => renderCustomerSeriesCard(serie)).join('') || '<div class="customer-empty"><i class="fas fa-film"></i><h3>Sua biblioteca está vazia</h3><p>As séries pagas aparecem aqui automaticamente após a aprovação.</p><a class="btn btn-primary" href="/">Explorar catálogo</a></div>'}</div></section>`;
    } else if (path === '/minhas-compras') {
        body = `<section class="customer-section"><div class="customer-section-head"><div><span>Pagamentos</span><h2>Minhas compras</h2></div><strong>${orders.length} pedidos</strong></div><div class="customer-orders-list">${orders.map(renderCustomerOrder).join('') || '<div class="customer-empty"><i class="fas fa-receipt"></i><h3>Nenhuma compra registrada</h3><p>Seus pedidos aparecerão aqui.</p></div>'}</div></section>`;
    } else if (path === '/historico') {
        body = `<section class="customer-section"><div class="customer-section-head"><div><span>Atividade</span><h2>Histórico</h2></div><strong>${history.length} títulos</strong></div><div class="customer-history-list">${history.map((item) => `
            <article class="customer-history-card">
                <img src="${escapeAttr(sanitizeUrl(item.cover_url) || PLACEHOLDER_IMAGE)}" alt="" loading="lazy">
                <div><span>${escapeHtml(formatCustomerDate(item.last_opened_at))}</span><h3>${escapeHtml(item.title || 'Série')}</h3><div class="customer-progress"><span style="width:${Math.max(0, Math.min(100, Number(item.completion_percent || 0)))}%"></span></div><p>${item.completed ? 'Concluída' : `${Math.round(Number(item.completion_percent || 0))}% registrado`}</p></div>
                ${item.available ? `<button type="button" class="btn btn-secondary" data-customer-series-id="${escapeAttr(String(item.series_id || ''))}">Abrir</button>` : ''}
            </article>
        `).join('') || '<div class="customer-empty"><i class="fas fa-clock-rotate-left"></i><h3>Seu histórico está vazio</h3><p>As séries abertas pelo Telegram aparecerão aqui.</p></div>'}</div></section>`;
    } else {
        body = `
            <section class="customer-summary-grid">
                <a href="/minha-biblioteca" class="customer-summary-card"><i class="fas fa-play"></i><span>Biblioteca</span><strong>${Number(summary.library_total || 0)}</strong></a>
                <a href="/minhas-compras" class="customer-summary-card"><i class="fas fa-receipt"></i><span>Compras aprovadas</span><strong>${Number(summary.approved_orders_total || 0)}</strong></a>
                <a href="/favoritos" class="customer-summary-card"><i class="fas fa-heart"></i><span>Favoritos</span><strong>${Number(summary.favorites_total || 0)}</strong></a>
                <a href="/historico" class="customer-summary-card"><i class="fas fa-clock-rotate-left"></i><span>Histórico</span><strong>${Number(summary.history_total || 0)}</strong></a>
            </section>
            <section class="customer-section"><div class="customer-section-head"><div><span>Acesso rápido</span><h2>Últimas séries da biblioteca</h2></div><a href="/minha-biblioteca">Ver todas</a></div><div class="customer-series-grid">${library.slice(0, 3).map((serie) => renderCustomerSeriesCard(serie)).join('') || '<div class="customer-empty"><p>Suas séries compradas aparecerão aqui automaticamente.</p></div>'}</div></section>
            <section class="customer-section"><div class="customer-section-head"><div><span>Pedidos recentes</span><h2>Minhas compras</h2></div><a href="/minhas-compras">Ver todas</a></div><div class="customer-orders-list">${orders.slice(0, 3).map(renderCustomerOrder).join('') || '<div class="customer-empty"><p>Nenhum pedido registrado ainda.</p></div>'}</div></section>
            ${renderCustomerNotificationPreferences(notificationPreferences)}
        `;
    }

    DOM.contentPage.innerHTML = `
        <div class="customer-shell">
            <header class="customer-hero"><div class="customer-avatar"><i class="fas fa-user"></i></div><div><span>Área da cliente</span><h1>Olá, ${escapeHtml(firstName)}</h1><p>${account.username ? `@${escapeHtml(account.username)}` : 'Seus acessos estão vinculados ao Telegram.'}</p></div></header>
            ${renderCustomerNav(path)}
            ${body}
        </div>
    `;
    wireCustomerAreaActions();
}

async function openCustomerRoute(path) {
    if (DOM.modalOverlay?.classList.contains('active')) closeModal();
    setCatalogPageVisibility(false);
    setMetaContent('meta[name="robots"]', 'noindex,nofollow');
    document.title = 'Minha conta — Séries Curtas Express';
    if (!appContext.isTelegram) {
        DOM.contentPage.innerHTML = '<article class="content-page-card content-page-empty"><p class="content-page-kicker">Área da cliente</p><h1>Abra pelo Telegram</h1><p>Compras, biblioteca e histórico ficam vinculados com segurança à sua conta do Telegram.</p><button type="button" class="btn btn-primary" data-customer-open-telegram><i class="fab fa-telegram"></i> Abrir no Telegram</button></article>';
        DOM.contentPage.querySelector('[data-customer-open-telegram]')?.addEventListener('click', () => openTelegramBotLink(TELEGRAM_BOT_LINK));
        return;
    }

    DOM.contentPage.innerHTML = '<div class="customer-loading"><i class="fas fa-spinner fa-spin"></i><strong>Carregando sua conta...</strong></div>';
    try {
        if (!customerAreaSnapshot || Date.now() - customerAreaLoadedAt > 30000) {
            customerAreaSnapshot = await requestCustomerArea();
            customerAreaLoadedAt = Date.now();
        }
        renderCustomerArea(path, customerAreaSnapshot);
    } catch (error) {
        DOM.contentPage.innerHTML = `<article class="content-page-card content-page-empty"><h1>Não foi possível carregar sua conta</h1><p>${escapeHtml(error.message || 'Tente novamente em instantes.')}</p><button type="button" class="btn btn-primary" data-customer-retry>Tentar novamente</button></article>`;
        DOM.contentPage.querySelector('[data-customer-retry]')?.addEventListener('click', () => {
            customerAreaSnapshot = null;
            void openCustomerRoute(path);
        });
    }
}

async function resolveMovedSeriesSlug(slug) {
    try {
        const response = await fetch(`${API_URL}?action=series-slug-resolve&slug=${encodeURIComponent(slug)}`, {
            method: 'GET',
            cache: 'no-store',
            headers: { accept: 'application/json' },
        });
        if (!response.ok) return '';
        const payload = await response.json().catch(() => ({}));
        return slugify(payload?.slug || '');
    } catch {
        return '';
    }
}

async function applyPublicRoute() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const params = new URLSearchParams(window.location.search);
    const seriesMatch = path.match(/^\/series\/([^/]+)$/);
    if (seriesMatch) {
        setCatalogPageVisibility(true);
        let serie = findSeriesBySlug(seriesMatch[1]);
        if (!serie) {
            const movedSlug = await resolveMovedSeriesSlug(seriesMatch[1]);
            serie = movedSlug ? findSeriesBySlug(movedSlug) : null;
            if (serie) history.replaceState({ route: 'series', seriesId: normalizeId(serie.id) }, '', `/series/${movedSlug}`);
        }
        if (serie) openSeriesDetails(serie, { updateHistory: false });
        else renderNotFoundPage();
        return;
    }

    if (CUSTOMER_ROUTES.has(path)) {
        await openCustomerRoute(path);
        return;
    }

    if (DOM.modalOverlay?.classList.contains('active')) closeModal();
    if (renderStaticContentPage(path)) return;
    const isCatalogRoute = path === '/' || path === '/series' || path === '/busca' || path === '/favoritos' || /^\/categoria\/[^/]+$/.test(path);
    if (!isCatalogRoute) {
        renderNotFoundPage();
        return;
    }
    setCatalogPageVisibility(true);
    setMetaContent('meta[name="robots"]', 'index,follow,max-image-preview:large');

    if (path === '/busca') {
        searchSeries(params.get('q') || '', { updateUrl: false });
    } else if (path === '/favoritos') {
        filterCategory('favorites', { updateUrl: false });
    } else {
        const categoryMatch = path.match(/^\/categoria\/([^/]+)$/);
        if (categoryMatch) filterCategory(categoryMatch[1], { updateUrl: false });
    }
    updatePageMetadata(null);
}

function buildSeriesShareText(serie) {
    const title = String(serie?.title || 'esta série').trim();
    return `Assista ${title === 'esta série' ? title : `"${title}"`} no bot.`;
}

async function shareSeriesPage(serie) {
    const sourceSerie = serie || activeSeriesProgressMeta?.serie || findSeriesById(activeSeriesProgressMeta?.id);
    if (!sourceSerie?.id) {
        showToast('Link da série indisponível.', 'info');
        return;
    }

    const shareUrl = buildSeriesPageUrl(sourceSerie);
    const shareText = buildSeriesShareText(sourceSerie);
    const fullText = `${shareText} ${shareUrl}`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: sourceSerie.title || 'Séries Express',
                text: shareText,
                url: shareUrl
            });
            return;
        }
    } catch (error) {
        if (error?.name === 'AbortError') return;
    }

    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    if (tg?.openTelegramLink) {
        openTelegramBotLink(telegramShareUrl);
        return;
    }

    await copyToClipboard(fullText);
    showToast('Link da série copiado.', 'success');
}

function formatPlayerTime(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value < 0) return '00:00';
    const total = Math.floor(value);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updatePlayerMuteButton() {
    if (!DOM.mainVideo || !DOM.playerMuteBtn) return;
    const isMuted = DOM.mainVideo.muted || Number(DOM.mainVideo.volume) === 0;
    DOM.playerMuteBtn.innerHTML = isMuted
        ? '<i class="fas fa-volume-xmark"></i>'
        : Number(DOM.mainVideo.volume) < 0.5
            ? '<i class="fas fa-volume-low"></i>'
            : '<i class="fas fa-volume-high"></i>';
    DOM.playerMuteBtn.setAttribute('aria-label', isMuted ? 'Ativar som' : 'Silenciar');
}

function updatePlayerPlayButton() {
    if (!DOM.mainVideo || !DOM.playerPlayBtn) return;
    const isPaused = DOM.mainVideo.paused || DOM.mainVideo.ended;
    DOM.playerPlayBtn.innerHTML = isPaused
        ? '<i class="fas fa-play"></i>'
        : '<i class="fas fa-pause"></i>';
    DOM.playerPlayBtn.setAttribute('aria-label', isPaused ? 'Reproduzir' : 'Pausar');
}

async function togglePlayerPlayback() {
    if (!DOM.mainVideo) return;
    try {
        if (DOM.mainVideo.paused || DOM.mainVideo.ended) {
            await DOM.mainVideo.play();
        } else {
            DOM.mainVideo.pause();
        }
    } catch (error) {
        console.warn('[PLAYER] Falha ao alternar reprodução:', error?.message || error);
        showToast('Toque em reproduzir novamente para iniciar o vídeo.', 'info');
    } finally {
        updatePlayerPlayButton();
    }
}

function updatePlayerControlsFromVideo() {
    if (!DOM.mainVideo) return;

    const duration = Number.isFinite(DOM.mainVideo.duration) ? DOM.mainVideo.duration : 0;
    const currentTime = Number.isFinite(DOM.mainVideo.currentTime) ? DOM.mainVideo.currentTime : 0;
    const progress = duration > 0 ? Math.max(0, Math.min(1000, Math.round((currentTime / duration) * 1000))) : 0;

    if (DOM.playerSeekInput instanceof HTMLInputElement) {
        DOM.playerSeekInput.max = '1000';
        DOM.playerSeekInput.value = String(progress);
        DOM.playerSeekInput.disabled = !duration;
    }

    if (DOM.playerCurrentTime) {
        DOM.playerCurrentTime.textContent = formatPlayerTime(currentTime);
    }

    if (DOM.playerDuration) {
        DOM.playerDuration.textContent = formatPlayerTime(duration);
    }

    if (DOM.playerVolumeInput instanceof HTMLInputElement) {
        DOM.playerVolumeInput.value = String(Number.isFinite(DOM.mainVideo.volume) ? DOM.mainVideo.volume : 1);
    }

    updatePlayerMuteButton();
    updatePlayerPlayButton();
}

async function requestPlayerFullscreen() {
    const target = DOM.playerOverlay || DOM.mainVideo;
    const webApp = tg;

    try {
        if (webApp?.requestFullscreen) {
            await webApp.requestFullscreen();
            return true;
        }
    } catch (error) {
        debugLog('[PLAYER] Telegram fullscreen indisponível:', error?.message || error);
    }

    const fullscreenTarget = target || DOM.mainVideo;
    try {
        if (fullscreenTarget?.requestFullscreen) {
            await fullscreenTarget.requestFullscreen();
            return true;
        }
        if (fullscreenTarget?.webkitRequestFullscreen) {
            await fullscreenTarget.webkitRequestFullscreen();
            return true;
        }
        if (DOM.mainVideo?.webkitEnterFullscreen) {
            DOM.mainVideo.webkitEnterFullscreen();
            return true;
        }
    } catch (error) {
        debugLog('[PLAYER] Erro ao solicitar fullscreen:', error?.message || error);
    }

    return false;
}

function bindPlayerVideoEvents() {
    if (playerVideoEventsBound || !DOM.mainVideo) return;
    playerVideoEventsBound = true;
    DOM.mainVideo.disableRemotePlayback = true;
    DOM.mainVideo.controls = false;

    DOM.mainVideo.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    DOM.mainVideo.addEventListener('loadeddata', () => {
        DOM.playerLoading?.classList.remove('active');
        updatePlayerControlsFromVideo();
    });

    DOM.mainVideo.addEventListener('canplay', () => {
        DOM.playerLoading?.classList.remove('active');
        updatePlayerControlsFromVideo();
    });

    DOM.mainVideo.addEventListener('playing', () => {
        DOM.playerLoading?.classList.remove('active');
        updatePlayerControlsFromVideo();
    });
    DOM.mainVideo.addEventListener('error', () => {
        const currentSrc = String(DOM.mainVideo?.currentSrc || '');
        if (!DOM.playerOverlay?.classList.contains('active')) return;
        if (currentSrc.includes('action=playback') || currentSrc.includes('token=') || currentSrc.includes('/object/sign/')) {
            showProtectedPlayerBlock('Conteúdo protegido', 'A sessão expirou ou o acesso foi negado.');
            return;
        }
        showPlayerError();
    });

    DOM.mainVideo.addEventListener('play', updatePlayerControlsFromVideo);
    DOM.mainVideo.addEventListener('pause', () => {
        updatePlayerControlsFromVideo();
        void syncSeriesProgress('paused', true);
    });
    DOM.mainVideo.addEventListener('ended', () => {
        updatePlayerControlsFromVideo();
        void syncSeriesProgress('completed', true);
    });
    DOM.mainVideo.addEventListener('loadedmetadata', () => {
        updatePlayerControlsFromVideo();
        applySavedProgressToPlayer();
    });
    DOM.mainVideo.addEventListener('timeupdate', () => {
        updatePlayerControlsFromVideo();
        void syncSeriesProgress('progress', false);
    });
    DOM.mainVideo.addEventListener('durationchange', updatePlayerControlsFromVideo);
    DOM.mainVideo.addEventListener('volumechange', updatePlayerControlsFromVideo);
    DOM.mainVideo.addEventListener('click', () => {
        void togglePlayerPlayback();
    });

    DOM.mainVideo.addEventListener('waiting', () => {
        if (DOM.playerOverlay?.classList.contains('active') && DOM.mainVideo?.style.display === 'block') {
            setPlayerLoadingView('Reconectando ao vídeo', 'Aguarde um instante, mantendo a sessão protegida...');
            DOM.playerLoading?.classList.add('active');
        }
    });

    DOM.mainVideo.addEventListener('error', () => {
        if (DOM.playerOverlay?.classList.contains('active')) {
            showPlayerError();
        }
    });
}

function applySavedProgressToPlayer() {
    if (!DOM.mainVideo || !activeSeriesProgressMeta?.id) return;
    const currentSerie = findSeriesById(activeSeriesProgressMeta.id) || activeSeriesProgressMeta.serie || null;
    if (!currentSerie) return;

    const resumeSeconds = getSeriesResumeSeconds(currentSerie);
    if (resumeSeconds <= 0) return;

    const normalizedId = normalizeId(currentSerie.id || activeSeriesProgressMeta.id);
    if (!normalizedId || playerResumeAppliedSeriesId === normalizedId) return;

    const duration = Number(DOM.mainVideo.duration);
    if (!Number.isFinite(duration) || duration <= 0) return;

    const safeTarget = Math.max(0, Math.min(resumeSeconds, Math.max(duration - 1, 0)));
    if (safeTarget <= 0) return;

    try {
        DOM.mainVideo.currentTime = safeTarget;
        playerResumeAppliedSeriesId = normalizedId;
        showToast(`Voltando para ${formatPlayerTime(safeTarget)}.`, 'info');
    } catch (error) {
        debugLog('[PLAYER] Falha ao retomar progresso salvo:', error?.message || error);
    }
}

function wirePlayerControls() {
    if (!(DOM.playerSeekInput instanceof HTMLInputElement) || !(DOM.playerVolumeInput instanceof HTMLInputElement) || !DOM.mainVideo) {
        return;
    }

    DOM.playerSeekInput.oninput = () => {
        const duration = Number(DOM.mainVideo.duration);
        if (!Number.isFinite(duration) || duration <= 0) return;
        const ratio = Number(DOM.playerSeekInput.value) / 1000;
        DOM.mainVideo.currentTime = Math.max(0, Math.min(duration, duration * ratio));
    };

    DOM.playerVolumeInput.oninput = () => {
        const value = Number(DOM.playerVolumeInput.value);
        DOM.mainVideo.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
        DOM.mainVideo.muted = DOM.mainVideo.volume === 0;
        updatePlayerMuteButton();
    };

    if (DOM.playerMuteBtn instanceof HTMLButtonElement) {
        DOM.playerMuteBtn.onclick = () => {
            DOM.mainVideo.muted = !DOM.mainVideo.muted;
            if (!DOM.mainVideo.muted && Number(DOM.mainVideo.volume) === 0) {
                DOM.mainVideo.volume = 0.8;
            }
            updatePlayerControlsFromVideo();
        };
    }

    if (DOM.playerPlayBtn instanceof HTMLButtonElement) {
        DOM.playerPlayBtn.onclick = () => {
            void togglePlayerPlayback();
        };
    }

    if (DOM.playerFullscreenBtn instanceof HTMLButtonElement) {
        DOM.playerFullscreenBtn.onclick = async () => {
            await requestPlayerFullscreen();
        };
    }

    updatePlayerControlsFromVideo();
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
        if (typeof err?.status !== 'number') {
            showToast('Erro de conexão', 'error');
        }
        throw err;
    }
}

function formatPrice(price) {
    const value = typeof price === 'object' && price !== null ? getSeriesPriceValue(price) : Number(price);
    const currency = typeof price === 'object' && price !== null ? getSeriesCurrency(price) : 'BRL';
    if (!Number.isFinite(value) || value <= 0) return 'GRÁTIS';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
}

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

function setSupportStatus(message, type = 'info') {
    if (!DOM.supportStatus) return;
    DOM.supportStatus.textContent = message;
    DOM.supportStatus.className = `support-status ${type}`.trim();
}

function openSupportForm() {
    if (!DOM.supportOverlay) return;
    DOM.supportOverlay.classList.add('active');
    document.body.classList.add('modal-open');
    setSupportStatus('', 'info');
    if (DOM.supportEmailInput && !DOM.supportEmailInput.value) {
        DOM.supportEmailInput.value = buyerEmail || '';
    }
    DOM.supportEmailInput?.focus();
}

function closeSupportForm() {
    DOM.supportOverlay?.classList.remove('active');
    if (!DOM.modalOverlay?.classList.contains('active') && !DOM.cartDrawer?.classList.contains('active') && !DOM.ownerOverlay?.classList.contains('active')) {
        document.body.classList.remove('modal-open');
    }
}

function buildSupportPayload() {
    return {
        init_data: tg?.initData || '',
        email: String(DOM.supportEmailInput?.value || '').trim(),
        subject: String(DOM.supportSubjectInput?.value || '').trim(),
        description: String(DOM.supportDescriptionInput?.value || '').trim(),
        context: String(DOM.supportContextInput?.value || '').trim(),
    };
}

async function submitSupportRequest(event) {
    event.preventDefault();
    if (supportRequestPending) return;

    const payload = buildSupportPayload();
    if (!payload.email || !DOM.supportEmailInput?.checkValidity()) {
        setSupportStatus('Informe um e-mail válido.', 'error');
        DOM.supportEmailInput?.focus();
        return;
    }
    if (!payload.subject || payload.subject.length < 3) {
        setSupportStatus('Descreva um assunto curto para o pedido.', 'error');
        DOM.supportSubjectInput?.focus();
        return;
    }
    if (!payload.description || payload.description.length < 20) {
        setSupportStatus('Conte um pouco mais sobre o problema.', 'error');
        DOM.supportDescriptionInput?.focus();
        return;
    }

    supportRequestPending = true;
    if (DOM.supportSubmitBtn) {
        DOM.supportSubmitBtn.disabled = true;
        DOM.supportSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    }
    setSupportStatus('Enviando solicitação...', 'info');

    try {
        const response = await requestSupportSubmit(payload);
        if (response?.ok) {
            const deliveredToTelegram = Boolean(response.telegram_sent);
            const deliveredToEmail = Boolean(response.email_sent);
            let successMessage = 'Solicitação enviada com sucesso.';
            if (deliveredToTelegram && deliveredToEmail) {
                successMessage = 'Solicitação enviada ao e-mail e ao bot de suporte.';
            } else if (deliveredToTelegram) {
                successMessage = 'Solicitação enviada ao bot de suporte.';
            } else if (deliveredToEmail) {
                successMessage = 'Solicitação enviada por e-mail.';
            }
            setSupportStatus(successMessage, 'success');
            showToast('Suporte enviado. Obrigada!', 'success');
            DOM.supportForm?.reset();
            setTimeout(() => closeSupportForm(), 700);
            return;
        }

        if (response?.mailto_url) {
            openExternalLink(response.mailto_url);
            setSupportStatus('Seu aplicativo de e-mail foi aberto com a solicitação.', 'success');
            showToast('Abrimos o e-mail para você concluir o envio.', 'info');
            return;
        }

        throw new Error(response?.error || 'Não foi possível enviar a solicitação.');
    } catch (error) {
        const mailtoUrl = buildSupportMailtoUrl(payload);
        setSupportStatus(error?.message || 'Falha ao enviar a solicitação.', 'error');
        showToast('Não consegui enviar automaticamente. Abrindo o e-mail de suporte.', 'info');
        openExternalLink(mailtoUrl);
    } finally {
        supportRequestPending = false;
        if (DOM.supportSubmitBtn) {
            DOM.supportSubmitBtn.disabled = false;
            DOM.supportSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar solicitação';
        }
    }
}

function formatFileSize(bytes) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function explainOwnerUploadError(error, file = null) {
    const rawMessage = String(error?.message || '').trim();
    const normalized = rawMessage.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (
        normalized.includes('maximum allowed size')
        || normalized.includes('exceeded the maximum allowed size')
        || normalized.includes('entity too large')
        || normalized.includes('file too big')
        || Number(error?.status || 0) === 413
    ) {
        return buildOwnerInternalUploadLimitMessage(file);
    }

    return rawMessage || 'Nao foi possivel concluir o upload.';
}

function savePaymentPrefs() {
    try {
        localStorage.setItem(PAYMENT_METHOD_STORAGE_KEY, selectedPaymentMethod);
        localStorage.setItem(BUYER_EMAIL_STORAGE_KEY, buyerEmail);
    } catch (e) {
        console.warn('[PAYMENT] Falha ao salvar preferências:', e.message);
    }
}

function configurePaymentMethodsForContext() {
    if (appContext.isTelegram) {
        selectedPaymentMethod = 'telegram_checkout';
    } else if (selectedPaymentMethod === 'telegram_checkout') {
        selectedPaymentMethod = 'pix_qr';
    }
    savePaymentPrefs();
}

function isAwaitingPayment(order) {
    if (!order) return false;
    const status = String(order.status || '').toLowerCase();
    return ['created', 'pending', 'pending_payment', 'in_process', 'pending_review'].includes(status);
}

function isTerminalPaymentFailure(order) {
    const status = String(order?.status || '').toLowerCase();
    return ['rejected', 'cancelled', 'canceled', 'expired', 'failed', 'payment_review', 'refunded', 'charged_back'].includes(status);
}

function isDeliveryPending(order) {
    if (!order || String(order.status || '').toLowerCase() !== 'approved') return false;
    return String(order.delivery_status || 'pending').toLowerCase() !== 'completed';
}

function getPaymentMethodLabel(method = selectedPaymentMethod) {
    switch (method) {
        case 'pix_qr':
            return 'Pix com QR Code';
        case 'telegram_checkout':
            return 'Telegram Stars';
        case 'mercado_pago_link':
        default:
            return 'Link Mercado Pago';
    }
}

function getCheckoutButtonLabel() {
    if (isDeliveryPending(activePaymentOrder)) {
        return '<i class="fab fa-telegram"></i> Acompanhar entrega';
    }
    if (isAwaitingPayment(activePaymentOrder)) {
        return '<i class="fas fa-credit-card"></i> Ver pagamento';
    }

    switch (selectedPaymentMethod) {
        case 'pix_qr':
            return '<i class="fas fa-qrcode"></i> Gerar Pix';
        case 'telegram_checkout':
            return '<i class="fas fa-star"></i> Pagar com Stars';
        case 'mercado_pago_link':
        default:
            return '<i class="fas fa-check"></i> Finalizar Compra';
    }
}

function buildTelegramCheckoutUrl(orderId = '') {
    const safeOrderId = String(orderId || '').trim();
    const suffix = safeOrderId ? `checkout_${encodeURIComponent(safeOrderId)}` : '';
    return `https://t.me/${TELEGRAM_BOT_USERNAME}${suffix ? `?start=${suffix}` : ''}`;
}

function getOrderPaymentUrl(order) {
    const checkoutUrl = String(order?.checkout_url || '').trim();
    return checkoutUrl || buildTelegramCheckoutUrl(order?.order_id || '');
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
        : getCheckoutButtonLabel();
}

function updatePaymentMethodUI() {
    DOM.paymentMethods?.forEach((button) => {
        const method = button.dataset.paymentMethod || '';
        button.hidden = appContext.isTelegram ? method !== 'telegram_checkout' : method === 'telegram_checkout';
        const active = method === selectedPaymentMethod;
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

    if (DOM.checkoutBtn && !DOM.checkoutBtn.disabled) {
        DOM.checkoutBtn.innerHTML = getCheckoutButtonLabel();
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
    const providerAmount = Math.max(0, Math.round(Number(order.provider_amount || 0)));
    const status = String(order.status || 'created');
    const deliveryStatus = String(order.delivery_status || 'pending').toLowerCase();
    const deliveryPending = status === 'approved' && deliveryStatus !== 'completed';
    const terminalFailure = isTerminalPaymentFailure(order);
    const shortOrderId = String(order.order_id || '').slice(0, 8);
    const statusLabel = status === 'approved'
        ? deliveryPending ? 'Pagamento aprovado • enviando' : 'Liberado no Telegram'
        : status === 'pending_payment' || status === 'created'
            ? 'Falta pouco'
            : status === 'payment_review'
                ? 'Pagamento em análise'
                : terminalFailure
                    ? 'Pagamento não concluído'
                    : status;

    DOM.paymentSummaryPanel.hidden = false;
    DOM.paymentSummaryStatus.innerHTML = `
        <strong>${escapeHtml(statusLabel)}</strong>
        <div class="payment-subtitle">${escapeHtml(getPaymentMethodLabel(method))} • Pedido ${escapeHtml(shortOrderId || '---')}</div>
    `;

    const details = [];
    details.push(`<div class="payment-detail"><span>Total</span><strong>${escapeHtml(method === 'telegram_checkout' && providerAmount > 0 ? `${providerAmount} Stars` : formatPrice(amount))}</strong></div>`);
    if (status === 'approved') {
        const deliveryLabel = deliveryStatus === 'completed'
            ? 'Concluída'
            : deliveryStatus === 'partial'
                ? 'Parcial, tentando novamente'
                : deliveryStatus === 'failed'
                    ? 'Pendente de nova tentativa'
                    : 'Em processamento';
        details.push(`<div class="payment-detail"><span>Entrega no Telegram</span><strong>${escapeHtml(deliveryLabel)}</strong></div>`);
    }

    if (order.checkout_url) {
        details.push(`<div class="payment-detail"><span>Mercado Pago</span><strong>Página disponível</strong></div>`);
    }

    if (method === 'telegram_checkout') {
        details.push(`<div class="payment-detail"><span>Telegram</span><strong>Pagamento seguro com Stars</strong></div>`);
    }

    if (order.pix_qr_code) {
        details.push(`<div class="payment-detail"><span>Pix</span><strong>Código gerado</strong></div>`);
        details.push(`<div class="payment-detail"><span>Como pagar</span><strong>Escaneie o QR Code ou copie o código Pix abaixo</strong></div>`);
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
    if (status === 'approved') {
        openButton.innerHTML = '<i class="fab fa-telegram"></i> Abrir bot';
        openButton.addEventListener('click', () => openTelegramBotLink(TELEGRAM_BOT_LINK));
    } else if (status === 'payment_review') {
        openButton.innerHTML = '<i class="fas fa-headset"></i> Falar com suporte';
        openButton.addEventListener('click', openSupportForm);
    } else if (terminalFailure) {
        openButton.innerHTML = '<i class="fas fa-rotate-right"></i> Tentar nova compra';
        openButton.addEventListener('click', () => {
            clearActivePaymentOrder();
            renderPaymentSummary(null);
            updateCartUI();
        });
    } else if (method === 'pix_qr') {
        openButton.innerHTML = '<i class="fas fa-copy"></i> Copiar código Pix';
        openButton.addEventListener('click', async () => {
            if (order.pix_qr_code) {
                await copyToClipboard(order.pix_qr_code);
                showToast('Pix copiado!', 'success');
            }
        });
    } else if (method === 'telegram_checkout') {
        openButton.innerHTML = '<i class="fas fa-star"></i> Pagar com Stars';
        openButton.addEventListener('click', () => {
            openTelegramInvoice(getOrderPaymentUrl(order));
        });
    } else {
        openButton.innerHTML = '<i class="fas fa-arrow-up-right-from-square"></i> Pagar agora';
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
        copyLinkButton.innerHTML = '<i class="fas fa-copy"></i> Copiar link';
        copyLinkButton.addEventListener('click', async () => {
            await copyToClipboard(order.checkout_url);
            showToast('Link copiado!', 'success');
        });
        DOM.paymentSummaryActions.appendChild(copyLinkButton);
    }

    if (method === 'telegram_checkout') {
        const guideButton = document.createElement('button');
        guideButton.className = 'btn btn-secondary';
        guideButton.innerHTML = '<i class="fab fa-telegram"></i> Abrir bot';
        guideButton.addEventListener('click', () => {
            openTelegramBotLink(buildTelegramCheckoutUrl(order.order_id || ''));
        });
        DOM.paymentSummaryActions.appendChild(guideButton);
    }

    if (order.ticket_url) {
        const ticketButton = document.createElement('button');
        ticketButton.className = 'btn btn-secondary';
        ticketButton.innerHTML = '<i class="fas fa-receipt"></i> Abrir comprovante';
        ticketButton.addEventListener('click', () => openExternalLink(order.ticket_url));
        DOM.paymentSummaryActions.appendChild(ticketButton);
    }

    setCheckoutLoading(isAwaitingPayment(order) || deliveryPending);
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

function openTelegramInvoice(url) {
    if (!url) return;
    try {
        if (tg && typeof tg.openInvoice === 'function') {
            tg.openInvoice(url, (status) => {
                const orderId = String(activePaymentOrder?.order_id || '');
                if (status === 'paid' && orderId) {
                    setPaymentSummaryLoading('Confirmando pagamento...');
                    setTimeout(() => refreshPaymentStatus(orderId, true), 500);
                } else if (status === 'failed') {
                    showToast('O pagamento não foi concluído.', 'error');
                }
            });
            return;
        }
    } catch (e) {
        console.warn('[PAYMENT] Falha ao abrir fatura em Stars:', e.message);
    }
    openTelegramBotLink(url);
}

function openTelegramBotLink(url) {
    if (!url) return;
    if (appContext.isTelegram) {
        trackAnalyticsEvent('telegram_open', { metadata: { destination: 'telegram' } });
    }
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

function buildSupportMailtoUrl({ email, subject, description, context = '' }) {
    const lines = [
        'Nova solicitação de suporte enviada pelo Mini App.',
        '',
        `E-mail do usuário: ${email || 'não informado'}`,
        `Assunto: ${subject || 'não informado'}`,
        `Descrição: ${description || 'não informado'}`,
    ];

    if (context) {
        lines.push('', `Contexto: ${context}`);
    }

    if (tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        lines.push(
            '',
            `Telegram: ${user.first_name || ''} ${user.last_name || ''}`.trim(),
            `Telegram ID: ${user.id || ''}`,
            user.username ? `@${user.username}` : '',
        );
    }

    const body = lines.filter(Boolean).join('\n');
    return `mailto:${encodeURIComponent(SUPPORT_INBOX_EMAIL)}?subject=${encodeURIComponent(`[Suporte Mini App] ${subject || 'Solicitação'}`)}&body=${encodeURIComponent(body)}`;
}

async function requestSupportSubmit(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const res = await fetch(`${API_URL}?action=support-submit`, {
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
        return { ok: res.ok && data?.ok !== false, status: res.status, ...data };
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

async function requestCouponValidation(couponCode) {
    return await requestJson(`${API_URL}?action=coupon-validate`, {
        init_data: tg?.initData || '',
        coupon_code: couponCode,
        items: sanitizeCheckoutItems(cart),
    }, 15000);
}

async function requestCartSync(operation, payload = {}) {
    return await requestJson(`${API_URL}?action=cart-sync`, {
        init_data: tg?.initData || '',
        operation,
        ...payload,
    }, 15000);
}

async function requestSeriesDelivery(payload) {
    return await fetchWithTimeout(withCacheBuster(`${API_URL}?action=deliver-series`), {
        method: 'POST',
        body: JSON.stringify(payload)
    }, 25000);
}

async function requestProgressSync(payload) {
    return await fetchWithTimeout(withCacheBuster(`${API_URL}?action=progress-sync`), {
        method: 'POST',
        body: JSON.stringify(payload)
    }, 15000);
}

async function requestFavoriteSync(payload) {
    return await fetchWithTimeout(withCacheBuster(`${API_URL}?action=favorite-sync`), {
        method: 'POST',
        body: JSON.stringify(payload),
    }, 15000);
}

async function requestOwnerUploadSign(payload) {
    return await requestJson(`${API_URL}?action=owner-upload-sign`, payload, 20000);
}

async function uploadOwnerMediaViaApi({ seriesId = '', fieldName, file }) {
    if (!(file instanceof File) || file.size <= 0) {
        throw new Error('Arquivo inválido para upload.');
    }

    return await fetchWithTimeout(withCacheBuster(`${API_URL}?action=owner-upload-binary`), {
        method: 'POST',
        headers: {
            'content-type': file.type || 'application/octet-stream',
            'x-webapp-init-data': tg?.initData || '',
            'x-owner-password': String(DOM.ownerPasswordInput?.value || ''),
            'x-owner-field-name': String(fieldName || ''),
            'x-owner-file-name': encodeURIComponent(String(file.name || 'arquivo.bin')),
            'x-owner-series-id': String(seriesId || ''),
        },
        body: file,
    }, 10 * 60 * 1000);
}

async function uploadFileToSignedStorageUrl(uploadUrl, file) {
    if (!(file instanceof File) || file.size <= 0) {
        throw new Error('Arquivo inválido para upload.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

    try {
        const res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'content-type': file.type || 'application/octet-stream',
                'x-upsert': 'true',
            },
            body: file,
            signal: controller.signal,
        });

        const text = await res.text().catch(() => '');
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (_) {
            data = text;
        }

        if (!res.ok) {
            throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
        }

        return data;
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error('Tempo esgotado no upload direto para o Storage.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function uploadOwnerMediaDirect({ seriesId = '', fieldName, file }) {
    const signed = await requestOwnerUploadSign({
        init_data: tg?.initData || '',
        password: String(DOM.ownerPasswordInput?.value || ''),
        series_id: String(seriesId || ''),
        field_name: String(fieldName || ''),
        file_name: String(file?.name || ''),
    });

    if (!signed?.upload_url || !signed?.object_path) {
        throw new Error('Não foi possível preparar o upload direto no Storage.');
    }

    await uploadFileToSignedStorageUrl(String(signed.upload_url), file);
    return signed;
}

async function requestOwnerSeriesSave(formData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

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

function resetProgressTracking() {
    activeSeriesProgressMeta = null;
    lastProgressSyncAt = 0;
    lastProgressSnapshotKey = '';
    playerResumeAppliedSeriesId = '';
}

async function syncSeriesProgress(eventType = 'progress', force = false) {
    if (!activeSeriesProgressMeta?.id || !userId || !tg?.initData) return null;

    const serie = findSeriesById(activeSeriesProgressMeta.id) || activeSeriesProgressMeta.serie || null;
    const currentTime = Number(DOM.mainVideo?.currentTime || 0);
    const duration = Number(DOM.mainVideo?.duration || 0);
    const safeCurrentTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    const completion = safeDuration > 0 ? Math.max(0, Math.min(100, (safeCurrentTime / safeDuration) * 100)) : 0;
    const now = Date.now();
    const snapshotKey = [
        normalizeId(activeSeriesProgressMeta.id),
        Math.round(safeCurrentTime),
        Math.round(safeDuration),
        Math.round(completion),
        eventType
    ].join(':');

    if (!force) {
        if (eventType === 'progress' && now - lastProgressSyncAt < 15000) return null;
        if (snapshotKey === lastProgressSnapshotKey) return null;
    }

    lastProgressSyncAt = now;
    lastProgressSnapshotKey = snapshotKey;

    try {
        const response = await requestProgressSync({
            init_data: tg.initData,
            series_id: normalizeId(activeSeriesProgressMeta.id),
            title: activeSeriesProgressMeta.title || serie?.title || '',
            category: serie?.category || '',
            last_position_seconds: Number(safeCurrentTime.toFixed(2)),
            duration_seconds: safeDuration > 0 ? Number(safeDuration.toFixed(2)) : 0,
            completion_percent: Number(completion.toFixed(2)),
            playback_mode: activeSeriesProgressMeta.playbackMode || getPlaybackMode(serie),
            event_type: eventType,
        });
        if (response?.progress) {
            applyProgressStateToSeries(activeSeriesProgressMeta.id, response.progress);
        }
        return response;
    } catch (error) {
        debugLog('[PROGRESS] Falha ao sincronizar progresso:', error.message);
        return null;
    }
}

async function deliverSeriesToTelegram(serie, options = {}) {
    if (!serie?.id || !userId) {
        showToast('Abra este Mini App pelo Telegram para receber a série.', 'error');
        return null;
    }

    const seriesId = normalizeId(serie.id);
    if (deliveryInFlightIds.has(seriesId)) {
        if (!options.silent) showToast('Enviando no Telegram...', 'info');
        return null;
    }

    deliveryInFlightIds.add(seriesId);
    try {
        const result = await requestSeriesDelivery({
            init_data: tg?.initData || '',
            series_id: seriesId,
            title: serie.title || '',
        });

        await requestProgressSync({
            init_data: tg?.initData || '',
            series_id: seriesId,
            title: serie.title || '',
            category: serie.category || '',
            last_position_seconds: 0,
            duration_seconds: 0,
            completion_percent: 0,
            playback_mode: 'telegram',
            event_type: 'telegram_delivery'
        }).catch(() => null);

        if (!options.silent) {
            showToast(`"${serie.title || 'Série'}" liberada no Telegram.`, 'success');
        }
        closeModal();
        toggleCart(false);
        return result;
    } catch (error) {
        if (error.status === 402 || error.code === 'payment_required') {
            closeModal();
            openModal(serie);
            showToast('Quer ver o final agora? Libere a série.', 'info');
            return null;
        }

        console.error('[DELIVERY] Falha ao entregar série:', error.message);
        showToast(error.message || 'Não foi possível enviar a série no Telegram.', 'error');
        return null;
    } finally {
        deliveryInFlightIds.delete(seriesId);
    }
}

async function requestOwnerDashboard(password) {
    return await requestJson(`${API_URL}?action=owner-dashboard`, {
        init_data: tg?.initData || '',
        password
    }, 20000);
}

async function requestOwnerOrderRetry(orderId) {
    return await requestJson(`${API_URL}?action=owner-order-retry`, {
        init_data: tg?.initData || '',
        password: String(DOM.ownerPasswordInput?.value || ''),
        order_id: String(orderId || ''),
    }, 2 * 60 * 1000);
}

async function requestOwnerCouponSave(payload) {
    return await requestJson(`${API_URL}?action=owner-coupon-save`, {
        init_data: tg?.initData || '',
        password: String(DOM.ownerPasswordInput?.value || ''),
        ...payload,
    }, 30000);
}

async function requestOwnerCouponAction(code, operation) {
    return await requestJson(`${API_URL}?action=owner-coupon-action`, {
        init_data: tg?.initData || '',
        password: String(DOM.ownerPasswordInput?.value || ''),
        code,
        operation,
    }, 30000);
}

function isOwnerUser() {
    return ownerSessionAuthorized;
}

function getOwnerInternalUploadLimitLabel() {
    return formatFileSize(OWNER_INTERNAL_UPLOAD_LIMIT_BYTES);
}

function updateOwnerVisibility() {
    if (DOM.ownerBtn) {
        DOM.ownerBtn.hidden = false;
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

function setOwnerSeriesSearchTerm(value = '') {
    ownerSeriesSearchTerm = String(value || '');
    if (ownerDashboardSnapshot) {
        renderOwnerDashboard(ownerDashboardSnapshot);
    }
}

function setOwnerSeriesFilterMode(mode = 'all') {
    ownerSeriesFilterMode = mode || 'all';
    if (ownerDashboardSnapshot) {
        renderOwnerDashboard(ownerDashboardSnapshot);
    }
}

function normalizeOwnerFilterText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function hasOwnerSeriesInternalPlayback(serie) {
    return Boolean(
        serie?.has_video_url ||
        hasDirectPlaybackUrl(serie)
    );
}

function needsOwnerSeriesMigration(serie) {
    return Boolean(
        !hasOwnerSeriesInternalPlayback(serie) &&
        (
            serie?.has_video_file_id ||
            getTelegramFileId(serie) ||
            Number(serie?.playable_episode_count || 0) > 0
        )
    );
}

function hasOwnerSeriesTelegramFallback(serie) {
    return Boolean(
        !hasOwnerSeriesInternalPlayback(serie) &&
        (
            serie?.has_video_file_id ||
            getTelegramFileId(serie) ||
            Number(serie?.playable_episode_count || 0) > 0
        )
    );
}

function hasOwnerSeriesAnyVideo(serie) {
    return Boolean(hasOwnerSeriesInternalPlayback(serie) || needsOwnerSeriesMigration(serie));
}

function getOwnerSeriesVideoStatusLabel(serie) {
    if (hasOwnerSeriesInternalPlayback(serie)) return 'Pronto';
    if (hasOwnerSeriesTelegramFallback(serie)) return 'Em fila';
    return 'Sem vídeo';
}

function getOwnerSeriesQuickVideoActionMeta(serie) {
    if (hasOwnerSeriesTelegramFallback(serie)) {
        return {
            action: 'migrate',
            label: 'Migrar',
            icon: 'fa-wand-magic-sparkles',
        };
    }

    return {
        action: 'video',
        label: 'Editar vídeo',
        icon: 'fa-film',
    };
}

function buildOwnerInternalUploadLimitMessage(file = null) {
    const sizeLabel = file instanceof File && file.size > 0
        ? ` O arquivo selecionado tem ${formatFileSize(file.size)}.`
        : '';
    return `O arquivo excede o limite desta etapa.${sizeLabel} Para arquivos acima de ${getOwnerInternalUploadLimitLabel()}, use o fluxo alternativo.`;
}

function extractTelegramFileIdInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i += 1) {
        if (/^file_id:?$/i.test(lines[i])) {
            return lines[i + 1] || '';
        }
    }

    const match = raw.match(/\b[A-Za-z0-9_-]{30,}\b/);
    return match ? match[0] : raw;
}

function getOwnerFileIdCaptureUrl(seriesId = '') {
    const payload = seriesId ? `fileid_${encodeURIComponent(String(seriesId))}` : 'fileid';
    return `${TELEGRAM_BOT_LINK}?start=${payload}`;
}

function getOwnerSeriesFilterCounts(series = []) {
    return {
        all: series.length,
        published: series.filter((item) => String(item?.status || 'published') === 'published').length,
        draft: series.filter((item) => String(item?.status || '') === 'draft').length,
        hidden: series.filter((item) => String(item?.status || '') === 'hidden').length,
        archived: series.filter((item) => String(item?.status || '') === 'archived').length,
        free: series.filter((item) => isFree(item)).length,
        paid: series.filter((item) => !isFree(item)).length,
        playable: series.filter((item) => hasOwnerSeriesInternalPlayback(item)).length,
        migration: series.filter((item) => hasOwnerSeriesTelegramFallback(item)).length,
        missing_video: series.filter((item) => !hasOwnerSeriesAnyVideo(item)).length,
    };
}

function filterOwnerSeries(series = []) {
    const term = normalizeOwnerFilterText(ownerSeriesSearchTerm);
    return series.filter((serie) => {
        const title = normalizeOwnerFilterText(serie?.title);
        const description = normalizeOwnerFilterText(serie?.description);
        const category = normalizeOwnerFilterText(serie?.category);

        const matchesTerm = !term || title.includes(term) || description.includes(term) || category.includes(term);
        if (!matchesTerm) return false;

        switch (ownerSeriesFilterMode) {
            case 'published':
            case 'draft':
            case 'hidden':
            case 'archived':
                return String(serie?.status || 'published') === ownerSeriesFilterMode;
            case 'free':
                return isFree(serie);
            case 'paid':
                return !isFree(serie);
            case 'playable':
                return hasOwnerSeriesInternalPlayback(serie);
            case 'migration':
                return needsOwnerSeriesMigration(serie);
            case 'missing_video':
                return !hasOwnerSeriesAnyVideo(serie);
            case 'all':
            default:
                return true;
        }
    });
}

function buildOwnerQuickUploadFormData(serie, fieldName, file) {
    const formData = new FormData();
    formData.set('init_data', tg?.initData || '');
    formData.set('password', String(DOM.ownerPasswordInput?.value || ''));
    formData.set('series_id', String(serie?.id || ''));
    formData.set('title', String(serie?.title || ''));
    formData.set('description', String(serie?.description || ''));
    formData.set('category', String(serie?.category || 'Geral') || 'Geral');
    formData.set('price', String(Number(serie?.price ?? 0) || 0));
    formData.set('is_free', isFree(serie) ? '1' : '0');
    if (file instanceof File) {
        formData.set(fieldName, file);
    }
    return formData;
}

function getOwnerUploadedFieldName(fieldName = '') {
    switch (String(fieldName || '').trim()) {
        case 'cover_file':
            return 'uploaded_cover_path';
        case 'trailer_file':
            return 'uploaded_trailer_path';
        case 'video_file':
            return 'uploaded_video_path';
        default:
            return '';
    }
}

function getOwnerUploadFieldLabel(fieldName = '') {
    switch (String(fieldName || '').trim()) {
        case 'cover_file':
            return 'capa';
        case 'trailer_file':
            return 'trailer';
        case 'video_file':
            return 'vídeo principal';
        default:
            return 'arquivo';
    }
}

async function uploadOwnerSeriesFormFile(formData, fieldName, file, resolvedSeriesId = '') {
    if (!(file instanceof File) || file.size <= 0) {
        return String(resolvedSeriesId || '');
    }

    const label = getOwnerUploadFieldLabel(fieldName);
    setOwnerUploadStatus(`Enviando ${label} em upload protegido...`, '');

    const upload = await uploadOwnerMediaViaApi({
        seriesId: String(resolvedSeriesId || ''),
        fieldName,
        file,
    });

    const nextSeriesId = String(upload?.series_id || resolvedSeriesId || '');
    const uploadedFieldName = getOwnerUploadedFieldName(fieldName);
    if (nextSeriesId) {
        formData.set('series_id', nextSeriesId);
    }
    if (uploadedFieldName) {
        formData.set(uploadedFieldName, String(upload?.object_path || ''));
    }
    formData.delete(fieldName);

    return nextSeriesId;
}

async function submitOwnerQuickUpload(seriesId, fieldName, file) {
    const serie = ownerSeriesCatalog.find((item) => sameId(item.id, seriesId));
    if (!serie) {
        showToast('Não encontrei a série para atualizar.', 'error');
        return;
    }
    if (!(file instanceof File) || file.size <= 0) {
        showToast('Selecione um arquivo válido.', 'error');
        return;
    }
    if (fieldName === 'video_file' && file.size > OWNER_INTERNAL_UPLOAD_LIMIT_BYTES) {
        const friendlyMessage = buildOwnerInternalUploadLimitMessage(file);
        setOwnerUploadStatus(friendlyMessage, 'error');
        showToast(friendlyMessage, 'error');
        return;
    }

    const labels = {
        cover_file: 'capa',
        video_file: 'vídeo principal',
        trailer_file: 'trailer',
    };
    const submitLabel = labels[fieldName] || 'arquivo';
    const previousStatus = document.getElementById('ownerUploadStatus')?.textContent || '';

    try {
        setOwnerUploadStatus(`Enviando nova ${submitLabel} de "${serie.title || 'série'}"...`, '');
        let payload;
        if (fieldName === 'video_file') {
            setOwnerUploadStatus(`Subindo ${submitLabel} em upload protegido para "${serie.title || 'série'}"...`, '');
            const upload = await uploadOwnerMediaViaApi({
                seriesId: String(serie?.id || ''),
                fieldName,
                file,
            });
            const formData = buildOwnerQuickUploadFormData(serie, fieldName, null);
            formData.set('series_id', String(upload?.series_id || serie?.id || ''));
            formData.set('uploaded_video_path', String(upload?.object_path || ''));
            payload = await requestOwnerSeriesSave(formData);
        } else {
            payload = await requestOwnerSeriesSave(buildOwnerQuickUploadFormData(serie, fieldName, file));
        }
        const updated = payload?.series || null;
        const dashboard = payload?.dashboard || null;

        if (updated) {
            allSeries = [updated, ...allSeries.filter((item) => !sameId(item.id, updated.id))];
            refreshCatalog();
            initHero();
        }

        if (dashboard) {
            ownerDashboardSnapshot = dashboard;
            renderOwnerDashboard(dashboard);
        }

        setOwnerUploadStatus(`Nova ${submitLabel} aplicada com sucesso.`, 'success');
        showToast(`Nova ${submitLabel} aplicada com sucesso!`, 'success');
    } catch (error) {
        const friendlyMessage = explainOwnerUploadError(error, file);
        setOwnerUploadStatus(friendlyMessage || `Não foi possível trocar a ${submitLabel}.`, 'error');
        showToast(friendlyMessage || `Falha ao trocar a ${submitLabel}.`, 'error');
    } finally {
        if (!document.getElementById('ownerUploadStatus')?.textContent) {
            setOwnerUploadStatus(previousStatus, '');
        }
    }
}

async function requestOwnerSeriesMigrate(seriesId) {
    return requestJson(`${API_URL}?action=owner-series-migrate`, {
        init_data: tg?.initData || '',
        password: String(DOM.ownerPasswordInput?.value || ''),
        series_id: seriesId,
    }, 120000);
}

async function migrateOwnerSeriesVideo(seriesId, options = {}) {
    const { silent = false } = options;
    const serie = ownerSeriesCatalog.find((item) => sameId(item.id, seriesId));
    if (!serie) {
        if (!silent) showToast('Não encontrei a série para migrar.', 'error');
        return null;
    }

    if (!needsOwnerSeriesMigration(serie)) {
        if (!silent) showToast('Essa série já está pronta no player interno.', 'info');
        return null;
    }

    const previousStatus = document.getElementById('ownerUploadStatus')?.textContent || '';

    try {
        if (!silent) {
            setOwnerUploadStatus(`Migrando "${serie.title || 'série'}" para o player interno...`, '');
        }

        const payload = await requestOwnerSeriesMigrate(seriesId);
        const updated = payload?.series || null;
        const dashboard = payload?.dashboard || null;

        if (updated) {
            allSeries = [updated, ...allSeries.filter((item) => !sameId(item.id, updated.id))];
            refreshCatalog();
            initHero();
        }

        if (dashboard) {
            ownerDashboardSnapshot = dashboard;
            renderOwnerDashboard(dashboard);
        }

        if (!silent) {
            setOwnerUploadStatus(`"${serie.title || 'série'}" migrada com sucesso.`, 'success');
            showToast(`"${serie.title || 'série'}" migrada para o player interno.`, 'success');
        }

        return payload;
    } catch (error) {
        if (!silent) {
            const friendlyMessage = explainOwnerUploadError(error);
            setOwnerUploadStatus(friendlyMessage || 'Não foi possível migrar a série.', 'error');
            showToast(friendlyMessage || 'Falha ao migrar a série.', 'error');
        }
        return null;
    } finally {
        if (!silent && !document.getElementById('ownerUploadStatus')?.textContent) {
            setOwnerUploadStatus(previousStatus, '');
        }
    }
}

async function migrateOwnerPrioritySeries() {
    const queue = ownerSeriesCatalog.filter((item) => needsOwnerSeriesMigration(item));
    if (!queue.length) {
        showToast('Não há séries elegíveis para migração agora.', 'info');
        return;
    }

    let migratedCount = 0;
    setOwnerUploadStatus(`Tentando migrar séries elegíveis (${queue.length})...`, '');

    for (const serie of queue) {
        const result = await migrateOwnerSeriesVideo(String(serie.id || ''), { silent: true });
        if (result?.ok) migratedCount += 1;
    }

    const message = migratedCount
        ? `${migratedCount} série(s) migrada(s) com sucesso.`
        : 'Nenhuma série elegível pôde ser migrada agora.';
    setOwnerUploadStatus(message, migratedCount ? 'success' : 'error');
    showToast(message, migratedCount ? 'success' : 'error');
}

function requestOwnerSeriesDelete(seriesId) {
    return requestJson(`${API_URL}?action=owner-series-delete`, {
        init_data: tg?.initData || '',
        password: String(DOM.ownerPasswordInput?.value || ''),
        series_id: seriesId,
    }, 20000);
}

function requestOwnerSeriesAction(seriesId, operation) {
    return requestJson(`${API_URL}?action=owner-series-action`, {
        init_data: tg?.initData || '',
        password: String(DOM.ownerPasswordInput?.value || ''),
        series_id: String(seriesId || ''),
        operation: String(operation || ''),
    }, 30000);
}

function getOwnerSeriesStatusMeta(serie) {
    const status = String(serie?.status || 'published').toLowerCase();
    const labels = {
        published: { label: 'Publicada', icon: 'fa-circle-check' },
        draft: { label: 'Rascunho', icon: 'fa-pen-ruler' },
        hidden: { label: 'Oculta', icon: 'fa-eye-slash' },
        archived: { label: 'Arquivada', icon: 'fa-box-archive' },
    };
    return { status, ...(labels[status] || labels.draft) };
}

async function runOwnerSeriesAction(seriesId, operation, button = null) {
    const serie = ownerSeriesCatalog.find((item) => sameId(item.id, seriesId));
    if (!serie) return;
    const confirmations = {
        archived: `Arquivar "${serie.title || 'esta série'}"? Ela deixará o catálogo público.`,
        duplicate: `Duplicar "${serie.title || 'esta série'}" como rascunho?`,
    };
    if (confirmations[operation] && !window.confirm(confirmations[operation])) return;

    const previousHtml = button instanceof HTMLButtonElement ? button.innerHTML : '';
    if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando';
    }
    try {
        const payload = await requestOwnerSeriesAction(seriesId, operation);
        if (payload?.dashboard) {
            ownerDashboardSnapshot = payload.dashboard;
            renderOwnerDashboard(payload.dashboard);
        }
        if (payload?.series && String(payload.series.status || 'published') === 'published') {
            allSeries = [payload.series, ...allSeries.filter((item) => !sameId(item.id, payload.series.id))];
        } else if (operation !== 'duplicate') {
            allSeries = allSeries.filter((item) => !sameId(item.id, seriesId));
        }
        refreshCatalog();
        initHero();
        const labels = { published: 'Série publicada.', draft: 'Série movida para rascunhos.', hidden: 'Série ocultada.', archived: 'Série arquivada.', duplicate: 'Cópia criada como rascunho.' };
        showToast(labels[operation] || 'Ação concluída.', 'success');
    } catch (error) {
        showToast(error.message || 'Não foi possível concluir a ação.', 'error');
        setOwnerUploadStatus(error.message || 'Não foi possível concluir a ação.', 'error');
    } finally {
        if (button instanceof HTMLButtonElement && button.isConnected) {
            button.disabled = false;
            button.innerHTML = previousHtml;
        }
    }
}

async function deleteOwnerSeries(seriesId) {
    const serie = ownerSeriesCatalog.find((item) => sameId(item.id, seriesId));
    if (!serie) {
        showToast('Não encontrei a série para excluir.', 'error');
        return;
    }

    const confirmed = window.confirm(`Excluir "${serie.title || 'esta série'}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
        setOwnerUploadStatus(`Excluindo "${serie.title || 'série'}"...`, '');
        const payload = await requestOwnerSeriesDelete(seriesId);
        const dashboard = payload?.dashboard || null;

        allSeries = allSeries.filter((item) => !sameId(item.id, seriesId));
        refreshCatalog();
        initHero();

        if (sameId(ownerSeriesEditId, seriesId)) {
            ownerSeriesEditId = '';
        }

        if (dashboard) {
            ownerDashboardSnapshot = dashboard;
            renderOwnerDashboard(dashboard);
        }
        showToast('Série excluída com sucesso.', 'success');
        setOwnerUploadStatus('Série excluída com sucesso.', 'success');
    } catch (error) {
        setOwnerUploadStatus(error.message || 'Não foi possível excluir a série.', 'error');
        showToast(error.message || 'Falha ao excluir a série.', 'error');
    }
}

function restoreOwnerSeriesEditorState() {
    if (!ownerSeriesEditId) {
        resetOwnerSeriesEditor();
        return;
    }

    const serie = ownerSeriesCatalog.find((item) => sameId(item.id, ownerSeriesEditId));
    if (!serie) {
        resetOwnerSeriesEditor();
        return;
    }

    updateOwnerFormMode(serie);
}

function wireOwnerDashboardControls() {
    document.querySelectorAll('.owner-series-thumb').forEach((image) => {
        if (!(image instanceof HTMLImageElement)) return;
        image.onerror = () => {
            image.onerror = null;
            image.src = PLACEHOLDER_IMAGE;
        };
    });

    const retryOrderButtons = document.querySelectorAll('[data-owner-order-retry]');
    retryOrderButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.onclick = () => retryOwnerOrderDelivery(button.dataset.ownerOrderRetry || '', button);
    });

    const couponForm = document.getElementById('ownerCouponForm');
    if (couponForm instanceof HTMLFormElement) {
        couponForm.onsubmit = submitOwnerCoupon;
        const discountType = couponForm.elements.namedItem('discount_type');
        const discountValue = couponForm.elements.namedItem('discount_value');
        const syncDiscountField = () => {
            if (!(discountType instanceof HTMLSelectElement) || !(discountValue instanceof HTMLInputElement)) return;
            const percentage = discountType.value === 'percentage';
            discountValue.max = percentage ? '100' : '10000';
            discountValue.step = percentage ? '1' : '0.01';
            discountValue.placeholder = percentage ? '10' : '5,90';
        };
        discountType?.addEventListener('change', syncDiscountField);
        syncDiscountField();
    }
    document.querySelectorAll('[data-owner-coupon-reset]').forEach((button) => {
        if (button instanceof HTMLButtonElement) button.onclick = resetOwnerCouponEditor;
    });
    document.querySelectorAll('[data-owner-coupon-edit]').forEach((button) => {
        if (button instanceof HTMLButtonElement) button.onclick = () => editOwnerCoupon(button.dataset.ownerCouponEdit || '');
    });
    document.querySelectorAll('[data-owner-coupon-action]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.onclick = () => runOwnerCouponAction(
            button.dataset.ownerCouponCode || '',
            button.dataset.ownerCouponAction || '',
            button,
        );
    });

    const searchInput = document.getElementById('ownerSeriesSearchInput');
    if (searchInput instanceof HTMLInputElement) {
        searchInput.value = ownerSeriesSearchTerm;
        searchInput.oninput = () => setOwnerSeriesSearchTerm(searchInput.value);
    }

    const filterButtons = document.querySelectorAll('[data-owner-filter-mode]');
    filterButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.onclick = () => setOwnerSeriesFilterMode(button.dataset.ownerFilterMode || 'all');
    });

    const resetEditorButtons = document.querySelectorAll('[data-owner-reset-editor]');
    resetEditorButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.onclick = () => resetOwnerSeriesEditor();
    });

    const migratePriorityButtons = document.querySelectorAll('[data-owner-migrate-priority]');
    migratePriorityButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.onclick = () => migrateOwnerPrioritySeries();
    });

    const quickActionButtons = document.querySelectorAll('[data-owner-quick-action]');
    quickActionButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.onclick = () => {
            const action = button.dataset.ownerQuickAction || '';
            const seriesId = button.dataset.ownerSeriesId || '';
            if (action === 'migrate') {
                void migrateOwnerSeriesVideo(seriesId);
                return;
            }
            const input = document.getElementById(`ownerQuick${action[0]?.toUpperCase() ?? ''}${action.slice(1)}Input`);
            if (input instanceof HTMLInputElement) {
                input.dataset.seriesId = seriesId;
                input.value = '';
                input.click();
            }
        };
    });

    const quickFileInputs = [
        { id: 'ownerQuickCoverInput', field: 'cover_file' },
        { id: 'ownerQuickVideoInput', field: 'video_file' },
        { id: 'ownerQuickTrailerInput', field: 'trailer_file' },
    ];

    quickFileInputs.forEach(({ id, field }) => {
        const input = document.getElementById(id);
        if (!(input instanceof HTMLInputElement)) return;
        input.onchange = async () => {
            const file = input.files?.[0] || null;
            const seriesId = String(input.dataset.seriesId || '');
            input.value = '';
            if (!seriesId) return;
            await submitOwnerQuickUpload(seriesId, field, file);
        };
    });

    const editButtons = document.querySelectorAll('[data-owner-edit-id]');
    editButtons.forEach((button) => {
        if (button instanceof HTMLButtonElement) {
            button.onclick = () => openOwnerSeriesEditor(button.dataset.ownerEditId || '');
        }
    });

    const deleteButtons = document.querySelectorAll('[data-owner-delete-id]');
    deleteButtons.forEach((button) => {
        if (button instanceof HTMLButtonElement) {
            button.onclick = () => deleteOwnerSeries(button.dataset.ownerDeleteId || '');
        }
    });

    const editorialButtons = document.querySelectorAll('[data-owner-editorial-action]');
    editorialButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.onclick = () => runOwnerSeriesAction(
            button.dataset.ownerSeriesId || '',
            button.dataset.ownerEditorialAction || '',
            button,
        );
    });
}

function releaseOwnerCoverPreviewObjectUrl() {
    if (ownerCoverPreviewObjectUrl) {
        URL.revokeObjectURL(ownerCoverPreviewObjectUrl);
        ownerCoverPreviewObjectUrl = '';
    }
}

function getOwnerCoverPreviewImage() {
    return document.getElementById('ownerCoverPreviewImage');
}

function getOwnerCoverPreviewCaption() {
    return document.getElementById('ownerCoverPreviewCaption');
}

function setOwnerCoverPreview(source = '', caption = 'Pré-visualização da capa') {
    const img = getOwnerCoverPreviewImage();
    const text = getOwnerCoverPreviewCaption();
    if (img instanceof HTMLImageElement) {
        img.onerror = () => {
            img.onerror = null;
            img.src = PLACEHOLDER_IMAGE;
        };
        img.src = source || PLACEHOLDER_IMAGE;
    }
    if (text) {
        text.textContent = caption;
    }
}

function syncOwnerCoverPreviewFromFile(file) {
    releaseOwnerCoverPreviewObjectUrl();

    if (file instanceof File && file.size > 0) {
        ownerCoverPreviewObjectUrl = URL.createObjectURL(file);
        setOwnerCoverPreview(ownerCoverPreviewObjectUrl, file.name || 'Nova capa');
        return;
    }

    const currentPreview = ownerSeriesEditId ? getCoverUrl(ownerSeriesCatalog.find((serie) => sameId(serie.id, ownerSeriesEditId))) : '';
    setOwnerCoverPreview(currentPreview || PLACEHOLDER_IMAGE, ownerSeriesEditId ? 'Capa atual da série' : 'Pré-visualização da capa');
}

function updateOwnerFormMode(serie = null) {
    ownerSeriesEditId = serie?.id ? String(serie.id) : '';

    const form = document.getElementById('ownerSeriesForm');
    const formTitle = document.getElementById('ownerFormTitle');
    const formSubtitle = document.getElementById('ownerFormSubtitle');
    const formBadge = document.getElementById('ownerFormBadge');
    const cancelBtn = document.getElementById('ownerFormCancelBtn');
    const submitBtn = document.getElementById('ownerSeriesSubmitBtn');
    const seriesIdInput = document.getElementById('ownerSeriesId');
    const coverInput = document.querySelector('input[name="cover_file"]');
    const videoInput = document.querySelector('input[name="video_file"]');
    const trailerInput = document.querySelector('input[name="trailer_file"]');
    const titleInput = document.querySelector('input[name="title"]');
    const categoryInput = document.querySelector('input[name="category"]');
    const descriptionInput = document.querySelector('textarea[name="description"]');
    const freeToggle = document.getElementById('ownerSeriesFree');
    const priceInput = document.getElementById('ownerSeriesPrice');
    const videoFileIdInput = document.getElementById('ownerSeriesVideoFileId');
    const fileIdHelpLink = document.getElementById('ownerFileIdHelpLink');

    if (seriesIdInput) {
        seriesIdInput.value = ownerSeriesEditId;
    }

    const editing = Boolean(serie);
    if (formTitle) {
        formTitle.textContent = editing ? `Editar série: ${serie.title || 'Sem título'}` : 'Nova série em vídeo único';
    }
    if (formSubtitle) {
        formSubtitle.textContent = editing
            ? 'Ajuste texto, preço, capa ou vídeo principal e salve por cima da série já publicada.'
            : 'Crie uma nova série com um vídeo principal único. O trailer continua opcional.';
    }
    if (formBadge) {
        formBadge.textContent = editing ? 'Modo de edição' : 'Novo cadastro';
    }
    if (cancelBtn instanceof HTMLButtonElement) {
        cancelBtn.hidden = !editing;
    }
    if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.innerHTML = editing
            ? '<i class="fas fa-floppy-disk"></i> Salvar alterações'
            : '<i class="fas fa-floppy-disk"></i> Salvar série';
    }

    if (titleInput instanceof HTMLInputElement) {
        titleInput.value = serie?.title || '';
    }
    if (categoryInput instanceof HTMLInputElement) {
        categoryInput.value = serie?.category || 'Geral';
    }
    if (descriptionInput instanceof HTMLTextAreaElement) {
        descriptionInput.value = serie?.description || '';
    }
    const optionalFieldValues = {
        slug: serie?.slug || '',
        alternate_title: serie?.alternate_title || '',
        short_description: serie?.short_description || '',
        tags: Array.isArray(serie?.tags) ? serie.tags.join(', ') : (serie?.tags || ''),
        language: serie?.language || 'Português',
        subtitle_language: serie?.subtitle_language || '',
        duration_minutes: serie?.duration_minutes || '',
        release_year: serie?.release_year || '',
        age_rating: serie?.age_rating || '',
        seo_title: serie?.seo_title || '',
        seo_description: serie?.seo_description || '',
        canonical_url: serie?.canonical_url || '',
        og_title: serie?.og_title || '',
        og_description: serie?.og_description || '',
        og_image_url: serie?.og_image_url || '',
    };
    Object.entries(optionalFieldValues).forEach(([name, value]) => {
        const field = form?.querySelector(`[name="${name}"]`);
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.value = String(value ?? '');
    });
    ['is_featured', 'is_dubbed', 'is_subtitled', 'is_new', 'seo_noindex'].forEach((name) => {
        const field = form?.querySelector(`[name="${name}"]`);
        if (field instanceof HTMLInputElement) field.checked = serie?.[name] === true;
    });
    const statusSelect = form?.querySelector('[name="status"]');
    if (statusSelect instanceof HTMLSelectElement) statusSelect.value = serie?.status || 'published';
    const deliverySelect = form?.querySelector('[name="content_delivery_type"]');
    if (deliverySelect instanceof HTMLSelectElement) deliverySelect.value = serie?.content_delivery_type || 'telegram';
    if (freeToggle instanceof HTMLInputElement) {
        freeToggle.checked = isFree(serie);
    }
    if (priceInput instanceof HTMLInputElement) {
        priceInput.value = editing ? String(Number(serie?.price ?? 0) || 0) : '0';
        priceInput.disabled = Boolean(freeToggle?.checked);
        priceInput.required = !Boolean(freeToggle?.checked);
    }
    if (videoFileIdInput instanceof HTMLTextAreaElement) {
        videoFileIdInput.value = editing ? getTelegramFileId(serie) : '';
    }
    const publishing = (serie?.status || 'published') === 'published';
    if (coverInput instanceof HTMLInputElement) {
        coverInput.required = !editing && publishing;
    }
    if (videoInput instanceof HTMLInputElement) {
        videoInput.required = !editing && publishing && !(videoFileIdInput instanceof HTMLTextAreaElement && extractTelegramFileIdInput(videoFileIdInput.value));
    }
    if (trailerInput instanceof HTMLInputElement) {
        trailerInput.required = false;
    }
    if (fileIdHelpLink instanceof HTMLAnchorElement) {
        fileIdHelpLink.href = getOwnerFileIdCaptureUrl(ownerSeriesEditId || '');
        fileIdHelpLink.textContent = editing ? 'Abrir guia desta série' : 'Abrir guia';
    }

    releaseOwnerCoverPreviewObjectUrl();
    setOwnerCoverPreview(editing ? getCoverUrl(serie) : PLACEHOLDER_IMAGE, editing ? 'Capa atual da série' : 'Pré-visualização da capa');
    if (form) {
        form.dataset.mode = editing ? 'edit' : 'create';
    }
}

function openOwnerSeriesEditor(seriesId) {
    const serie = ownerSeriesCatalog.find((item) => sameId(item.id, seriesId));
    if (!serie) {
        showToast('Não encontrei essa série para edição.', 'error');
        return;
    }

    updateOwnerFormMode(serie);
    setOwnerUploadStatus(`Editando ${serie.title || 'série selecionada'}.`, 'success');
    DOM.ownerOverlay?.scrollTo?.({ top: 0, behavior: 'smooth' });
    document.getElementById('ownerSeriesForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetOwnerSeriesEditor() {
    releaseOwnerCoverPreviewObjectUrl();
    updateOwnerFormMode(null);
    setOwnerUploadStatus('Pronto para novo cadastro.', '');
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
    const coverInput = document.querySelector('input[name="cover_file"]');
    const videoInput = document.querySelector('input[name="video_file"]');
    const videoFileIdInput = document.getElementById('ownerSeriesVideoFileId');
    const cancelBtn = document.getElementById('ownerFormCancelBtn');
    const statusSelect = form?.querySelector('[name="status"]');
    const descriptionInput = form?.querySelector('[name="description"]');

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

    if (coverInput instanceof HTMLInputElement) {
        coverInput.onchange = () => {
            const file = coverInput.files?.[0] || null;
            syncOwnerCoverPreviewFromFile(file);
        };
    }

    const syncOwnerVideoSources = () => {
        const normalizedFileId = videoFileIdInput instanceof HTMLTextAreaElement
            ? extractTelegramFileIdInput(videoFileIdInput.value)
            : '';

        if (videoFileIdInput instanceof HTMLTextAreaElement && normalizedFileId && videoFileIdInput.value.trim() !== normalizedFileId) {
            videoFileIdInput.value = normalizedFileId;
        }

        if (videoInput instanceof HTMLInputElement) {
            const hasUpload = Boolean(videoInput.files?.[0]?.size);
            const publishing = !(statusSelect instanceof HTMLSelectElement) || statusSelect.value === 'published';
            videoInput.required = publishing && !ownerSeriesEditId && !normalizedFileId;
            if (normalizedFileId && hasUpload && videoInput.files?.[0] && videoInput.files[0].size > OWNER_INTERNAL_UPLOAD_LIMIT_BYTES) {
                videoInput.value = '';
            }
        }
    };

    const syncOwnerEditorialRequirements = () => {
        const publishing = !(statusSelect instanceof HTMLSelectElement) || statusSelect.value === 'published';
        if (descriptionInput instanceof HTMLTextAreaElement) descriptionInput.required = publishing;
        if (coverInput instanceof HTMLInputElement) coverInput.required = publishing && !ownerSeriesEditId;
        syncOwnerVideoSources();
    };

    if (statusSelect instanceof HTMLSelectElement) {
        statusSelect.onchange = syncOwnerEditorialRequirements;
    }

    form?.querySelectorAll('[maxlength][name]').forEach((field) => {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
        const counter = form.querySelector(`[data-owner-count-for="${field.name}"]`);
        const updateCounter = () => {
            if (counter) counter.textContent = `${field.value.length}/${field.maxLength}`;
        };
        field.addEventListener('input', updateCounter);
        updateCounter();
    });

    if (videoFileIdInput instanceof HTMLTextAreaElement) {
        videoFileIdInput.onchange = syncOwnerVideoSources;
        videoFileIdInput.oninput = () => {
            if (!videoFileIdInput.value.trim()) return;
            const normalized = extractTelegramFileIdInput(videoFileIdInput.value);
            if (normalized && normalized !== videoFileIdInput.value) {
                videoFileIdInput.value = normalized;
            }
        };
    }

    if (videoInput instanceof HTMLInputElement) {
        videoInput.onchange = syncOwnerVideoSources;
    }

    if (cancelBtn instanceof HTMLButtonElement) {
        cancelBtn.onclick = () => {
            if (form instanceof HTMLFormElement) {
                form.reset();
            }
            resetOwnerSeriesEditor();
            const coverInputElement = document.querySelector('input[name="cover_file"]');
            if (coverInputElement instanceof HTMLInputElement) {
                coverInputElement.value = '';
            }
            const videoInput = document.querySelector('input[name="video_file"]');
            if (videoInput instanceof HTMLInputElement) {
                videoInput.value = '';
            }
            const trailerInput = document.querySelector('input[name="trailer_file"]');
            if (trailerInput instanceof HTMLInputElement) {
                trailerInput.value = '';
            }
            if (videoFileIdInput instanceof HTMLTextAreaElement) {
                videoFileIdInput.value = '';
            }
            syncOwnerVideoSources();
        };
    }

    if (form) {
        form.onsubmit = submitOwnerSeriesUpload;
    }
    syncOwnerEditorialRequirements();
}

function openOwnerArea() {
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

function openOwnerMigrationForSeries(serie) {
    closePlayer();
    if (!isOwnerUser()) {
        showToast('Este conteúdo não está disponível no momento.', 'info');
        return;
    }

    openOwnerArea();
    setOwnerStatus('Abra a área de gestão para continuar.', 'info');

    if (ownerDashboardSnapshot && serie?.id) {
        setTimeout(() => openOwnerSeriesEditor(serie.id), 120);
    }
}

function formatOwnerCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function getOwnerDeliveryStatusMeta(status, isProcessing = false) {
    const normalized = String(status || 'pending').toLowerCase();
    if (isProcessing || normalized === 'processing') return { label: 'Processando', tone: 'info', icon: 'fa-spinner fa-spin' };
    if (normalized === 'completed') return { label: 'Concluída', tone: 'success', icon: 'fa-circle-check' };
    if (normalized === 'partial') return { label: 'Parcial', tone: 'warning', icon: 'fa-triangle-exclamation' };
    if (normalized === 'failed') return { label: 'Falhou', tone: 'danger', icon: 'fa-circle-xmark' };
    if (normalized === 'retry') return { label: 'Aguardando nova tentativa', tone: 'warning', icon: 'fa-rotate' };
    return { label: 'Pendente', tone: 'muted', icon: 'fa-clock' };
}

function getOwnerPaymentStatusLabel(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'Pagamento aprovado';
    if (['pending', 'pending_payment', 'in_process'].includes(normalized)) return 'Pagamento pendente';
    if (normalized === 'rejected') return 'Pagamento recusado';
    if (['cancelled', 'canceled'].includes(normalized)) return 'Pagamento cancelado';
    return normalized || 'Status desconhecido';
}

function renderOwnerOrderCard(order, priority = false) {
    const orderId = String(order?.order_id || '');
    const shortOrderId = String(order?.order_short_id || orderId.slice(0, 8) || '---');
    const deliveryMeta = getOwnerDeliveryStatusMeta(order?.delivery_status, order?.is_processing);
    const items = Array.isArray(order?.items) ? order.items : [];
    const itemRows = items.map((item) => `
        <div class="owner-order-item ${item.delivered ? 'is-delivered' : ''}">
            <i class="fas ${item.delivered ? 'fa-circle-check' : 'fa-clock'}"></i>
            <span>${escapeHtml(item.title || 'Série')}</span>
            <strong>${escapeHtml(formatOwnerCurrency(item.price))}</strong>
        </div>
    `).join('') || '<div class="owner-order-item"><i class="fas fa-circle-info"></i><span>Itens não informados</span></div>';
    const customer = [order?.buyer_email, order?.user_id ? `Telegram ${order.user_id}` : ''].filter(Boolean).join(' • ');
    const canRetry = order?.can_retry_delivery === true;
    const retrying = ownerOrderRetryInFlightIds.has(orderId);

    return `
        <article class="owner-order-card ${priority ? 'owner-order-card-priority' : ''}" data-owner-order-id="${escapeAttr(orderId)}">
            <div class="owner-order-card-head">
                <div>
                    <span class="owner-order-kicker">Pedido ${escapeHtml(shortOrderId)}</span>
                    <strong>${escapeHtml(formatOwnerCurrency(order?.amount))}</strong>
                </div>
                <div class="owner-order-badges">
                    <span class="owner-order-badge owner-order-badge-payment"><i class="fas fa-shield-halved"></i> ${escapeHtml(getOwnerPaymentStatusLabel(order?.status))}</span>
                    <span class="owner-order-badge owner-order-badge-${escapeAttr(deliveryMeta.tone)}"><i class="fas ${escapeAttr(deliveryMeta.icon)}"></i> ${escapeHtml(deliveryMeta.label)}</span>
                </div>
            </div>
            <div class="owner-order-meta">
                <span><i class="fas fa-user"></i> ${escapeHtml(customer || 'Cliente não informado')}</span>
                <span><i class="fas fa-calendar"></i> ${escapeHtml(formatOwnerDate(order?.created_at))}</span>
                <span><i class="fas fa-box"></i> ${escapeHtml(String(order?.delivered_count ?? 0))}/${escapeHtml(String(order?.item_count ?? items.length))} entregues</span>
            </div>
            <div class="owner-order-items">${itemRows}</div>
            ${order?.delivery_last_error ? `<div class="owner-order-error"><i class="fas fa-triangle-exclamation"></i><span>${escapeHtml(order.delivery_last_error)}</span></div>` : ''}
            <div class="owner-order-card-footer">
                <span>Tentativas: <strong>${escapeHtml(String(order?.delivery_attempts ?? 0))}</strong></span>
                ${canRetry ? `
                    <button type="button" class="btn btn-primary owner-order-retry-btn" data-owner-order-retry="${escapeAttr(orderId)}" ${retrying ? 'disabled' : ''}>
                        <i class="fas ${retrying ? 'fa-spinner fa-spin' : 'fa-rotate-right'}"></i> ${retrying ? 'Reprocessando...' : 'Reprocessar entrega'}
                    </button>
                ` : `<span class="owner-order-locked"><i class="fas ${order?.is_processing ? 'fa-spinner fa-spin' : 'fa-lock'}"></i> ${order?.is_processing ? 'Entrega em andamento' : deliveryMeta.label}</span>`}
            </div>
        </article>
    `;
}

async function retryOwnerOrderDelivery(orderId, button) {
    const normalizedOrderId = String(orderId || '');
    if (!normalizedOrderId || ownerOrderRetryInFlightIds.has(normalizedOrderId)) return;
    if (!window.confirm('Confirmar nova tentativa? O sistema enviará somente os títulos que ainda não foram entregues.')) return;

    ownerOrderRetryInFlightIds.add(normalizedOrderId);
    if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reprocessando...';
    }
    setOwnerStatus('Validando o pagamento e reprocessando somente os itens pendentes...', '');

    try {
        const payload = await requestOwnerOrderRetry(normalizedOrderId);
        if (payload?.dashboard) {
            ownerDashboardSnapshot = payload.dashboard;
            renderOwnerDashboard(payload.dashboard);
        }
        const status = String(payload?.order?.delivery_status || '').toLowerCase();
        if (status === 'completed') {
            setOwnerStatus('Entrega reprocessada e concluída com sucesso.', 'success');
            showToast('Entrega concluída no Telegram.', 'success');
        } else {
            setOwnerStatus('A nova tentativa terminou, mas ainda existem itens pendentes.', 'error');
            showToast('Ainda existem itens pendentes nessa entrega.', 'info');
        }
    } catch (error) {
        setOwnerStatus(error?.message || 'Não foi possível reprocessar a entrega.', 'error');
        showToast(error?.message || 'Falha ao reprocessar a entrega.', 'error');
    } finally {
        ownerOrderRetryInFlightIds.delete(normalizedOrderId);
        const currentButton = Array.from(document.querySelectorAll('[data-owner-order-retry]'))
            .find((candidate) => candidate.dataset.ownerOrderRetry === normalizedOrderId);
        if (currentButton instanceof HTMLButtonElement && currentButton.isConnected) {
            currentButton.disabled = false;
            currentButton.innerHTML = '<i class="fas fa-rotate-right"></i> Reprocessar entrega';
        }
    }
}

function renderOwnerEditorialActions(serie) {
    const id = escapeAttr(String(serie?.id || ''));
    const status = getOwnerSeriesStatusMeta(serie).status;
    const primary = status === 'published'
        ? { operation: 'hidden', label: 'Ocultar', icon: 'fa-eye-slash' }
        : { operation: 'published', label: 'Publicar', icon: 'fa-cloud-arrow-up' };
    const secondary = status === 'archived'
        ? { operation: 'draft', label: 'Restaurar', icon: 'fa-rotate-left' }
        : { operation: 'archived', label: 'Arquivar', icon: 'fa-box-archive' };
    return `
        <button type="button" class="btn btn-secondary owner-series-mini-btn" data-owner-editorial-action="${primary.operation}" data-owner-series-id="${id}">
            <i class="fas ${primary.icon}"></i> ${primary.label}
        </button>
        <button type="button" class="btn btn-secondary owner-series-mini-btn" data-owner-editorial-action="${secondary.operation}" data-owner-series-id="${id}">
            <i class="fas ${secondary.icon}"></i> ${secondary.label}
        </button>
        <button type="button" class="btn btn-secondary owner-series-mini-btn" data-owner-editorial-action="duplicate" data-owner-series-id="${id}">
            <i class="fas fa-copy"></i> Duplicar
        </button>
    `;
}

function getOwnerCouponStatusMeta(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'active') return { label: 'Ativa', tone: 'success', icon: 'fa-circle-check' };
    if (normalized === 'scheduled') return { label: 'Agendada', tone: 'info', icon: 'fa-calendar-check' };
    if (normalized === 'expired') return { label: 'Expirada', tone: 'warning', icon: 'fa-hourglass-end' };
    return { label: 'Encerrada', tone: 'muted', icon: 'fa-circle-pause' };
}

function formatOwnerCouponDateInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function formatOwnerCouponDiscount(coupon) {
    const value = Number(coupon?.discount_value || 0);
    return coupon?.discount_type === 'percentage' ? `${value}%` : formatOwnerCurrency(value);
}

function renderOwnerCouponSection(couponData, paidSeries) {
    const coupons = Array.isArray(couponData?.items) ? couponData.items : [];
    const editingCoupon = coupons.find((coupon) => coupon.code === ownerCouponEditCode) || null;
    const selectedSeries = new Set(Array.isArray(editingCoupon?.eligible_series_ids) ? editingCoupon.eligible_series_ids.map(String) : []);
    const seriesOptions = paidSeries.map((serie) => `
        <label class="owner-coupon-series-option">
            <input type="checkbox" name="eligible_series_ids" value="${escapeAttr(String(serie.id || ''))}" ${selectedSeries.has(String(serie.id || '')) ? 'checked' : ''}>
            <span>${escapeHtml(serie.title || 'Série')}</span>
        </label>
    `).join('') || '<p class="owner-coupon-empty-copy">Nenhuma série paga cadastrada. Sem seleção, o cupom será válido para todas as séries pagas futuras.</p>';

    const couponCards = coupons.map((coupon) => {
        const status = getOwnerCouponStatusMeta(coupon.status);
        const scope = Array.isArray(coupon.eligible_series_ids) && coupon.eligible_series_ids.length
            ? `${coupon.eligible_series_ids.length} série(s)`
            : 'Todas as séries pagas';
        const useLimit = coupon.usage_limit ? `${coupon.usage_total || 0}/${coupon.usage_limit}` : `${coupon.usage_total || 0} usos`;
        const period = coupon.starts_at || coupon.ends_at
            ? `${coupon.starts_at ? formatOwnerDate(coupon.starts_at) : 'Agora'} até ${coupon.ends_at ? formatOwnerDate(coupon.ends_at) : 'Sem prazo'}`
            : 'Sem período definido';
        return `
            <article class="owner-coupon-card" data-owner-coupon-code="${escapeAttr(coupon.code || '')}">
                <div class="owner-coupon-card-head">
                    <div>
                        <span class="owner-order-kicker">Cupom</span>
                        <strong>${escapeHtml(coupon.code || '')}</strong>
                    </div>
                    <span class="owner-order-badge owner-order-badge-${escapeAttr(status.tone)}"><i class="fas ${escapeAttr(status.icon)}"></i> ${escapeHtml(status.label)}</span>
                </div>
                <div class="owner-coupon-value">${escapeHtml(formatOwnerCouponDiscount(coupon))} de desconto</div>
                ${coupon.description ? `<p>${escapeHtml(coupon.description)}</p>` : ''}
                <div class="owner-coupon-meta">
                    <span><i class="fas fa-bullseye"></i> ${escapeHtml(scope)}</span>
                    <span><i class="fas fa-users"></i> ${escapeHtml(useLimit)}</span>
                    <span><i class="fas fa-receipt"></i> Mínimo ${escapeHtml(formatOwnerCurrency(coupon.minimum_amount))}</span>
                    <span><i class="fas fa-calendar"></i> ${escapeHtml(period)}</span>
                </div>
                <div class="owner-coupon-card-actions">
                    <button type="button" class="btn btn-secondary" data-owner-coupon-edit="${escapeAttr(coupon.code || '')}"><i class="fas fa-pen"></i> Editar</button>
                    <button type="button" class="btn ${coupon.active ? 'btn-danger' : 'btn-primary'}" data-owner-coupon-action="${coupon.active ? 'deactivate' : 'activate'}" data-owner-coupon-code="${escapeAttr(coupon.code || '')}">
                        <i class="fas ${coupon.active ? 'fa-circle-pause' : 'fa-circle-play'}"></i> ${coupon.active ? 'Encerrar' : 'Ativar'}
                    </button>
                </div>
            </article>
        `;
    }).join('') || `
        <div class="owner-order-empty-state owner-coupon-empty">
            <i class="fas fa-ticket"></i>
            <strong>Nenhum cupom cadastrado</strong>
            <span>Crie a primeira campanha usando o formulário.</span>
        </div>
    `;

    return `
        <section class="owner-section owner-coupon-section">
            <div class="owner-section-head">
                <div>
                    <span class="owner-eyebrow"><i class="fas fa-ticket"></i> Cupons e campanhas</span>
                    <h3>Descontos com regras claras</h3>
                    <p>Crie campanhas, limite usos e escolha séries. O checkout sempre recalcula o desconto no backend.</p>
                </div>
                <div class="owner-coupon-summary">
                    <span><strong>${escapeHtml(String(couponData?.active_total ?? 0))}</strong> ativas</span>
                    <span><strong>${escapeHtml(String(couponData?.applied_uses ?? 0))}</strong> usos pagos</span>
                </div>
            </div>
            <div class="owner-coupon-layout">
                <form class="owner-coupon-form" id="ownerCouponForm">
                    <input type="hidden" name="original_code" value="${escapeAttr(editingCoupon?.code || '')}">
                    <div class="owner-form-head owner-coupon-form-head">
                        <div>
                            <span class="owner-eyebrow">${editingCoupon ? 'Editando campanha' : 'Nova campanha'}</span>
                            <h3>${editingCoupon ? escapeHtml(editingCoupon.code) : 'Criar cupom'}</h3>
                        </div>
                        ${editingCoupon ? '<button type="button" class="btn btn-secondary" data-owner-coupon-reset>Cancelar edição</button>' : ''}
                    </div>
                    <div class="owner-upload-grid">
                        <label class="payment-field">
                            <span>Código</span>
                            <input type="text" name="code" minlength="3" maxlength="32" pattern="[A-Za-z0-9_\\-]{3,32}" value="${escapeAttr(editingCoupon?.code || '')}" placeholder="EXEMPLO10" required>
                        </label>
                        <label class="payment-field">
                            <span>Tipo de desconto</span>
                            <select name="discount_type">
                                <option value="percentage" ${editingCoupon?.discount_type !== 'fixed' ? 'selected' : ''}>Percentual</option>
                                <option value="fixed" ${editingCoupon?.discount_type === 'fixed' ? 'selected' : ''}>Valor fixo</option>
                            </select>
                        </label>
                        <label class="payment-field">
                            <span>Valor do desconto</span>
                            <input type="number" name="discount_value" min="1" max="10000" step="1" value="${escapeAttr(String(editingCoupon?.discount_value || ''))}" placeholder="10" required>
                        </label>
                        <label class="payment-field">
                            <span>Compra mínima</span>
                            <input type="number" name="minimum_amount" min="0" max="100000" step="0.01" value="${escapeAttr(String(editingCoupon?.minimum_amount || 0))}">
                        </label>
                        <label class="payment-field">
                            <span>Início opcional</span>
                            <input type="datetime-local" name="starts_at" value="${escapeAttr(formatOwnerCouponDateInput(editingCoupon?.starts_at))}">
                        </label>
                        <label class="payment-field">
                            <span>Encerramento opcional</span>
                            <input type="datetime-local" name="ends_at" value="${escapeAttr(formatOwnerCouponDateInput(editingCoupon?.ends_at))}">
                        </label>
                        <label class="payment-field">
                            <span>Limite total opcional</span>
                            <input type="number" name="usage_limit" min="1" max="1000000" step="1" value="${escapeAttr(String(editingCoupon?.usage_limit || ''))}">
                        </label>
                        <label class="payment-field">
                            <span>Limite por cliente</span>
                            <input type="number" name="per_user_limit" min="1" max="100" step="1" value="${escapeAttr(String(editingCoupon?.per_user_limit || 1))}" required>
                        </label>
                        <label class="payment-field owner-upload-span-2">
                            <span>Descrição interna</span>
                            <textarea name="description" rows="2" maxlength="240" placeholder="Objetivo desta campanha">${escapeHtml(editingCoupon?.description || '')}</textarea>
                        </label>
                    </div>
                    <fieldset class="owner-coupon-series-fieldset">
                        <legend>Séries elegíveis</legend>
                        <p>Sem seleção, o cupom vale para todas as séries pagas.</p>
                        <div class="owner-coupon-series-options">${seriesOptions}</div>
                    </fieldset>
                    <label class="owner-upload-toggle"><input type="checkbox" name="active" ${editingCoupon?.active === false ? '' : 'checked'}><span>Campanha ativa</span></label>
                    <div class="owner-coupon-form-actions">
                        <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> ${editingCoupon ? 'Salvar alterações' : 'Criar cupom'}</button>
                        <div class="owner-status" id="ownerCouponStatus" aria-live="polite"></div>
                    </div>
                </form>
                <div class="owner-coupon-list">${couponCards}</div>
            </div>
        </section>
    `;
}

function resetOwnerCouponEditor() {
    ownerCouponEditCode = '';
    if (ownerDashboardSnapshot) renderOwnerDashboard(ownerDashboardSnapshot);
}

function editOwnerCoupon(code) {
    ownerCouponEditCode = String(code || '');
    if (ownerDashboardSnapshot) {
        renderOwnerDashboard(ownerDashboardSnapshot);
        document.getElementById('ownerCouponForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function ownerCouponLocalDateToIso(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

async function submitOwnerCoupon(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement) || !form.reportValidity()) return;
    const submitButton = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const payload = {
        original_code: data.get('original_code') || '',
        code: String(data.get('code') || '').trim().toUpperCase(),
        description: data.get('description') || '',
        discount_type: data.get('discount_type') || 'percentage',
        discount_value: data.get('discount_value') || '',
        minimum_amount: data.get('minimum_amount') || 0,
        starts_at: ownerCouponLocalDateToIso(data.get('starts_at')),
        ends_at: ownerCouponLocalDateToIso(data.get('ends_at')),
        usage_limit: data.get('usage_limit') || '',
        per_user_limit: data.get('per_user_limit') || 1,
        eligible_series_ids: data.getAll('eligible_series_ids').map(String),
        active: data.has('active'),
    };

    try {
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        }
        const result = await requestOwnerCouponSave(payload);
        ownerCouponEditCode = '';
        if (result?.dashboard) renderOwnerDashboard(result.dashboard);
        setOwnerStatus(`Cupom ${payload.code} salvo com sucesso.`, 'success');
        showToast('Campanha salva com sucesso.', 'success');
    } catch (error) {
        const status = document.getElementById('ownerCouponStatus');
        if (status) {
            status.textContent = error?.message || 'Não foi possível salvar o cupom.';
            status.className = 'owner-status error';
        }
    } finally {
        if (submitButton instanceof HTMLButtonElement && submitButton.isConnected) {
            submitButton.disabled = false;
        }
    }
}

async function runOwnerCouponAction(code, operation, button) {
    const actionLabel = operation === 'activate' ? 'ativar' : 'encerrar';
    if (!window.confirm(`Deseja ${actionLabel} o cupom ${code}?`)) return;
    try {
        if (button instanceof HTMLButtonElement) button.disabled = true;
        const result = await requestOwnerCouponAction(code, operation);
        if (ownerCouponEditCode === code && operation === 'deactivate') ownerCouponEditCode = '';
        if (result?.dashboard) renderOwnerDashboard(result.dashboard);
        showToast(`Cupom ${operation === 'activate' ? 'ativado' : 'encerrado'}.`, 'success');
    } catch (error) {
        showToast(error?.message || 'Não foi possível atualizar o cupom.', 'error');
        if (button instanceof HTMLButtonElement) button.disabled = false;
    }
}

function renderOwnerDashboard(data) {
    if (!DOM.ownerDashboard) return;

    ownerDashboardSnapshot = data;
    const catalog = data?.catalog || {};
    const payments = data?.payments || {};
    const analytics = data?.analytics || {};
    const coupons = data?.coupons || {};
    const funnel = analytics.funnel || {};
    const conversionRates = analytics.conversion_rates || {};
    const analyticsChannels = analytics.channels && typeof analytics.channels === 'object' ? analytics.channels : {};
    const topSeriesMetrics = Array.isArray(analytics.top_series) ? analytics.top_series : [];
    const seriesItems = Array.isArray(data?.series_items) ? data.series_items : [];
    const recentSeries = Array.isArray(data?.recent_series) ? data.recent_series : [];
    const catalogSeries = seriesItems.length ? seriesItems : recentSeries;
    const statusCounts = payments.status_counts || {};
    const recentOrders = Array.isArray(payments.recent_orders) ? payments.recent_orders : [];
    const deliveryQueue = Array.isArray(payments.delivery_queue) ? payments.delivery_queue : [];
    ownerSeriesCatalog = catalogSeries;
    const visibleSeries = filterOwnerSeries(ownerSeriesCatalog);
    const filterCounts = getOwnerSeriesFilterCounts(ownerSeriesCatalog);
    const visibleSeriesLabel = `${visibleSeries.length} de ${ownerSeriesCatalog.length}`;
    const freeSeriesCount = ownerSeriesCatalog.filter((item) => isFree(item)).length;
    const paidSeriesCount = ownerSeriesCatalog.length - freeSeriesCount;
    const internalSeriesCount = Number(catalog.internal_playback_series ?? catalog.playable_series ?? ownerSeriesCatalog.filter((item) => hasOwnerSeriesInternalPlayback(item)).length ?? 0);
    const migrationSeries = ownerSeriesCatalog.filter((item) => needsOwnerSeriesMigration(item));
    const missingPlaybackSeries = ownerSeriesCatalog.filter((item) => !hasOwnerSeriesAnyVideo(item));
    const migrationSeriesCount = Number(catalog.migration_needed ?? migrationSeries.length ?? 0);
    const missingPlaybackCount = Number(catalog.missing_playback ?? missingPlaybackSeries.length ?? 0);
    const telegramFallbackCount = migrationSeriesCount;
    const prioritySeriesCount = missingPlaybackCount;
    const prioritySeries = [];
    [...missingPlaybackSeries].forEach((serie) => {
        if (!prioritySeries.some((item) => sameId(item.id, serie.id))) {
            prioritySeries.push(serie);
        }
    });

    const statusRows = Object.entries(statusCounts)
        .map(([status, count]) => `
            <div class="owner-list-row">
                <span>${escapeHtml(status)}</span>
                <strong>${escapeHtml(String(count))}</strong>
            </div>
        `)
        .join('') || '<div class="owner-list-row"><span>Nenhum pedido registrado</span><strong>0</strong></div>';

    const deliveryQueueRows = deliveryQueue
        .map((order) => renderOwnerOrderCard(order, true))
        .join('') || `
            <div class="owner-empty-state owner-order-empty-state">
                <i class="fas fa-circle-check"></i>
                <strong>Nenhuma entrega precisa de intervenção.</strong>
                <span>Pedidos aprovados e concluídos ficam apenas no histórico.</span>
            </div>
        `;

    const recentRows = recentOrders
        .map((order) => renderOwnerOrderCard(order, false))
        .join('') || '<div class="owner-empty-state"><strong>Nenhum pedido recente</strong><span>Os novos pedidos aparecerão aqui automaticamente.</span></div>';

    const channelRows = Object.entries(analyticsChannels).map(([channel, metrics]) => {
        const label = channel === 'web' ? 'Web' : 'Telegram';
        return `
            <div class="owner-analytics-list-row">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(String(metrics?.purchase_completed ?? 0))} compras</strong>
                <small>${escapeHtml(String(metrics?.checkout_conversion_rate ?? 0))}% do checkout</small>
            </div>
        `;
    }).join('') || '<div class="owner-empty-state"><span>Ainda não há dados suficientes por canal.</span></div>';

    const topSeriesRows = topSeriesMetrics.slice(0, 5).map((metric) => {
        const serie = catalogSeries.find((item) => sameId(item.id, metric?.series_id));
        return `
            <div class="owner-analytics-list-row">
                <span>${escapeHtml(serie?.title || 'Série do catálogo')}</span>
                <strong>${escapeHtml(String(metric?.purchases ?? 0))} compras</strong>
                <small>${escapeHtml(String(metric?.views ?? 0))} visualizações</small>
            </div>
        `;
    }).join('') || '<div class="owner-empty-state"><span>As séries mais acessadas aparecerão aqui.</span></div>';

    const prioritySeriesRows = prioritySeries.slice(0, 4)
        .map((serie) => {
            const trailerLabel = serie.has_trailer ? 'Trailer' : 'Sem trailer';
            const videoLabel = getOwnerSeriesVideoStatusLabel(serie);
            const coverLabel = serie.has_cover ? 'Capa OK' : 'Sem capa';
            const freeLabel = serie.is_free ? 'Grátis' : formatPrice(serie.price);
            const coverUrl = getCoverUrl(serie);
            const editId = String(serie.id || '');
            const quickActionMeta = getOwnerSeriesQuickVideoActionMeta(serie);
            const editorialStatus = getOwnerSeriesStatusMeta(serie);
            return `
                <article class="owner-series-row owner-series-row-priority">
                    <div class="owner-series-thumb-wrap">
                        <img class="owner-series-thumb" src="${escapeAttr(coverUrl)}" alt="${escapeAttr(serie.title || 'Capa da série')}" loading="lazy">
                    </div>
                    <div class="owner-series-row-main">
                        <strong>${escapeHtml(serie.title || 'Sem título')}</strong>
                        <span>${escapeHtml([serie.category || 'Geral', freeLabel, formatOwnerDate(serie.created_at)].join(' • '))}</span>
                        <p>${escapeHtml(serie.description || 'Sem descrição')}</p>
                    </div>
                    <div class="owner-series-row-tags">
                        <span class="owner-pill owner-pill-status owner-pill-${escapeAttr(editorialStatus.status)}"><i class="fas ${escapeAttr(editorialStatus.icon)}"></i> ${escapeHtml(editorialStatus.label)}</span>
                        <span class="owner-pill">${escapeHtml(coverLabel)}</span>
                        <span class="owner-pill">${escapeHtml(videoLabel)}</span>
                        <span class="owner-pill">${escapeHtml(trailerLabel)}</span>
                    </div>
                    <div class="owner-series-row-actions">
                        <button type="button" class="btn btn-secondary owner-series-edit-btn" data-owner-edit-id="${escapeAttr(editId)}">
                            <i class="fas fa-pen-to-square"></i> Abrir
                        </button>
                        <button type="button" class="btn btn-secondary owner-series-mini-btn" data-owner-quick-action="${escapeAttr(quickActionMeta.action)}" data-owner-series-id="${escapeAttr(editId)}">
                            <i class="fas ${escapeAttr(quickActionMeta.icon)}"></i> ${escapeHtml(quickActionMeta.label)}
                        </button>
                        ${renderOwnerEditorialActions(serie)}
                    </div>
                </article>
            `;
        })
        .join('') || `
            <div class="owner-empty-state">
                <strong>Nenhuma série está sem mídia neste momento.</strong>
                <span>Os demais títulos podem continuar ativos sem ajustes imediatos.</span>
            </div>
        `;

    const recentSeriesRows = visibleSeries
        .map((serie) => {
            const trailerLabel = serie.has_trailer ? 'Trailer' : 'Sem trailer';
            const videoLabel = getOwnerSeriesVideoStatusLabel(serie);
            const coverLabel = serie.has_cover ? 'Capa OK' : 'Sem capa';
            const freeLabel = serie.is_free ? 'Grátis' : formatPrice(serie.price);
            const coverUrl = getCoverUrl(serie);
            const editId = String(serie.id || '');
            const quickActionMeta = getOwnerSeriesQuickVideoActionMeta(serie);
            const editorialStatus = getOwnerSeriesStatusMeta(serie);
            return `
                <article class="owner-series-row">
                    <div class="owner-series-thumb-wrap">
                        <img class="owner-series-thumb" src="${escapeAttr(coverUrl)}" alt="${escapeAttr(serie.title || 'Capa da série')}" loading="lazy">
                    </div>
                    <div class="owner-series-row-main">
                        <strong>${escapeHtml(serie.title || 'Sem título')}</strong>
                        <span>${escapeHtml([serie.category || 'Geral', freeLabel, formatOwnerDate(serie.created_at)].join(' • '))}</span>
                        <p>${escapeHtml(serie.description || 'Sem descrição')}</p>
                    </div>
                    <div class="owner-series-row-tags">
                        <span class="owner-pill owner-pill-status owner-pill-${escapeAttr(editorialStatus.status)}"><i class="fas ${escapeAttr(editorialStatus.icon)}"></i> ${escapeHtml(editorialStatus.label)}</span>
                        <span class="owner-pill">${escapeHtml(coverLabel)}</span>
                        <span class="owner-pill">${escapeHtml(videoLabel)}</span>
                        <span class="owner-pill">${escapeHtml(trailerLabel)}</span>
                    </div>
                    <div class="owner-series-row-actions">
                        <button type="button" class="btn btn-secondary owner-series-edit-btn" data-owner-edit-id="${escapeAttr(editId)}">
                            <i class="fas fa-pen-to-square"></i> Editar
                        </button>
                        <button type="button" class="btn btn-secondary owner-series-mini-btn" data-owner-quick-action="cover" data-owner-series-id="${escapeAttr(editId)}">
                            <i class="fas fa-image"></i> Trocar capa
                        </button>
                        <button type="button" class="btn btn-secondary owner-series-mini-btn" data-owner-quick-action="${escapeAttr(quickActionMeta.action)}" data-owner-series-id="${escapeAttr(editId)}">
                            <i class="fas ${escapeAttr(quickActionMeta.icon)}"></i> ${escapeHtml(quickActionMeta.label)}
                        </button>
                        ${renderOwnerEditorialActions(serie)}
                        <button type="button" class="btn btn-danger owner-series-mini-btn" data-owner-delete-id="${escapeAttr(editId)}">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </article>
            `;
        })
        .join('') || '<div class="owner-list-row"><span>Nenhuma série encontrada com esses filtros</span><strong>-</strong></div>';

    const toolbarFilters = [
        { key: 'all', label: `Todas (${filterCounts.all})` },
        { key: 'published', label: `Publicadas (${filterCounts.published})` },
        { key: 'draft', label: `Rascunhos (${filterCounts.draft})` },
        { key: 'hidden', label: `Ocultas (${filterCounts.hidden})` },
        { key: 'archived', label: `Arquivadas (${filterCounts.archived})` },
        { key: 'free', label: `Grátis (${filterCounts.free})` },
        { key: 'paid', label: `Pagas (${filterCounts.paid})` },
        { key: 'playable', label: `Player interno (${filterCounts.playable})` },
        { key: 'migration', label: `Entrega assistida (${filterCounts.migration})` },
        { key: 'missing_video', label: `Sem vídeo (${filterCounts.missing_video})` },
    ];

    const toolbarChips = toolbarFilters.map((filter) => `
        <button type="button" class="owner-filter-chip ${ownerSeriesFilterMode === filter.key ? 'active' : ''}" data-owner-filter-mode="${escapeAttr(filter.key)}">
            ${escapeHtml(filter.label)}
        </button>
    `).join('');

    DOM.ownerDashboard.innerHTML = `
        <section class="owner-hero-card owner-hero-card-compact">
            <div class="owner-hero-top">
                <div class="owner-hero-copy">
                    <span class="owner-eyebrow"><i class="fas fa-sparkles"></i> Área de gestão</span>
                    <h3>Painel central do catálogo, mídia e pagamentos.</h3>
                    <p>Cadastre séries, acompanhe a fila de entrega e ajuste rapidamente o que precisa de atenção, sem sobreposição de blocos.</p>
                </div>
                <div class="owner-brand owner-brand-compact">
                    <img class="owner-brand-logo" src="${OWNER_LOGO_IMAGE}" alt="Séries Express">
                    <div>
                        <strong>Séries Express</strong>
                        <span>Operação do proprietário</span>
                    </div>
                </div>
            </div>
            <div class="owner-kpi-grid owner-kpi-grid-extended">
                <div class="owner-card">
                    <span>Séries no catálogo</span>
                    <strong>${escapeHtml(String(catalog.series_total ?? 0))}</strong>
                </div>
                <div class="owner-card">
                    <span>Gratuitas</span>
                    <strong>${escapeHtml(String(freeSeriesCount))}</strong>
                </div>
                <div class="owner-card">
                    <span>Pagas</span>
                    <strong>${escapeHtml(String(paidSeriesCount))}</strong>
                </div>
                <div class="owner-card">
                    <span>Prontas</span>
                    <strong>${escapeHtml(String(internalSeriesCount))}</strong>
                </div>
                <div class="owner-card">
                    <span>Entrega assistida</span>
                    <strong>${escapeHtml(String(telegramFallbackCount))}</strong>
                </div>
                <div class="owner-card">
                    <span>Sem vídeo</span>
                    <strong>${escapeHtml(String(missingPlaybackCount))}</strong>
                </div>
                <div class="owner-card">
                    <span>Pedidos</span>
                    <strong>${escapeHtml(String(payments.orders_total ?? 0))}</strong>
                </div>
                <div class="owner-card">
                    <span>Total aprovado</span>
                    <strong>${escapeHtml(formatOwnerCurrency(payments.approved_amount))}</strong>
                </div>
                <div class="owner-card ${Number(payments.delivery_queue_total || 0) ? 'owner-card-warning' : 'owner-card-accent'}">
                    <span>Fila de entregas</span>
                    <strong>${escapeHtml(String(payments.delivery_queue_total ?? 0))}</strong>
                </div>
                <div class="owner-card ${Number(payments.delivery_failed_total || 0) ? 'owner-card-danger' : 'owner-card-accent'}">
                    <span>Falhas de entrega</span>
                    <strong>${escapeHtml(String(payments.delivery_failed_total ?? 0))}</strong>
                </div>
                <div class="owner-card owner-card-accent">
                    <span>Usuários ativos (30 dias)</span>
                    <strong>${escapeHtml(String(analytics.unique_users ?? 0))}</strong>
                </div>
                <div class="owner-card owner-card-accent">
                    <span>Abandono do carrinho</span>
                    <strong>${escapeHtml(String(analytics.cart_abandonment_rate ?? analytics.abandonment_rate ?? 0))}%</strong>
                </div>
            </div>
            <div class="owner-action-strip">
                <button type="button" class="btn btn-primary" data-owner-reset-editor>
                    <i class="fas fa-plus"></i> Novo cadastro
                </button>
                <button type="button" class="btn btn-secondary" data-owner-filter-mode="migration">
                    <i class="fas fa-link"></i> Ver entrega assistida
                </button>
                <button type="button" class="btn btn-secondary" data-owner-filter-mode="playable">
                    <i class="fas fa-circle-play"></i> Ver prontas
                </button>
                <button type="button" class="btn btn-secondary" data-owner-migrate-priority ${telegramFallbackCount ? '' : 'disabled'}>
                    <i class="fas fa-wand-magic-sparkles"></i> Aplicar migração
                </button>
            </div>
        </section>
        <section class="owner-section owner-orders-section owner-orders-priority-section">
            <div class="owner-section-head">
                <div>
                    <span class="owner-eyebrow"><i class="fas fa-truck-fast"></i> Operação de entregas</span>
                    <h3>Fila que precisa de atenção</h3>
                    <p>Somente pedidos aprovados e ainda incompletos aparecem aqui. O reprocessamento preserva tudo que já foi entregue.</p>
                </div>
                <div class="owner-series-count">${escapeHtml(String(payments.delivery_queue_total ?? deliveryQueue.length))} pendentes</div>
            </div>
            <div class="owner-orders-grid">${deliveryQueueRows}</div>
        </section>
        ${renderOwnerCouponSection(coupons, ownerSeriesCatalog.filter((serie) => !isFree(serie)))}
        <div class="owner-workspace-grid">
            <section class="owner-section owner-section-featured owner-editor-section">
                <div class="owner-form-head">
                    <div>
                        <span class="owner-eyebrow" id="ownerFormBadge">Cadastro</span>
                        <h3 id="ownerFormTitle">Nova série</h3>
                        <p id="ownerFormSubtitle">Crie ou edite uma série com capa, trailer opcional, vídeo principal e preço em um fluxo único.</p>
                    </div>
                    <button type="button" class="btn btn-secondary" id="ownerFormCancelBtn" hidden>
                        <i class="fas fa-arrow-rotate-left"></i> Cancelar edição
                    </button>
                </div>
                <form class="owner-upload-form" id="ownerSeriesForm" enctype="multipart/form-data" data-mode="create">
                    <input type="hidden" name="series_id" id="ownerSeriesId" value="">
                    <div class="owner-cover-preview">
                        <img id="ownerCoverPreviewImage" src="${PLACEHOLDER_IMAGE}" alt="Pré-visualização da capa">
                        <div class="owner-cover-preview-copy">
                            <strong>Pré-visualização da capa</strong>
                            <span id="ownerCoverPreviewCaption">Confira a capa antes de salvar e mantenha o visual do catálogo consistente.</span>
                        </div>
                    </div>
                    <div class="owner-form-groups">
                        <section class="owner-form-group owner-form-group-editorial">
                            <div class="owner-form-group-head">
                                <strong>Publicação e entrega</strong>
                                <span>Rascunhos ficam privados. Somente séries publicadas aparecem no catálogo.</span>
                            </div>
                            <div class="owner-upload-grid owner-upload-grid-tight">
                                <label class="payment-field">
                                    <span>Situação</span>
                                    <select name="status">
                                        <option value="published">Publicada</option>
                                        <option value="draft">Rascunho</option>
                                        <option value="hidden">Oculta</option>
                                        <option value="archived">Arquivada</option>
                                    </select>
                                </label>
                                <label class="payment-field">
                                    <span>Forma de entrega</span>
                                    <select name="content_delivery_type">
                                        <option value="telegram">Telegram</option>
                                        <option value="web">Player web</option>
                                        <option value="hybrid">Web e Telegram</option>
                                    </select>
                                </label>
                            </div>
                            <div class="owner-editor-flags">
                                <label class="owner-upload-toggle"><input type="checkbox" name="is_new"><span>Marcar como lançamento</span></label>
                            </div>
                        </section>
                        <section class="owner-form-group">
                            <div class="owner-form-group-head">
                                <strong>Informações da série</strong>
                                <span>Defina o que o usuário vai ver no catálogo.</span>
                            </div>
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
                                    <textarea name="description" rows="4" placeholder="Descreva a série"></textarea>
                                </label>
                            </div>
                        </section>
                        <section class="owner-form-group">
                            <div class="owner-form-group-head">
                                <strong>SEO e compartilhamento</strong>
                                <span>Campos opcionais. Se ficarem vazios, a página usa automaticamente o título, a descrição e a capa.</span>
                            </div>
                            <div class="owner-upload-grid">
                                <label class="payment-field owner-upload-span-2">
                                    <span>Título SEO <small data-owner-count-for="seo_title">0/70</small></span>
                                    <input type="text" name="seo_title" maxlength="70" placeholder="Título exibido no Google">
                                </label>
                                <label class="payment-field owner-upload-span-2">
                                    <span>Descrição SEO <small data-owner-count-for="seo_description">0/180</small></span>
                                    <textarea name="seo_description" rows="3" maxlength="180" placeholder="Resumo exibido nos resultados de busca"></textarea>
                                </label>
                                <label class="payment-field owner-upload-span-2">
                                    <span>URL canônica</span>
                                    <input type="url" name="canonical_url" inputmode="url" placeholder="https://seriescurtasexpressbot.vercel.app/series/...">
                                </label>
                                <label class="payment-field">
                                    <span>Título social</span>
                                    <input type="text" name="og_title" placeholder="Título ao compartilhar">
                                </label>
                                <label class="payment-field">
                                    <span>Imagem social</span>
                                    <input type="url" name="og_image_url" inputmode="url" placeholder="https://...">
                                </label>
                                <label class="payment-field owner-upload-span-2">
                                    <span>Descrição social</span>
                                    <textarea name="og_description" rows="2" placeholder="Texto ao compartilhar a página"></textarea>
                                </label>
                            </div>
                            <label class="owner-upload-toggle"><input type="checkbox" name="seo_noindex"><span>Não indexar esta página nos buscadores</span></label>
                        </section>
                        <section class="owner-form-group">
                            <div class="owner-form-group-head">
                                <strong>Descoberta e página pública</strong>
                                <span>Campos opcionais para busca, organização e apresentação da série.</span>
                            </div>
                            <div class="owner-upload-grid">
                                <label class="payment-field">
                                    <span>Título alternativo</span>
                                    <input type="text" name="alternate_title" placeholder="Outro nome conhecido">
                                </label>
                                <label class="payment-field">
                                    <span>Endereço amigável</span>
                                    <input type="text" name="slug" placeholder="Gerado automaticamente se vazio" pattern="[a-z0-9-]*">
                                </label>
                                <label class="payment-field owner-upload-span-2">
                                    <span>Resumo curto</span>
                                    <textarea name="short_description" rows="2" maxlength="220" placeholder="Resumo para cards, compartilhamento e busca"></textarea>
                                </label>
                                <label class="payment-field owner-upload-span-2">
                                    <span>Tags</span>
                                    <input type="text" name="tags" placeholder="CEO, bilionário, máfia, casamento, vingança">
                                </label>
                                <label class="payment-field">
                                    <span>Idioma</span>
                                    <input type="text" name="language" value="Português" placeholder="Português">
                                </label>
                                <label class="payment-field">
                                    <span>Idioma da legenda</span>
                                    <input type="text" name="subtitle_language" placeholder="Português, se houver">
                                </label>
                                <label class="payment-field">
                                    <span>Duração em minutos</span>
                                    <input type="number" name="duration_minutes" min="1" max="1440" placeholder="Ex.: 95">
                                </label>
                                <label class="payment-field">
                                    <span>Ano</span>
                                    <input type="number" name="release_year" min="1900" max="2100" placeholder="Ex.: 2026">
                                </label>
                                <label class="payment-field owner-upload-span-2">
                                    <span>Classificação indicativa</span>
                                    <input type="text" name="age_rating" placeholder="Ex.: 14 anos">
                                </label>
                            </div>
                            <div class="owner-editor-flags">
                                <label class="owner-upload-toggle"><input type="checkbox" name="is_dubbed"><span>Dublada</span></label>
                                <label class="owner-upload-toggle"><input type="checkbox" name="is_subtitled"><span>Legendada</span></label>
                                <label class="owner-upload-toggle"><input type="checkbox" name="is_featured"><span>Destaque editorial</span></label>
                            </div>
                        </section>
                        <section class="owner-form-group">
                            <div class="owner-form-group-head">
                                <strong>Acesso e preço</strong>
                                <span>Escolha se a série será gratuita ou paga.</span>
                            </div>
                            <div class="owner-upload-grid owner-upload-grid-tight">
                                <label class="owner-upload-toggle">
                                    <input type="checkbox" name="is_free" id="ownerSeriesFree">
                                    <span>Marcar como série gratuita</span>
                                </label>
                                <label class="payment-field">
                                    <span>Preço</span>
                                    <input type="number" name="price" id="ownerSeriesPrice" min="0" step="0.01" placeholder="0,00" value="0">
                                </label>
                            </div>
                        </section>
                        <section class="owner-form-group">
                            <div class="owner-form-group-head">
                                <strong>Arquivos principais</strong>
                                <span>Envie a mídia principal da série e o material visual.</span>
                            </div>
                            <div class="owner-upload-grid">
                                <label class="payment-field">
                                    <span>Capa</span>
                                    <input type="file" name="cover_file" accept="image/*" required>
                                </label>
                                <label class="payment-field">
                                    <span>Trailer opcional</span>
                                    <input type="file" name="trailer_file" accept="video/*">
                                </label>
                                <label class="payment-field owner-upload-span-2">
                                    <span>Vídeo principal</span>
                                    <input type="file" name="video_file" accept="video/*" required>
                                </label>
                            </div>
                        </section>
                        <section class="owner-form-group">
                            <div class="owner-form-group-head">
                                <strong>Entrega via Telegram</strong>
                                <span>Use este campo quando preferir ligar a série por File_ID em vez de arquivo enviado aqui.</span>
                            </div>
                            <label class="payment-field owner-upload-span-2">
                                <span>File_ID do vídeo no Telegram opcional</span>
                                <textarea name="video_file_id" id="ownerSeriesVideoFileId" rows="3" placeholder="Cole aqui o File_ID do vídeo, se preferir usar o Telegram"></textarea>
                            </label>
                        </section>
                    </div>
                    <div class="owner-upload-actions">
                        <button class="btn btn-primary" id="ownerSeriesSubmitBtn" type="submit">
                            <i class="fas fa-floppy-disk"></i> Salvar série
                        </button>
                        <p class="owner-upload-note">Use envio rápido apenas para arquivos até ${escapeHtml(getOwnerInternalUploadLimitLabel())}. Arquivos maiores seguem no fluxo alternativo.</p>
                    </div>
                    <div class="owner-status" id="ownerUploadStatus"></div>
                </form>
            </section>
            <aside class="owner-sidebar-stack">
                <section class="owner-section">
                    <h3>Operação rápida</h3>
                    <div class="owner-list">
                        <div class="owner-list-row"><span>Fluxo</span><strong>1. Cadastrar 2. Enviar 3. Publicar</strong></div>
                        <div class="owner-list-row"><span>Envio rápido</span><strong>Até ${escapeHtml(getOwnerInternalUploadLimitLabel())}</strong></div>
                        <div class="owner-list-row"><span>Capturar File_ID</span><strong><a id="ownerFileIdHelpLink" href="${escapeAttr(getOwnerFileIdCaptureUrl())}" target="_blank" rel="noopener noreferrer">Abrir guia</a></strong></div>
                    </div>
                </section>
                <section class="owner-section">
                    <h3>Status do catálogo</h3>
                    <div class="owner-list">
                        <div class="owner-list-row"><span>Prontas</span><strong>${escapeHtml(String(internalSeriesCount))}</strong></div>
                        <div class="owner-list-row"><span>Entrega assistida</span><strong>${escapeHtml(String(telegramFallbackCount))}</strong></div>
                        <div class="owner-list-row"><span>Sem vídeo</span><strong>${escapeHtml(String(missingPlaybackCount))}</strong></div>
                        <div class="owner-list-row"><span>Itens críticos</span><strong>${escapeHtml(String(prioritySeriesCount))}</strong></div>
                    </div>
                </section>
                <section class="owner-section">
                    <h3>Pagamentos</h3>
                    <div class="owner-list">
                        <div class="owner-list-row"><span>Pedidos registrados</span><strong>${escapeHtml(String(payments.orders_total ?? 0))}</strong></div>
                        <div class="owner-list-row"><span>Total aprovado</span><strong>${escapeHtml(formatOwnerCurrency(payments.approved_amount))}</strong></div>
                        ${statusRows}
                    </div>
                </section>
            </aside>
        </div>
        <section class="owner-section owner-section-priority owner-series-section">
            <div class="owner-section-head">
                <div>
                    <h3>Itens que pedem ajuste</h3>
                    <p>Esses títulos ainda dependem de vídeo, migração ou revisão antes de ficarem redondos no catálogo.</p>
                </div>
                <div class="owner-series-count">${escapeHtml(String(prioritySeriesCount))} itens</div>
            </div>
            <div class="owner-series-list">${prioritySeriesRows}</div>
        </section>
        <section class="owner-section owner-series-section">
            <div class="owner-section-head">
                <div>
                    <h3>Catálogo</h3>
                    <p>Busque, filtre e edite as séries a partir de um bloco único, sem misturar cadastro, métricas e ações.</p>
                </div>
                <div class="owner-series-count">${escapeHtml(visibleSeriesLabel)} exibidas</div>
            </div>
            <div class="owner-series-toolbar">
                <label class="payment-field owner-series-search">
                    <span>Buscar séries</span>
                    <input type="search" id="ownerSeriesSearchInput" placeholder="Título, descrição ou categoria" value="${escapeAttr(ownerSeriesSearchTerm)}">
                </label>
                <div class="owner-series-filters" role="tablist" aria-label="Filtros do catálogo">
                    ${toolbarChips}
                </div>
            </div>
            <input type="file" id="ownerQuickCoverInput" accept="image/*" hidden>
            <input type="file" id="ownerQuickVideoInput" accept="video/*" hidden>
            <input type="file" id="ownerQuickTrailerInput" accept="video/*" hidden>
            <div class="owner-series-list">${recentSeriesRows}</div>
        </section>
        <section class="owner-section owner-orders-section">
            <div class="owner-section-head">
                <div>
                    <h3>Histórico operacional</h3>
                    <p>Últimos pedidos com situação do pagamento, entrega e itens enviados.</p>
                </div>
                <div class="owner-series-count">${escapeHtml(String(recentOrders.length))} pedidos</div>
            </div>
            <div class="owner-orders-grid">${recentRows}</div>
        </section>
        <section class="owner-section owner-analytics-section">
            <div class="owner-section-head">
                <div>
                    <h3>Conversão e abandono</h3>
                    <p>Resumo dos últimos ${escapeHtml(String(analytics.period_days ?? 30))} dias, contado por usuário.</p>
                </div>
                <div class="owner-series-count">${escapeHtml(String(analytics.events_total ?? 0))} eventos</div>
            </div>
            <div class="owner-analytics-grid">
                <div class="owner-analytics-step"><span>Abriu o app</span><strong>${escapeHtml(String(funnel.app_opened ?? 0))}</strong></div>
                <div class="owner-analytics-step"><span>Viu uma série</span><strong>${escapeHtml(String(funnel.series_viewed ?? 0))}</strong></div>
                <div class="owner-analytics-step"><span>Adicionou ao carrinho</span><strong>${escapeHtml(String(funnel.add_to_cart ?? 0))}</strong></div>
                <div class="owner-analytics-step"><span>Iniciou checkout</span><strong>${escapeHtml(String(funnel.checkout_started ?? 0))}</strong></div>
                <div class="owner-analytics-step"><span>Pagamento aprovado</span><strong>${escapeHtml(String(funnel.payment_approved ?? 0))}</strong></div>
                <div class="owner-analytics-step"><span>Compra concluída</span><strong>${escapeHtml(String(funnel.purchase_completed ?? funnel.payment_approved ?? 0))}</strong></div>
                <div class="owner-analytics-step"><span>Entrega concluída</span><strong>${escapeHtml(String(funnel.delivery_completed ?? 0))}</strong></div>
                <div class="owner-analytics-step owner-analytics-step-warning"><span>Carrinho abandonado</span><strong>${escapeHtml(String(funnel.cart_abandoned ?? 0))}</strong></div>
                <div class="owner-analytics-step owner-analytics-step-warning"><span>Checkout abandonado</span><strong>${escapeHtml(String(funnel.checkout_abandoned ?? 0))}</strong></div>
                <div class="owner-analytics-step"><span>Checkout retomado</span><strong>${escapeHtml(String(funnel.checkout_recovered ?? 0))}</strong></div>
            </div>
            <div class="owner-analytics-rate-grid" aria-label="Taxas de conversão do funil">
                <div><span>App → série</span><strong>${escapeHtml(String(conversionRates.app_to_series ?? 0))}%</strong></div>
                <div><span>Série → carrinho</span><strong>${escapeHtml(String(conversionRates.series_to_cart ?? 0))}%</strong></div>
                <div><span>Carrinho → checkout</span><strong>${escapeHtml(String(conversionRates.cart_to_checkout ?? 0))}%</strong></div>
                <div><span>Checkout → compra</span><strong>${escapeHtml(String(conversionRates.checkout_to_purchase ?? 0))}%</strong></div>
                <div><span>Compra → entrega</span><strong>${escapeHtml(String(conversionRates.purchase_to_delivery ?? 0))}%</strong></div>
                <div><span>Recuperação de checkout</span><strong>${escapeHtml(String(conversionRates.checkout_recovery ?? 0))}%</strong></div>
            </div>
            <div class="owner-analytics-breakdown">
                <article>
                    <h4>Conversão por canal</h4>
                    ${channelRows}
                </article>
                <article>
                    <h4>Séries com maior resultado</h4>
                    ${topSeriesRows}
                </article>
            </div>
        </section>
    `;
    DOM.ownerDashboard.hidden = false;
    wireOwnerUploadForm();
    wireOwnerDashboardControls();
    restoreOwnerSeriesEditorState();
}

async function submitOwnerLogin(event) {
    event?.preventDefault();

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
        ownerSessionAuthorized = false;
        const data = await requestOwnerDashboard(password);
        ownerSessionAuthorized = true;
        renderOwnerDashboard(data);
        refreshCatalog();
        setOwnerStatus('Acesso validado.', 'success');
    } catch (error) {
        ownerSessionAuthorized = false;
        DOM.ownerDashboard.hidden = true;
        const message = String(error?.message || '');
        const normalizedMessage = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        let friendlyMessage = message || 'Não foi possível abrir a área do proprietário.';

        if (normalizedMessage.includes('acesso restrito') || normalizedMessage.includes('proprietario')) {
            friendlyMessage = 'Entre com a conta Telegram do proprietário cadastrada no backend.';
        } else if (normalizedMessage.includes('senha invalida')) {
            friendlyMessage = 'Senha inválida. Confira a senha da área do proprietário.';
        } else if (normalizedMessage.includes('nao configurada')) {
            friendlyMessage = 'A senha da área do proprietário ainda não foi configurada no backend.';
        } else if (normalizedMessage.includes('telegram') && (normalizedMessage.includes('ausentes') || normalizedMessage.includes('invalidos') || normalizedMessage.includes('expirada'))) {
            friendlyMessage = 'Abra o Mini App dentro do Telegram para validar o acesso do proprietário.';
        }

        setOwnerStatus(friendlyMessage, 'error');
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
    formData.set('series_id', ownerSeriesEditId || '');
    const normalizedTelegramFileId = extractTelegramFileIdInput(formData.get('video_file_id'));
    formData.set('video_file_id', normalizedTelegramFileId);

    const submitButton = form.querySelector('button[type="submit"]');
    const previousLabel = submitButton?.innerHTML || '';

    try {
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        }
        let resolvedSeriesId = ownerSeriesEditId || String(formData.get('series_id') || '');
        const coverFile = formData.get('cover_file');
        const trailerFile = formData.get('trailer_file');
        const videoFile = formData.get('video_file');

        if (videoFile instanceof File && videoFile.size > 0) {
            if (videoFile.size > OWNER_INTERNAL_UPLOAD_LIMIT_BYTES) {
                if (normalizedTelegramFileId) {
                    formData.delete('video_file');
                    setOwnerUploadStatus('Video grande detectado. Vou salvar a série usando o File_ID do Telegram.', '');
                } else {
                    throw new Error(buildOwnerInternalUploadLimitMessage(videoFile));
                }
            }
        }

        if (coverFile instanceof File && coverFile.size > 0) {
            resolvedSeriesId = await uploadOwnerSeriesFormFile(formData, 'cover_file', coverFile, resolvedSeriesId);
        }

        if (trailerFile instanceof File && trailerFile.size > 0) {
            resolvedSeriesId = await uploadOwnerSeriesFormFile(formData, 'trailer_file', trailerFile, resolvedSeriesId);
        }

        if (formData.get('video_file') instanceof File) {
            resolvedSeriesId = await uploadOwnerSeriesFormFile(formData, 'video_file', videoFile, resolvedSeriesId);
        }

        setOwnerUploadStatus('Registrando série e demais arquivos no Supabase...', '');

        const payload = await requestOwnerSeriesSave(formData);
        const created = payload?.series || null;
        const dashboard = payload?.dashboard || null;

        if (created && String(created.status || 'published') === 'published') {
            allSeries = [created, ...allSeries.filter((serie) => !sameId(serie.id, created.id))];
            refreshCatalog();
            initHero();
        } else if (created) {
            allSeries = allSeries.filter((serie) => !sameId(serie.id, created.id));
            refreshCatalog();
            initHero();
        }

        if (dashboard) {
            ownerSeriesEditId = '';
            ownerDashboardSnapshot = dashboard;
            renderOwnerDashboard(dashboard);
        }

        const savedAsDraft = String(created?.status || '') !== 'published';
        setOwnerUploadStatus(savedAsDraft ? 'Série salva fora do catálogo público.' : 'Série publicada com sucesso.', 'success');

        form.reset();
        const freeToggle = document.getElementById('ownerSeriesFree');
        const priceInput = document.getElementById('ownerSeriesPrice');
        if (freeToggle instanceof HTMLInputElement && priceInput instanceof HTMLInputElement) {
            freeToggle.checked = false;
            priceInput.disabled = false;
            priceInput.required = true;
            priceInput.value = '0';
        }

        showToast(savedAsDraft ? 'Série salva com sucesso!' : 'Série publicada com sucesso!', 'success');
    } catch (error) {
        const friendlyMessage = explainOwnerUploadError(error, formData.get('video_file'));
        setOwnerUploadStatus(friendlyMessage || 'Não foi possível publicar a série.', 'error');
        showToast(friendlyMessage || 'Falha ao publicar a série.', 'error');
    } finally {
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = false;
            submitButton.innerHTML = previousLabel || '<i class="fas fa-floppy-disk"></i> Salvar série';
        }
    }
}

async function refreshPaymentStatus(orderId, shouldToast = true) {
    if (!orderId || paymentStatusLoading) return;
    paymentStatusLoading = true;

    try {
        const data = await requestPaymentStatus({
            init_data: tg?.initData || '',
            order_id: orderId,
            recovery_source: APP_LAUNCH_CHECKOUT_RECOVERY && sameId(orderId, APP_LAUNCH_PAYMENT_ORDER_ID)
                ? 'telegram_bot'
                : '',
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
            if (String(order.delivery_status || 'pending').toLowerCase() === 'completed') {
                showToast('Pagamento aprovado e série enviada no Telegram.', 'success');
                clearActivePaymentOrder();
                toggleCart(false);
                closeModal();
            } else {
                startPaymentStatusPolling(String(order.order_id || orderId || ''));
                if (shouldToast) {
                    showToast('Pagamento aprovado. A entrega está sendo processada no Telegram.', 'success');
                }
            }
        } else if (isTerminalPaymentFailure(order)) {
            stopPaymentStatusPolling();
            renderPaymentSummary(order);
            if (shouldToast) {
                showToast(
                    status === 'payment_review'
                        ? 'O pagamento precisa de conferência. Fale com o suporte.'
                        : 'Pagamento não concluído. Você pode tentar novamente.',
                    'error'
                );
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

    if (typeof serie.video_storage_path === 'string' && serie.video_storage_path.trim()) return true;

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
    if (isPlaybackLocked(serie)) return 'locked';
    const declaredMode = String(serie?.playback_mode || '').trim().toLowerCase();
    if (['direct', 'telegram', 'missing'].includes(declaredMode)) return declaredMode;
    if (hasDirectPlaybackUrl(serie)) return 'direct';
    if (serie?.has_video_file_id || getTelegramFileId(serie) || Number(serie?.playable_episode_count || 0) > 0) return 'telegram';
    return 'missing';
}

// ==================== INICIALIZAÇÃO ====================
async function init() {
    resolveTelegramContext();
    configurePaymentMethodsForContext();
    trackStaleCartAbandonment();
    trackAnalyticsEvent('app_opened');
    restoreFavoriteSeries();
    bindPlayerVideoEvents();
    wirePlayerControls();
    restoreActivePaymentOrder();

    if (tg) {
        tg.ready();
        tg.expand();
    }

    applyTheme();
    updatePaymentMethodUI();
    updateOwnerVisibility();
    if (DOM.openTelegramBtn) DOM.openTelegramBtn.hidden = appContext.isTelegram;
    if (DOM.accountBtn) DOM.accountBtn.hidden = !appContext.isTelegram;
    if (DOM.cartBtn) DOM.cartBtn.hidden = !appContext.isTelegram;
    if (DOM.currentYear) DOM.currentYear.textContent = String(new Date().getFullYear());
    renderCatalogSkeleton();

    try {
        const url = new URL(API_URL);
        url.searchParams.set('action', 'series');
        if (tg?.initData) {
            url.searchParams.set('init_data', tg.initData);
        }
        const data = await fetchWithTimeout(withCacheBuster(url.toString()));
        allSeries = Array.isArray(data) ? data : [];
        trackAnalyticsEvent('catalog_loaded', { metadata: { item_count: allSeries.length } });
        hydrateFavoriteSeriesFromCatalog(allSeries);
        await loadServerCart();
        debugLog(`[INIT] ${allSeries.length} éries carregadas`);

        renderNetflixRow(allSeries);
        refreshCatalog();
        initHero();
        updateCartUI();
        renderPaymentSummary(activePaymentOrder);
        applyPublicRoute({ replace: true });

        if (isAwaitingPayment(activePaymentOrder)) {
            startPaymentStatusPolling(String(activePaymentOrder.order_id || ''));
            refreshPaymentStatus(String(activePaymentOrder.order_id || ''), false);
        }

        if (APP_LAUNCH_SERIE_ID) {
            const targetSerie = allSeries.find((serie) => sameId(serie.id, APP_LAUNCH_SERIE_ID));
            if (targetSerie) {
                setTimeout(() => {
                    if (hasSeriesAccess(targetSerie)) {
                        openModal(targetSerie);
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

    DOM.supportBtn?.addEventListener('click', openSupportForm);
    DOM.openTelegramBtn?.addEventListener('click', () => {
        trackAnalyticsEvent('telegram_open', { metadata: { source: 'header' } });
        openTelegramBotLink(TELEGRAM_BOT_LINK);
    });
    DOM.accountBtn?.addEventListener('click', () => {
        history.pushState({ route: 'customer' }, '', '/minha-conta');
        void applyPublicRoute();
    });
    DOM.supportCloseBtn?.addEventListener('click', closeSupportForm);
    DOM.supportCancelBtn?.addEventListener('click', closeSupportForm);
    DOM.supportForm?.addEventListener('submit', submitSupportRequest);
    DOM.supportOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'supportOverlay') closeSupportForm();
    });

    document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);
    DOM.ownerBtn?.addEventListener('click', openOwnerArea);
    DOM.ownerCloseBtn?.addEventListener('click', closeOwnerArea);
    DOM.ownerLoginForm?.addEventListener('submit', submitOwnerLogin);
    DOM.ownerOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'ownerOverlay') closeOwnerArea();
    });
    DOM.cartBtn?.addEventListener('click', () => toggleCart(true));
    document.getElementById('cartCloseBtn')?.addEventListener('click', () => toggleCart(false));
    DOM.checkoutBtn?.addEventListener('click', checkout);
    DOM.cartCouponBtn?.addEventListener('click', () => void applyCartCoupon());
    DOM.cartCouponInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void applyCartCoupon();
        }
    });
    DOM.cartCouponInput?.addEventListener('input', (event) => {
        const nextCode = String(event.currentTarget?.value || '').trim().toUpperCase();
        if (activeCoupon?.code && nextCode !== activeCoupon.code) {
            activeCoupon = null;
            setCartCouponStatus('Aplique novamente para validar o desconto.', 'info');
            updateCartUI();
            scheduleServerCartSave();
        }
    });
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

    [DOM.searchInput, DOM.headerSearchInput].forEach((input) => {
        input?.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => searchSeries(e.target.value.trim(), { updateUrl: true }), 220);
        });
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.currentTarget.value = '';
                searchSeries('', { updateUrl: true });
            }
        });
    });

    window.addEventListener('popstate', () => applyPublicRoute({ replace: true }));

    document.querySelectorAll('.category-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const category = chip.dataset.category || 'all';
            filterCategory(category, { updateUrl: true });
        });
    });

    document.querySelectorAll('.player-back, .player-close').forEach(btn => {
        btn.addEventListener('click', closePlayer);
    });
    document.getElementById('playerErrorCloseBtn')?.addEventListener('click', closePlayer);

    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    DOM.modalOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (DOM.supportOverlay?.classList.contains('active')) closeSupportForm();
            else if (DOM.playerOverlay?.classList.contains('active')) closePlayer();
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
    DOM.heroImg.decoding = 'async';

    const free = isFree(serie);
    DOM.heroBadge.className = free ? 'hero-badge-free' : 'hero-badge';
    DOM.heroBadge.innerHTML = free
        ? '<i class="fas fa-gift"></i> Grátis'
        : serie.is_featured === true
            ? '<i class="fas fa-star"></i> Destaque da semana'
            : '<i class="fas fa-play-circle"></i> Série em destaque';

    if (DOM.heroMeta) {
        const metadata = [
            ...normalizeSeriesTerms(serie.genre || serie.category).slice(0, 1),
            serie.language || serie.audio_language,
            serie.duration_minutes ? `${serie.duration_minutes} min` : '',
            'Série completa',
        ].filter(Boolean);
        DOM.heroMeta.innerHTML = metadata.map((item) => `<span>${escapeHtml(String(item))}</span>`).join('');
    }

    DOM.heroPlayBtn.style.display = 'inline-flex';
    DOM.heroPlayBtn.innerHTML = free
        ? '<i class="fas fa-play"></i> Assistir grátis'
        : hasSeriesAccess(serie)
            ? '<i class="fas fa-play"></i> Assistir agora'
            : `<i class="fas fa-ticket"></i> Ver detalhes • ${escapeHtml(formatPrice(serie))}`;
    DOM.heroPlayBtn.onclick = () => handleSeriesClick(serie);
    if (DOM.heroDetailsBtn) {
        DOM.heroDetailsBtn.style.display = 'inline-flex';
        DOM.heroDetailsBtn.onclick = () => openSeriesDetails(serie);
    }
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

function renderGrid(series) {
    const grid = DOM.catalogGrid;
    if (!grid) return;
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = '';
    if (!series.length) {
        grid.innerHTML = '<p style="text-align:center; color:var(--gray); padding:40px 0;">Nenhuma série encontrada.</p>';
        return;
    }

    const freeSeries = series.filter((serie) => isFree(serie));
    const paidSeries = series.filter((serie) => !isFree(serie));
    const fragment = document.createDocumentFragment();

    [
        {
            key: 'free',
            title: 'Séries Gratuitas',
            subtitle: 'Toque e assista sem esperar.',
            items: freeSeries,
        },
        {
            key: 'paid',
            title: 'Séries Pagas',
            subtitle: 'Libere todos os episódios agora.',
            items: paidSeries,
        },
    ].forEach((section) => {
        if (!section.items.length) return;

        const wrapper = document.createElement('section');
        wrapper.className = `catalog-group catalog-group-${section.key}`;
        wrapper.setAttribute('aria-label', section.title);

        const header = document.createElement('div');
        header.className = 'catalog-group-header';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'catalog-group-copy';

        const title = document.createElement('h3');
        title.className = 'catalog-group-title';
        title.textContent = section.title;

        const subtitle = document.createElement('p');
        subtitle.className = 'catalog-group-subtitle';
        subtitle.textContent = section.subtitle;

        const count = document.createElement('span');
        count.className = 'catalog-group-count';
        count.textContent = `${section.items.length} título${section.items.length === 1 ? '' : 's'}`;

        titleWrap.appendChild(title);
        titleWrap.appendChild(subtitle);
        header.appendChild(titleWrap);
        header.appendChild(count);

        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'grid catalog-group-grid';
        section.items.forEach((serie) => cardsGrid.appendChild(createCard(serie, false)));

        wrapper.appendChild(header);
        wrapper.appendChild(cardsGrid);
        fragment.appendChild(wrapper);
    });

    grid.appendChild(fragment);
}

function renderCatalogSkeleton(count = 6) {
    if (!DOM.catalogGrid) return;
    DOM.catalogGrid.setAttribute('aria-busy', 'true');
    DOM.catalogGrid.innerHTML = `<div class="catalog-skeleton-grid" aria-hidden="true">${Array.from({ length: count }, () => `
        <div class="catalog-skeleton-card">
            <div class="catalog-skeleton-cover"></div>
            <div class="catalog-skeleton-line"></div>
            <div class="catalog-skeleton-line catalog-skeleton-line-short"></div>
        </div>
    `).join('')}</div>`;
}

function getVisibleSeries() {
    let filtered = allSeries.slice();

    if (currentCategory === 'favorites') {
        filtered = filtered.filter((s) => isFavoriteSeries(s.id));
    } else if (currentCategory !== 'all') {
        filtered = filtered.filter((serie) => seriesMatchesCategory(serie, currentCategory));
    }

    if (currentSearchTerm) {
        filtered = filtered.filter((serie) => buildSeriesSearchText(serie).includes(normalizeSearchText(currentSearchTerm)));
    }

    return filtered;
}

function refreshCatalog() {
    renderGrid(getVisibleSeries());
}

function createCard(serie, isNetflix = false) {
    const card = document.createElement('div');
    card.className = isNetflix ? 'netflix-card' : 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const playbackMode = getPlaybackMode(serie);
    const hasAccess = hasSeriesAccess(serie);
    const lockedPlayback = playbackMode === 'locked';
    const missingPlayback = playbackMode === 'missing';
    card.dataset.id = normalizeId(serie.id);
    card.dataset.playback = playbackMode;
    card.setAttribute(
        'aria-label',
        missingPlayback
            ? `Abrir ${serie.title || 'série'} - vídeo indisponível`
            : lockedPlayback
            ? `Abrir ${serie.title || 'série'} - conteúdo bloqueado até pagamento`
            : `Abrir ${serie.title || 'série'}`
    );

    const free = isFree(serie);
    const ownerCanWatch = hasAccess && !free && isOwnerUser();
    if (!isNetflix) {
        card.classList.add(free ? 'card-free' : 'card-paid');
        if (hasAccess && !free) card.classList.add('card-unlocked');
        if (lockedPlayback) card.classList.add('card-locked');
        if (missingPlayback) card.classList.add('card-missing');
    }
    const coverUrl = getCoverUrl(serie);
    const cover = document.createElement('div');
    cover.className = isNetflix ? 'netflix-cover' : 'card-cover';

    const img = document.createElement('img');
    img.src = coverUrl;
    img.alt = serie.title || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = function() { this.src = PLACEHOLDER_IMAGE; };
    cover.appendChild(img);

    if (!isNetflix) {
        const coverBadges = document.createElement('div');
        coverBadges.className = 'card-top-badges';

        const accessBadge = document.createElement('span');
        accessBadge.className = 'card-top-badge';
        if (free) {
            accessBadge.classList.add('card-top-badge-free');
            accessBadge.innerHTML = '<i class="fas fa-gift"></i> Grátis';
        } else if (hasAccess && !missingPlayback) {
            accessBadge.classList.add('card-top-badge-unlocked');
            accessBadge.innerHTML = '<i class="fas fa-circle-check"></i> Liberado';
        } else if (lockedPlayback) {
            accessBadge.classList.add('card-top-badge-paid');
            accessBadge.innerHTML = `<i class="fas fa-lock"></i> ${escapeHtml(formatPrice(serie.price))}`;
        } else if (missingPlayback) {
            accessBadge.classList.add('card-top-badge-missing');
            accessBadge.innerHTML = '<i class="fas fa-ban"></i> Sem vídeo';
        } else {
            accessBadge.classList.add('card-top-badge-paid');
            accessBadge.innerHTML = `<i class="fas fa-ticket"></i> ${escapeHtml(formatPrice(serie.price))}`;
        }
        coverBadges.appendChild(accessBadge);

        const favoriteBtn = document.createElement('button');
        favoriteBtn.type = 'button';
        favoriteBtn.className = `card-favorite-btn ${isFavoriteSeries(serie.id) ? 'active' : ''}`;
        favoriteBtn.setAttribute('aria-label', isFavoriteSeries(serie.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
        favoriteBtn.innerHTML = `<i class="${isFavoriteSeries(serie.id) ? 'fas' : 'far'} fa-heart"></i>`;
        favoriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavoriteSeries(serie);
        });
        coverBadges.appendChild(favoriteBtn);

        if (!free && playbackMode === 'telegram') {
            const playerBadge = document.createElement('span');
            playerBadge.className = 'card-top-badge card-top-badge-protected';
            playerBadge.innerHTML = '<i class="fas fa-shield-halved"></i> Protegido';
            coverBadges.appendChild(playerBadge);
        }

        cover.appendChild(coverBadges);
    }
    card.appendChild(cover);

    const infoDiv = document.createElement('div');
    infoDiv.className = isNetflix ? 'netflix-info' : 'card-info';
    const titleDiv = document.createElement('div');
    titleDiv.className = isNetflix ? 'netflix-title' : 'card-title';
    titleDiv.textContent = serie.title || '';
    infoDiv.appendChild(titleDiv);

    if (!free) {
        const meta = document.createElement('div');
        meta.className = 'card-meta';
        meta.innerHTML = `
            <span class="card-price">${escapeHtml(formatPrice(serie.price))}</span>
            <span class="card-meta-sep">•</span>
            <span class="card-meta-status">${escapeHtml(
                hasAccess && !missingPlayback
                    ? playbackMode === 'telegram'
                        ? 'Entrega no Telegram'
                        : 'Acesso liberado'
                    : lockedPlayback
                        ? 'Pagamento necessário'
                        : missingPlayback
                            ? 'Vídeo em preparo'
                            : 'Catálogo premium'
            )}</span>
        `;
        infoDiv.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'card-actions';
        const buyBtn = document.createElement('button');
        buyBtn.type = 'button';
        buyBtn.className = 'card-cart-btn';
        if (ownerCanWatch) {
            buyBtn.classList.add('card-watch-btn');
            buyBtn.innerHTML = '<i class="fas fa-circle-play"></i> Assistir agora';
        } else if (hasAccess && !missingPlayback) {
            buyBtn.classList.add('card-watch-btn');
            buyBtn.innerHTML = '<i class="fab fa-telegram"></i> Receber no Telegram';
        } else if (missingPlayback) {
            buyBtn.classList.add('card-disabled-btn');
            buyBtn.disabled = true;
            buyBtn.innerHTML = '<i class="fas fa-ban"></i> Vídeo em preparo';
        } else {
            buyBtn.innerHTML = '<i class="fas fa-circle-info"></i> Ver detalhes';
        }
        buyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (ownerCanWatch) {
                void openPlayer(serie.id, serie.title || 'Reproduzir');
                return;
            }
            if (hasAccess && !missingPlayback) {
                void deliverSeriesToTelegram(serie);
                return;
            }
            if (!missingPlayback) openSeriesDetails(serie);
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
    activeSeriesProgressMeta = {
        id: serieId,
        title: title || sourceSerie?.title || 'Reproduzir',
        playbackMode: getPlaybackMode(sourceSerie),
        serie: sourceSerie,
    };
    playerResumeAppliedSeriesId = '';
    lastProgressSyncAt = 0;
    lastProgressSnapshotKey = '';
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
    DOM.playerOverlay.dataset.state = 'loading';
    DOM.playerLoading.classList.add('active');
    setPlayerLoadingView('Abrindo agora', 'Seu vídeo está entrando...');
    DOM.playerError.classList.remove('active');
    DOM.mainVideo.style.display = 'none';
    void requestPlayerFullscreen();
    if (DOM.playerShareBtn) {
        DOM.playerShareBtn.onclick = () => {
            void shareSeriesPage(sourceSerie);
        };
    }
    if (DOM.playerTitle) DOM.playerTitle.textContent = title || 'Reproduzir';
    if (DOM.playerKicker) {
        DOM.playerKicker.innerHTML = isTelegramPlayback
            ? '<i class="fas fa-film"></i> Reprodução'
            : hasAccess
                ? '<i class="fas fa-circle-check"></i> Reprodução liberada'
                : '<i class="fas fa-film"></i> Carregando mídia';
    }
    if (DOM.playerMeta) {
        DOM.playerMeta.textContent = isTelegramPlayback
            ? 'Carregando reprodução.'
            : isFreeContent
                ? 'Grátis. Toque e assista agora.'
                : 'Pagou, liberou. Sem espera.';
    }

    resetVideo();
    const posterUrl = getCoverUrl(sourceSerie);
    if (posterUrl && posterUrl !== PLACEHOLDER_IMAGE) {
        DOM.mainVideo.setAttribute('poster', posterUrl);
    }

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
            DOM.mainVideo.muted = false;
            DOM.mainVideo.volume = 1;
            DOM.mainVideo.style.display = 'block';
            DOM.playerOverlay.dataset.state = 'playing';
            updatePlayerControlsFromVideo();
            
            const playPromise = DOM.mainVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('[PLAYER] Autoplay bloqueado:', err.name);
                    showToast('Toque no vídeo para reproduzir', 'info');
                });
            }
            void syncSeriesProgress('opened', true);
            void requestPlayerFullscreen();
        } else if (data.type === 'internal_player_unavailable' || data.type === 'telegram_file' || data.file_id) {
            playerRetryData = { id: serieId, title: title || sourceSerie?.title || 'Reproduzir', telegramFileId: '' };
            const ownerCanMigrate = isOwnerUser();
            const telegramDescription = ownerCanMigrate
                ? 'Este título já pode ser ajustado nesta área.'
                : 'Este título pode ser entregue pelo bot enquanto a reprodução nesta tela não estiver disponível.';
            DOM.mainVideo.style.display = 'none';
            DOM.playerOverlay.dataset.state = 'unavailable';
            setPlayerErrorView({
                iconClass: 'fas fa-shield-halved',
                iconColor: '#FFD700',
                title: ownerCanMigrate ? 'Pronto' : 'Vídeo em preparo',
                description: telegramDescription,
                buttonHtml: ownerCanMigrate
                    ? '<i class="fas fa-gear"></i> Abrir ajuste'
                    : '<i class="fab fa-telegram"></i> Receber no Telegram',
                buttonHandler: ownerCanMigrate ? () => openOwnerMigrationForSeries(sourceSerie) : () => deliverSeriesToTelegram(sourceSerie)
            });
            DOM.playerError.classList.add('active');
            return;
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('URL de vídeo não retornada');
        }
    } catch (err) {
        if (err?.code === 'access_restricted') {
            showProtectedPlayerBlock(
                'Conteúdo indisponível',
                'Abra este conteúdo pelo fluxo principal.'
            );
            return;
        }
        if (isAccessDeniedError(err)) {
            const titleText = err.status === 402 || err.code === 'payment_required'
                ? 'Conteúdo protegido'
                : 'Acesso não autorizado';
            const description = err.status === 402 || err.code === 'payment_required'
                ? 'Libere a série para assistir dentro do Mini App.'
                : 'Abra esta série pelo fluxo correto para continuar.';
            showProtectedPlayerBlock(titleText, description);
            return;
        }
        showPlayerError();
    }
}

function showPlayerError() {
    DOM.playerLoading.classList.remove('active');
    DOM.mainVideo.style.display = 'none';
    if (DOM.playerOverlay) DOM.playerOverlay.dataset.state = 'error';
    setPlayerErrorView({
        iconClass: 'fas fa-exclamation-triangle',
        iconColor: '#ff4444',
        title: 'Erro ao reproduzir o vídeo',
        description: 'Tente de novo. Se continuar, esse vídeo ainda está sendo preparado.',
        buttonHtml: '<i class="fas fa-redo"></i> Tentar Novamente',
        buttonHandler: retryPlayer
    });
    DOM.playerError.classList.add('active');
}

function retryPlayer() {
    if (!playerRetryData) return;

    openPlayer(playerRetryData.id, playerRetryData.title);
}

function closePlayer() {
    void syncSeriesProgress('closed', true);
    resetVideo();
    if (tg?.exitFullscreen) {
        try {
            tg.exitFullscreen();
        } catch (_) {}
    }
    if (document.fullscreenElement) {
        document.exitFullscreen?.().catch?.(() => {});
    }
    DOM.playerOverlay.classList.remove('active');
    delete DOM.playerOverlay.dataset.state;
    DOM.playerError.classList.remove('active');
    DOM.playerLoading.classList.remove('active');
    updatePlayerControlsFromVideo();
    const panel = document.querySelector('.player-error-panel');
    if (panel) {
        panel.classList.remove('is-protected');
    }
    if (DOM.playerMeta) DOM.playerMeta.textContent = 'Abra diretamente no player.';
    resetProgressTracking();
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
    DOM.modalImg.alt = `Capa de ${serie.title || 'série'}`;
    DOM.modalTitle.textContent = serie.title || 'Série';
    
    const free = isFree(serie);
    const hasAccess = hasSeriesAccess(serie);
    const playbackMode = getPlaybackMode(serie);
    const trailerUrl = getTrailerUrl(serie);
    if (DOM.telegramGuide) {
        DOM.telegramGuide.hidden = true;
    }

    const baseDescription = serie.description || 'Sem descrição disponível.';
    const canDeliver = hasAccess && playbackMode !== 'missing';
    const canDeliverInTelegram = appContext.isTelegram && canDeliver;
    const ownerCanWatch = canDeliver && isOwnerUser();

    if (DOM.modalSeriesMeta) {
        const metadata = [
            ...normalizeSeriesTerms(serie.genre || serie.genres || serie.category).slice(0, 2),
            serie.language || serie.audio_language,
            serie.duration_minutes ? `${serie.duration_minutes} min` : '',
            'Série completa',
        ].filter(Boolean);
        DOM.modalSeriesMeta.innerHTML = metadata.map((item) => `<span>${escapeHtml(String(item))}</span>`).join('');
    }

    DOM.modalDesc.textContent = !appContext.isTelegram
        ? `${baseDescription} Série curta completa, com todos os episódios em um único vídeo.`
        : canDeliver
        ? ownerCanWatch
            ? `${baseDescription} Toque para assistir agora no Mini App.`
            : `${baseDescription} Toque para receber a série no chat do bot pelo Telegram.`
        : playbackMode === 'locked'
        ? `${baseDescription} Quer ver o final agora? Libere todos os episódios.`
        : playbackMode === 'missing'
        ? `${baseDescription} O vídeo desta série ainda está em preparação.`
        : baseDescription;

    if (ownerCanWatch) {
        DOM.modalPrice.innerHTML = '<span class="telegram-badge"><i class="fas fa-circle-play"></i> DISPONÍVEL</span>';
    } else if (!appContext.isTelegram && free) {
        DOM.modalPrice.innerHTML = '<span class="free-badge"><i class="fas fa-gift"></i> GRÁTIS</span>';
    } else if (!appContext.isTelegram && !free) {
        DOM.modalPrice.innerHTML = `<span class="locked-badge"><i class="fas fa-ticket"></i> ${escapeHtml(formatPrice(serie.price))}</span>`;
    } else if (!free && canDeliver) {
        DOM.modalPrice.innerHTML = '<span class="telegram-badge"><i class="fab fa-telegram"></i> LIBERADO NO TELEGRAM</span>';
    } else if (!free && playbackMode === 'locked') {
        DOM.modalPrice.innerHTML = `<span class="locked-badge"><i class="fas fa-lock"></i> BLOQUEADO • ${escapeHtml(formatPrice(serie.price))}</span>`;
    } else if (free && canDeliver) {
        DOM.modalPrice.innerHTML = '<span class="telegram-badge"><i class="fab fa-telegram"></i> ENTREGA NO TELEGRAM</span>';
    } else if (playbackMode === 'missing') {
        DOM.modalPrice.innerHTML = '<span class="unavailable-badge"><i class="fas fa-ban"></i> VÍDEO EM PREPARO</span>';
    } else {
        DOM.modalPrice.innerHTML = free 
            ? '<span class="free-badge"><i class="fas fa-gift"></i> GRÁTIS</span>'
            : `<span>${formatPrice(serie.price)}</span>`;
    }

    DOM.modalActions.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = free ? 'btn btn-free' : 'btn btn-primary';

    if (!appContext.isTelegram && playbackMode !== 'missing') {
        btn.className = free ? 'btn btn-free' : 'btn btn-primary';
        btn.innerHTML = free
            ? '<i class="fab fa-telegram"></i> Assistir grátis no Telegram'
            : `<i class="fab fa-telegram"></i> Comprar por ${escapeHtml(formatPrice(serie))}`;
    } else if (ownerCanWatch) {
        btn.className = 'btn btn-primary';
        btn.innerHTML = '<i class="fas fa-circle-play"></i> Assistir agora';
    } else if (canDeliverInTelegram) {
        btn.className = 'btn btn-free';
        btn.innerHTML = free
            ? '<i class="fab fa-telegram"></i> Assistir grátis'
            : '<i class="fab fa-telegram"></i> Assistir agora';
    } else if (playbackMode === 'missing') {
        btn.className = 'btn btn-secondary';
        btn.innerHTML = '<i class="fas fa-ban"></i> VÍDEO INDISPONÍVEL';
    } else {
        btn.innerHTML = `<i class="fas fa-cart-plus"></i> Comprar por ${escapeHtml(formatPrice(serie))}`;
    }
    
    btn.onclick = () => {
        closeModal();
        if (!appContext.isTelegram && playbackMode !== 'missing') {
            openTelegramBotLink(buildTelegramSeriesLink(serie));
        } else if (ownerCanWatch) {
            void openPlayer(serie.id, serie.title || 'Reproduzir');
        } else if (canDeliver) {
            void deliverSeriesToTelegram(serie);
        } else if (playbackMode === 'missing') {
            showToast('Essa série ainda não possui vídeo disponível', 'info');
        } else {
            addToCart(serie);
        }
    };
    
    DOM.modalActions.appendChild(btn);

    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'btn btn-secondary';
    favoriteBtn.innerHTML = isFavoriteSeries(serie.id)
        ? '<i class="fas fa-heart"></i> Favorita'
        : '<i class="far fa-heart"></i> Favoritar';
    favoriteBtn.onclick = () => {
        toggleFavoriteSeries(serie);
    };
    DOM.modalActions.appendChild(favoriteBtn);

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

    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-secondary';
    shareBtn.innerHTML = '<i class="fas fa-share-nodes"></i> Compartilhar';
    shareBtn.onclick = () => {
        void shareSeriesPage(serie);
    };
    DOM.modalActions.appendChild(shareBtn);

    renderRelatedSeries(serie);

    DOM.modalOverlay.classList.add('active');
    document.body.classList.add('modal-open');
}

function getRelatedSeries(currentSerie, catalog = allSeries, limit = 4) {
    if (!currentSerie) return [];
    const currentTerms = new Set(normalizeSearchText([
        currentSerie.category,
        currentSerie.genre,
        currentSerie.genres,
        currentSerie.tags,
        currentSerie.language,
    ].flatMap((value) => normalizeSeriesTerms(value)).join(' ')).split(' ').filter(Boolean));

    return catalog
        .filter((candidate) => candidate && !sameId(candidate.id, currentSerie.id))
        .map((candidate) => {
            const candidateTerms = new Set(normalizeSearchText([
                candidate.category,
                candidate.genre,
                candidate.genres,
                candidate.tags,
                candidate.language,
            ].flatMap((value) => normalizeSeriesTerms(value)).join(' ')).split(' ').filter(Boolean));
            let score = 0;
            currentTerms.forEach((term) => {
                if (candidateTerms.has(term)) score += 2;
            });
            if (isFree(candidate) === isFree(currentSerie)) score += 1;
            return { candidate, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score || String(left.candidate.title).localeCompare(String(right.candidate.title), 'pt-BR'))
        .slice(0, limit)
        .map((entry) => entry.candidate);
}

function renderRelatedSeries(serie) {
    if (!DOM.relatedSeriesSection || !DOM.relatedSeriesGrid) return;
    const related = getRelatedSeries(serie);
    DOM.relatedSeriesGrid.innerHTML = '';
    DOM.relatedSeriesSection.hidden = related.length === 0;
    related.forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'related-series-card';
        const image = document.createElement('img');
        image.src = getCoverUrl(item);
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        const title = document.createElement('span');
        title.textContent = item.title || 'Série';
        button.append(image, title);
        button.addEventListener('click', () => openSeriesDetails(item));
        DOM.relatedSeriesGrid.appendChild(button);
    });
}

function closeModal() {
    DOM.modalOverlay?.classList.remove('active');
    if (!DOM.cartDrawer?.classList.contains('active')) {
        document.body.classList.remove('modal-open');
    }
    if (window.location.pathname.startsWith('/series/')) {
        history.pushState({ route: 'home' }, '', '/');
        updatePageMetadata(null);
    }
}

// =================== CARRINHO ====================
function setCartCouponStatus(message = '', type = '') {
    if (!DOM.cartCouponStatus) return;
    DOM.cartCouponStatus.textContent = message;
    DOM.cartCouponStatus.className = `cart-coupon-status ${type}`.trim();
}

function scheduleServerCartSave() {
    if (!appContext.isTelegram || !tg?.initData) return;
    clearTimeout(cartSyncTimer);
    cartSyncTimer = setTimeout(() => {
        requestCartSync('save', {
            item_ids: cart.map((item) => String(item.id || '')).filter(Boolean),
            coupon_code: activeCoupon?.code || '',
        }).catch((error) => debugLog('[CART] Falha ao sincronizar carrinho:', error?.message || error));
    }, 250);
}

async function loadServerCart() {
    if (!appContext.isTelegram || !tg?.initData) return;
    try {
        const payload = await requestCartSync('load');
        const serverIds = Array.isArray(payload?.cart?.item_ids) ? payload.cart.item_ids.map(normalizeId) : [];
        const mergedIds = new Set([...cart.map((item) => normalizeId(item.id)), ...serverIds]);
        cart = allSeries.filter((serie) => mergedIds.has(normalizeId(serie.id)) && !isFree(serie) && !hasSeriesAccess(serie));
        const couponCode = String(payload?.cart?.coupon_code || '').trim();
        if (DOM.cartCouponInput instanceof HTMLInputElement && couponCode) DOM.cartCouponInput.value = couponCode;
        saveCart();
        if (couponCode && cart.length) {
            await applyCartCoupon();
        } else {
            updateCartUI();
            scheduleServerCartSave();
        }
    } catch (error) {
        debugLog('[CART] Carrinho remoto indisponível:', error?.message || error);
    }
}

async function applyCartCoupon() {
    if (!appContext.isTelegram) {
        showToast('Abra o Telegram para validar cupons.', 'info');
        return;
    }
    if (!cart.length) {
        setCartCouponStatus('Adicione uma série antes de aplicar o cupom.', 'error');
        return;
    }
    const code = String(DOM.cartCouponInput?.value || '').trim().toUpperCase();
    if (!code) {
        activeCoupon = null;
        setCartCouponStatus('', '');
        updateCartUI();
        scheduleServerCartSave();
        return;
    }

    const previousLabel = DOM.cartCouponBtn?.textContent || 'Aplicar';
    try {
        if (DOM.cartCouponBtn instanceof HTMLButtonElement) {
            DOM.cartCouponBtn.disabled = true;
            DOM.cartCouponBtn.textContent = 'Validando...';
        }
        const payload = await requestCouponValidation(code);
        activeCoupon = payload?.coupon || null;
        if (!activeCoupon?.code) throw new Error('Cupom inválido');
        if (DOM.cartCouponInput instanceof HTMLInputElement) DOM.cartCouponInput.value = activeCoupon.code;
        setCartCouponStatus(`${activeCoupon.code} aplicado: ${formatPrice(activeCoupon.discountAmount)} de desconto.`, 'success');
        trackAnalyticsEvent('coupon_applied', { metadata: { code_length: activeCoupon.code.length, discount_amount: activeCoupon.discountAmount } });
        updateCartUI();
        scheduleServerCartSave();
    } catch (error) {
        activeCoupon = null;
        setCartCouponStatus(error.message || 'Não foi possível aplicar o cupom.', 'error');
        updateCartUI();
        scheduleServerCartSave();
    } finally {
        if (DOM.cartCouponBtn instanceof HTMLButtonElement) {
            DOM.cartCouponBtn.disabled = false;
            DOM.cartCouponBtn.textContent = previousLabel;
        }
    }
}

function clearAppliedCoupon(message = '') {
    activeCoupon = null;
    setCartCouponStatus(message, message ? 'info' : '');
}

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
        if (DOM.cartSubtotal) DOM.cartSubtotal.textContent = 'R$ 0,00';
        if (DOM.cartDiscountRow) DOM.cartDiscountRow.hidden = true;
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
            const discount = Number(activeCoupon?.discountAmount || 0);
            const finalTotal = Math.max(0, total - discount);
            DOM.cartTotal.textContent = formatPrice(finalTotal);
        }
        if (DOM.cartSubtotal) DOM.cartSubtotal.textContent = formatPrice(total);
        if (DOM.cartDiscount) DOM.cartDiscount.textContent = `- ${formatPrice(activeCoupon?.discountAmount || 0)}`;
        if (DOM.cartDiscountRow) DOM.cartDiscountRow.hidden = !activeCoupon?.discountAmount;
    }

    if (DOM.checkoutBtn) {
        const hasPendingOrder = isAwaitingPayment(activePaymentOrder);
        DOM.checkoutBtn.disabled = !cart.length && !hasPendingOrder;
        DOM.checkoutBtn.innerHTML = getCheckoutButtonLabel();
    }

    renderPaymentSummary(activePaymentOrder);
}

function addToCart(serie) {
    if (!serie || cart.some(item => sameId(item.id, serie.id))) {
        showToast('Já está no carrinho!', 'error');
        return;
    }
    clearAppliedCoupon('Carrinho alterado. Aplique o cupom novamente.');
    cart.push(serie);
    trackAnalyticsEvent('add_to_cart', {
        series_id: serie.id,
        metadata: { item_count: cart.length, price: getSeriesPriceValue(serie) },
    });
    if (!saveCart()) {
        showToast('Item adicionado, mas não será salvo entre sessões', 'error');
    }
    updateCartUI();
    scheduleServerCartSave();
    toggleCart(true);
    showToast('Adicionado ao carrinho!', 'success');
}

function removeFromCart(id) {
    clearAppliedCoupon('Carrinho alterado. Aplique o cupom novamente.');
    cart = cart.filter(item => !sameId(item.id, id));
    trackAnalyticsEvent('remove_from_cart', {
        series_id: id,
        metadata: { item_count: cart.length },
    });
    saveCart();
    updateCartUI();
    scheduleServerCartSave();
}

function checkout() {
    if (!appContext.isTelegram) {
        showToast('Abra o bot no Telegram para comprar com segurança.', 'info');
        openTelegramBotLink(TELEGRAM_BOT_LINK);
        return;
    }
    if (isAwaitingPayment(activePaymentOrder)) {
        showToast('Seu pagamento já está pronto aqui embaixo.', 'info');
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
    trackAnalyticsEvent('checkout_started', {
        metadata: { item_count: checkoutItems.length, payment_method: selectedPaymentMethod },
    });
    savePaymentPrefs();
    setCheckoutLoading(true);

    requestPaymentCreate({
        init_data: tg?.initData || '',
        payment_method: selectedPaymentMethod,
        buyer_email: buyerEmail || '',
        buyer_name: tg?.initDataUnsafe?.user?.first_name || '',
        items: checkoutItems,
        coupon_code: activeCoupon?.code || '',
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
        activeCoupon = null;
        if (DOM.cartCouponInput instanceof HTMLInputElement) DOM.cartCouponInput.value = '';
        setCartCouponStatus('', '');
        saveCart('CHECKOUT');
        scheduleServerCartSave();
        updateCartUI();
        showToast('Tudo certo. Agora é só pagar.', 'success');

        if (selectedPaymentMethod === 'telegram_checkout') {
            openTelegramInvoice(getOrderPaymentUrl(order));
        } else if (selectedPaymentMethod !== 'pix_qr' && order.checkout_url) {
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
function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function normalizeSeriesTerms(value) {
    const entries = Array.isArray(value) ? value : String(value || '').split(/[,/|;]/);
    return entries.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function buildSeriesSearchText(serie) {
    const terms = [
        serie?.title,
        serie?.alternate_title,
        serie?.alternateTitle,
        serie?.short_description,
        serie?.description,
        serie?.category,
        serie?.genre,
        serie?.genres,
        serie?.tags,
        serie?.language,
        serie?.audio_language,
        serie?.subtitle_language,
        serie?.theme,
        serie?.keywords,
    ].flatMap((value) => normalizeSeriesTerms(value));
    return normalizeSearchText(terms.join(' '));
}

function seriesMatchesCategory(serie, category) {
    const normalizedCategory = slugify(category);
    if (normalizedCategory === 'gratuitas') return isFree(serie);
    if (normalizedCategory === 'pagas') return !isFree(serie);
    const searchable = buildSeriesSearchText(serie);
    if (normalizedCategory === 'dubladas') return searchable.includes('dublad');
    if (normalizedCategory === 'legendadas') return searchable.includes('legendad');
    return searchable.includes(normalizeSearchText(normalizedCategory));
}

function filterCategory(category, options = {}) {
    currentCategory = (category || 'all').trim().toLowerCase();
    document.querySelectorAll('.category-chip').forEach((chip) => {
        chip.classList.toggle('active', (chip.dataset.category || 'all') === currentCategory);
    });
    refreshCatalog();
    if (options.updateUrl) {
        const nextPath = currentCategory === 'all'
            ? '/'
            : currentCategory === 'favorites'
                ? '/favoritos'
                : `/categoria/${slugify(currentCategory)}`;
        history.pushState({ route: 'category', category: currentCategory }, '', nextPath);
        updatePageMetadata(null);
    }
}

function searchSeries(term, options = {}) {
    currentSearchTerm = (term || '').trim().toLowerCase();
    [DOM.searchInput, DOM.headerSearchInput].forEach((input) => {
        if (input && input.value !== term) input.value = term;
    });
    DOM.catalogGrid?.setAttribute('aria-busy', 'true');
    refreshCatalog();
    DOM.catalogGrid?.setAttribute('aria-busy', 'false');
    if (options.updateUrl) {
        if (currentSearchTerm) trackAnalyticsEvent('series_search', { metadata: { query_length: term.trim().length, result_count: getVisibleSeries().length } });
        const target = currentSearchTerm ? `/busca?q=${encodeURIComponent(term.trim())}` : '/';
        history.replaceState({ route: 'search', query: term.trim() }, '', target);
        updatePageMetadata(null);
    }
}

// =================== EXPORT GLOBAL }
window.retryPlayer = retryPlayer;
window.toggleCart = toggleCart;
window.openModal = openModal;
window.closeModal = closeModal;
window.checkout = checkout;
window.searchSeries = searchSeries;
window.openOwnerSeriesEditor = openOwnerSeriesEditor;
window.resetOwnerSeriesEditor = resetOwnerSeriesEditor;


