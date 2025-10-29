// pages/product/inventory.js

import { loadToken } from '../../shared/api/tpos-api.js';
import { autoLoadSavedData, clearSavedData, exportToJSON, importFromJSON, handleDataFile, loadProductFromList } from './product-storage.js';
import { searchProduct } from './product-api.js';
import { clearData } from './product-display.js';
import { loadProductSuggestions, updateSuggestions } from './suggestions.js';
import { openEditModal, closeEditModal, saveProductChanges, recalculateTotalQuantities, handleImagePaste, handleTransferQuantityChange, saveQuantityTransfer } from './edit-modal-controller.js';
import { closeVariantSelector, handleVariantSelection, activeVariantInput } from './variant-editor.js';
import { initImageLightbox } from '../../shared/components/image-lightbox/image-lightbox.js'; // Import lightbox initializer
import { quantityTransferState } from './edit-modal/state.js'; // NEW: Import quantityTransferState
import { currentProduct } from './inventory-state.js'; // NEW: Import currentProduct
import { updateTransferQuantitiesDisplay } from './edit-modal/ui-manager.js'; // Import for updating display

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
window.handleTransferQuantityChange = handleTransferQuantityChange; // Expose for new tab
window.saveQuantityTransfer = saveQuantityTransfer; // Expose for new tab

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

    // Event listeners for quantity transfer buttons
    document.getElementById('transferVariant1')?.addEventListener('change', (e) => {
        const variantId = parseInt(e.target.value, 10);
        quantityTransferState.variant1 = currentProduct.ProductVariants.find(v => v.Id === variantId);
        quantityTransferState.initialQty1 = quantityTransferState.variant1?.QtyAvailable || 0;
        quantityTransferState.currentQty1 = quantityTransferState.initialQty1;
        
        // Repopulate select2 to exclude selected variant1
        populateTransferVariantSelect(document.getElementById('transferVariant2'), variantId);
        // Reset variant2 if it was the same as variant1
        if (quantityTransferState.variant2?.Id === variantId) {
            quantityTransferState.variant2 = null;
            document.getElementById('transferVariant2').value = "";
            quantityTransferState.initialQty2 = 0;
            quantityTransferState.currentQty2 = 0;
        }
        updateTransferQuantitiesDisplay();
    });

    document.getElementById('transferVariant2')?.addEventListener('change', (e) => {
        const variantId = parseInt(e.target.value, 10);
        quantityTransferState.variant2 = currentProduct.ProductVariants.find(v => v.Id === variantId);
        quantityTransferState.initialQty2 = quantityTransferState.variant2?.QtyAvailable || 0;
        quantityTransferState.currentQty2 = quantityTransferState.initialQty2;
        updateTransferQuantitiesDisplay();
    });

    document.querySelectorAll('.qty-controls .btn-qty-control').forEach(button => {
        button.addEventListener('click', (e) => {
            const variantIndex = parseInt(e.currentTarget.dataset.variantIndex, 10);
            const delta = parseInt(e.currentTarget.dataset.delta, 10);
            handleTransferQuantityChange(variantIndex, delta);
        });
    });

    // NEW: Event listener for the "Lưu chuyển đổi số lượng" button
    document.getElementById('saveQuantityTransferBtn')?.addEventListener('click', saveQuantityTransfer);

    initImageLightbox(); // Initialize lightbox for all images on the page

    console.log("Inventory page initialized (modular).");
});

// Helper function for populating transfer variant selects (needed here for the change listeners)
function populateTransferVariantSelect(selectElement, excludeVariantId = null) {
    selectElement.innerHTML = '<option value="">-- Chọn biến thể --</option>';
    if (currentProduct && currentProduct.ProductVariants) {
        currentProduct.ProductVariants.forEach(variant => {
            if (variant.Id !== excludeVariantId) {
                const option = document.createElement('option');
                option.value = variant.Id;
                option.textContent = variant.NameGet || variant.Name;
                selectElement.appendChild(option);
            }
        });
    }
}

// Helper function for updating transfer quantities display (needed here for the change listeners)
function updateTransferQuantitiesDisplay() {
    const qty1El = document.getElementById('transferQty1');
    const qty2El = document.getElementById('transferQty2');
    const saveBtn = document.getElementById('saveQuantityTransferBtn');

    if (qty1El) qty1El.textContent = quantityTransferState.currentQty1;
    if (qty2El) qty2El.textContent = quantityTransferState.currentQty2;

    const changed = quantityTransferState.currentQty1 !== quantityTransferState.initialQty1 ||
                    quantityTransferState.currentQty2 !== quantityTransferState.initialQty2;
    if (saveBtn) saveBtn.disabled = !changed;
}