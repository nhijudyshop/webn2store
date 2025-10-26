// pages/product/inventory-initializer.js

import { loadToken } from '../../shared/api/tpos-api.js';
import { setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { showEmptyState } from './product-utils.js';
import { autoLoadSavedData, clearSavedData, exportToJSON, importFromJSON, handleDataFile, loadProductFromList, loadAllSavedProducts } from './product-storage.js'; // Import loadAllSavedProducts
import { searchProduct } from './product-api.js';
import { displayProductInfo, displayParentProduct, displayVariants, updateStats, switchTab, renderAllSavedProductsTable } from './product-display.js'; // Import renderAllSavedProductsTable

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
 * Loads product suggestions from the server and populates the datalist.
 */
async function loadProductSuggestions() {
    try {
        console.log('Attempting to load product suggestions...'); // Added log
        const response = await fetch('/api/products/suggestions');
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            const datalist = document.getElementById('productSuggestions');
            if (datalist) {
                datalist.innerHTML = ''; // Clear existing options
                result.data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.code;
                    option.textContent = `${item.code} - ${item.name}`;
                    datalist.appendChild(option);
                });
                console.log(`✅ Loaded ${result.data.length} product suggestions into datalist.`); // Added log
                console.log('Datalist options:', datalist.options); // Added log to inspect datalist content
            }
        } else {
            console.error('❌ Failed to load product suggestions:', result.error);
            window.showNotification('Lỗi tải gợi ý sản phẩm', 'error');
        }
    } catch (error) {
        console.error('❌ Error fetching product suggestions:', error);
        window.showNotification('Lỗi kết nối để tải gợi ý sản phẩm', 'error');
    }
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    window.lucide.createIcons();

    loadToken();
    loadProductSuggestions(); // Load suggestions on page load

    setTimeout(() => {
        autoLoadSavedData();
        renderAllSavedProductsTable(loadAllSavedProducts()); // Render all saved products on load
    }, 500);

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