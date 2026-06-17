/**
 * Séries Curtas Express - Main Application
 * Features: Player protegido, carrinho de compras, catálogo dinâmico
 * Segurança: Sem inline handlers, ARIA roles, focus management
 */

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Fetch with timeout and error handling
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format');
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw err;
  }
}

/**
 * Format currency using Intl.NumberFormat
 */
function formatPrice(price) {
  if (price === 0 || price == 0) return 'GRÁTIS';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(price) || 0);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = {
    success: '<i class="fas fa-check-circle"></i>',
    error: '<i class="fas fa-times-circle"></i>',
    info: '<i class="fas fa-info-circle"></i>'
  }[type] || '<i class="fas fa-info-circle"></i>';

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  const timeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);

  toast.addEventListener('mouseenter', () => clearTimeout(timeout));
  toast.addEventListener('mouseleave', () => {
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  });
}

/**
 * Focus trap for modals
 */
function createFocusTrap(element) {
  const focusableElements = element.querySelectorAll(
    'a, button, input, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return null;

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];

  const handler = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  element.addEventListener('keydown', handler);
  return () => element.removeEventListener('keydown', handler);
}

// ============================================================================
// CONFIGURATION & STATE
// ============================================================================

const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// API Configuration
const API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado';
const userId = tg?.initDataUnsafe?.user?.id || 'anonymous';

// Global state
let allSeries = [];
let cart = JSON.parse(localStorage.getItem('cart_series')) || [];
let currentHero = 0;
let currentModalSeries = null;
let heroInterval = null;
let playerRetryData = null;
let currentFocusTrap = null;
let savedFocus = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', init);

async function init() {
  applyTheme();
  await loadSeries();
  updateCartUI();
  setupEventListeners();
}

function setupEventListeners() {
  // Header scroll effect
  window.addEventListener('scroll', () => {
    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 50);
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePlayer();
      closeModal();
      toggleCart(false);
    }
  });

  // Theme toggle
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Cart toggle
  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => toggleCart(true));
  }

  // Cart overlay close
  const cartOverlay = document.getElementById('cartOverlay');
  if (cartOverlay) {
    cartOverlay.addEventListener('click', () => toggleCart(false));
  }

  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchSeries(e.target.value);
    });
  }

  // Category filters
  const categoryChips = document.querySelectorAll('.category-chip');
  categoryChips.forEach((chip, index) => {
    chip.addEventListener('click', () => {
      const category = index === 0 ? 'all' : chip.textContent.toLowerCase().trim();
      filterCategory(category, chip);
    });
  });

  // Modal overlay close
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') closeModal();
    });
  }

  // Modal close button
  const modalCloseBtn = document.querySelector('.modal-close');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  // Player controls
  const playerBackBtn = document.querySelector('.player-back');
  if (playerBackBtn) {
    playerBackBtn.addEventListener('click', closePlayer);
  }

  const playerCloseBtn = document.querySelector('.player-close');
  if (playerCloseBtn) {
    playerCloseBtn.addEventListener('click', closePlayer);
  }

  // Player error buttons
  const retryBtn = document.querySelector('.player-error .btn-primary');
  const testBtn = document.querySelector('.player-error .btn-free');
  if (retryBtn) retryBtn.addEventListener('click', retryPlayer);
  if (testBtn) testBtn.addEventListener('click', loadTestVideo);

  // Cart checkout
  const checkoutBtn = document.querySelector('.btn-cart');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', checkout);
  }

  // Cart close button
  const cartCloseBtn = document.querySelector('.cart-drawer .icon-btn');
  if (cartCloseBtn) {
    cartCloseBtn.addEventListener('click', () => toggleCart(false));
  }

  // Hero explore button - create if not exists
  const heroSection = document.querySelector('.hero-content > div:last-of-type');
  if (heroSection && !heroSection.querySelector('button:first-child')) {
    const exploreBtn = createExploreButton();
    heroSection.insertBefore(exploreBtn, heroSection.firstChild);
  }

  // Prevent video context menu
  const video = document.getElementById('mainVideo');
  if (video) {
    video.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
  }
}

// ============================================================================
// THEME
// ============================================================================

