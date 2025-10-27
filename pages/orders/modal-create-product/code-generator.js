// pages/orders/modal-create-product/code-generator.js

import { normalizeVietnamese } from '../../../shared/utils/text-utils.js';
import { tposRequest } from '../../../shared/api/tpos-api.js';
import { productSuggestions, orders } from '../state.js';

/**
 * Checks if a product code is available on the TPOS server.
 * @param {string} code - The product code to check.
 * @returns {Promise<boolean>} True if the code is available, false otherwise.
 */
async function isCodeAvailableOnTPOS(code) {
    try {
        const response = await tposRequest(`/ProductTemplate/OdataService.GetViewV2?Active=true&DefaultCode=${code}`);
        return response && Array.isArray(response.value) && response.value.length === 0;
    } catch (error) {
        console.error(`Error checking code ${code} on TPOS:`, error);
        // Assume it's not available if there's an error to be safe
        return false;
    }
}

/**
 * Generates a new, unique product code based on the product name and verifies it against local data and TPOS.
 * @param {string} productName - The name of the product.
 * @param {HTMLElement} currentRow - The current table row being edited.
 * @returns {Promise<string|null>} A unique product code or null if an error occurs.
 */
export async function generateAndVerifyProductCode(productName, currentRow) {
    if (!productName) return null;

    // 1. Gather all existing codes from all sources
    const allKnownCodes = new Set();

    // a. Get codes from other rows in the "Create New Product" modal
    const modalRows = document.querySelectorAll('#newProductList tr');
    modalRows.forEach(row => {
        const codeInput = row.querySelector('input[placeholder="Mã SP"]');
        if (codeInput && codeInput.value && !codeInput.value.includes('Đang tạo')) {
            allKnownCodes.add(codeInput.value.toUpperCase());
        }
    });

    // b. Get codes from the main orders list (orders.json)
    orders.forEach(order => {
        if (order.productCode) {
            allKnownCodes.add(order.productCode.toUpperCase());
        }
    });

    // c. Get codes from product suggestions
    productSuggestions.forEach(p => {
        if (p.code) {
            allKnownCodes.add(p.code.toUpperCase());
        }
    });

    // 2. Determine prefix ('N' or 'P')
    const normalizedName = normalizeVietnamese(productName);
    const keywords = ['ao', 'quan', 'giay', 'non', 'dam', 'set', 'vay'];
    const prefix = keywords.some(k => normalizedName.includes(k)) ? 'N' : 'P';

    // 3. Find the max number from ALL known codes with the same prefix
    const relevantCodes = [...allKnownCodes].filter(code => code.startsWith(prefix));
    const numbers = relevantCodes.map(code => {
        const match = code.substring(1).match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : NaN;
    }).filter(n => !isNaN(n));
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    let baseNumber = maxNumber + 1;

    // 4. Generate and verify uniqueness, trying letters if base number is taken
    let finalCode = '';
    let attempts = 0;
    const maxAttempts = 500; // Safety break

    while (!finalCode && attempts < maxAttempts) {
        const baseCode = `${prefix}${baseNumber}`;
        
        // Check 1: Is base code available? (local + TPOS)
        let isAvailable = !(allKnownCodes.has(baseCode.toUpperCase())) && await isCodeAvailableOnTPOS(baseCode);

        if (isAvailable) {
            finalCode = baseCode;
            break; // Found a unique code
        }

        // Check 2: If base code is taken, try appending letters (A-Z)
        let suffixCharCode = 'A'.charCodeAt(0);
        for (let i = 0; i < 26; i++) {
            const potentialCodeWithLetter = `${baseCode}${String.fromCharCode(suffixCharCode + i)}`;
            isAvailable = !(allKnownCodes.has(potentialCodeWithLetter.toUpperCase())) && await isCodeAvailableOnTPOS(potentialCodeWithLetter);
            if (isAvailable) {
                finalCode = potentialCodeWithLetter;
                break; // Found a unique code
            }
        }

        if (!finalCode) {
            // If we exhausted all letters for this base number, increment the number and try again in the next loop iteration
            baseNumber++;
        }
        
        attempts++;
    }

    if (!finalCode) {
        throw new Error("Không thể tìm thấy mã sản phẩm duy nhất sau nhiều lần thử.");
    }

    return finalCode;
}