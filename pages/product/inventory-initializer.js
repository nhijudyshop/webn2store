// pages/product/inventory-initializer.js

import { TPOS_API } from '../../shared/api/tpos-api.js';
import { setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { showEmptyState } from './product-utils.js';
import { autoLoadSavedData, clearSavedData, exportToJSON, importFromJSON, handleDataFile, loadProductFromList } from './product-storage.js';
import { searchProduct } from './product-api.js';
import { displayProductInfo, displayParentProduct, displayVariants, updateStats, switchTab } from './product-display.js';

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

    window.showNotification("Đã xóa dữ liệu", "info");
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    window.lucide.createIcons();

    TPOS_API.loadToken();

    setTimeout(() => {
        autoLoadSavedData();
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