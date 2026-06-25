'use strict';

/**
 * Séries Curtas Express - Utility Functions
 * Extracted for testability and reuse.
 */

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

function isFreePrice(price) {
    var numPrice = Number(price);
    return numPrice === 0 || price === null || price === undefined || isNaN(numPrice);
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
        isFreePrice: isFreePrice,
        filterByCategory: filterByCategory,
        searchByTitle: searchByTitle,
        calculateCartTotal: calculateCartTotal,
        canAddToCart: canAddToCart
    };
}
