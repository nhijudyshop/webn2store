// pages/orders/api.js

import { setOrders, setInventoryProducts } from './state.js';
import { displayOrders, updateStats } from './ui.js';

export async function loadInventoryProducts() {
    try {
        const response = await fetch('/api/products/suggestions');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            setInventoryProducts(result.data);
            console.log(`✅ Loaded ${result.data.length} inventory products.`);
        } else {
            console.error('❌ Failed to load inventory products.');
            const tbody = document.getElementById("inventoryProductList");
            if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">Lỗi tải danh sách sản phẩm.</td></tr>`;
        }
    } catch (error) {
        console.error('❌ Error fetching inventory products:', error);
        const tbody = document.getElementById("inventoryProductList");
        if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">Lỗi kết nối. Không thể tải sản phẩm.</td></tr>`;
    }
}

export function loadOrders() {
    // Sample data
    const sampleOrders = [
        { id: 1, date: "25/10/2025", time: "18:15", supplier: "A79", totalQty: 1, invoice: "100.000 ₫", productName: "2510 A79 SET ÁO TD + Q.DÀI TRƠN ĐEN", productCode: "N1213", variant: "-", quantity: 1, purchasePrice: "100.000 ₫", salePrice: "195.000 ₫", note: "", status: "waiting" },
        { id: 2, date: "25/10/2025", time: "17:30", supplier: "B45", totalQty: 2, invoice: "250.000 ₫", productName: "2510 B45 ÁO THUN NAM TRƠN XANH", productCode: "N1214", variant: "Size M", quantity: 2, purchasePrice: "125.000 ₫", salePrice: "220.000 ₫", note: "Giao hàng nhanh", status: "delivered" },
        { id: 3, date: "24/10/2025", time: "16:45", supplier: "C12", totalQty: 1, invoice: "80.000 ₫", productName: "2410 C12 QUẦN JEAN NAM XANH", productCode: "N1215", variant: "Size L", quantity: 1, purchasePrice: "80.000 ₫", salePrice: "150.000 ₫", note: "", status: "cancelled" }
    ];

    setOrders(sampleOrders);
    displayOrders();
    updateStats();
}

export function loadDrafts() {
    window.showNotification("Không có bản nháp nào", "info");
    setOrders([]);
    displayOrders();
    updateStats();
}

export function loadProducts() {
    window.showNotification("Tính năng sản phẩm đã đặt đang được phát triển", "info");
    setOrders([]);
    displayOrders();
    updateStats();
}