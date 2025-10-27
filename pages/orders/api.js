// pages/orders/api.js

import { setOrders, setProductSuggestions } from './state.js';
import { displayOrders, updateStats } from './ui.js';

export async function loadProductSuggestions() {
    try {
        const response = await fetch('/api/products/suggestions');
        const result = await response.json();
        if (result.success) {
            setProductSuggestions(result.data);
            console.log(`✅ Loaded ${result.data.length} product suggestions for order modal.`);
        }
    } catch (error) {
        console.error('Error loading product suggestions:', error);
    }
}

export async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        const result = await response.json();
        if (result.success) {
            // Sort by date descending before setting state
            const sortedOrders = result.data.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
            setOrders(sortedOrders);
            displayOrders();
            updateStats();
        } else {
            console.error("Failed to load orders:", result.error);
            window.showNotification("Lỗi tải danh sách đơn hàng", "error");
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        window.showNotification("Lỗi kết nối server khi tải đơn hàng", "error");
    }
}

export async function saveOrders(newOrders) {
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrders)
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Error saving orders:', error);
        window.showNotification("Lỗi kết nối server khi lưu đơn hàng", "error");
        return false;
    }
}

export async function deleteOrder(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Error deleting order:', error);
        return { success: false, error: error.message };
    }
}

export function loadProducts() {
    window.showNotification("Tính năng sản phẩm đã đặt đang được phát triển", "info");
    setOrders([]);
    displayOrders();
    updateStats();
}