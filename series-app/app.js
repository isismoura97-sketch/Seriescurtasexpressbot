/**
 * Séries Curtas Express - Mini App Telegram
 * Versão 3.6 - Entrega Protegida via Telegram
 */

'use strict';

// ==================== CONFIGURAÇÃO ====================
const DEBUG = false;
const BUILD_VERSION = '20260707-02';
const TELEGRAM_BOT_USERNAME = 'ShortNovelsBot';
const OWNER_INTERNAL_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;
const OWNER_LOGO_IMAGE = `assets/logo-welcome.png?v=${BUILD_VERSION}`;
const TELEGRAM_BOT_LINK = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
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
const FAVORITES_STORAGE_KEY = 'series_favorites';
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
let ownerSessionAuthorized = false;

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

function buildSeriesPageUrl(serieId) {
    const baseUrl = new URL(window.location.pathname, window.location.origin);
    if (serieId) {
        baseUrl.searchParams.set('play', normalizeId(serieId));
    }
    return baseUrl.toString();
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

    const shareUrl = buildSeriesPageUrl(sourceSerie.id);
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
        ? 'Liberado'
        : status === 'pending_payment' || status === 'created'
            ? 'Falta pouco'
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

    if (method === 'telegram_checkout') {
        details.push(`<div class="payment-detail"><span>Telegram</span><strong>Confirmação pelo bot</strong></div>`);
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
        openButton.innerHTML = '<i class="fas fa-qrcode"></i> Copiar Pix';
        openButton.addEventListener('click', async () => {
            if (order.pix_qr_code) {
                await copyToClipboard(order.pix_qr_code);
                showToast('Pix copiado!', 'success');
            }
        });
    } else if (method === 'telegram_checkout') {
        openButton.innerHTML = '<i class="fas fa-arrow-up-right-from-square"></i> Pagar agora';
        openButton.addEventListener('click', () => {
            openExternalLink(getOrderPaymentUrl(order));
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
            : '<i class="fas fa-cloud-arrow-up"></i> Publicar série';
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
    if (coverInput instanceof HTMLInputElement) {
        coverInput.required = !editing;
    }
    if (videoInput instanceof HTMLInputElement) {
        videoInput.required = !editing && !(videoFileIdInput instanceof HTMLTextAreaElement && extractTelegramFileIdInput(videoFileIdInput.value));
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
            videoInput.required = !ownerSeriesEditId && !normalizedFileId;
            if (normalizedFileId && hasUpload && videoInput.files?.[0] && videoInput.files[0].size > OWNER_INTERNAL_UPLOAD_LIMIT_BYTES) {
                videoInput.value = '';
            }
        }
    };

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
    syncOwnerVideoSources();
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

function renderOwnerDashboard(data) {
    if (!DOM.ownerDashboard) return;

    ownerDashboardSnapshot = data;
    const catalog = data?.catalog || {};
    const payments = data?.payments || {};
    const seriesItems = Array.isArray(data?.series_items) ? data.series_items : [];
    const recentSeries = Array.isArray(data?.recent_series) ? data.recent_series : [];
    const catalogSeries = seriesItems.length ? seriesItems : recentSeries;
    const statusCounts = payments.status_counts || {};
    const recentOrders = Array.isArray(payments.recent_orders) ? payments.recent_orders : [];
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

    const recentRows = recentOrders
        .map((order) => `
            <div class="owner-list-row">
                <span>${escapeHtml(order.order_id || '---')} • ${escapeHtml(order.payment_method || '---')} • ${escapeHtml(order.status || '---')}</span>
                <strong>${escapeHtml(formatOwnerCurrency(order.amount))}</strong>
            </div>
        `)
        .join('') || '<div class="owner-list-row"><span>Nenhum pedido recente</span><strong>-</strong></div>';

    const prioritySeriesRows = prioritySeries.slice(0, 4)
        .map((serie) => {
            const trailerLabel = serie.has_trailer ? 'Trailer' : 'Sem trailer';
            const videoLabel = getOwnerSeriesVideoStatusLabel(serie);
            const coverLabel = serie.has_cover ? 'Capa OK' : 'Sem capa';
            const freeLabel = serie.is_free ? 'Grátis' : formatPrice(serie.price);
            const coverUrl = getCoverUrl(serie);
            const editId = String(serie.id || '');
            const quickActionMeta = getOwnerSeriesQuickVideoActionMeta(serie);
            return `
                <article class="owner-series-row owner-series-row-priority">
                    <div class="owner-series-thumb-wrap">
                        <img class="owner-series-thumb" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(serie.title || 'Capa da série')}" loading="lazy" onerror="${escapeHtml(`this.src=${JSON.stringify(PLACEHOLDER_IMAGE)}`)}">
                    </div>
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
                    <div class="owner-series-row-actions">
                        <button type="button" class="btn btn-secondary owner-series-edit-btn" data-owner-edit-id="${escapeAttr(editId)}">
                            <i class="fas fa-pen-to-square"></i> Abrir
                        </button>
                        <button type="button" class="btn btn-secondary owner-series-mini-btn" data-owner-quick-action="${escapeAttr(quickActionMeta.action)}" data-owner-series-id="${escapeAttr(editId)}">
                            <i class="fas ${escapeAttr(quickActionMeta.icon)}"></i> ${escapeHtml(quickActionMeta.label)}
                        </button>
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
            return `
                <article class="owner-series-row">
                    <div class="owner-series-thumb-wrap">
                        <img class="owner-series-thumb" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(serie.title || 'Capa da série')}" loading="lazy" onerror="${escapeHtml(`this.src=${JSON.stringify(PLACEHOLDER_IMAGE)}`)}">
                    </div>
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
        <section class="owner-hero-card">
            <div class="owner-hero-layout">
                <div class="owner-hero-copy">
                    <span class="owner-eyebrow"><i class="fas fa-sparkles"></i> Área de gestão</span>
                    <h3>Gerencie séries, capas, trailers e vídeos em um só painel.</h3>
                    <p>Use o envio rápido para arquivos leves e o fluxo alternativo quando necessário, mantendo o catálogo estável.</p>
                </div>
                <div class="owner-hero-side">
                    <div class="owner-brand">
                        <img class="owner-brand-logo" src="${OWNER_LOGO_IMAGE}" alt="Séries Express">
                        <div>
                            <strong>Séries Express</strong>
                            <span>Área de gestão</span>
                        </div>
                    </div>
                    <div class="owner-side-stack">
                        <div class="owner-side-item">
                            <span>Sem vídeo</span>
                            <strong>${escapeHtml(String(prioritySeriesCount))}</strong>
                        </div>
                        <div class="owner-side-item">
                            <span>Pagamentos aprovados</span>
                            <strong>${escapeHtml(formatOwnerCurrency(payments.approved_amount))}</strong>
                        </div>
                        <div class="owner-side-item">
                            <span>Pedidos registrados</span>
                            <strong>${escapeHtml(String(payments.orders_total ?? 0))}</strong>
                        </div>
                        <div class="owner-side-item">
                            <span>Fluxo</span>
                            <strong>1. Cadastrar 2. Envio rápido até ${escapeHtml(getOwnerInternalUploadLimitLabel())} 3. Fluxo alternativo</strong>
                        </div>
                    </div>
                    <div class="owner-hero-actions">
                        <button type="button" class="btn btn-secondary" data-owner-reset-editor>
                            <i class="fas fa-plus"></i> Novo item
                        </button>
                        <button type="button" class="btn btn-secondary" data-owner-filter-mode="migration">
                            <i class="fas fa-link"></i> Ver fila
                        </button>
                        <button type="button" class="btn btn-primary" data-owner-migrate-priority ${telegramFallbackCount ? '' : 'disabled'}>
                            <i class="fas fa-wand-magic-sparkles"></i> Aplicar ajuste
                        </button>
                        <button type="button" class="btn btn-secondary" data-owner-filter-mode="playable">
                            <i class="fas fa-circle-play"></i> Prontos
                        </button>
                    </div>
                </div>
            </div>
            <div class="owner-kpi-grid">
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
                    <span>Em fila</span>
                    <strong>${escapeHtml(String(telegramFallbackCount))}</strong>
                </div>
            </div>
        </section>
        <section class="owner-section owner-section-priority owner-series-section">
            <div class="owner-section-head">
                <div>
                    <h3>Itens em fila</h3>
                    <p>Estes títulos ainda pedem ajuste. Os demais seguem ativos normalmente.</p>
                </div>
                <div class="owner-series-count">${escapeHtml(String(prioritySeriesCount))} itens</div>
            </div>
            <div class="owner-series-list">${prioritySeriesRows}</div>
        </section>
        <div class="owner-dashboard-grid">
            <div class="owner-section owner-section-featured">
                <div class="owner-form-head">
                    <div>
                        <span class="owner-eyebrow" id="ownerFormBadge">Novo cadastro</span>
                        <h3 id="ownerFormTitle">Nova série</h3>
                        <p id="ownerFormSubtitle">Crie uma série com um vídeo principal único. O trailer continua opcional.</p>
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
                            <span id="ownerCoverPreviewCaption">Use a imagem da série para ver antes de salvar.</span>
                        </div>
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
                            <span>Vídeo principal</span>
                            <input type="file" name="video_file" accept="video/*" required>
                        </label>
                        <label class="payment-field owner-upload-span-2">
                            <span>File_ID do vídeo no Telegram opcional</span>
                            <textarea name="video_file_id" id="ownerSeriesVideoFileId" rows="3" placeholder="Cole aqui o File_ID do vídeo, se preferir usar o Telegram"></textarea>
                        </label>
                    </div>
                    <div class="owner-upload-actions">
                        <button class="btn btn-primary" id="ownerSeriesSubmitBtn" type="submit">
                            <i class="fas fa-cloud-arrow-up"></i> Publicar série
                        </button>
                        <p class="owner-upload-note">Use envio rápido apenas para arquivos até ${escapeHtml(getOwnerInternalUploadLimitLabel())}. Arquivos maiores seguem no fluxo alternativo.</p>
                    </div>
                    <div class="owner-list">
                        <div class="owner-list-row">
                            <span>Capturar File_ID</span>
                            <strong><a id="ownerFileIdHelpLink" href="${escapeAttr(getOwnerFileIdCaptureUrl())}" target="_blank" rel="noopener noreferrer">Abrir guia</a></strong>
                        </div>
                        <div class="owner-list-row">
                            <span>Fluxo</span>
                            <strong>1. Abra a guia 2. Envie o arquivo 3. Salve</strong>
                        </div>
                    </div>
                    <div class="owner-status" id="ownerUploadStatus"></div>
                </form>
            </div>
            <div class="owner-section">
                <h3>Visão geral</h3>
                <div class="owner-list">
                    <div class="owner-list-row"><span>Prontas</span><strong>${escapeHtml(String(internalSeriesCount))}</strong></div>
                    <div class="owner-list-row"><span>Em fila</span><strong>${escapeHtml(String(telegramFallbackCount))}</strong></div>
                    <div class="owner-list-row"><span>Sem vídeo</span><strong>${escapeHtml(String(missingPlaybackCount))}</strong></div>
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
            <div class="owner-section owner-series-section">
                <div class="owner-section-head">
                    <div>
                        <h3>Catálogo</h3>
                        <p>Busque, filtre e edite rapidamente. O painel mostra quando um título está pronto ou aguarda ajuste.</p>
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
            </div>
            <div class="owner-section">
                <h3>Pedidos Recentes</h3>
                <div class="owner-list">${recentRows}</div>
            </div>
        </div>
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
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
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

        if (created) {
            allSeries = [created, ...allSeries.filter((serie) => !sameId(serie.id, created.id))];
            refreshCatalog();
            initHero();
        }

        if (dashboard) {
            ownerSeriesEditId = '';
            ownerDashboardSnapshot = dashboard;
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
        const friendlyMessage = explainOwnerUploadError(error, formData.get('video_file'));
        setOwnerUploadStatus(friendlyMessage || 'Não foi possível publicar a série.', 'error');
        showToast(friendlyMessage || 'Falha ao publicar a série.', 'error');
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
            showToast('Pago com sucesso. Sua série já foi liberada.', 'success');
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
    if (hasDirectPlaybackUrl(serie)) return 'direct';
    if (serie?.has_video_file_id || getTelegramFileId(serie) || Number(serie?.playable_episode_count || 0) > 0) return 'telegram';
    return 'missing';
}

// ==================== INICIALIZAÇÃO ====================
async function init() {
    resolveTelegramContext();
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
        hydrateFavoriteSeriesFromCatalog(allSeries);
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
    DOM.heroPlayBtn.innerHTML = '<i class="fab fa-telegram"></i> RECEBER';
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

function renderGrid(series) {
    const grid = DOM.catalogGrid;
    if (!grid) return;
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

function getVisibleSeries() {
    let filtered = allSeries.slice();

    if (currentCategory === 'favorites') {
        filtered = filtered.filter((s) => isFavoriteSeries(s.id));
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
            buyBtn.innerHTML = `<i class="fas fa-cart-plus"></i> Comprar ${escapeHtml(formatPrice(serie))}`;
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
            if (!missingPlayback) {
                addToCart(serie);
            }
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
    const ownerCanWatch = canDeliver && isOwnerUser();

    DOM.modalDesc.textContent = canDeliver
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

    if (ownerCanWatch) {
        btn.className = 'btn btn-primary';
        btn.innerHTML = '<i class="fas fa-circle-play"></i> Assistir agora';
    } else if (canDeliver) {
        btn.className = 'btn btn-free';
        btn.innerHTML = '<i class="fab fa-telegram"></i> RECEBER NO TELEGRAM';
    } else if (playbackMode === 'missing') {
        btn.className = 'btn btn-secondary';
        btn.innerHTML = '<i class="fas fa-ban"></i> VÍDEO INDISPONÍVEL';
    } else {
        btn.innerHTML = '<i class="fas fa-cart-plus"></i> Adicionar ao Carrinho';
    }
    
    btn.onclick = () => {
        closeModal();
        if (ownerCanWatch) {
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
        showToast('Tudo certo. Agora é só pagar.', 'success');

        if (selectedPaymentMethod === 'telegram_checkout') {
            openExternalLink(getOrderPaymentUrl(order));
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
window.openOwnerSeriesEditor = openOwnerSeriesEditor;
window.resetOwnerSeriesEditor = resetOwnerSeriesEditor;


