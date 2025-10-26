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

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    window.lucide.createIcons();

    loadToken();

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