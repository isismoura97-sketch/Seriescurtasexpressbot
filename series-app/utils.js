'use strict';

/**
 * Séries Curtas Express - Utility Functions
 * Extracted for testability and reuse.
 */

var SUPABASE_PROJECT_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co';
var DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFBMjc0NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNGRkQ3MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TZW0gQ2FwYTwvdGV4dD48L3N2Zz4=';

function formatPrice(price) {
    var numPrice = Number(price);
    if (numPrice === 0 || price === null || price === undefined || isNaN(numPrice)) return 'GRÁTIS';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numPrice);
}

function escapeHtml(text) {
    if (text == null) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCoverUrl(serie) {
    if (!serie) return '';

    if (serie.cover_url && serie.cover_url !== 'null' && serie.cover_url !== null) {
        return serie.cover_url;
    }

    if (serie.cover_storage_path && serie.cover_storage_path !== 'null') {
        return SUPABASE_PROJECT_URL + '/storage/v1/object/public/covers/' + serie.cover_storage_path;
    }

    if (serie.cover_path && serie.cover_path !== 'null') {
        return SUPABASE_PROJECT_URL + '/storage/v1/object/public/covers/' + serie.cover_path;
    }

    return DEFAULT_PLACEHOLDER;
}

function isFreePrice(price) {
    return Number(price) === 0 || price === null || price === undefined;
}

function filterByCategory(series, category) {
    if (category === 'all') return series;
    return series.filter(function (s) {
        return s.category && s.category.toLowerCase() === category;
    });
}

function searchByTitle(series, term) {
    if (!term) return series;
    return series.filter(function (s) {
        return s.title && s.title.toLowerCase().includes(term.toLowerCase());
    });
}

function calculateCartTotal(cart) {
    return cart.reduce(function (sum, item) {
        return sum + (parseFloat(item.price) || 0);
    }, 0);
}

function canAddToCart(cart, serie) {
    if (!serie) return false;
    return !cart.some(function (item) { return item.id === serie.id; });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatPrice: formatPrice,
        escapeHtml: escapeHtml,
        getCoverUrl: getCoverUrl,
        isFreePrice: isFreePrice,
        filterByCategory: filterByCategory,
        searchByTitle: searchByTitle,
        calculateCartTotal: calculateCartTotal,
        canAddToCart: canAddToCart,
        SUPABASE_PROJECT_URL: SUPABASE_PROJECT_URL,
        DEFAULT_PLACEHOLDER: DEFAULT_PLACEHOLDER
    };
}
