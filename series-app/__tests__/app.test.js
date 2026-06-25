'use strict';

/**
 * Integration tests for app.js DOM-dependent functions.
 *
 * Strategy: build a minimal DOM that mirrors index.html, load utils.js
 * globals, then require app.js so its top-level code can resolve
 * getElementById calls. Global functions (those assigned to window.*)
 * are exercised via the window object.
 */

const fs = require('fs');
const path = require('path');

// ---- Helpers ----

function buildMinimalDOM() {
    document.body.innerHTML = `
        <!-- Player -->
        <div id="playerOverlay">
            <div id="playerLoading"></div>
            <div id="playerError"></div>
            <video id="mainVideo"></video>
            <div id="playerTitle"></div>
            <span id="watermarkId"></span>
            <button class="player-back"></button>
            <button class="player-close"></button>
        </div>

        <!-- Cart -->
        <div id="cartOverlay"></div>
        <aside id="cartDrawer">
            <div id="cartItems"></div>
            <span id="cartTotal">R$ 0,00</span>
        </aside>
        <span id="cartBadge" style="display:none;">0</span>

        <!-- Modal -->
        <div id="modalOverlay">
            <div class="modal-content">
                <img id="modalImg" src="" alt="">
                <button class="modal-close"></button>
                <h2 id="modalTitle"></h2>
                <div id="modalPrice"></div>
                <p id="modalDesc"></p>
                <div id="modalActions"></div>
            </div>
        </div>

        <!-- Toast -->
        <div id="toastContainer"></div>

        <!-- Header -->
        <header id="header">
            <button id="themeBtn"><i id="themeIcon" class="fas fa-moon"></i></button>
            <button id="cartBtn"></button>
        </header>

        <!-- Hero -->
        <img id="heroImg" src="" alt="">
        <h1 id="heroTitle">Carregando destaque...</h1>
        <p id="heroDesc">Preparando o catálogo...</p>
        <span id="heroBadge"></span>
        <button id="heroPlayBtn" style="display:none;"></button>

        <!-- Catalog -->
        <section id="netflixRow" style="display:none;">
            <div id="netflixScroll"></div>
        </section>
        <div id="catalogGrid"></div>
        <input id="searchInput" type="text">
        <button class="category-chip active">Todas</button>
        <button class="category-chip">Romance</button>
    `;
}

// ---- Test-wide setup ----

let utilsModule;

beforeEach(() => {
    jest.useFakeTimers();

    // Reset DOM
    buildMinimalDOM();

    // Mock localStorage
    const store = {};
    Object.defineProperty(window, 'localStorage', {
        value: {
            getItem: jest.fn((key) => store[key] || null),
            setItem: jest.fn((key, val) => { store[key] = val; }),
            removeItem: jest.fn((key) => { delete store[key]; }),
            clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
        },
        writable: true,
        configurable: true
    });

    // Mock Telegram WebApp
    window.Telegram = { WebApp: { ready: jest.fn(), expand: jest.fn(), initDataUnsafe: { user: { id: 'test-user-123' } }, close: jest.fn(), sendData: jest.fn() } };

    // Mock fetch globally
    global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('')
    }));

    // Suppress console noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Load utils into global scope (as the browser would)
    utilsModule = require('../utils');
    Object.keys(utilsModule).forEach(key => {
        global[key] = utilsModule[key];
    });
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.resetModules();
    // Clean up globals
    if (utilsModule) {
        Object.keys(utilsModule).forEach(key => {
            delete global[key];
        });
    }
    delete window.Telegram;
    delete global.fetch;
});

// Helper: load app.js in current jsdom context
function loadApp() {
    // Isolate modules so each test starts fresh
    jest.isolateModules(() => {
        require('../utils');
        require('../app');
    });
}

// ==================== showToast ====================

describe('showToast (via app.js)', () => {
    beforeEach(() => loadApp());

    it('is not directly on window but runs via side-effects', () => {
        // showToast is called internally; we test it indirectly through
        // functions that invoke it (e.g. checkout with empty cart).
        const container = document.getElementById('toastContainer');
        expect(container).toBeTruthy();
    });
});

// ==================== toggleCart ====================

