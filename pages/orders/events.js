// pages/orders/events.js

import { orders } from './state.js';
import { displayOrders } from './ui.js';
import { handleProductSearch } from './modal-select-product.js';

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

export function setupEventListeners() {
    document.getElementById("searchInput")?.addEventListener("input", filterOrders);
    document.getElementById("quickFilter")?.addEventListener("change", filterOrders);
    document.getElementById("statusFilter")?.addEventListener("change", filterOrders);
    document.getElementById("productSearchInput")?.addEventListener("input", handleProductSearch);
}