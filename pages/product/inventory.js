// pages/product/inventory.js

import { loadToken } from '../../shared/api/tpos-api.js';
import { currentProduct, setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { showEmptyState } from './product-utils.js';
import { autoLoadSavedData, clearSavedData, exportToJSON, importFromJSON, handleDataFile, loadProductFromList, saveProductData } from './product-storage.js';
import { searchProduct } from './product-api.js';
import { displayProductInfo, displayParentProduct, displayVariants, updateStats, switchTab } from './product-display.js';
import { normalizeVietnamese } from '../../shared/utils/text-utils.js';

// ===== GLOBAL EXPORTS (for HTML onclicks and shared access) =====
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

// ===== CORE APPLICATION LOGIC =====

let allProductSuggestions = []; // Cache for product suggestions

function clearData() {
    document.getElementById("productCode").value = "";

    setCurrentProduct(null);
    setCurrentVariants([]);

    document.getElementById("productInfoCard").classList.remove("show");

    document.getElementById("totalProducts").textContent = "0";
    document.getElementById("totalVariants").textContent = "0";
    document.getElementById("totalQty").textContent = "0";
    document.getElementById("totalValue").textContent = "0đ";

    showEmptyState("parentTableWrapper", 'Nhập mã sản phẩm và nhấn "Thêm" để xem thông tin');
    showEmptyState("variantsTableWrapper", 'Nhập mã sản phẩm và nhấn "Thêm" để xem danh sách biến thể');

    window.showNotification("Đã xóa dữ liệu", "info");
}

/**
 * Loads product suggestions from the server and caches them.
 */
async function loadProductSuggestions() {
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
function updateSuggestions(event) {
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

// ===== EDIT MODAL FUNCTIONS =====

function openEditModal() {
    if (!currentProduct) {
        window.showNotification("Chưa có sản phẩm nào được chọn để chỉnh sửa.", "error");
        return;
    }

    // Populate the modal with current product data
    document.getElementById('editProductName').value = currentProduct.Name || '';
    document.getElementById('editProductImageURL').value = currentProduct.ImageUrl || '';
    document.getElementById('editPurchasePrice').value = currentProduct.PurchasePrice || 0;
    document.getElementById('editListPrice').value = currentProduct.ListPrice || 0;
    document.getElementById('editQtyAvailable').value = currentProduct.QtyAvailable || 0;
    document.getElementById('editVirtualAvailable').value = currentProduct.VirtualAvailable || 0;

    // Show the modal
    document.getElementById('editProductModal').style.display = 'flex';
    window.lucide.createIcons();
}

function closeEditModal() {
    document.getElementById('editProductModal').style.display = 'none';
}

async function saveProductChanges(event) {
    event.preventDefault();
    if (!currentProduct) return;

    // Update the currentProduct object from form values
    currentProduct.Name = document.getElementById('editProductName').value;
    currentProduct.ImageUrl = document.getElementById('editProductImageURL').value;
    currentProduct.PurchasePrice = parseFloat(document.getElementById('editPurchasePrice').value) || 0;
    currentProduct.ListPrice = parseFloat(document.getElementById('editListPrice').value) || 0;
    currentProduct.QtyAvailable = parseInt(document.getElementById('editQtyAvailable').value) || 0;
    currentProduct.VirtualAvailable = parseInt(document.getElementById('editVirtualAvailable').value) || 0;

    // The image in ProductVariants might also need updating if it's separate
    if (currentProduct.ProductVariants && currentProduct.ProductVariants.length > 0) {
        currentProduct.ProductVariants.forEach(variant => {
            // Assuming variants share the parent image URL
            variant.ImageUrl = currentProduct.ImageUrl;
        });
    }

    try {
        // Save the updated product data
        await saveProductData(currentProduct);

        // Re-render the UI with the new data
        displayProductInfo(currentProduct);
        displayParentProduct(currentProduct);
        displayVariants(currentProduct.ProductVariants || []);
        updateStats(currentProduct);

        closeEditModal();
        window.showNotification("Đã cập nhật sản phẩm thành công!", "success");

    } catch (error) {
        console.error("Error saving product changes:", error);
        window.showNotification("Lỗi khi lưu thay đổi: " + error.message, "error");
    }
}


// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
    window.lucide.createIcons();

    loadToken();
    await loadProductSuggestions(); // Load suggestions into memory on page load

    const productCodeInput = document.getElementById('productCode');
    if (productCodeInput) {
        productCodeInput.addEventListener('input', updateSuggestions);
    }

    await autoLoadSavedData();

    // Add CSS animations (if not already in common.css)
    const style = document.createElement("style");
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    console.log("Inventory page initialized");
});