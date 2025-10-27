// pages/orders/modal-create-product/events.js

import { openCreateProductModal, closeCreateProductModal, addProductRowProductModal } from './ui.js';
import { saveNewProducts } from './api.js';
import { openVariantSelector, handleVariantSelection, closeVariantSelector } from './variant-selector.js';

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