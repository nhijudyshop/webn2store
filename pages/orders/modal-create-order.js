// pages/orders/modal-create-order.js

import { openSelectProductModal } from './modal-select-product.js';

export function createOrder() {
    const modal = document.getElementById("createOrderModal");
    if (modal) {
        modal.style.display = "flex";
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('orderDateInput').value = today;
        if (document.getElementById("modalProductList").children.length === 0) {
            addProductRow();
        }
        window.lucide.createIcons();
    }
}

export function closeCreateOrderModal() {
    const modal = document.getElementById("createOrderModal");
    if (modal) {
        modal.style.display = "none";
    }
}

export function clearOrderForm() {
    if (confirm("Bạn có chắc muốn xóa toàn bộ thông tin đã nhập?")) {
        const modal = document.getElementById("createOrderModal");
        modal.querySelectorAll('input, textarea').forEach(input => {
            if (input.type === 'date') {
                input.value = new Date().toISOString().split('T')[0];
            } else if (input.type === 'number') {
                input.value = '0';
            } else {
                input.value = '';
            }
        });
        document.getElementById("modalProductList").innerHTML = '';
        addProductRow();
        updateTotals();
        window.showNotification("Đã xóa thông tin trên form", "info");
    }
}

export function addProductRow() {
    const tbody = document.getElementById("modalProductList");
    const newRow = document.createElement("tr");
    const rowIndex = tbody.children.length + 1;

    newRow.innerHTML = `
        <td>${rowIndex}</td>
        <td><input type="text" placeholder="Nhập tên sản phẩm"></td>
        <td><input type="text" placeholder="Mã SP"></td>
        <td><input type="number" value="1" style="width: 60px;"></td>
        <td><input type="number" value="0"></td>
        <td><input type="number" value="0"></td>
        <td>0 ₫</td>
        <td><div class="image-dropzone"><i data-lucide="image"></i></div></td>
        <td><div class="image-dropzone"><i data-lucide="image"></i></div></td>
        <td><select><option>Chọn biến thể...</option></select></td>
        <td class="action-cell">
            <button class="btn-action" title="Gợi ý thông minh"><i data-lucide="sparkles"></i></button>
            <button class="btn-action" title="Sao chép"><i data-lucide="copy"></i></button>
            <button class="btn-action delete" title="Xóa" onclick="this.closest('tr').remove(); updateTotals();"><i data-lucide="trash-2"></i></button>
        </td>
    `;
    tbody.appendChild(newRow);
    window.lucide.createIcons();
    updateTotals();
}

export function updateTotals() {
    document.getElementById("modalTotalQuantity").textContent = document.getElementById("modalProductList").children.length;
}

// Make openSelectProductModal available for the onclick attribute
window.openSelectProductModal = openSelectProductModal;