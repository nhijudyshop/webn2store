// pages/orders/orders.js

import { loadOrders, loadInventoryProducts, loadDrafts, loadProducts } from './api.js';
import { setupEventListeners } from './events.js';
import { displayOrders, updateStats } from './ui.js';
import * as createModal from './modal-create-order.js';
import * as selectProductModal from './modal-select-product.js';
import { setOrders } from './state.js';

// ===== GLOBAL ACTIONS (for HTML onclicks) =====
window.switchTab = (tab) => {
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
    event.target.closest(".tab-btn").classList.add("active");
    
    if (tab === 'orders') loadOrders();
    else if (tab === 'drafts') loadDrafts();
    else if (tab === 'products') loadProducts();
};

window.exportExcel = (type) => {
    if (type === 'purchase') window.showNotification("Đang xuất Excel mua hàng...", "info");
    else window.showNotification("Đang xuất Excel thêm sản phẩm...", "info");
};

window.selectDate = (type) => {
    window.showNotification(`Chọn ngày ${type === 'from' ? 'từ' : 'đến'} đang được phát triển`, "info");
};

window.editOrder = (orderId) => window.showNotification(`Chỉnh sửa đơn hàng #${orderId}`, "info");

window.deleteOrder = (orderId) => {
    if (confirm(`Bạn có chắc muốn xóa đơn hàng #${orderId}?`)) {
        const { orders } = await import('./state.js');
        const newOrders = orders.filter(order => order.id !== orderId);
        setOrders(newOrders);
        displayOrders();
        updateStats();
        window.showNotification(`Đã xóa đơn hàng #${orderId}`, "success");
    }
};

window.toggleOrderSelection = (orderId) => {
    window.showNotification(`Đã chọn đơn hàng #${orderId}`, "info");
};

// Modal functions
window.createOrder = createModal.createOrder;
window.closeCreateOrderModal = createModal.closeCreateOrderModal;
window.clearOrderForm = createModal.clearOrderForm;
window.addProductRow = createModal.addProductRow;
window.openSelectProductModal = selectProductModal.openSelectProductModal;
window.closeSelectProductModal = selectProductModal.closeSelectProductModal;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    window.lucide.createIcons();
    loadOrders();
    loadInventoryProducts();
    setupEventListeners();
    console.log("Orders page initialized (modular).");
});