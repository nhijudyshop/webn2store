// pages/product/inventory.js

import { loadToken } from '../../shared/api/tpos-api.js';
import { autoLoadSavedData, clearSavedData, exportToJSON, importFromJSON, handleDataFile, loadProductFromList } from './product-storage.js';
import { searchProduct } from './product-api.js';
import { switchTab, clearData } from './product-display.js';
import { loadProductSuggestions, updateSuggestions } from './suggestions.js';
import { openEditModal, closeEditModal, saveProductChanges, recalculateTotalQuantities, handleImagePaste } from './edit-modal.js';
import { closeVariantSelector, handleVariantSelection, activeVariantInput } from './variant-editor.js';

// ===== GLOBAL EXPORTS (for HTML onclicks) =====
window.searchProduct = searchProduct;
window.clearData = clearData;
window.exportToJSON = exportToJSON;
window.importFromJSON = importFromJSON;
window.handleDataFile = handleDataFile;
window.clearSavedData = clearSavedData;
window.loadProductFromList = loadProductFromList;
window.switchTab = switchTab;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveProductChanges = saveProductChanges;
window.recalculateTotalQuantities = recalculateTotalQuantities;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
    window.lucide.createIcons();
    loadToken();
    await loadProductSuggestions();
    await autoLoadSavedData();

    // Main Event Listeners
    document.getElementById('productCode')?.addEventListener('input', updateSuggestions);
    
    // Edit Modal & Variant Selector Listeners
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

    console.log("Inventory page initialized (modular).");
});