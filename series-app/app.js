/**
 * Séries Curtas Express - Mini App Telegram
 * Versão Final Otimizada - 2025
 * Compatível com HTML e CSS revisados (Player & Modal Premium)
 */

'use strict';

// ====================== UTILITIES ======================

async function fetchWithTimeout(url, options = {}, timeout = 12000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const contentType = res.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            throw new Error('Resposta inválida do servidor');
        }

        return await res.json();
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('Timeout da requisição');
        throw err;
    }
}

function formatPrice(price) {
    if (price === 0 || price === null) return 'GRÁTIS';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const container = DOM.toastContainer;
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ====================== DOM CACHE ======================

const DOM = {
    playerOverlay: document.getElementById('playerOverlay'),
    mainVideo: document.getElementById('mainVideo'),
    playerTitle: document.getElementById('playerTitle'),
    playerLoading: document.getElementById('playerLoading'),
    playerError: document.getElementById('playerError'),
    playerWatermark: document.getElementById('playerWatermark'),
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
    themeBtn: document.getElementById('themeBtn'),
    themeIcon: document.getElementById('themeIcon'),
    cartBtn: document.getElementById('cartBtn')
};

// ====================== STATE & CONFIG ======================

let allSeries = [];
let cart = JSON.parse(localStorage.getItem('cart_series')) || [];
let currentHeroIndex = 0;
let heroInterval = null;
let currentModalSeries = null;
let playerRetryData = null;
let savedFocus = null;

const tg = window.Telegram?.WebApp;
const API_URL = 'https://uyyeascxvnrrkjtlygdoe.supabase.co/functions/v1/bot-unificado';
const userId = tg?.initDataUnsafe?.user?.id || 'anonymous';

// ====================== INITIALIZATION ======================

document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0F0F0F');
        tg.onEvent('themeChanged', applyTheme);
    }

    applyTheme();
    await loadSeries();
    updateCartUI();
    setupEventListeners();
    setupKeyboardShortcuts();
}

// ====================== EVENT LISTENERS ======================

function setupEventListeners() {
    // Header scroll
    window.addEventListener('scroll', () => {
        DOM.header.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Search
    DOM.searchInput?.addEventListener('input', (e) => {
        searchSeries(e.target.value.trim());
    });

    // Category chips
    document.querySelectorAll('.category-chip').forEach((chip, index) => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const category = index === 0 ? 'all' : chip.textContent.trim().toLowerCase();
            filterCategory(category);
        });
    });

    // Cart
    DOM.cartBtn?.addEventListener('click', () => toggleCart(true));
    DOM.cartOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'cartOverlay') toggleCart(false);
    });

    // Theme
    DOM.themeBtn?.addEventListener('click', toggleTheme);

    // Player buttons
    document.querySelectorAll('.player-back, .player-close').forEach(btn => {
        btn.addEventListener('click', closePlayer);
    });

    // Modal close
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    DOM.modalOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (DOM.playerOverlay?.classList.contains('active')) closePlayer();
            else if (DOM.modalOverlay?.classList.contains('active')) closeModal();
            else toggleCart(false);
        }
    });
}

// ====================== THEME ======================

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
    showToast(isLight ? '🌞 Tema Claro ativado' : '🌙 Tema Escuro ativado', 'success');
}

// ====================== DATA LOADING ======================

async function loadSeries() {
    try {
        const data = await fetchWithTimeout(`${API_URL}/api/series`, {}, 15000);
        if (!Array.isArray(data)) throw new Error('Formato inválido');

        allSeries = data;
        renderNetflixRow(allSeries);
        renderGrid(allSeries);
        initHero();
    } catch (err) {
        console.error(err);
        showToast('Erro ao carregar catálogo: ' + err.message, 'error');
    }
}

// ====================== HERO ======================

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
    if (!serie) return;

    DOM.heroTitle.textContent = serie.title || 'Destaque';
    DOM.heroDesc.textContent = serie.description || 'Uma história emocionante...';
    DOM.heroImg.src = serie.cover_url || '';
    DOM.heroImg.alt = serie.title || 'Poster';

    const isFree = serie.price === 0;

    DOM.heroBadge.className = isFree ? 'hero-badge-free' : 'hero-badge';
    DOM.heroBadge.innerHTML = isFree 
        ? `<i class="fas fa-gift"></i> GRÁTIS` 
        : `<i class="fas fa-fire"></i> Destaque da Semana`;

    DOM.heroPlayBtn.style.display = 'inline-flex';
    DOM.heroPlayBtn.onclick = () => {
        if (isFree) openPlayer(serie.id, serie.title);
        else openModal(serie);
    };
}

