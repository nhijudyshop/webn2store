// pages/product/inventory.js

import { loadToken } from '../../shared/api/tpos-api.js';
import { autoLoadSavedData, clearSavedData, exportToJSON, importFromJSON, handleDataFile, loadProductFromList } from './product-storage.js';
import { searchProduct } from './product-api.js';
import { clearData } from './product-display.js';
import { loadProductSuggestions, updateSuggestions } from './suggestions.js';
import { openEditModal, closeEditModal, saveProductChanges, recalculateTotalQuantities, handleImagePaste } from './edit-modal-controller.js';
import { closeVariantSelector, handleVariantSelection, activeVariantInput } from './variant-editor.js';
import { initImageLightbox } from '../../shared/components/image-lightbox/image-lightbox.js'; // Import lightbox initializer

// ===== GLOBAL EXPORTS (for HTML onclicks) =====
window.clearData = clearData;
window.exportToJSON = exportToJSON;
window.importFromJSON = importFromJSON;
window.handleDataFile = handleDataFile;
window.clearSavedData = clearSavedData;
window.loadProductFromList = loadProductFromList;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.recalculateTotalQuantities = recalculateTotalQuantities;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
    window.lucide.createIcons();
    loadToken();
    await loadProductSuggestions();

    // Main Event Listeners
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', searchProduct);
    }
    document.getElementById('productCode')?.addEventListener('input', updateSuggestions);
    
    // This will now just populate the input and return true if it did.
    const loaded = await autoLoadSavedData(); 

    // If a product code was loaded, automatically trigger the search form submission.
    if (loaded && searchForm) {
        window.showNotification(
            `🔄 Tự động tải dữ liệu mới nhất cho sản phẩm...`,
            "info",
        );
        searchForm.requestSubmit();
    }
    
    // Edit Modal & Variant Selector Listeners
    document.getElementById('editProductForm')?.addEventListener('submit', saveProductChanges);
    const editImageDropzone = document.getElementById('editImageDropzone');
    const deleteEditImageBtn = document.getElementById('deleteEditImageBtn');
    const variantSelector = document.getElementById('variantSelector');

    if (editImageDropzone) editImageDropzone.addEventListener('paste', handleImagePaste);
    if (deleteEditImageBtn) {
        deleteEditImageBtn.addEventListener('click', () => {
            editImageDropzone.innerHTML = '<i data-lucide="image"></i><span>Ctrl+V</span>';
            editImageDropzone.classList.remove('has-image');
            deleteEditImageBtn.style.display = 'none';
            window.lucide.createIcons();
            initImageLightbox(); // Re-initialize lightbox after image deletion
        });
    }
    
    if (variantSelector) {
        variantSelector.addEventListener('change', handleVariantSelection);
        variantSelector.querySelector('.btn-close-selector')?.addEventListener('click', closeVariantSelector);
    }

    // Global click listener to close variant selector when clicking outside
    document.addEventListener('click', (event) => {
        if (variantSelector && !variantSelector.contains(event.target) && event.target !== activeVariantInput) {
            closeVariantSelector();
        }
    });

    initImageLightbox(); // Initialize lightbox for all images on the page

    console.log("Inventory page initialized (modular).");
});