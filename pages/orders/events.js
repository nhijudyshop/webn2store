// pages/orders/events.js

import { orders, setOrders } from './state.js';
import { displayOrders, updateStats } from './ui.js';
import { createOrder, closeCreateOrderModal, clearOrderForm, addProductRow, updateProductCodeSuggestions, fetchProductAndPopulateRow, updateTotals, cloneProductRow, deleteProductRow } from './modal-create-order.js';
import { loadOrders, loadDrafts, loadProducts } from './api.js';

function filterOrders() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    const quickFilter = document.getElementById("quickFilter").value;
    const statusFilter = document.getElementById("statusFilter").value;

    let filteredOrders = orders;

    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => 
            order.supplier.toLowerCase().includes(searchTerm) ||
            order.productName.toLowerCase().includes(searchTerm) ||
            order.productCode.toLowerCase().includes(searchTerm) ||
            order.date.includes(searchTerm)
        );
    }

    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    if (quickFilter !== 'all') {
        const today = new Date();
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.date.split('/').reverse().join('-'));
            switch (quickFilter) {
                case 'today': return orderDate.toDateString() === today.toDateString();
                case 'week': const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); return orderDate >= weekAgo;
                case 'month': return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
                default: return true;
            }
        });
    }
    
    displayOrders(filteredOrders);
}

function handleTableActions(event) {
    const target = event.target;
    const actionElement = target.closest('[data-action]');
    if (!actionElement) return;

    const action = actionElement.dataset.action;
    const orderId = parseInt(actionElement.closest('tr').dataset.orderId);

    switch (action) {
        case 'edit':
            window.showNotification(`Chỉnh sửa đơn hàng #${orderId}`, "info");
            break;
        case 'delete':
            if (confirm(`Bạn có chắc muốn xóa đơn hàng #${orderId}?`)) {
                const newOrders = orders.filter(order => order.id !== orderId);
                setOrders(newOrders);
                displayOrders();
                updateStats();
                window.showNotification(`Đã xóa đơn hàng #${orderId}`, "success");
            }
            break;
        case 'select':
            window.showNotification(`Đã chọn đơn hàng #${orderId}`, "info");
            break;
    }
}

export function setupEventListeners() {
    // Main page filters
    document.getElementById("searchInput")?.addEventListener("input", filterOrders);
    document.getElementById("quickFilter")?.addEventListener("change", filterOrders);
    document.getElementById("statusFilter")?.addEventListener("change", filterOrders);

    // Main page buttons
    document.getElementById("createOrderBtn")?.addEventListener("click", createOrder);
    document.getElementById("exportPurchaseBtn")?.addEventListener("click", () => window.showNotification("Đang xuất Excel mua hàng...", "info"));
    document.getElementById("exportProductsBtn")?.addEventListener("click", () => window.showNotification("Đang xuất Excel thêm sản phẩm...", "info"));
    document.getElementById("selectDateFromBtn")?.addEventListener("click", () => window.showNotification(`Chọn ngày bắt đầu đang được phát triển`, "info"));
    document.getElementById("selectDateToBtn")?.addEventListener("click", () => window.showNotification(`Chọn ngày kết thúc đang được phát triển`, "info"));

    // Tabs
    document.querySelector('.nav-tabs')?.addEventListener('click', (event) => {
        const tabButton = event.target.closest('.tab-btn');
        if (!tabButton) return;

        document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
        tabButton.classList.add("active");
        
        const tab = tabButton.dataset.tab;
        if (tab === 'orders') loadOrders();
        else if (tab === 'drafts') loadDrafts();
        else if (tab === 'products') loadProducts();
    });

    // Order table actions (event delegation)
    document.getElementById('ordersTableBody')?.addEventListener('click', handleTableActions);

    // Create Order Modal buttons
    document.getElementById("closeCreateOrderModalBtnHeader")?.addEventListener("click", closeCreateOrderModal);
    document.getElementById("closeCreateOrderModalBtnFooter")?.addEventListener("click", closeCreateOrderModal);
    document.getElementById("clearOrderFormBtn")?.addEventListener("click", clearOrderForm);
    document.getElementById("addProductRowBtn")?.addEventListener("click", addProductRow);

    // Expose functions to window for inline event handlers
    window.updateProductCodeSuggestions = updateProductCodeSuggestions;
    window.fetchProductAndPopulateRow = fetchProductAndPopulateRow;
    window.updateTotals = updateTotals;
    window.cloneProductRow = cloneProductRow;
    window.deleteProductRow = deleteProductRow;
}