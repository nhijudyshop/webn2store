// pages/product/suggestions.js

import { normalizeVietnamese } from '../../shared/utils/text-utils.js';

let allProductSuggestions = []; // Cache for product suggestions

/**
 * Loads product suggestions from the server and caches them.
 */
export async function loadProductSuggestions() {
    try {
        const response = await fetch('/api/products/suggestions');
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            allProductSuggestions = result.data;
            console.log(`✅ Loaded ${allProductSuggestions.length} product suggestions.`);
        } else {
            console.error('❌ Failed to load product suggestions:', result.error);
            window.showNotification('Lỗi tải gợi ý sản phẩm', 'error');
        }
    } catch (error) {
        console.error('❌ Error fetching product suggestions:', error);
        window.showNotification('Lỗi kết nối để tải gợi ý sản phẩm', 'error');
    }
}

/**
 * Filters, sorts, and displays product suggestions based on user input.
 * @param {Event} event - The input event from the text field.
 */
export function updateSuggestions(event) {
    const query = event.target.value.trim();
    const datalist = document.getElementById('productSuggestions');
    if (!datalist) return;

    datalist.innerHTML = ''; // Clear previous suggestions

    if (!query) return;

    const normalizedQuery = normalizeVietnamese(query);
    const queryWords = normalizedQuery.split(' ').filter(w => w);

    const filtered = allProductSuggestions.filter(item => {
        const normalizedCode = normalizeVietnamese(item.code || '');
        const normalizedName = normalizeVietnamese(item.name || '');

        // Check code: must contain the full query string
        if (normalizedCode.includes(normalizedQuery)) {
            return true;
        }

        // Check name: must contain all words from the query
        if (queryWords.every(word => normalizedName.includes(word))) {
            return true;
        }

        return false;
    });

    // Sort results for relevance
    filtered.sort((a, b) => {
        const normACode = normalizeVietnamese(a.code || '');
        const normBCode = normalizeVietnamese(b.code || '');
        const normAName = normalizeVietnamese(a.name || '');
        const normBName = normalizeVietnamese(b.name || '');

        // Scoring function for relevance
        const score = (itemCode, itemName) => {
            if (itemCode === normalizedQuery) return 10; // Exact code match
            if (itemCode.startsWith(normalizedQuery)) return 9; // Code starts with query
            if (itemName.startsWith(normalizedQuery)) return 8; // Name starts with query
            if (queryWords.every(word => itemName.includes(word))) return 7; // Name contains all words
            if (itemCode.includes(normalizedQuery)) return 6; // Code contains query
            return 0;
        };

        const scoreA = score(normACode, normAName);
        const scoreB = score(normBCode, normBName);

        if (scoreA !== scoreB) {
            return scoreB - scoreA; // Higher score comes first
        }

        // Fallback sort by name length
        return a.name.length - b.name.length;
    });

    const suggestionsToShow = filtered.slice(0, 50);

    suggestionsToShow.forEach(item => {
        const option = document.createElement('option');
        option.value = item.code;
        option.textContent = `${item.code} - ${item.name}`;
        datalist.appendChild(option);
    });
}