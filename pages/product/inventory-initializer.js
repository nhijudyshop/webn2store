// pages/product/inventory-initializer.js

import { loadToken } from '../../shared/api/tpos-api.js';
import { setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { showEmptyState } from './product-utils.js';
import { autoLoadSavedData, clearSavedData, exportToJSON, importFromJSON, handleDataFile, loadProductFromList, loadAllSavedProducts } from './product-storage.js';
import { searchProduct } from './product-api.js';
import { displayProductInfo, displayParentProduct, displayVariants, updateStats, switchTab, renderAllSavedProductsTable } from './product-display.js';

// ===== GLOBAL EXPORTS (for HTML onclicks and shared access) =====
window.searchProduct = searchProduct;
window.clearData = clearData;
window.exportToJSON = exportToJSON;
window.importFromJSON = importFromJSON;
window.handleDataFile = handleDataFile;
window.clearSavedData = clearSavedData;
window.loadProductFromList = loadProductFromList;
window.switchTab = switchTab;

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
    showEmptyState("allProductsTableWrapper", 'Chưa có sản phẩm nào được thêm.'); // Clear the new table

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
    const query = event.target.value.toUpperCase().trim();
    const datalist = document.getElementById('productSuggestions');
    if (!datalist) return;

    datalist.innerHTML = ''; // Clear previous suggestions

    if (!query) return;

    const filtered = allProductSuggestions.filter(item => 
        item.code.toUpperCase().startsWith(query)
    );

    // Sort to put exact match first, then by length, then alphabetically
    filtered.sort((a, b) => {
        const aCode = a.code.toUpperCase();
        const bCode = b.code.toUpperCase();

        if (aCode === query) return -1;
        if (bCode === query) return 1;

        if (aCode.length !== bCode.length) {
            return aCode.length - bCode.length;
        }

        return aCode.localeCompare(bCode);
    });

    // Limit to a reasonable number of suggestions to display
    const suggestionsToShow = filtered.slice(0, 50);

    suggestionsToShow.forEach(item => {
        const option = document.createElement('option');
        option.value = item.code;
        // Add text content which some browsers might display as extra info
        option.textContent = `${item.code} - ${item.name}`;
        datalist.appendChild(option);
    });
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
    renderAllSavedProductsTable(await loadAllSavedProducts()); // Render all saved products on load

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