// ====================== RENDER ======================

function renderNetflixRow(series) {
    const container = DOM.netflixScroll;
    if (!container) return;
    container.innerHTML = '';

    series.slice(0, 10).forEach(serie => {
        const card = createCard(serie, true);
        container.appendChild(card);
    });
    document.getElementById('netflixRow').style.display = 'block';
}

function renderGrid(series) {
    const grid = DOM.catalogGrid;
    if (!grid) return;
    grid.innerHTML = '';

    series.forEach(serie => {
        const card = createCard(serie, false);
        grid.appendChild(card);
    });
}

function createCard(serie, isNetflix = false) {
    const card = document.createElement('div');
    card.className = isNetflix ? 'netflix-card' : 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Abrir ${serie.title}`);

    const isFree = serie.price === 0;

    card.innerHTML = `
        ${isFree ? `<div class="badge-gratis-landscape"><i class="fas fa-gift"></i> GRÁTIS</div>` : ''}
        <img src="${serie.cover_url}" alt="${serie.title}" loading="lazy">
        <div class="${isNetflix ? 'netflix-info' : 'card-info'}">
            <div class="${isNetflix ? 'netflix-title' : 'card-title'}">${escapeHtml(serie.title)}</div>
        </div>
    `;

    const handleClick = () => {
        if (isFree) openPlayer(serie.id, serie.title);
        else openModal(serie);
    };

    card.addEventListener('click', handleClick);
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    });

    return card;
}

// ====================== PLAYER ======================

async function openPlayer(serieId, title) {
    playerRetryData = { id: serieId, title };

    DOM.playerOverlay.classList.add('active');
    DOM.playerLoading.style.display = 'flex';
    DOM.playerError.classList.remove('active');
    DOM.mainVideo.style.display = 'none';
    DOM.playerTitle.textContent = title || 'Reproduzindo...';
    DOM.watermarkId.textContent = userId;

    if (tg?.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(closePlayer);
    }

    try {
        const url = new URL(`${API_URL}/api/stream/${serieId}`);
        url.searchParams.set('user_id', userId);

        const data = await fetchWithTimeout(url.toString(), {}, 15000);

        if (data.url) {
            DOM.mainVideo.src = data.url;
            DOM.mainVideo.style.display = 'block';
            DOM.mainVideo.play().catch(() => {});
        } else {
            throw new Error('URL de vídeo não retornada');
        }
    } catch (err) {
        console.error(err);
        showToast('Erro ao carregar vídeo', 'error');
        showPlayerError();
    } finally {
        DOM.playerLoading.style.display = 'none';
    }
}

function showPlayerError() {
    DOM.playerLoading.style.display = 'none';
    DOM.mainVideo.style.display = 'none';
    DOM.playerError.classList.add('active');
}

function retryPlayer() {
    if (playerRetryData) openPlayer(playerRetryData.id, playerRetryData.title);
}

function loadTestVideo() {
    const video = DOM.mainVideo;
    video.src = 'https://test-streams.mux.dev/x264_720p_1500kbps_30fps.mp4';
    video.style.display = 'block';
    DOM.playerError.classList.remove('active');
    DOM.playerLoading.style.display = 'none';
    video.play().catch(console.warn);
    showToast('Vídeo de teste carregado', 'success');
}

function closePlayer() {
    DOM.mainVideo.pause();
    DOM.mainVideo.src = '';
    DOM.mainVideo.load();

    DOM.playerOverlay.classList.remove('active');
    DOM.playerError.classList.remove('active');
    DOM.playerLoading.style.display = 'flex';

    if (tg?.BackButton) tg.BackButton.hide();
    savedFocus?.focus();
}

// ====================== CART ======================

function toggleCart(open) {
    const isOpen = typeof open === 'boolean' ? open : !DOM.cartDrawer.classList.contains('active');
    
    DOM.cartOverlay.classList.toggle('active', isOpen);
    DOM.cartDrawer.classList.toggle('active', isOpen);
    document.body.classList.toggle('modal-open', isOpen);

    if (isOpen) updateCartUI();
}

function updateCartUI() {
    const container = DOM.cartItems;
    let total = 0;

    DOM.cartBadge.textContent = cart.length;
    DOM.cartBadge.style.display = cart.length > 0 ? 'flex' : 'none';

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:80px 20px; color:var(--gray);">
                <i class="fas fa-shopping-basket" style="font-size:48px; opacity:0.3; margin-bottom:16px"></i>
                <p>Seu carrinho está vazio</p>
                <p style="font-size:14px; margin-top:8px">Adicione séries para continuar</p>
            </div>`;
        DOM.cartTotal.textContent = 'R$ 0,00';
        return;
    }

    container.innerHTML = '';
    cart.forEach(item => {
        total += parseFloat(item.price) || 0;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.cover_url}" alt="${item.title}">
            <div class="cart-item-info">
                <div class="cart-item-title">${escapeHtml(item.title)}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
            </div>
            <button class="cart-item-remove" aria-label="Remover ${item.title}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        div.querySelector('.cart-item-remove').addEventListener('click', () => removeFromCart(item.id));
        container.appendChild(div);
    });

    DOM.cartTotal.textContent = formatPrice(total);
}