describe('toggleCart', () => {
    beforeEach(() => loadApp());

    it('opens cart drawer', () => {
        window.toggleCart(true);
        expect(document.getElementById('cartDrawer').classList.contains('active')).toBe(true);
        expect(document.getElementById('cartOverlay').classList.contains('active')).toBe(true);
    });

    it('closes cart drawer', () => {
        window.toggleCart(true);
        window.toggleCart(false);
        expect(document.getElementById('cartDrawer').classList.contains('active')).toBe(false);
        expect(document.getElementById('cartOverlay').classList.contains('active')).toBe(false);
    });

    it('toggles when no argument', () => {
        window.toggleCart(true);
        // Calling without boolean should toggle off
        window.toggleCart();
        expect(document.getElementById('cartDrawer').classList.contains('active')).toBe(false);
    });
});

// ==================== openModal / closeModal ====================

describe('openModal / closeModal', () => {
    beforeEach(() => loadApp());

    it('does nothing for null serie', () => {
        window.openModal(null);
        expect(document.getElementById('modalOverlay').classList.contains('active')).toBe(false);
    });

    it('opens modal with serie data', () => {
        const serie = { id: 1, title: 'Test Serie', description: 'A test', price: 29.9 };
        window.openModal(serie);

        expect(document.getElementById('modalOverlay').classList.contains('active')).toBe(true);
        expect(document.getElementById('modalTitle').textContent).toBe('Test Serie');
        expect(document.getElementById('modalDesc').textContent).toBe('A test');
        expect(document.body.classList.contains('modal-open')).toBe(true);
    });

    it('shows GRÁTIS badge for free series', () => {
        const serie = { id: 2, title: 'Free Serie', price: 0 };
        window.openModal(serie);

        const priceEl = document.getElementById('modalPrice');
        expect(priceEl.innerHTML).toContain('GRÁTIS');
    });

    it('shows formatted price for paid series', () => {
        const serie = { id: 3, title: 'Paid', price: 15 };
        window.openModal(serie);

        const priceEl = document.getElementById('modalPrice');
        expect(priceEl.textContent).toMatch(/15/);
    });

    it('creates add-to-cart button for paid series', () => {
        const serie = { id: 4, title: 'Paid', price: 10 };
        window.openModal(serie);

        const actions = document.getElementById('modalActions');
        const btn = actions.querySelector('button');
        expect(btn).toBeTruthy();
        expect(btn.innerHTML).toContain('Carrinho');
    });

    it('creates watch button for free series', () => {
        const serie = { id: 5, title: 'Free', price: 0 };
        window.openModal(serie);

        const actions = document.getElementById('modalActions');
        const btn = actions.querySelector('button');
        expect(btn).toBeTruthy();
        expect(btn.innerHTML).toContain('ASSISTIR');
    });

    it('closeModal removes active class', () => {
        window.openModal({ id: 1, title: 'X', price: 5 });
        window.closeModal();

        expect(document.getElementById('modalOverlay').classList.contains('active')).toBe(false);
    });

    it('closeModal removes modal-open from body when cart is closed', () => {
        window.openModal({ id: 1, title: 'X', price: 5 });
        window.closeModal();

        expect(document.body.classList.contains('modal-open')).toBe(false);
    });

    it('uses default title when serie.title is missing', () => {
        window.openModal({ id: 1, price: 5 });
        expect(document.getElementById('modalTitle').textContent).toBe('Série');
    });

    it('uses default description when missing', () => {
        window.openModal({ id: 1, price: 5 });
        expect(document.getElementById('modalDesc').textContent).toBe('Sem descrição disponível.');
    });
});

// ==================== checkout ====================

