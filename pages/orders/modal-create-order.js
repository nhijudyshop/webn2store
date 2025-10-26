// pages/orders/modal-create-order.js

import { openSelectProductModal } from './modal-select-product.js';
import { getProductByCode } from '../../shared/api/tpos-api.js';
import { productSuggestions } from './state.js';
import { formatCurrency } from './ui.js';

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
        <td><input type="text" placeholder="Mã SP" list="productSuggestionsModal" oninput="window.updateProductCodeSuggestions(event)"></td>
        <td><input type="number" value="1" style="width: 60px;" oninput="window.updateTotals()"></td>
        <td><input type="number" value="0" oninput="window.updateTotals()"></td>
        <td><input type="number" value="0"></td>
        <td>0 ₫</td>
        <td><div class="image-dropzone"><i data-lucide="image"></i></div></td>
        <td><div class="image-dropzone"><i data-lucide="image"></i></div></td>
        <td><select><option>Chọn biến thể...</option></select></td>
        <td class="action-cell">
            <button class="btn-action" title="Gợi ý thông minh" onclick="window.fetchProductAndPopulateRow(event)"><i data-lucide="sparkles"></i></button>
            <button class="btn-action" title="Sao chép"><i data-lucide="copy"></i></button>
            <button class="btn-action delete" title="Xóa" onclick="this.closest('tr').remove(); window.updateTotals();"><i data-lucide="trash-2"></i></button>
        </td>
    `;
    tbody.appendChild(newRow);
    window.lucide.createIcons();
    updateTotals();
}

export function updateTotals() {
    const rows = document.getElementById("modalProductList").children;
    let subtotal = 0;

    for (const row of rows) {
        const qtyInput = row.querySelector('td:nth-child(4) input');
        const priceInput = row.querySelector('td:nth-child(5) input');
        const lineTotalCell = row.querySelector('td:nth-child(7)');

        const quantity = parseInt(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const lineTotal = quantity * price;

        subtotal += lineTotal;

        if (lineTotalCell) {
            lineTotalCell.textContent = formatCurrency(lineTotal);
        }
    }

    document.getElementById("modalTotalQuantity").textContent = rows.length;

    const subtotalEl = document.getElementById('modalSubtotal');
    const totalEl = document.getElementById('modalTotal');
    const discountInput = document.querySelector('.order-summary input[type="number"]');
    const shippingInput = document.querySelectorAll('.order-summary input[type="number"]')[1];

    const discount = parseFloat(discountInput.value) || 0;
    const shipping = parseFloat(shippingInput.value) || 0;

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (totalEl) totalEl.textContent = formatCurrency(subtotal - discount + shipping);
}

export function updateProductCodeSuggestions(event) {
    const query = event.target.value.toUpperCase().trim();
    const datalist = document.getElementById('productSuggestionsModal');
    if (!datalist) return;

    datalist.innerHTML = '';

    if (!query || !productSuggestions) return;

    const filtered = productSuggestions.filter(item => 
        item.code.toUpperCase().startsWith(query)
    );

    const suggestionsToShow = filtered.slice(0, 50);

    suggestionsToShow.forEach(item => {
        const option = document.createElement('option');
        option.value = item.code;
        option.textContent = `${item.code} - ${item.name}`;
        datalist.appendChild(option);
    });
}

export async function fetchProductAndPopulateRow(event) {
    const btn = event.currentTarget;
    const row = btn.closest('tr');
    const codeInput = row.querySelector('input[placeholder="Mã SP"]');
    const nameInput = row.querySelector('input[placeholder="Nhập tên sản phẩm"]');
    const purchasePriceInput = row.querySelector('td:nth-child(5) input');
    const salePriceInput = row.querySelector('td:nth-child(6) input');
    const variantSelect = row.querySelector('td:nth-child(10) select');

    const productCode = codeInput.value.trim();
    if (!productCode) {
        window.showNotification("Vui lòng nhập mã sản phẩm", "warning");
        return;
    }

    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i>';
    window.lucide.createIcons();

    try {
        const product = await getProductByCode(productCode);
        
        nameInput.value = product.Name;
        purchasePriceInput.value = product.PurchasePrice || 0;
        salePriceInput.value = product.ListPrice || 0;

        if (variantSelect && product.ProductVariants && product.ProductVariants.length > 0) {
            variantSelect.innerHTML = '<option value="">Chọn biến thể...</option>';
            product.ProductVariants.forEach(variant => {
                const option = document.createElement('option');
                option.value = variant.DefaultCode;
                option.textContent = variant.Name;
                option.dataset.purchasePrice = variant.StandardPrice || product.PurchasePrice || 0;
                option.dataset.salePrice = variant.PriceVariant || product.ListPrice || 0;
                variantSelect.appendChild(option);
            });

            variantSelect.onchange = (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                if (selectedOption.value) {
                    purchasePriceInput.value = selectedOption.dataset.purchasePrice;
                    salePriceInput.value = selectedOption.dataset.salePrice;
                    nameInput.value = selectedOption.textContent;
                    codeInput.value = selectedOption.value;
                } else {
                    nameInput.value = product.Name;
                    purchasePriceInput.value = product.PurchasePrice || 0;
                    salePriceInput.value = product.ListPrice || 0;
                    codeInput.value = product.DefaultCode;
                }
                updateTotals();
            };
        } else if (variantSelect) {
            variantSelect.innerHTML = '<option>Không có biến thể</option>';
        }

        window.showNotification(`Đã tải thông tin sản phẩm ${product.DefaultCode}`, "success");
        updateTotals();

    } catch (error) {
        window.showNotification(`Lỗi: ${error.message}`, "error");
    } finally {
        btn.innerHTML = '<i data-lucide="sparkles"></i>';
        window.lucide.createIcons();
    }
}

// Make openSelectProductModal available for the onclick attribute
window.openSelectProductModal = openSelectProductModal;