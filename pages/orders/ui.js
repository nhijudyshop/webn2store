// pages/orders/ui.js

import { orders } from './state.js';

export function getStatusText(status) {
    const statusMap = {
        'waiting': 'Chờ Hàng',
        'delivered': 'Đã giao',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}

export function formatCurrency(value) {
    if (!value && value !== 0) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
}

export function displayOrders(ordersToDisplay = orders) {
    const tbody = document.getElementById("ordersTableBody");
    
    if (ordersToDisplay.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; padding: 40px; color: #64748b;">
                    <i data-lucide="inbox" style="width: 48px; height: 48px; margin: 0 auto 16px; display: block;"></i>
                    <p>Chưa có đơn hàng nào</p>
                </td>
            </tr>
        `;
        window.lucide.createIcons();
        return;
    }

    const html = ordersToDisplay.map(order => {
        const purchasePriceImageHtml = order.purchasePriceImageUrl
            ? `<img src="${order.purchasePriceImageUrl}" class="price-image" alt="Purchase Price Image">`
            : `<div class="image-placeholder">Chưa có hình</div>`;

        const salePriceImageHtml = order.productImageUrl
            ? `<img src="${order.productImageUrl}" class="price-image" alt="Product Image">`
            : `<div class="image-placeholder">Chưa có hình</div>`;
        
        const invoiceImageHtml = order.invoiceImageUrl
            ? `<img src="${order.invoiceImageUrl}" class="invoice-image" alt="Invoice">`
            : `<div class="image-placeholder">Chưa có hình</div>`;

        return `
        <tr data-order-id="${order.id}">
            <td><div class="order-date"><i data-lucide="calendar"></i><div><div>${order.date}</div><div style="font-size: 12px; color: #64748b;">(${order.time})</div></div></div></td>
            <td><div class="supplier-info">${order.supplier}</div><div class="supplier-qty">Tổng SL: ${order.totalQty}</div></td>
            <td><div class="invoice-info"><div class="invoice-images">${invoiceImageHtml}</div><div class="invoice-value">${order.invoice}</div></div></td>
            <td><div class="product-name">${order.productName}</div></td>
            <td><span class="product-code">${order.productCode}</span></td>
            <td><div class="variant">${order.variant}</div></td>
            <td><div class="quantity">${order.quantity}</div></td>
            <td><div class="price-cell">${purchasePriceImageHtml}<div class="price">${order.purchasePrice}</div></div></td>
            <td><div class="price-cell">${salePriceImageHtml}<div class="price">${order.salePrice}</div></div></td>
            <td><div style="color: #64748b; font-size: 14px;">${order.note || '-'}</div></td>
            <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
            <td><button class="btn-edit" data-action="edit" title="Chỉnh sửa đơn hàng"><i data-lucide="edit"></i></button></td>
            <td><div class="action-buttons"><button class="btn-delete" data-action="delete" title="Xóa đơn hàng"><i data-lucide="trash-2"></i></button><input type="checkbox" class="checkbox" data-action="select"></div></td>
        </tr>
    `}).join('');

    tbody.innerHTML = html;
    window.lucide.createIcons();
}

export function updateStats() {
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, order) => {
        const value = parseInt(order.invoice.replace(/[^\d]/g, ''));
        return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    const today = new Date().toLocaleDateString('vi-VN');
    const todayOrders = orders.filter(order => order.date === today).length;
    const todayValue = orders.filter(order => order.date === today)
        .reduce((sum, order) => {
            const value = parseInt(order.invoice.replace(/[^\d]/g, ''));
            return sum + (isNaN(value) ? 0 : value);
        }, 0);

    document.getElementById("totalOrders").textContent = totalOrders;
    document.getElementById("totalValue").textContent = formatCurrency(totalValue);
    document.getElementById("todayOrders").textContent = todayOrders;
    document.getElementById("todayValue").textContent = formatCurrency(todayValue);
    document.getElementById("syncStatus").textContent = "0/328";
}