function applyTheme() {
  if (localStorage.getItem('theme_series') === 'light') {
    document.body.classList.add('light-mode');
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) themeIcon.className = 'fas fa-sun';
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
  }
  localStorage.setItem('theme_series', isLight ? 'light' : 'dark');
  showToast(isLight ? 'Tema claro ativado' : 'Tema escuro ativado', 'success');
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadSeries() {
  try {
    const data = await fetchWithTimeout(`${API_URL}/api/series`, {}, 15000);
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format');
    }

    allSeries = data;
    renderGrid(allSeries);
    initHero();
    renderNetflixRow(allSeries);
  } catch (err) {
    console.error('Error loading series:', err);
    showToast('Erro ao carregar catálogo: ' + err.message, 'error');
  }
}

// ============================================================================
// HERO SLIDESHOW
// ============================================================================

function initHero() {
  if (!allSeries.length) return;

  updateHero(0);
  clearInterval(heroInterval);
  heroInterval = setInterval(() => {
    currentHero = (currentHero + 1) % allSeries.length;
    updateHero(currentHero);
  }, 6000);
}

function updateHero(index) {
  const serie = allSeries[index];
  if (!serie) return;

  document.getElementById('heroTitle').textContent = serie.title || 'Carregando...';
  document.getElementById('heroDesc').textContent = 
    serie.description || 'Uma história emocionante...';

  const img = document.getElementById('heroImg');
  img.src = serie.cover_url;
  img.alt = serie.title || 'Poster';

  const badge = document.getElementById('heroBadge');
  if (serie.price == 0) {
    badge.className = 'hero-badge-free';
    badge.innerHTML = '<i class="fas fa-gift" aria-hidden="true"></i> GRÁTIS';
  } else {
    badge.className = 'hero-badge';
    badge.innerHTML = '<i class="fas fa-fire" aria-hidden="true"></i> Destaque da Semana';
  }

  const playBtn = document.getElementById('heroPlayBtn');
  if (playBtn) {
    playBtn.style.display = 'inline-flex';
    playBtn.onclick = null;
    playBtn.removeEventListener('click', playHero);
    playBtn.addEventListener('click', () => {
      if (serie.price == 0) {
        openPlayer(serie.id, serie.title);
      } else {
        openModal(serie);
      }
    });
  }
}

function createExploreButton() {
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.innerHTML = '<i class="fas fa-list" aria-hidden="true"></i> Explorar';
  btn.addEventListener('click', scrollToCatalog);
  return btn;
}

function scrollToCatalog() {
  document.getElementById('catalogSection')?.scrollIntoView({ 
    behavior: 'smooth' 
  });
}

// ============================================================================
// NETFLIX ROW (HORIZONTAL SCROLL)
// ============================================================================

