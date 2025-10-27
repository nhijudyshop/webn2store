// pages/orders/modal-create-product/events.js

import { openCreateProductModal, closeCreateProductModal, addProductRowProductModal } from './ui.js';
import { saveNewProducts } from './api.js';
import { openVariantSelector, handleVariantSelection, closeVariantSelector } from './variant-selector.js';
import { generateAndVerifyProductCode } from './code-generator.js';

/**
 * Handles the blur event on the product name input to generate a product code.
 * @param {FocusEvent} event - The blur event.
 */
async function handleProductNameBlur(event) {
    const nameInput = event.target;
    const row = nameInput.closest('tr');
    if (!row) return;

    const codeInput = row.querySelector('input[placeholder="Mã SP"]');
    const toggleCheckbox = row.querySelector('.product-code-toggle');

    // Only generate if checkbox is checked (meaning input is disabled and auto-generation is on)
    if (!toggleCheckbox || !toggleCheckbox.checked) {
        return;
    }

    const productName = nameInput.value.trim();
    if (!productName) return;

    // Show loading state
    codeInput.value = 'Đang tạo mã...';

    try {
        const newCode = await generateAndVerifyProductCode(productName);
        if (newCode) {
            codeInput.value = newCode;
            window.showNotification(`Đã tạo mã sản phẩm mới: ${newCode}`, "success");
        } else {
            codeInput.value = ''; // Clear if generation failed
        }
    } catch (error) {
        console.error("Code generation failed:", error);
        window.showNotification(error.message, 'error');
        codeInput.value = ''; // Clear on error
    }
}

export function setupCreateProductModalEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('closeCreateProductModalBtn')?.addEventListener('click', closeCreateProductModal);
        document.getElementById('addProductRowProductModalBtn')?.addEventListener('click', addProductRowProductModal);
        document.getElementById('saveNewProductsBtn')?.addEventListener('click', saveNewProducts);

        document.getElementById('newProductList')?.addEventListener('focusin', (event) => {
            if (event.target.classList.contains('variant-input')) {
                openVariantSelector(event.target);
            }
        });

        // Add blur event listener using event delegation on the table body
        document.getElementById('newProductList')?.addEventListener('blur', (event) => {
            if (event.target && event.target.matches('input[placeholder="Tên sản phẩm"]')) {
                handleProductNameBlur(event);
            }
        }, true); // Use capture phase to ensure it runs

        document.getElementById('variantSelector')?.addEventListener('change', handleVariantSelection);

        document.addEventListener('click', (event) => {
            const panel = document.getElementById('variantSelector');
            if (panel && !panel.contains(event.target) && !event.target.classList.contains('variant-input')) {
                closeVariantSelector();
            }
        });
        document.querySelector('.btn-close-selector')?.addEventListener('click', closeVariantSelector);
    });
}

// Expose openCreateProductModal globally so it can be called from other modules
window.openCreateProductModal = openCreateProductModal;