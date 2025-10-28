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

    // Group orders by a composite key to identify unique order instances
    const groupedOrders = ordersToDisplay.reduce((acc, order) => {
        const key = `${order.supplier}-${order.rawDate}`; // Unique key for an order instance
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(order);
        return acc;
    }, {});

    let html = '';
    const processedGroups = new Set();

    ordersToDisplay.forEach(item => {
        const key = `${item.supplier}-${item.rawDate}`;
        const isFirstInGroup = !processedGroups.has(key);
        
        const purchasePriceHtml = `
            ${item.purchasePriceImageUrl
                ? `<img src="${item.purchasePriceImageUrl}" class="price-image" alt="Purchase Price Image" onerror="this.outerHTML='<div class=\\'image-placeholder price-image\\'>Chưa có hình</div>'">`
                : `<div class="image-placeholder price-image">Chưa có hình</div>`
            }
            <div class="price">${item.purchasePrice}</div>
        `;

        const salePriceHtml = `
            ${item.productImageUrl
                ? `<img src="${item.productImageUrl}" class="price-image" alt="Product Image" onerror="this.outerHTML='<div class=\\'image-placeholder price-image\\'>Chưa có hình</div>'">`
                : `<div class="image-placeholder price-image">Chưa có hình</div>`
            }
            <div class="price">${item.salePrice}</div>
        `;
        
        const invoiceHtml = `
            ${item.invoiceImageUrl
                ? `<img src="${item.invoiceImageUrl}" class="invoice-image" alt="Invoice" onerror="this.outerHTML='<div class=\\'image-placeholder invoice-image\\'>Chưa có hình</div>'">`
                : `<div class="image-placeholder invoice-image">Chưa có hình</div>`
            }
            <div class="invoice-value">${item.invoice}</div>
        `;

        html += `<tr data-order-id="${item.id}">`;

        // Date cell is always rendered for every row
        html += `
            <td>
                <div class="order-date">
                    <i data-lucide="calendar"></i>
                    <div>
                        <div>${item.date}</div>
                        <div style="font-size: 12px; color: #64748b;">(${item.time})</div>
                    </div>
                </div>
            </td>
        `;

        if (isFirstInGroup) {
            const orderGroup = groupedOrders[key];
            const rowspan = orderGroup.length;
            processedGroups.add(key);

            html += `
                <td class="align-left" rowspan="${rowspan}">
                    <div class="supplier-info">${item.supplier}</div>
                    <div class="supplier-qty">Tổng SL: ${item.totalQty}</div>
                </td>
            `;
        }

        // Invoice cell is always rendered for every row
        html += `<td><div class="price-cell">${invoiceHtml}</div></td>`;

        // The rest of the cells are added for every row
        html += `
            <td class="align-left"><div class="product-name">${item.productName}</div></td>
            <td><span class="product-code">${item.productCode}</span></td>
            <td><div class="variant">${item.variant}</div></td>
            <td><div class="quantity">${item.quantity}</div></td>
            <td><div class="price-cell">${purchasePriceHtml}</div></td>
            <td><div class="price-cell">${salePriceHtml}</div></td>
            <td class="align-left"><div style="color: #64748b; font-size: 14px;">${item.note || '-'}</div></td>
            <td><span class="status-badge status-${item.status}">${getStatusText(item.status)}</span></td>
            <td><button class="btn-edit" data-action="edit" title="Chỉnh sửa đơn hàng"><i data-lucide="edit"></i></button></td>
            <td><div class="action-buttons"><button class="btn-delete" data-action="delete" title="Xóa đơn hàng"><i data-lucide="trash-2"></i></button><input type="checkbox" class="checkbox" data-action="select"></div></td>
        `;

        html += `</tr>`;
    });

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
}