describe('checkout', () => {
    beforeEach(() => loadApp());

    it('shows toast for empty cart', () => {
        window.checkout();
        // The toast container should have a child (the error toast)
        jest.advanceTimersByTime(100);
        const toasts = document.getElementById('toastContainer').children;
        expect(toasts.length).toBeGreaterThanOrEqual(1);
    });

    it('sends data via Telegram when cart has items', () => {
        // Add an item to cart first via openModal flow
        const serie = { id: 99, title: 'BuySerie', price: 20, description: 'x' };
        window.openModal(serie);
        const btn = document.getElementById('modalActions').querySelector('button');
        btn.click(); // adds to cart and closes modal

        window.checkout();

        expect(window.Telegram.WebApp.sendData).toHaveBeenCalled();
        const sentData = JSON.parse(window.Telegram.WebApp.sendData.mock.calls[0][0]);
        expect(sentData.action).toBe('checkout_cart');
        expect(sentData.items).toHaveLength(1);
        expect(sentData.items[0].id).toBe(99);
        expect(sentData.total).toBe(20);
    });

    it('clears cart after checkout completes', () => {
        const serie = { id: 50, title: 'S', price: 10, description: 'x' };
        window.openModal(serie);
        document.getElementById('modalActions').querySelector('button').click();

        window.checkout();
        jest.advanceTimersByTime(2000);

        expect(document.getElementById('cartBadge').textContent).toBe('0');
    });
});

// ==================== searchSeries ====================

describe('searchSeries (window)', () => {
    beforeEach(() => {
        // Provide series data via fetch mock
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
                { id: 1, title: 'Breaking Bad', price: 10, category: 'Drama' },
                { id: 2, title: 'Game of Thrones', price: 0, category: 'Drama' },
                { id: 3, title: 'Breaking Point', price: 5, category: 'Ação' }
            ]),
            text: () => Promise.resolve('')
        }));
        loadApp();
    });

    it('renders all series when term is empty', async () => {
        // Wait for init() fetch to resolve
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        window.searchSeries('');
        const grid = document.getElementById('catalogGrid');
        expect(grid.children.length).toBe(3);
    });

    it('filters series by title', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        window.searchSeries('breaking');
        const grid = document.getElementById('catalogGrid');
        expect(grid.children.length).toBe(2);
    });

    it('shows no results message when nothing matches', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        window.searchSeries('xyznonexistent');
        const grid = document.getElementById('catalogGrid');
        expect(grid.innerHTML).toContain('Nenhuma série encontrada');
    });
});

// ==================== renderGrid / createCard ====================

describe('renderGrid and createCard', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
                { id: 1, title: 'Serie A', price: 0, category: 'Drama' },
                { id: 2, title: 'Serie B', price: 15, category: 'Ação' }
            ]),
            text: () => Promise.resolve('')
        }));
        loadApp();
    });

    it('creates cards in catalog grid', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const grid = document.getElementById('catalogGrid');
        expect(grid.children.length).toBe(2);
    });

    it('marks free series with GRÁTIS badge', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const grid = document.getElementById('catalogGrid');
        const firstCard = grid.children[0];
        expect(firstCard.innerHTML).toContain('GRÁTIS');
    });

    it('cards have proper ARIA attributes', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const grid = document.getElementById('catalogGrid');
        const card = grid.children[0];
        expect(card.getAttribute('role')).toBe('button');
        expect(card.getAttribute('tabindex')).toBe('0');
    });

    it('shows empty message for empty series', async () => {
        // Re-mock with empty response
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([]),
            text: () => Promise.resolve('')
        }));
        jest.resetModules();
        buildMinimalDOM();
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        window.searchSeries('anything');
        const grid = document.getElementById('catalogGrid');
        expect(grid.innerHTML).toContain('Nenhuma série encontrada');
    });
});

// ==================== Netflix row ====================

describe('renderNetflixRow', () => {
    it('shows netflix row when series exist', async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([
                { id: 1, title: 'NF1', price: 0 },
                { id: 2, title: 'NF2', price: 10 }
            ]),
            text: () => Promise.resolve('')
        }));
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const row = document.getElementById('netflixRow');
        expect(row.style.display).toBe('block');
    });

    it('limits netflix row to 10 items', async () => {
        const manySeries = Array.from({ length: 15 }, (_, i) => ({
            id: i, title: `S${i}`, price: i
        }));
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve(manySeries),
            text: () => Promise.resolve('')
        }));
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const scroll = document.getElementById('netflixScroll');
        expect(scroll.children.length).toBeLessThanOrEqual(10);
    });
});

// ==================== Hero ====================

