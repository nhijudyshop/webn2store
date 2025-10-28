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

    let html = '';
    
    // First pass: Prepare data with rowspan and total quantity information for consecutive supplier groups
    const processedOrders = [];
    for (let i = 0; i < ordersToDisplay.length; i++) {
        const item = { ...ordersToDisplay[i] }; // Clone to add properties
        item.isFirstInConsecutiveSupplierGroup = false;
        item.supplierRowspan = 1; // Default rowspan
        item.groupTotalQty = 0; // Initialize group total quantity

        if (i === 0 || item.supplier !== ordersToDisplay[i-1].supplier) {
            // This is the start of a new consecutive supplier group
            item.isFirstInConsecutiveSupplierGroup = true;
            
            // Calculate rowspan and total quantity for this new group
            let count = 0;
            let currentGroupTotalQty = 0;
            for (let j = i; j < ordersToDisplay.length; j++) {
                if (ordersToDisplay[j].supplier === item.supplier) {
                    count++;
                    currentGroupTotalQty += ordersToDisplay[j].quantity || 0;
                } else {
                    break; // Stop counting when supplier changes
                }
            }
            item.supplierRowspan = count;
            item.groupTotalQty = currentGroupTotalQty;
        }
        processedOrders.push(item);
    }

    // Second pass: Render HTML based on the processed data
    processedOrders.forEach((item, index) => {
        // Add a separator before a new supplier group, but not before the very first item
        if (item.isFirstInConsecutiveSupplierGroup && index > 0) {
            html += `<tr><td colspan="13" class="supplier-separator"></td></tr>`;
        }

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

        // Date cell (always present for every row)
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

        // Supplier cell (only rendered if it's the first in its consecutive group)
        if (item.isFirstInConsecutiveSupplierGroup) {
            html += `
                <td class="align-left" rowspan="${item.supplierRowspan}">
                    <div class="supplier-info">${item.supplier}</div>
                    <div class="supplier-qty">Tổng SL: ${item.groupTotalQty}</div>
                </td>
            `;
        }

        // Invoice cell (always present for every row)
        html += `<td><div class="price-cell">${invoiceHtml}</div></td>`;

        // The rest of the cells (always present for every row)
        html += `
            <td class="align-left"><div class="product-name">${item.productName}</div></td>
            <td><span class="product-code">${item.productCode}</span></td>
            <td><div class="variant">${item.variant}</div></td>
            <td><div class="quantity">${item.quantity}</div></td>
            <td><div class="price-cell">${purchasePriceHtml}</div></td>
            <td><div class="price-cell">${salePriceHtml}</div></div></td>
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