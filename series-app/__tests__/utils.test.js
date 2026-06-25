'use strict';

const {
    formatPrice,
    escapeHtml,
    getCoverUrl,
    isFreePrice,
    filterByCategory,
    searchByTitle,
    calculateCartTotal,
    canAddToCart,
    SUPABASE_PROJECT_URL,
    DEFAULT_PLACEHOLDER
} = require('../utils');

// ---------- formatPrice ----------

describe('formatPrice', () => {
    it('returns GRÁTIS for zero', () => {
        expect(formatPrice(0)).toBe('GRÁTIS');
    });

    it('returns GRÁTIS for null', () => {
        expect(formatPrice(null)).toBe('GRÁTIS');
    });

    it('returns GRÁTIS for undefined', () => {
        expect(formatPrice(undefined)).toBe('GRÁTIS');
    });

    it('returns GRÁTIS for NaN string', () => {
        expect(formatPrice('abc')).toBe('GRÁTIS');
    });

    it('returns GRÁTIS for empty string', () => {
        expect(formatPrice('')).toBe('GRÁTIS');
    });

    it('formats a positive integer price in BRL', () => {
        const result = formatPrice(10);
        expect(result).toMatch(/10/);
        expect(result).toMatch(/R\$/);
    });

    it('formats a decimal price in BRL', () => {
        const result = formatPrice(29.9);
        expect(result).toMatch(/29/);
        expect(result).toMatch(/R\$/);
    });

    it('formats a string number price', () => {
        const result = formatPrice('15.50');
        expect(result).toMatch(/15/);
        expect(result).toMatch(/R\$/);
    });

    it('handles negative price', () => {
        const result = formatPrice(-5);
        expect(result).toMatch(/5/);
    });

    it('returns GRÁTIS for string "0"', () => {
        expect(formatPrice('0')).toBe('GRÁTIS');
    });
});

// ---------- escapeHtml ----------