describe('Hero section', () => {
    it('updates hero with first serie', async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([
                { id: 1, title: 'Hero Serie', description: 'Best series', price: 0 }
            ]),
            text: () => Promise.resolve('')
        }));
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        expect(document.getElementById('heroTitle').textContent).toBe('Hero Serie');
        expect(document.getElementById('heroDesc').textContent).toBe('Best series');
    });

    it('shows GRÁTIS badge for free hero serie', async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([
                { id: 1, title: 'Free Hero', price: 0 }
            ]),
            text: () => Promise.resolve('')
        }));
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const badge = document.getElementById('heroBadge');
        expect(badge.innerHTML).toContain('GRÁTIS');
    });

    it('rotates hero after interval', async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([
                { id: 1, title: 'First', price: 0 },
                { id: 2, title: 'Second', price: 10 }
            ]),
            text: () => Promise.resolve('')
        }));
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        expect(document.getElementById('heroTitle').textContent).toBe('First');

        // Advance past the 6s hero rotation interval
        jest.advanceTimersByTime(6100);
        expect(document.getElementById('heroTitle').textContent).toBe('Second');
    });
});

// ==================== Theme ====================

describe('Theme toggle', () => {
    beforeEach(() => loadApp());

    it('body does not have light-mode by default', () => {
        expect(document.body.classList.contains('light-mode')).toBe(false);
    });

    it('toggling theme button applies light-mode', () => {
        const btn = document.getElementById('themeBtn');
        btn.click();
        expect(document.body.classList.contains('light-mode')).toBe(true);
    });

    it('toggling twice returns to dark mode', () => {
        const btn = document.getElementById('themeBtn');
        btn.click();
        btn.click();
        expect(document.body.classList.contains('light-mode')).toBe(false);
    });

    it('saves theme preference to localStorage', () => {
        const btn = document.getElementById('themeBtn');
        btn.click();
        expect(window.localStorage.setItem).toHaveBeenCalledWith('theme_series', 'light');
    });
});

// ==================== Keyboard navigation ====================

describe('Keyboard shortcuts', () => {
    beforeEach(() => loadApp());

    it('Escape closes player when active', () => {
        const overlay = document.getElementById('playerOverlay');
        overlay.classList.add('active');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(overlay.classList.contains('active')).toBe(false);
    });

    it('Escape closes modal when active and player is not', () => {
        const modal = document.getElementById('modalOverlay');
        modal.classList.add('active');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(modal.classList.contains('active')).toBe(false);
    });

    it('Escape closes cart when active and neither player nor modal', () => {
        window.toggleCart(true);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(document.getElementById('cartDrawer').classList.contains('active')).toBe(false);
    });
});

// ==================== Error handling ====================

describe('Error handling on init', () => {
    it('shows error message when fetch fails', async () => {
        global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        // Let the rejected promise propagate
        await Promise.resolve();
        await Promise.resolve();

        const title = document.getElementById('heroTitle');
        expect(title.textContent).toBe('Erro de Conexão');
    });
});

// ==================== Player ====================

describe('closePlayer', () => {
    beforeEach(() => loadApp());

    it('removes active class from player overlay', () => {
        const overlay = document.getElementById('playerOverlay');
        overlay.classList.add('active');
        // Trigger close via keyboard (Escape)
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(overlay.classList.contains('active')).toBe(false);
    });

    it('hides player error', () => {
        const error = document.getElementById('playerError');
        error.classList.add('active');
        const overlay = document.getElementById('playerOverlay');
        overlay.classList.add('active');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(error.classList.contains('active')).toBe(false);
    });
});

// ==================== Cart UI ====================