function addToCart(serie) {
    if (cart.some(item => item.id === serie.id)) {
        showToast('Esta série já está no carrinho!', 'error');
        return;
    }
    cart.push(serie);
    localStorage.setItem('cart_series', JSON.stringify(cart));
    updateCartUI();
    showToast('Adicionado ao carrinho!', 'success');
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cart_series', JSON.stringify(cart));
    updateCartUI();
}

function checkout() {
    if (!cart.length) return showToast('Carrinho vazio!', 'error');

    tg?.sendData(JSON.stringify({
        action: 'checkout_cart',
        items: cart,
        total: cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0),
        user_id: userId
    }));

    showToast('Finalizando compra...', 'success');

    setTimeout(() => {
        cart = [];
        localStorage.setItem('cart_series', JSON.stringify(cart));
        updateCartUI();
        toggleCart(false);
        tg?.close();
    }, 1500);
}

// ====================== MODAL ======================

function openModal(serie) {
    currentModalSeries = serie;

    DOM.modalImg.src = serie.cover_url;
    DOM.modalTitle.textContent = serie.title;
    DOM.modalDesc.textContent = serie.description || 'Sem descrição disponível.';

    const isFree = serie.price === 0;
    DOM.modalPrice.innerHTML = isFree 
        ? `<span class="free-badge"><i class="fas fa-gift"></i> GRÁTIS</span>`
        : `<span>${formatPrice(serie.price)}</span>`;

    DOM.modalActions.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = isFree ? 'btn btn-free' : 'btn btn-primary';
    btn.innerHTML = isFree 
        ? `<i class="fas fa-play"></i> ASSISTIR AGORA`
        : `<i class="fas fa-cart-plus"></i> Adicionar ao Carrinho`;

    btn.addEventListener('click', () => {
        if (isFree) {
            closeModal();
            openPlayer(serie.id, serie.title);
        } else {
            addToCart(serie);
            closeModal();
        }
    });

    DOM.modalActions.appendChild(btn);
    DOM.modalOverlay.classList.add('active');
    document.body.classList.add('modal-open');

    savedFocus = document.activeElement;
    setTimeout(() => document.querySelector('.modal-close').focus(), 150);
}

function closeModal() {
    DOM.modalOverlay.classList.remove('active');
    document.body.classList.remove('modal-open');
    if (savedFocus) {
        savedFocus.focus();
        savedFocus = null;
    }
}

// ====================== FILTERS ======================

function filterCategory(category) {
    if (category === 'all') {
        renderGrid(allSeries);
    } else {
        const filtered = allSeries.filter(s => 
            s.category && s.category.toLowerCase() === category
        );
        renderGrid(filtered);
    }
}

function searchSeries(term) {
    if (!term) {
        renderGrid(allSeries);
        return;
    }
    const filtered = allSeries.filter(s => 
        s.title.toLowerCase().includes(term.toLowerCase())
    );
    renderGrid(filtered);
}

// ====================== CLEANUP ======================

function cleanup() {
    if (heroInterval) clearInterval(heroInterval);
    if (tg?.BackButton) tg.BackButton.hide();
}

window.addEventListener('beforeunload', cleanup);

// Export global functions (para compatibilidade com onclick no HTML)
window.openPlayer = openPlayer;
window.closePlayer = closePlayer;
window.retryPlayer = retryPlayer;
window.loadTestVideo = loadTestVideo;
window.toggleCart = toggleCart;
window.openModal = openModal;
window.closeModal = closeModal;
window.checkout = checkout;
window.filterCategory = filterCategory;
window.searchSeries = searchSeries;
