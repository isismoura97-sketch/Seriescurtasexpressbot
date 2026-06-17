/**
 * Séries Curtas Express - Mini App Telegram
 * Versão com diagnóstico de NetworkError
 */

'use strict';

const tg = window.Telegram?.WebApp;
const API_URL = 'https://uyyeascxvnrrkjtlygdoe.supabase.co/functions/v1/bot-unificado';
const userId = tg?.initDataUnsafe?.user?.id || 'anonymous';

let allSeries = [];
let cart = JSON.parse(localStorage.getItem('cart_series')) || [];
let currentHeroIndex = 0;
let heroInterval = null;
let playerRetryData = null;
let savedFocus = null;

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

// ==================== FETCH MELHORADO ====================
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    console.log(`[API] Tentando acessar: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' }
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        }

        const data = await res.json();
        console.log('[API] Sucesso:', data);
        return data;

    } catch (err) {
        clearTimeout(timeoutId);
        console.error('[NetworkError]', err.message, url);
        
        if (err.name === 'AbortError') {
            showToast('Timeout ao conectar com o servidor', 'error');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            showToast('Erro de rede. Verifique sua conexão ou CORS do Supabase.', 'error');
        } else {
            showToast('Erro ao carregar dados: ' + err.message, 'error');
        }
        throw err;
    }
}

function showToast(message, type = 'error') {
    const container = DOM.toastContainer;
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0F0F0F');
    }

    try {
        const data = await fetchWithTimeout(`${API_URL}/api/series`);
        allSeries = Array.isArray(data) ? data : [];
        renderNetflixRow(allSeries);
        renderGrid(allSeries);
        initHero();
        updateCartUI();
    } catch (e) {
        console.error("Falha crítica no carregamento inicial", e);
        DOM.heroTitle.textContent = "Erro de Conexão";
        DOM.heroDesc.textContent = "Não foi possível carregar o catálogo.";
    }

    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('cartBtn')?.addEventListener('click', () => toggleCart(true));
    DOM.searchInput?.addEventListener('input', (e) => searchSeries(e.target.value.trim()));
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
}

// ==================== Funções restantes (mesmas de antes) ====================

function initHero() { /* ... */ }
function updateHero() { /* ... */ }
function renderNetflixRow() { /* ... */ }
function renderGrid() { /* ... */ }
function createCard() { /* ... */ }
async function openPlayer() { /* ... */ }
function closePlayer() { /* ... */ }
function openModal() { /* ... */ }
function closeModal() { /* ... */ }
function toggleCart() { /* ... */ }
function updateCartUI() { /* ... */ }
function addToCart() { /* ... */ }
function checkout() { /* ... */ }
function filterCategory() { /* ... */ }
function searchSeries() { /* ... */ }
function toggleTheme() { /* ... */ }

window.retryPlayer = () => playerRetryData && openPlayer(playerRetryData.id, playerRetryData.title);
window.loadTestVideo = () => { /* ... */ };
