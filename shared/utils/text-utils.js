// shared/utils/text-utils.js

/**
 * Normalizes a Vietnamese string by removing diacritics and converting to lowercase.
 * @param {string} str - The input string.
 * @returns {string} The normalized string.
 */
export function normalizeVietnamese(str) {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}