describe('Cart UI integration', () => {
    beforeEach(() => loadApp());

    it('shows empty cart message', () => {
        window.toggleCart(true);
        const items = document.getElementById('cartItems');
        expect(items.innerHTML).toContain('vazio');
    });

    it('updates badge count after adding item', () => {
        const serie = { id: 10, title: 'Cart Item', price: 25, description: 'x' };
        window.openModal(serie);
        document.getElementById('modalActions').querySelector('button').click();

        const badge = document.getElementById('cartBadge');
        expect(badge.textContent).toBe('1');
        expect(badge.style.display).toBe('flex');
    });

    it('shows item in cart after adding', () => {
        const serie = { id: 11, title: 'In Cart', price: 30, description: 'x' };
        window.openModal(serie);
        document.getElementById('modalActions').querySelector('button').click();

        window.toggleCart(true);
        const items = document.getElementById('cartItems');
        expect(items.innerHTML).toContain('In Cart');
    });

    it('updates total price', () => {
        const serie = { id: 12, title: 'Priced', price: 45, description: 'x' };
        window.openModal(serie);
        document.getElementById('modalActions').querySelector('button').click();

        const total = document.getElementById('cartTotal');
        expect(total.textContent).toMatch(/45/);
    });

    it('prevents duplicate items', () => {
        const serie = { id: 13, title: 'Dup', price: 10, description: 'x' };
        // Add once
        window.openModal(serie);
        document.getElementById('modalActions').querySelector('button').click();
        // Try to add again
        window.openModal(serie);
        document.getElementById('modalActions').querySelector('button').click();

        const badge = document.getElementById('cartBadge');
        expect(badge.textContent).toBe('1');
    });

    it('remove button removes item from cart', () => {
        const serie = { id: 14, title: 'Remove Me', price: 10, description: 'x' };
        window.openModal(serie);
        document.getElementById('modalActions').querySelector('button').click();

        window.toggleCart(true);
        const removeBtn = document.getElementById('cartItems').querySelector('.cart-item-remove');
        removeBtn.click();

        expect(document.getElementById('cartBadge').textContent).toBe('0');
    });
});

// ==================== openPlayer ====================

describe('openPlayer (via free card click)', () => {
    beforeEach(() => {
        global.fetch = jest.fn()
            // First call: init() fetches series list
            .mockResolvedValueOnce({
                ok: true, status: 200,
                json: () => Promise.resolve([
                    { id: 1, title: 'Free Player Test', price: 0, category: 'Drama' }
                ]),
                text: () => Promise.resolve('')
            })
            // Second call: openPlayer fetches stream URL
            .mockResolvedValueOnce({
                ok: true, status: 200,
                json: () => Promise.resolve({ url: 'https://example.com/video.mp4' }),
                text: () => Promise.resolve('')
            });
        loadApp();
    });

    it('opens player overlay when free card is clicked', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const grid = document.getElementById('catalogGrid');
        const card = grid.children[0];
        card.click();

        await jest.advanceTimersByTimeAsync(200);
        await Promise.resolve();
        await Promise.resolve();

        const overlay = document.getElementById('playerOverlay');
        expect(overlay.classList.contains('active')).toBe(true);
    });

    it('sets video src when stream URL is returned', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const grid = document.getElementById('catalogGrid');
        grid.children[0].click();

        await jest.advanceTimersByTimeAsync(200);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        const video = document.getElementById('mainVideo');
        expect(video.getAttribute('src')).toBe('https://example.com/video.mp4');
    });

    it('sets player title', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const grid = document.getElementById('catalogGrid');
        grid.children[0].click();

        await jest.advanceTimersByTimeAsync(200);
        await Promise.resolve();

        expect(document.getElementById('playerTitle').textContent).toBe('Free Player Test');
    });

    it('sets watermark with user id', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const grid = document.getElementById('catalogGrid');
        grid.children[0].click();

        await jest.advanceTimersByTimeAsync(200);
        await Promise.resolve();

        expect(document.getElementById('watermarkId').textContent).toBe('test-user-123');
    });
});

