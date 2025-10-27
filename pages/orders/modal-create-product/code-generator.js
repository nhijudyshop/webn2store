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

    // 1. Gather all existing local codes to avoid conflicts
    const localExistingCodes = new Set();

    // a. Get codes from other rows in the "Create New Product" modal
    const modalRows = document.querySelectorAll('#newProductList tr');
    modalRows.forEach(row => {
        if (row !== currentRow) {
            const codeInput = row.querySelector('input[placeholder="Mã SP"]');
            if (codeInput && codeInput.value) {
                localExistingCodes.add(codeInput.value.toUpperCase());
            }
        }
    });

    // b. Get codes from the main orders list (orders.json)
    orders.forEach(order => {
        if (order.productCode) {
            localExistingCodes.add(order.productCode.toUpperCase());
        }
    });

    // 2. Determine prefix ('N' or 'P')
    const normalizedName = normalizeVietnamese(productName);
    const keywords = ['ao', 'quan', 'giay', 'non'];
    const prefix = keywords.some(k => normalizedName.includes(k)) ? 'N' : 'P';

    // 3. Find the max number from local suggestions
    const relevantCodes = productSuggestions.filter(p => p.code && p.code.toUpperCase().startsWith(prefix));
    const numbers = relevantCodes.map(p => parseInt(p.code.substring(1), 10)).filter(n => !isNaN(n));
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    let nextNumber = maxNumber + 1;

    // 4. Verify uniqueness locally and on TPOS, incrementing if necessary
    let uniqueCodeFound = false;
    let finalCode = '';
    let attempts = 0;
    const maxAttempts = 100; // To prevent infinite loops

    while (!uniqueCodeFound && attempts < maxAttempts) {
        const potentialCode = `${prefix}${nextNumber}`;
        
        // Check 1: Against local data (modal + orders.json)
        if (localExistingCodes.has(potentialCode.toUpperCase())) {
            console.log(`Code ${potentialCode} already exists locally, trying next...`);
            nextNumber++;
            attempts++;
            continue;
        }

        // Check 2: Against TPOS server
        const isAvailableOnServer = await isCodeAvailableOnTPOS(potentialCode);
        if (isAvailableOnServer) {
            uniqueCodeFound = true;
            finalCode = potentialCode;
        } else {
            console.log(`Code ${potentialCode} already exists on TPOS, trying next...`);
            nextNumber++;
        }
        attempts++;
    }

    if (!uniqueCodeFound) {
        throw new Error("Không thể tìm thấy mã sản phẩm duy nhất sau 100 lần thử.");
    }

    return finalCode;
}