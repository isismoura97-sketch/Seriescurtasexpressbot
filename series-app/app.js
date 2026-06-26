/**
 * Séries Curtas Express - Mini App Telegram
 * Versão 3.4 - Player Corrigido (404 Fix)
 */

'use strict';

// ==================== CONFIGURAÇÃO ====================
const DEBUG = false;
const BUILD_VERSION = '20260626-9';
const TELEGRAM_BOT_USERNAME = 'ShortNovelsBot';
let tg = null;
let userId = null;
const API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api';
const SUPABASE_PROJECT_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co';

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
    if (isFree(serie)) {
        openPlayer(serie.id, serie.title);
    } else {
        openModal(serie);
    }
}

// ==================== CACHE DOM =====================
const DOM = {
    playerOverlay: document.getElementById('playerOverlay'),
    mainVideo: document.getElementById('mainVideo'),
    playerTitle: document.getElementById('playerTitle'),
    playerLoading: document.getElementById('playerLoading'),
    playerError: document.getElementById('playerError'),
    watermarkId: document.getElementById('watermarkId'),
    cartOverlay: document.getElementById('cartOverlay'),
    cartDrawer: document.getElementById('cartDrawer'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    cartBadge: document.getElementById('cartBadge'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalImg: document.getElementById('modalImg'),
    modalTitle: document.getElementById('modalTitle'),
    modalPrice: document.getElementById('modalPrice'),
    modalDesc: document.getElementById('modalDesc'),
    modalActions: document.getElementById('modalActions'),
    heroImg: document.getElementById('heroImg'),
    heroTitle: document.getElementById('heroTitle'),
    heroDesc: document.getElementById('heroDesc'),
    heroBadge: document.getElementById('heroBadge'),
    heroPlayBtn: document.getElementById('heroPlayBtn'),
    catalogGrid: document.getElementById('catalogGrid'),
    netflixScroll: document.getElementById('netflixScroll'),
    searchInput: document.getElementById('searchInput'),
    toastContainer: document.getElementById('toastContainer'),
    header: document.getElementById('header'),
    themeIcon: document.getElementById('themeIcon')
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
    const payload = JSON.stringify({
        action: 'play_video',
        serie_id: serieId,
        file_id: telegramFileId,
        title
    });

    try {
        if (tg && typeof tg.sendData === 'function') {
            tg.sendData(payload);
            showToast('Solicitando a reprodução no Telegram...', 'success');
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
        showToast('Abrindo o Telegram para reproduzir o vídeo...', 'info');
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
            await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}`);
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
    
    const safe = raw ? sanitizeUrl(raw) : '';
    return safe || PLACEHOLDER_IMAGE;
}

// ==================== INICIALIZAÇÃO ====================
async function init() {
    resolveTelegramContext();
    bindPlayerVideoEvents();

    if (tg) {
        tg.ready();
        tg.expand();
    }

    applyTheme();

    if (!userId) {
        if (DOM.heroTitle) DOM.heroTitle.textContent = 'Acesso Negado';
        if (DOM.heroDesc) DOM.heroDesc.textContent = 'Abra este app pelo Telegram.';
        return;
    }

    try {
        const url = new URL(API_URL);
        url.searchParams.set('action', 'series');
        const data = await fetchWithTimeout(withCacheBuster(url.toString()));
        allSeries = Array.isArray(data) ? data : [];
        debugLog(`[INIT] ${allSeries.length} éries carregadas`);

        renderNetflixRow(allSeries);
        renderGrid(getVisibleSeries());
        initHero();
        updateCartUI();
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
    document.getElementById('cartBtn')?.addEventListener('click', () => toggleCart(true));
    DOM.cartOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'cartOverlay') toggleCart(false);
    });

    DOM.searchInput?.addEventListener('input', (e) => searchSeries(e.target.value.trim()));

    document.querySelectorAll('.category-chip').forEach((chip, index) => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const category = index === 0 ? 'all' : chip.textContent.trim().toLowerCase();
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

    if (currentCategory !== 'all') {
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
    card.setAttribute('aria-label', `Abrir ${serie.title || 'série'}`);

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

    playerRetryData = { id: serieId, title };
    DOM.playerOverlay.classList.add('active');
    DOM.playerLoading.classList.add('active');
    DOM.playerError.classList.remove('active');
    DOM.mainVideo.style.display = 'none';
    if (DOM.playerTitle) DOM.playerTitle.textContent = title || 'Reproduzir';
    if (DOM.watermarkId) DOM.watermarkId.textContent = userId || '---';

    resetVideo();

    try {
        const url = new URL(API_URL);
        url.searchParams.set('action', 'stream');
        url.searchParams.set('serie_id', serieId);
        url.searchParams.set('user_id', userId);

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
            playerRetryData = { id: serieId, title, telegramFileId: data.file_id };
            DOM.mainVideo.style.display = 'none';
            setPlayerErrorView({
                iconClass: 'fab fa-telegram',
                iconColor: '#2AABEE',
                title: 'Reprodução via Telegram',
                description: 'Este título usa um arquivo do Telegram. Abra no bot para continuar a reprodução.',
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
        showPlayerError();
    }
}

function showPlayerError() {
    DOM.playerLoading.classList.remove('active');
    DOM.mainVideo.style.display = 'none';
    setPlayerErrorView({
        iconClass: 'fas fa-exclamation-triangle',
        iconColor: '#ff4444',
        title: 'Erro ao reproduzir o vídeo',
        description: 'Tente novamente. Se o erro persistir, o player pode depender de abertura no Telegram.',
        buttonHtml: '<i class="fas fa-redo"></i> Tentar Novamente',
        buttonHandler: retryPlayer
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
    DOM.modalDesc.textContent = serie.description || 'Sem descrição disponível.';
    
    const free = isFree(serie);
    DOM.modalPrice.innerHTML = free 
        ? '<span class="free-badge"><i class="fas fa-gift"></i> GRÁTIS</span>'
        : `<span>${formatPrice(serie.price)}</span>`;

    DOM.modalActions.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = free ? 'btn btn-free' : 'btn btn-primary';
    btn.innerHTML = free 
        ? '<i class="fas fa-play"></i> ASSISTIR AGORA'
        : '<i class="fas fa-cart-plus"></i> Adicionar ao Carrinho';
    
    btn.onclick = () => {
        closeModal();
        if (free) { openPlayer(serie.id, serie.title); }
        else { addToCart(serie); }
    };
    
    DOM.modalActions.appendChild(btn);
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
    let total = 0;

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
        DOM.cartTotal.textContent = 'R$ 0,00';
        return;
    }

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

    DOM.cartTotal.textContent = formatPrice(total);
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
    showToast('Adicionado ao carrinho!', 'success');
}

function removeFromCart(id) {
    cart = cart.filter(item => !sameId(item.id, id));
    saveCart();
    updateCartUI();
}

function checkout() {
    if (!cart.length) return showToast('Carrinho vazio!', 'error');

    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

    try {
        if (!tg || typeof tg.sendData !== 'function') {
            throw new Error('Telegram WebApp não disponível');
        }
        tg.sendData(JSON.stringify({
            action: 'checkout_cart',
            items: cart,
            total: total,
            user_id: userId
        }));
    } catch (err) {
        console.error('[CHECKOUT] Falha ao enviar dados ao Telegram:', err.message);
        showToast('Erro ao finalizar compra. Tente novamente.', 'error');
        return;
    }

    showToast('Finalizando compra...', 'success');
    setTimeout(() => {
        cart = [];
        saveCart('CHECKOUT');
        updateCartUI();
        toggleCart(false);
        if (tg && typeof tg.close === 'function') tg.close();
    }, 1500);
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