describe('openPlayer error handling', () => {
    it('shows player error when stream fetch fails', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true, status: 200,
                json: () => Promise.resolve([
                    { id: 1, title: 'Fail Test', price: 0 }
                ]),
                text: () => Promise.resolve('')
            })
            .mockRejectedValueOnce(new Error('Network error'));
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        document.getElementById('catalogGrid').children[0].click();

        await jest.advanceTimersByTimeAsync(200);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(document.getElementById('playerError').classList.contains('active')).toBe(true);
    });

    it('shows error when response has error field instead of url', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true, status: 200,
                json: () => Promise.resolve([
                    { id: 1, title: 'ErrorField', price: 0 }
                ]),
                text: () => Promise.resolve('')
            })
            .mockResolvedValueOnce({
                ok: true, status: 200,
                json: () => Promise.resolve({ error: 'Not authorized' }),
                text: () => Promise.resolve('')
            });
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        document.getElementById('catalogGrid').children[0].click();

        await jest.advanceTimersByTimeAsync(200);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(document.getElementById('playerError').classList.contains('active')).toBe(true);
    });

    it('shows error when response has no url field', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true, status: 200,
                json: () => Promise.resolve([
                    { id: 1, title: 'NoUrl', price: 0 }
                ]),
                text: () => Promise.resolve('')
            })
            .mockResolvedValueOnce({
                ok: true, status: 200,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve('')
            });
        loadApp();

        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        document.getElementById('catalogGrid').children[0].click();

        await jest.advanceTimersByTimeAsync(200);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(document.getElementById('playerError').classList.contains('active')).toBe(true);
    });
});

// ==================== retryPlayer ====================

describe('retryPlayer', () => {
    beforeEach(() => loadApp());

    it('is exposed on window', () => {
        expect(typeof window.retryPlayer).toBe('function');
    });
});

// ==================== Card keyboard events ====================

describe('Card keyboard interaction', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([
                { id: 1, title: 'KeySerie', price: 10, category: 'Drama' }
            ]),
            text: () => Promise.resolve('')
        }));
        loadApp();
    });

    it('opens modal on Enter keypress', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const card = document.getElementById('catalogGrid').children[0];
        card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(document.getElementById('modalOverlay').classList.contains('active')).toBe(true);
    });

    it('opens modal on Space keypress', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const card = document.getElementById('catalogGrid').children[0];
        card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

        expect(document.getElementById('modalOverlay').classList.contains('active')).toBe(true);
    });

    it('does not open modal on other keys', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const card = document.getElementById('catalogGrid').children[0];
        card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

        expect(document.getElementById('modalOverlay').classList.contains('active')).toBe(false);
    });
});

// ==================== Toast lifecycle ====================

describe('Toast lifecycle', () => {
    beforeEach(() => loadApp());

    it('toast is removed after timeout', () => {
        // Trigger a toast via checkout with empty cart
        window.checkout();

        const container = document.getElementById('toastContainer');
        expect(container.children.length).toBeGreaterThanOrEqual(1);

        // Advance past the 4s show time + 500ms removal
        jest.advanceTimersByTime(4600);

        expect(container.children.length).toBe(0);
    });
});

// ==================== Scroll header ====================

describe('Header scroll behavior', () => {
    beforeEach(() => loadApp());

    it('adds scrolled class when scrollY > 50', () => {
        Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.getElementById('header').classList.contains('scrolled')).toBe(true);
    });

    it('removes scrolled class when scrollY <= 50', () => {
        Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        Object.defineProperty(window, 'scrollY', { value: 10, writable: true, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.getElementById('header').classList.contains('scrolled')).toBe(false);
    });
});

// ==================== Category chips ====================

describe('Category chip filtering', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([
                { id: 1, title: 'Romance A', price: 5, category: 'Romance' },
                { id: 2, title: 'Drama B', price: 10, category: 'Drama' },
                { id: 3, title: 'Romance C', price: 0, category: 'Romance' }
            ]),
            text: () => Promise.resolve('')
        }));
        loadApp();
    });

    it('clicking "Todas" chip shows all series', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const chips = document.querySelectorAll('.category-chip');
        chips[0].click(); // "Todas"

        const grid = document.getElementById('catalogGrid');
        expect(grid.children.length).toBe(3);
    });

    it('clicking category chip filters series', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const chips = document.querySelectorAll('.category-chip');
        chips[1].click(); // "Romance"

        const grid = document.getElementById('catalogGrid');
        expect(grid.children.length).toBe(2);
    });

    it('sets active class on clicked chip', async () => {
        await jest.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        const chips = document.querySelectorAll('.category-chip');
        chips[1].click();

        expect(chips[1].classList.contains('active')).toBe(true);
        expect(chips[0].classList.contains('active')).toBe(false);
    });
});
