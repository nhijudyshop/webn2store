// pages/orders/modal-create-order.js

import { getProductByCode } from '../../shared/api/tpos-api.js';
import { productSuggestions } from './state.js';
import { formatCurrency } from './ui.js';
import { saveOrders, loadOrders } from './api.js';

/**
 * Handles pasting an image from the clipboard into a dropzone.
 * @param {ClipboardEvent} event - The paste event.
 */
function handlePaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    const dropzone = event.currentTarget;

    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                
                dropzone.innerHTML = '';
                dropzone.appendChild(img);
            };
            reader.readAsDataURL(file);
            
            event.preventDefault();
            break; 
        }
    }
}

/**
 * Updates the row numbers (STT column) in the product table.
 */
function updateRowNumbers() {
    const tbody = document.getElementById("modalProductList");
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const firstCell = row.querySelector('td:first-child');
        if (firstCell) {
            firstCell.textContent = index + 1;
        }
    });
}

export function createOrder() {
    const modal = document.getElementById("createOrderModal");
    if (modal) {
        modal.style.display = "flex";
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('orderDateInput').value = today;
        if (document.getElementById("modalProductList").children.length === 0) {
            addProductRow();
        }

        // Add paste listener to the main invoice dropzone
        const mainDropzone = modal.querySelector('.order-info-grid .image-dropzone');
        if (mainDropzone && !mainDropzone.dataset.pasteListenerAdded) {
            mainDropzone.addEventListener('paste', handlePaste);
            mainDropzone.dataset.pasteListenerAdded = 'true';
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
    
    newRow.innerHTML = `
        <td></td>
        <td><input type="text" placeholder="Mã SP" list="productSuggestionsModal" oninput="window.updateProductCodeSuggestions(event)"></td>
        <td><input type="text" placeholder="Nhập tên sản phẩm" oninput="this.title = this.value"></td>
        <td><input type="number" value="1" style="width: 60px;" oninput="window.updateTotals()"></td>
        <td><input type="number" value="0" oninput="window.updateTotals()"></td>
        <td><input type="number" value="0"></td>
        <td>0 ₫</td>
        <td><div class="image-dropzone"><i data-lucide="image"></i></div></td>
        <td><div class="image-dropzone"><i data-lucide="image"></i></div></td>
        <td><select><option>Chọn biến thể...</option></select></td>
        <td class="action-cell">
            <button class="btn-action" title="Gợi ý thông minh" onclick="window.fetchProductAndPopulateRow(event)"><i data-lucide="sparkles"></i></button>
            <button class="btn-action delete" title="Xóa" onclick="window.deleteProductRow(event)"><i data-lucide="trash-2"></i></button>
        </td>
    `;
    tbody.appendChild(newRow);

    const dropzones = newRow.querySelectorAll('.image-dropzone');
    dropzones.forEach(dz => dz.addEventListener('paste', handlePaste));

    updateRowNumbers();
    window.lucide.createIcons();
    updateTotals();
}

export function deleteProductRow(event) {
    const btn = event.currentTarget;
    const row = btn.closest('tr');
    if (row) {
        row.remove();
        updateTotals();
        updateRowNumbers();
    }
}

export function updateTotals() {
    const rows = document.getElementById("modalProductList").children;
    let subtotal = 0;
    let totalQuantity = 0;

    for (const row of rows) {
        const qtyInput = row.querySelector('td:nth-child(4) input');
        const priceInput = row.querySelector('td:nth-child(5) input');
        const lineTotalCell = row.querySelector('td:nth-child(7)');

        const quantity = parseInt(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const lineTotal = quantity * price;

        subtotal += lineTotal;
        totalQuantity += quantity;

        if (lineTotalCell) {
            lineTotalCell.textContent = formatCurrency(lineTotal);
        }
    }

    document.getElementById("modalTotalQuantity").textContent = totalQuantity;

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
    const imageDropzone = row.querySelector('td:nth-child(8) .image-dropzone');

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
        nameInput.title = product.Name;
        purchasePriceInput.value = product.PurchasePrice || 0;
        salePriceInput.value = product.ListPrice || 0;

        if (imageDropzone && product.ImageUrl) {
            imageDropzone.innerHTML = `<img src="${product.ImageUrl}" alt="${product.Name}" onerror="this.parentElement.innerHTML = '<i data-lucide=\\'image-off\\'></i>'; window.lucide.createIcons();">`;
        }

        if (variantSelect && product.ProductVariants && product.ProductVariants.length > 0) {
            variantSelect.innerHTML = '<option value="">Chọn biến thể...</option>';
            product.ProductVariants.forEach(variant => {
                const option = document.createElement('option');
                option.value = variant.DefaultCode;
                option.textContent = variant.Name;
                option.title = variant.Name;
                option.dataset.purchasePrice = variant.StandardPrice || product.PurchasePrice || 0;
                option.dataset.salePrice = variant.PriceVariant || product.ListPrice || 0;
                variantSelect.appendChild(option);
            });

            variantSelect.onchange = (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                variantSelect.title = selectedOption.textContent;
                if (selectedOption.value) {
                    purchasePriceInput.value = selectedOption.dataset.purchasePrice;
                    salePriceInput.value = selectedOption.dataset.salePrice;
                    nameInput.value = selectedOption.textContent;
                    nameInput.title = selectedOption.textContent;
                    codeInput.value = selectedOption.value;
                } else {
                    nameInput.value = product.Name;
                    nameInput.title = product.Name;
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

export async function submitOrder() {
    const modal = document.getElementById("createOrderModal");
    const supplier = modal.querySelector('input[placeholder="Nhập tên nhà cung cấp"]').value.trim();
    const orderDateValue = modal.querySelector('#orderDateInput').value;
    const invoiceAmount = modal.querySelector('input[placeholder="Nhập số tiền VND"]').value;
    const note = modal.querySelector('textarea').value.trim();
    const productRows = modal.querySelectorAll('#modalProductList tr');
    const invoiceImageDropzone = modal.querySelector('.order-info-grid .image-dropzone img');
    const invoiceImageUrl = invoiceImageDropzone ? invoiceImageDropzone.src : null;

    if (!supplier) {
        window.showNotification("Vui lòng nhập tên nhà cung cấp", "error");
        return;
    }
    if (productRows.length === 0) {
        window.showNotification("Vui lòng thêm ít nhất một sản phẩm", "error");
        return;
    }

    const newOrders = [];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const date = new Date(orderDateValue).toLocaleDateString('vi-VN');

    let totalQtyForSupplier = 0;
    productRows.forEach(row => {
        totalQtyForSupplier += parseInt(row.querySelector('td:nth-child(4) input').value) || 0;
    });

    productRows.forEach(row => {
        const productCode = row.querySelector('td:nth-child(2) input').value.trim();
        const productName = row.querySelector('td:nth-child(3) input').value.trim();
        const quantity = parseInt(row.querySelector('td:nth-child(4) input').value) || 0;
        const purchasePrice = parseFloat(row.querySelector('td:nth-child(5) input').value) || 0;
        const salePrice = parseFloat(row.querySelector('td:nth-child(6) input').value) || 0;
        const variantSelect = row.querySelector('td:nth-child(10) select');
        const variant = variantSelect.selectedIndex > 0 ? variantSelect.options[variantSelect.selectedIndex].text : '-';
        
        const productImageDropzone = row.querySelector('td:nth-child(8) .image-dropzone img');
        const purchasePriceImageDropzone = row.querySelector('td:nth-child(9) .image-dropzone img');

        const productImageUrl = productImageDropzone ? productImageDropzone.src : null;
        const purchasePriceImageUrl = purchasePriceImageDropzone ? purchasePriceImageDropzone.src : null;

        if (!productName || quantity === 0) {
            return; // Skip empty rows
        }

        const order = {
            id: Date.now() + Math.random(), // Simple unique ID
            date: date,
            time: time,
            rawDate: new Date(`${orderDateValue}T${time}`), // For sorting
            supplier: supplier,
            totalQty: totalQtyForSupplier, // This is for the whole supplier order, repeated
            invoice: formatCurrency(invoiceAmount),
            invoiceImageUrl: invoiceImageUrl,
            productName: productName,
            productCode: productCode,
            variant: variant,
            quantity: quantity,
            purchasePrice: formatCurrency(purchasePrice),
            salePrice: formatCurrency(salePrice),
            note: note,
            status: 'waiting',
            productImageUrl: productImageUrl,
            purchasePriceImageUrl: purchasePriceImageUrl
        };
        newOrders.push(order);
    });

    if (newOrders.length === 0) {
        window.showNotification("Không có sản phẩm hợp lệ để tạo đơn hàng", "error");
        return;
    }

    const success = await saveOrders(newOrders);
    if (success) {
        window.showNotification(`Đã tạo thành công ${newOrders.length} mục đơn hàng!`, "success");
        closeCreateOrderModal();
        clearOrderForm();
        await loadOrders();
    } else {
        window.showNotification("Có lỗi xảy ra khi lưu đơn hàng.", "error");
    }
}

// Expose functions to window for inline event handlers
window.deleteProductRow = deleteProductRow;