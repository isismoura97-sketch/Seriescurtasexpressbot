/**
 * Séries Curtas Express - Mini App Telegram
 * Versão 3.4 - Player Corrigido (404 Fix)
 */

'use strict';

// ==================== CONFIGURAÇÃO ====================
const DEBUG = false;
const tg = window.Telegram?.WebApp;
const API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado';
const SUPABASE_PROJECT_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co';

function sanitizeUserId(raw) {
    if (raw == null) return null;
    const str = String(raw);
    if (/^\d{1,20}$/.test(str)) return str;
    return null;
}
const userId = sanitizeUserId(tg?.initDataUnsafe?.user?.id);

let allSeries = [];
let cart = [];
try {
    cart = JSON.parse(localStorage.getItem('cart_series')) || [];
} catch (e) {
    cart = [];
}

let currentHeroIndex = 0;
let heroInterval = null;
let playerRetryData = null;

// ==================== CACHE DOM ====================
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

// ==================== UTILITÁRIOS ====================
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

// Utility functions from utils.js: formatPrice, escapeHtml, isFreePrice,
// filterByCategory, searchByTitle, calculateCartTotal, canAddToCart

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    debugLog(`[FETCH] ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: { ...(options.headers || {}), 'Content-Type': 'application/json' }
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}`);
        }

        return await res.json();

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

const PLACEHOLDER_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFBMjc0NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNGRkQ3MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TZW0gQ2FwYTwvdGV4dD48L3N2Zz4=';

// ==================== FUNÇÃO CRÍTICA: OBTER URL DA CAPA ====================
function getCoverUrl(serie) {
    if (!serie) return PLACEHOLDER_IMG;
    
    let raw = null;
    if (serie.cover_url && serie.cover_url !== 'null' && serie.cover_url !== null) {
        raw = serie.cover_url;
    } else if (serie.cover_storage_path && serie.cover_storage_path !== 'null') {
        raw = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/covers/${encodeURI(serie.cover_storage_path)}`;
    } else if (serie.cover_path && serie.cover_path !== 'null') {
        raw = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/covers/${encodeURI(serie.cover_path)}`;
    }
    
    const safe = raw ? sanitizeUrl(raw) : '';
    return safe || PLACEHOLDER_IMG;
}

