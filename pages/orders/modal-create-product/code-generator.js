// pages/orders/modal-create-product/code-generator.js

import { normalizeVietnamese } from '../../../shared/utils/text-utils.js';
import { tposRequest } from '../../../shared/api/tpos-api.js';
import { productSuggestions } from '../state.js';

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
 * Generates a new, unique product code based on the product name and verifies it against TPOS.
 * @param {string} productName - The name of the product.
 * @param {Array<string>} otherCodes - Codes from other rows in the current modal.
 * @returns {Promise<string|null>} A unique product code or null if an error occurs.
 */
export async function generateAndVerifyProductCode(productName, otherCodes = []) {
    if (!productName) return null;

    // 1. Determine prefix ('N' or 'P')
    const normalizedName = normalizeVietnamese(productName);
    const keywords = ['ao', 'quan', 'giay', 'non'];
    const prefix = keywords.some(k => normalizedName.includes(k)) ? 'N' : 'P';

    // 2. Find the max number from local suggestions AND other codes in the modal
    const suggestionCodes = productSuggestions
        .filter(p => p.code && p.code.toUpperCase().startsWith(prefix))
        .map(p => p.code);
        
    const modalCodes = otherCodes.filter(c => c && c.toUpperCase().startsWith(prefix));

    const allCodes = [...suggestionCodes, ...modalCodes];
    
    const numbers = allCodes.map(c => parseInt(c.substring(1), 10)).filter(n => !isNaN(n));
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    let nextNumber = maxNumber + 1;

    // 3. Verify uniqueness on TPOS, incrementing if necessary
    let uniqueCodeFound = false;
    let finalCode = '';
    let attempts = 0;
    const maxAttempts = 100; // To prevent infinite loops

    while (!uniqueCodeFound && attempts < maxAttempts) {
        const potentialCode = `${prefix}${nextNumber}`;
        
        // Also check against the modal codes again to be absolutely sure
        if (modalCodes.includes(potentialCode)) {
            nextNumber++;
            attempts++;
            continue;
        }

        const isAvailable = await isCodeAvailableOnTPOS(potentialCode);
        if (isAvailable) {
            uniqueCodeFound = true;
            finalCode = potentialCode;
        } else {
            console.log(`Code ${potentialCode} already exists, trying next...`);
            nextNumber++;
        }
        attempts++;
    }

    if (!uniqueCodeFound) {
        throw new Error("Không thể tìm thấy mã sản phẩm duy nhất sau 100 lần thử.");
    }

    return finalCode;
}