describe('escapeHtml', () => {
    it('returns empty string for null', () => {
        expect(escapeHtml(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(escapeHtml(undefined)).toBe('');
    });

    it('returns plain text unchanged', () => {
        expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('escapes angle brackets', () => {
        const result = escapeHtml('<script>alert("xss")</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
    });

    it('escapes ampersands', () => {
        expect(escapeHtml('A & B')).toContain('&amp;');
    });

    it('preserves quotes (textContent does not entity-encode them)', () => {
        const result = escapeHtml('"quoted"');
        expect(result).toContain('"quoted"');
    });

    it('handles empty string', () => {
        expect(escapeHtml('')).toBe('');
    });

    it('handles string with only special chars', () => {
        const result = escapeHtml('<>&"');
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
        expect(result).toContain('&amp;');
        // textContent + innerHTML does not entity-encode quotes
        expect(result).toContain('"');
    });
});

// ---------- getCoverUrl ----------

describe('getCoverUrl', () => {
    it('returns empty string for null/undefined serie', () => {
        expect(getCoverUrl(null)).toBe('');
        expect(getCoverUrl(undefined)).toBe('');
    });

    it('returns cover_url when present', () => {
        const serie = { cover_url: 'https://example.com/cover.jpg' };
        expect(getCoverUrl(serie)).toBe('https://example.com/cover.jpg');
    });

    it('ignores cover_url when it is string "null"', () => {
        const serie = { cover_url: 'null', cover_storage_path: 'path/to/cover.jpg' };
        expect(getCoverUrl(serie)).toBe(
            SUPABASE_PROJECT_URL + '/storage/v1/object/public/covers/path/to/cover.jpg'
        );
    });

    it('ignores cover_url when it is actual null', () => {
        const serie = { cover_url: null, cover_path: 'fallback.jpg' };
        expect(getCoverUrl(serie)).toBe(
            SUPABASE_PROJECT_URL + '/storage/v1/object/public/covers/fallback.jpg'
        );
    });

    it('returns storage path URL for cover_storage_path', () => {
        const serie = { cover_storage_path: 'series/cover1.png' };
        expect(getCoverUrl(serie)).toBe(
            SUPABASE_PROJECT_URL + '/storage/v1/object/public/covers/series/cover1.png'
        );
    });

    it('ignores cover_storage_path when it is string "null"', () => {
        const serie = { cover_storage_path: 'null', cover_path: 'alt.jpg' };
        expect(getCoverUrl(serie)).toBe(
            SUPABASE_PROJECT_URL + '/storage/v1/object/public/covers/alt.jpg'
        );
    });

    it('returns cover_path URL as third fallback', () => {
        const serie = { cover_path: 'covers/image.jpg' };
        expect(getCoverUrl(serie)).toBe(
            SUPABASE_PROJECT_URL + '/storage/v1/object/public/covers/covers/image.jpg'
        );
    });

    it('returns placeholder when no cover fields are present', () => {
        const serie = { title: 'No Cover' };
        expect(getCoverUrl(serie)).toBe(DEFAULT_PLACEHOLDER);
    });

    it('returns placeholder for empty object', () => {
        expect(getCoverUrl({})).toBe(DEFAULT_PLACEHOLDER);
    });

    it('prioritizes cover_url over cover_storage_path', () => {
        const serie = {
            cover_url: 'https://cdn.example.com/img.jpg',
            cover_storage_path: 'fallback.png'
        };
        expect(getCoverUrl(serie)).toBe('https://cdn.example.com/img.jpg');
    });

    it('prioritizes cover_storage_path over cover_path', () => {
        const serie = {
            cover_storage_path: 'primary.png',
            cover_path: 'secondary.png'
        };
        expect(getCoverUrl(serie)).toContain('primary.png');
    });
});

// ---------- isFreePrice ----------

describe('isFreePrice', () => {
    it('returns true for 0', () => {
        expect(isFreePrice(0)).toBe(true);
    });

    it('returns true for null', () => {
        expect(isFreePrice(null)).toBe(true);
    });

    it('returns true for undefined', () => {
        expect(isFreePrice(undefined)).toBe(true);
    });

    it('returns true for string "0"', () => {
        expect(isFreePrice('0')).toBe(true);
    });

    it('returns false for positive number', () => {
        expect(isFreePrice(10)).toBe(false);
    });

    it('returns false for string with positive number', () => {
        expect(isFreePrice('29.90')).toBe(false);
    });

    it('returns false for negative number', () => {
        expect(isFreePrice(-5)).toBe(false);
    });
});

// ---------- filterByCategory ----------

describe('filterByCategory', () => {
    const series = [
        { id: 1, title: 'A', category: 'Drama' },
        { id: 2, title: 'B', category: 'Ação' },
        { id: 3, title: 'C', category: 'drama' },
        { id: 4, title: 'D', category: null },
        { id: 5, title: 'E' }
    ];

    it('returns all series when category is "all"', () => {
        expect(filterByCategory(series, 'all')).toEqual(series);
    });

    it('filters by lowercase category match', () => {
        const result = filterByCategory(series, 'drama');
        expect(result).toHaveLength(2);
        expect(result.map(s => s.id)).toEqual([1, 3]);
    });

    it('returns empty array when no match', () => {
        expect(filterByCategory(series, 'terror')).toEqual([]);
    });

    it('handles empty series array', () => {
        expect(filterByCategory([], 'drama')).toEqual([]);
    });

    it('handles series with null category', () => {
        const result = filterByCategory(series, 'null');
        expect(result).toEqual([]);
    });

    it('filters case-insensitively', () => {
        const result = filterByCategory(series, 'ação');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });
});

// ---------- searchByTitle ----------

describe('searchByTitle', () => {
    const series = [
        { id: 1, title: 'Breaking Bad' },
        { id: 2, title: 'Breaking Point' },
        { id: 3, title: 'Game of Thrones' },
        { id: 4, title: null },
        { id: 5 }
    ];

    it('returns all series when term is empty', () => {
        expect(searchByTitle(series, '')).toEqual(series);
    });

    it('returns all series when term is null/undefined', () => {
        expect(searchByTitle(series, null)).toEqual(series);
        expect(searchByTitle(series, undefined)).toEqual(series);
    });

    it('finds series matching term case-insensitively', () => {
        const result = searchByTitle(series, 'breaking');
        expect(result).toHaveLength(2);
    });

    it('finds partial match', () => {
        const result = searchByTitle(series, 'thron');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    it('returns empty array when no match', () => {
        expect(searchByTitle(series, 'xyz')).toEqual([]);
    });

    it('handles empty series array', () => {
        expect(searchByTitle([], 'test')).toEqual([]);
    });

    it('skips series with null/undefined title', () => {
        const result = searchByTitle(series, 'null');
        expect(result).toEqual([]);
    });

    it('is case-insensitive both ways', () => {
        const result = searchByTitle(series, 'GAME');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });
});

// ---------- calculateCartTotal ----------

describe('calculateCartTotal', () => {
    it('returns 0 for empty cart', () => {
        expect(calculateCartTotal([])).toBe(0);
    });

    it('sums prices correctly', () => {
        const cart = [
            { id: 1, price: 10 },
            { id: 2, price: 20 },
            { id: 3, price: 5.5 }
        ];
        expect(calculateCartTotal(cart)).toBeCloseTo(35.5);
    });

    it('handles string prices', () => {
        const cart = [
            { id: 1, price: '15.00' },
            { id: 2, price: '25.50' }
        ];
        expect(calculateCartTotal(cart)).toBeCloseTo(40.5);
    });

    it('treats null/undefined price as 0', () => {
        const cart = [
            { id: 1, price: null },
            { id: 2, price: undefined },
            { id: 3, price: 10 }
        ];
        expect(calculateCartTotal(cart)).toBe(10);
    });

    it('treats invalid price string as 0', () => {
        const cart = [
            { id: 1, price: 'abc' },
            { id: 2, price: 20 }
        ];
        expect(calculateCartTotal(cart)).toBe(20);
    });

    it('handles single item', () => {
        expect(calculateCartTotal([{ id: 1, price: 42 }])).toBe(42);
    });
});

// ---------- canAddToCart ----------

describe('canAddToCart', () => {
    it('returns false for null serie', () => {
        expect(canAddToCart([], null)).toBe(false);
    });

    it('returns false for undefined serie', () => {
        expect(canAddToCart([], undefined)).toBe(false);
    });

    it('returns true when serie is not in cart', () => {
        const cart = [{ id: 1 }, { id: 2 }];
        expect(canAddToCart(cart, { id: 3 })).toBe(true);
    });

    it('returns false when serie is already in cart', () => {
        const cart = [{ id: 1 }, { id: 2 }];
        expect(canAddToCart(cart, { id: 2 })).toBe(false);
    });

    it('returns true for empty cart', () => {
        expect(canAddToCart([], { id: 1 })).toBe(true);
    });

    it('matches by id strictly', () => {
        const cart = [{ id: 1 }];
        expect(canAddToCart(cart, { id: '1' })).toBe(true);
    });
});