// ==================== INICIALIZAÇÃO ====================
async function init() {
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
        const data = await fetchWithTimeout(`${API_URL}/api/series`);
        allSeries = Array.isArray(data) ? data : [];
        debugLog(`[INIT] ${allSeries.length} séries carregadas`);

        renderNetflixRow(allSeries);
        renderGrid(allSeries);
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
    const isLight = localStorage.getItem('theme_series') === 'light';
    document.body.classList.toggle('light-mode', isLight);
    if (DOM.themeIcon) {
        DOM.themeIcon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme_series', isLight ? 'light' : 'dark');
    applyTheme();
    showToast(isLight ? 'Tema Claro ativado' : 'Tema Escuro ativado', 'success');
}

// ==================== HERO ====================
function initHero() {
    if (!allSeries.length) return;
    updateHero(0);
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

    const isFree = isFreePrice(serie.price);
    DOM.heroBadge.className = isFree ? 'hero-badge-free' : 'hero-badge';
    DOM.heroBadge.innerHTML = isFree 
        ? '<i class="fas fa-gift"></i> GRÁTIS' 
        : '<i class="fas fa-fire"></i> Destaque da Semana';

    DOM.heroPlayBtn.style.display = 'inline-flex';
    DOM.heroPlayBtn.onclick = () => isFree ? openPlayer(serie.id, serie.title) : openModal(serie);
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

function createCard(serie, isNetflix = false) {
    const card = document.createElement('div');
    card.className = isNetflix ? 'netflix-card' : 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Abrir ${serie.title || 'série'}`);

    const isFree = isFreePrice(serie.price);
    const coverUrl = getCoverUrl(serie);

    if (isFree) {
        const badge = document.createElement('div');
        badge.className = 'badge-gratis-landscape';
        badge.innerHTML = '<i class="fas fa-gift"></i> GRÁTIS';
        card.appendChild(badge);
    }

    const img = document.createElement('img');
    img.src = coverUrl;
    img.alt = serie.title || '';
    img.loading = 'lazy';
    img.onerror = function() { this.src = PLACEHOLDER_IMG; };
    card.appendChild(img);

    const infoDiv = document.createElement('div');
    infoDiv.className = isNetflix ? 'netflix-info' : 'card-info';
    const titleDiv = document.createElement('div');
    titleDiv.className = isNetflix ? 'netflix-title' : 'card-title';
    titleDiv.textContent = serie.title || '';
    infoDiv.appendChild(titleDiv);
    card.appendChild(infoDiv);

    const handleClick = () => isFree ? openPlayer(serie.id, serie.title) : openModal(serie);
    card.addEventListener('click', handleClick);
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    });

    return card;
}

// ==================== PLAYER - CORRIGIDO (404 FIX) ====================
async function openPlayer(serieId, title) {
    playerRetryData = { id: serieId, title };
    DOM.playerOverlay.classList.add('active');
    DOM.playerLoading.classList.add('active');
    DOM.playerError.classList.remove('active');
    DOM.mainVideo.style.display = 'none';
    DOM.playerTitle.textContent = title || 'Reproduzir';
    DOM.watermarkId.textContent = userId || '---';

    // Reset do vídeo para evitar carregamento de URL antiga
    DOM.mainVideo.pause();
    DOM.mainVideo.src = '';
    DOM.mainVideo.removeAttribute('src');

    try {
        const url = new URL(API_URL);
        url.searchParams.set('action', 'stream');
        url.searchParams.set('serie_id', serieId);
        url.searchParams.set('user_id', userId);

        const data = await fetchWithTimeout(url.toString());
        
        if (data.url) {
            const safeVideoUrl = sanitizeUrl(data.url);
            if (!safeVideoUrl) throw new Error('URL de vídeo inválida');
            DOM.mainVideo.setAttribute('src', safeVideoUrl);
            DOM.mainVideo.style.display = 'block';
            
            const playPromise = DOM.mainVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Autoplay bloqueado:', err.name);
                });
            }
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('URL de vídeo não retornada');
        }
    } catch (err) {
    
        showPlayerError();
    } finally {
        DOM.playerLoading.classList.remove('active');
    }
}

function showPlayerError() {
    DOM.playerLoading.classList.remove('active');
    DOM.mainVideo.style.display = 'none';
    DOM.playerError.classList.add('active');
}

function retryPlayer() {
    if (playerRetryData) openPlayer(playerRetryData.id, playerRetryData.title);
}

function closePlayer() {
    DOM.mainVideo.pause();
    DOM.mainVideo.src = '';
    DOM.mainVideo.removeAttribute('src');
    DOM.playerOverlay.classList.remove('active');
    DOM.playerError.classList.remove('active');
    DOM.playerLoading.classList.remove('active');
}

// ==================== MODAL ====================
function openModal(serie) {
    if (!serie) return;
    DOM.modalImg.src = getCoverUrl(serie);
    DOM.modalTitle.textContent = serie.title || 'Série';
    DOM.modalDesc.textContent = serie.description || 'Sem descrição disponível.';
    
    const isFree = isFreePrice(serie.price);
    DOM.modalPrice.innerHTML = isFree 
        ? '<span class="free-badge"><i class="fas fa-gift"></i> GRÁTIS</span>'
        : `<span>${formatPrice(serie.price)}</span>`;

    DOM.modalActions.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = isFree ? 'btn btn-free' : 'btn btn-primary';
    btn.innerHTML = isFree 
        ? '<i class="fas fa-play"></i> ASSISTIR AGORA'
        : '<i class="fas fa-cart-plus"></i> Adicionar ao Carrinho';
    
    btn.onclick = () => {
        if (isFree) { closeModal(); openPlayer(serie.id, serie.title); }
        else { addToCart(serie); closeModal(); }
    };
    
    DOM.modalActions.appendChild(btn);
    DOM.modalOverlay.classList.add('active');
    document.body.classList.add('modal-open');
}

function closeModal() {
    DOM.modalOverlay.classList.remove('active');
    if (!DOM.cartDrawer.classList.contains('active')) {
        document.body.classList.remove('modal-open');
    }
}

// ==================== CARRINHO ====================
function toggleCart(open) {
    const isOpen = typeof open === 'boolean' ? open : !DOM.cartDrawer.classList.contains('active');
    DOM.cartOverlay.classList.toggle('active', isOpen);
    DOM.cartDrawer.classList.toggle('active', isOpen);
    if (!DOM.modalOverlay.classList.contains('active')) {
        document.body.classList.toggle('modal-open', isOpen);
    }
    if (isOpen) updateCartUI();
}

function updateCartUI() {
    const container = DOM.cartItems;
    let total = 0;

    DOM.cartBadge.textContent = cart.length;
    DOM.cartBadge.style.display = cart.length > 0 ? 'flex' : 'none';

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
        cartImg.onerror = function() { this.src = PLACEHOLDER_IMG; };
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
    if (!canAddToCart(cart, serie)) {
        showToast('Já está no carrinho!', 'error');
        return;
    }
    cart.push(serie);
    try {
        localStorage.setItem('cart_series', JSON.stringify(cart));
    } catch (e) {
        console.warn('localStorage não disponível');
    }
    updateCartUI();
    showToast('Adicionado ao carrinho!', 'success');
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    try {
        localStorage.setItem('cart_series', JSON.stringify(cart));
    } catch (e) {
        console.warn('localStorage não disponível');
    }
    updateCartUI();
}

function checkout() {
    if (!cart.length) return showToast('Carrinho vazio!', 'error');

    const total = calculateCartTotal(cart);
    
    tg?.sendData(JSON.stringify({
        action: 'checkout_cart',
        items: cart,
        total: total,
        user_id: userId
    }));

    showToast('Finalizando compra...', 'success');
    setTimeout(() => {
        cart = [];
        try {
            localStorage.setItem('cart_series', JSON.stringify(cart));
        } catch (e) {}
        updateCartUI();
        toggleCart(false);
        if (tg && typeof tg.close === 'function') tg.close();
    }, 1500);
}

// ==================== FILTROS ====================
function filterCategory(category) {
    renderGrid(filterByCategory(allSeries, category));
}

function searchSeries(term) {
    renderGrid(searchByTitle(allSeries, term));
}

// ==================== EXPORT GLOBAL ====================
window.retryPlayer = retryPlayer;
window.toggleCart = toggleCart;
window.openModal = openModal;
window.closeModal = closeModal;
window.checkout = checkout;
window.searchSeries = searchSeries;