function renderNetflixRow(series) {
  const container = document.getElementById('netflixScroll');
  const section = document.getElementById('netflixRow');
  
  if (!series.length || !container) return;

  section.style.display = 'block';
  container.innerHTML = '';

  series.slice(0, 10).forEach((s) => {
    const isFree = s.price == 0;
    const card = document.createElement('div');
    card.className = 'netflix-card';
    card.tabIndex = 0;

    // Badge
    if (isFree) {
      const badge = document.createElement('div');
      badge.className = 'badge-gratis-landscape';
      badge.innerHTML = '<i class="fas fa-gift" aria-hidden="true"></i> GRÁTIS';
      card.appendChild(badge);
    }

    // Image
    const img = document.createElement('img');
    img.src = s.cover_url;
    img.alt = s.title;
    img.loading = 'lazy';
    img.onerror = () => (img.style.opacity = '0.5');
    card.appendChild(img);

    // Info
    const info = document.createElement('div');
    info.className = 'netflix-info';
    const title = document.createElement('div');
    title.className = 'netflix-title';
    title.textContent = s.title;
    info.appendChild(title);
    card.appendChild(info);

    // Click handler
    card.addEventListener('click', () => {
      if (isFree) {
        openPlayer(s.id, s.title);
      } else {
        openModal(s);
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });

    container.appendChild(card);
  });
}

// ============================================================================
// VIDEO PLAYER
// ============================================================================

async function openPlayer(serieId, title) {
  playerRetryData = { id: serieId, title };

  const overlay = document.getElementById('playerOverlay');
  const loading = document.getElementById('playerLoading');
  const video = document.getElementById('mainVideo');
  const errorState = document.getElementById('playerError');
  const playerTitle = document.getElementById('playerTitle');

  overlay.classList.add('active');
  loading.style.display = 'flex';
  errorState.classList.remove('active');
  video.style.display = 'none';
  playerTitle.textContent = title || 'Carregando...';
  document.getElementById('watermarkId').textContent = userId;

  // Save focus for restoration
  savedFocus = document.activeElement;

  // Set focus to player close button
  setTimeout(() => document.querySelector('.player-close')?.focus(), 100);

  try {
    const url = new URL(`${API_URL}/api/stream/${serieId}`);
    url.searchParams.set('user_id', userId);

    const data = await fetchWithTimeout(url.toString(), {}, 15000);

    if (data.error) {
      showToast(data.error, 'error');
      showPlayerError();
      return;
    }

    if (data.type === 'telegram') {
      showToast('Abrindo no Telegram...', 'info');
      tg?.sendData?.(JSON.stringify({ 
        action: 'request_video', 
        series_id: serieId 
      }));
      setTimeout(() => {
        closePlayer();
        tg?.close?.();
      }, 1500);
      return;
    }

    // Set video source
    if (data.url && typeof data.url === 'string') {
      video.src = data.url;

      video.oncanplay = () => {
        loading.style.display = 'none';
        video.style.display = 'block';
        video.play().catch((e) => {
          console.log('Autoplay blocked:', e);
        });
      };

      video.onerror = () => {
        showToast('Erro ao carregar vídeo', 'error');
        showPlayerError();
      };
    } else {
      throw new Error('Invalid stream URL');
    }

    // Session timeout warning
    setTimeout(() => {
      if (overlay.classList.contains('active') && 
          loading.style.display !== 'none') {
        showToast('Sessão expirando em breve', 'info');
      }
    }, 1740000);
  } catch (err) {
    console.error('Player error:', err);
    showToast('Erro de conexão: ' + err.message, 'error');
    showPlayerError();
  }
}

function showPlayerError() {
  document.getElementById('playerLoading').style.display = 'none';
  document.getElementById('playerError').classList.add('active');
  document.getElementById('mainVideo').style.display = 'none';
}

function retryPlayer() {
  if (playerRetryData) {
    document.getElementById('playerError').classList.remove('active');
    openPlayer(playerRetryData.id, playerRetryData.title);
  }
}

function loadTestVideo() {
  const video = document.getElementById('mainVideo');
  const loading = document.getElementById('playerLoading');
  const errorState = document.getElementById('playerError');

  video.src = 'https://test-streams.mux.dev/x264_720p_1500kbps_30fps.mp4';
  loading.style.display = 'none';
  errorState.classList.remove('active');
  video.style.display = 'block';

  video.oncanplay = () => {
    video.play().catch((e) => console.log('Autoplay:', e));
  };

  showToast('Vídeo de teste carregado', 'success');
}

function closePlayer() {
  const overlay = document.getElementById('playerOverlay');
  const video = document.getElementById('mainVideo');
  const loading = document.getElementById('playerLoading');
  const errorState = document.getElementById('playerError');

  video.pause();
  video.src = '';
  video.load();
  video.style.display = 'none';
  loading.style.display = 'flex';
  errorState.classList.remove('active');
  overlay.classList.remove('active');

  // Restore focus
  if (savedFocus) {
    savedFocus.focus();
    savedFocus = null;
  }
}

// ============================================================================
// CART
// ============================================================================

function toggleCart(open) {
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');

  if (open === undefined) {
    open = !drawer?.classList.contains('active');
  }

  if (open) {
    overlay?.classList.add('active');
    drawer?.classList.add('active');
    document.body.classList.add('modal-open');
    savedFocus = document.activeElement;
    setTimeout(() => {
      const closeBtn = drawer?.querySelector('.icon-btn');
      closeBtn?.focus();
    }, 100);
  } else {
    overlay?.classList.remove('active');
    drawer?.classList.remove('active');
    document.body.classList.remove('modal-open');
    if (savedFocus) {
      savedFocus.focus();
      savedFocus = null;
    }
  }
}

function addToCart(serie) {
  if (!serie || !serie.id) {
    showToast('Dados inválidos', 'error');
    return;
  }

  if (cart.some((item) => item.id === serie.id)) {
    showToast('Já está no carrinho!', 'error');
    return;
  }

  cart.push(serie);
  localStorage.setItem('cart_series', JSON.stringify(cart));
  updateCartUI();
  showToast('Adicionado ao carrinho!', 'success');
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  localStorage.setItem('cart_series', JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const container = document.getElementById('cartItems');
  const badge = document.getElementById('cartBadge');
  const totalEl = document.getElementById('cartTotal');

  if (!container || !badge || !totalEl) return;

  badge.textContent = cart.length;
  badge.style.display = cart.length > 0 ? 'flex' : 'none';

  let total = 0;

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--gray);">
        <i class="fas fa-shopping-basket" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;" aria-hidden="true"></i>
        <p>Seu carrinho está vazio</p>
        <p style="font-size: 14px; margin-top: 10px;">Adicione séries para começar!</p>
      </div>
    `;
  } else {
    container.innerHTML = '';
    cart.forEach((item) => {
      total += parseFloat(item.price) || 0;

      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';

      const img = document.createElement('img');
      img.src = item.cover_url;
      img.alt = item.title;
      img.onerror = () => 
        (img.src = 'https://placehold.co/60x90?text=Sem+Capa');

      const info = document.createElement('div');
      info.className = 'cart-item-info';

      const titleEl = document.createElement('div');
      titleEl.className = 'cart-item-title';
      titleEl.textContent = item.title;

      const priceEl = document.createElement('div');
      priceEl.className = 'cart-item-price';
      priceEl.textContent = formatPrice(item.price);

      info.appendChild(titleEl);
      info.appendChild(priceEl);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'cart-item-remove';
      removeBtn.setAttribute('aria-label', `Remover ${item.title}`);
      removeBtn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i>';
      removeBtn.addEventListener('click', () => removeFromCart(item.id));

      cartItem.appendChild(img);
      cartItem.appendChild(info);
      cartItem.appendChild(removeBtn);
      container.appendChild(cartItem);
    });
  }

  totalEl.textContent = total === 0 ? 'Grátis' : formatPrice(total);
}

function checkout() {
  if (cart.length === 0) {
    showToast('Carrinho vazio!', 'error');
    return;
  }

  const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

  tg?.sendData?.(JSON.stringify({
    action: 'checkout_cart',
    items: cart.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price
    })),
    total: total,
    user_id: userId
  }));

  showToast('Finalizando compra...', 'success');

  setTimeout(() => {
    cart = [];
    localStorage.setItem('cart_series', JSON.stringify(cart));
    updateCartUI();
    toggleCart(false);
    tg?.close?.();
  }, 1000);
}

// ============================================================================
// MODAL
// ============================================================================

function openModal(serie) {
  if (!serie || !serie.id) {
    showToast('Série não encontrada', 'error');
    return;
  }

  currentModalSeries = serie;

  const modal = document.getElementById('modalOverlay');
  const img = document.getElementById('modalImg');
  const title = document.getElementById('modalTitle');
  const desc = document.getElementById('modalDesc');
  const priceEl = document.getElementById('modalPrice');
  const actionsDiv = document.getElementById('modalActions');

  if (!modal || !img || !title || !desc || !priceEl || !actionsDiv) return;

  img.src = serie.cover_url;
  img.alt = serie.title;
  title.textContent = serie.title;
  desc.textContent = serie.description || 'Sem descrição disponível.';

  actionsDiv.innerHTML = '';

  if (serie.price == 0) {
    priceEl.className = 'modal-price free';
    priceEl.innerHTML = 
      '<span class="free-badge"><i class="fas fa-gift" aria-hidden="true"></i> GRÁTIS</span>';

    const watchBtn = document.createElement('button');
    watchBtn.className = 'btn btn-free';
    watchBtn.style.width = '100%';
    watchBtn.style.padding = '18px';
    watchBtn.style.fontSize = '18px';
    watchBtn.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i> ASSISTIR AGORA';
    watchBtn.addEventListener('click', () => {
      closeModal();
      openPlayer(serie.id, serie.title);
    });
    actionsDiv.appendChild(watchBtn);
  } else {
    priceEl.className = 'modal-price';
    priceEl.innerHTML = `<span>${formatPrice(serie.price)}</span>`;

    const cartBtn = document.createElement('button');
    cartBtn.className = 'btn btn-play';
    cartBtn.style.flex = '1';
    cartBtn.innerHTML = '<i class="fas fa-cart-plus" aria-hidden="true"></i> Adicionar';
    cartBtn.addEventListener('click', () => {
      addToCart(serie);
      closeModal();
    });

    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn btn-primary';
    buyBtn.style.flex = '1';
    buyBtn.innerHTML = '<i class="fas fa-shopping-bag" aria-hidden="true"></i> Comprar';
    buyBtn.addEventListener('click', () => {
      tg?.sendData?.(JSON.stringify({
        action: 'buy',
        series_id: serie.id,
        title: serie.title,
        price: serie.price
      }));
      tg?.close?.();
    });

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.appendChild(cartBtn);
    row.appendChild(buyBtn);
    actionsDiv.appendChild(row);
  }

  modal.classList.add('active');
  document.body.classList.add('modal-open');

  // Focus management
  savedFocus = document.activeElement;
  setTimeout(() => {
    document.querySelector('.modal-close')?.focus();
  }, 100);

  // Create focus trap
  if (currentFocusTrap) currentFocusTrap();
  currentFocusTrap = createFocusTrap(modal);
}

function closeModal(e) {
  if (e && e.target?.id !== 'modalOverlay') return;

  const modal = document.getElementById('modalOverlay');
  modal?.classList.remove('active');
  document.body.classList.remove('modal-open');

  if (currentFocusTrap) {
    currentFocusTrap();
    currentFocusTrap = null;
  }

  if (savedFocus) {
    savedFocus.focus();
    savedFocus = null;
  }
}

// ============================================================================
// CATALOG GRID
// ============================================================================

function renderGrid(series) {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  grid.innerHTML = '';

  series.forEach((s) => {
    const isFree = s.price == 0;
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    // Badge
    if (isFree) {
      const badge = document.createElement('div');
      badge.className = 'badge-gratis';
      badge.innerHTML = '<i class="fas fa-gift" aria-hidden="true"></i> GRÁTIS';
      card.appendChild(badge);
    } else {
      const priceTag = document.createElement('span');
      priceTag.className = `price-tag ${isFree ? 'free' : ''}`;
      priceTag.textContent = formatPrice(s.price);
      card.appendChild(priceTag);
    }

    // Image
    const img = document.createElement('img');
    img.src = s.cover_url;
    img.alt = s.title;
    img.loading = 'lazy';
    img.onerror = () => (img.style.opacity = '0.5');
    card.appendChild(img);

    // Info
    const info = document.createElement('div');
    info.className = 'card-info';
    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = s.title;
    info.appendChild(titleEl);
    card.appendChild(info);

    // Click handler
    const handleClick = () => {
      if (isFree) {
        openPlayer(s.id, s.title);
      } else {
        openModal(s);
      }
    };

    card.addEventListener('click', handleClick);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    });

    grid.appendChild(card);
  });
}

function filterCategory(cat, el) {
  document.querySelectorAll('.category-chip').forEach((c) => {
    c.classList.remove('active');
  });
  el?.classList.add('active');

  const filtered = cat === 'all' 
    ? allSeries 
    : allSeries.filter((s) => 
        s.category && s.category.toLowerCase() === cat.toLowerCase()
      );
  renderGrid(filtered);
}

function searchSeries(term) {
  const filtered = term
    ? allSeries.filter((s) =>
        (s.title || '').toLowerCase().includes(term.toLowerCase())
      )
    : allSeries;
  renderGrid(filtered);
}

// ============================================================================
// EXPORTS FOR GLOBAL SCOPE (for backwards compatibility)
// ============================================================================

window.openPlayer = openPlayer;
window.closePlayer = closePlayer;
window.retryPlayer = retryPlayer;
window.loadTestVideo = loadTestVideo;
window.toggleCart = toggleCart;
window.openModal = openModal;
window.closeModal = closeModal;
window.scrollToCatalog = scrollToCatalog;
window.toggleTheme = toggleTheme;
window.searchSeries = searchSeries;
window.filterCategory = filterCategory;