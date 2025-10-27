// pages/orders/modal-create-product.js

import { loadProductSuggestions } from './api.js';

function handlePasteProductModal(event) {
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

function updateRowNumbersProductModal() {
    const tbody = document.getElementById("newProductList");
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const firstCell = row.querySelector('td:first-child');
        if (firstCell) {
            firstCell.textContent = index + 1;
        }
    });
}

export function openCreateProductModal() {
    const modal = document.getElementById("createProductModal");
    if (modal) {
        modal.style.display = "flex";
        const tbody = document.getElementById("newProductList");
        if (tbody.children.length === 0) {
            addProductRowProductModal();
        }
        window.lucide.createIcons();
    }
}

export function closeCreateProductModal() {
    const modal = document.getElementById("createProductModal");
    if (modal) {
        modal.style.display = "none";
    }
}

export function addProductRowProductModal() {
    const tbody = document.getElementById("newProductList");
    const newRow = document.createElement("tr");
    
    newRow.innerHTML = `
        <td></td>
        <td><input type="text" placeholder="Mã SP"></td>
        <td><input type="text" placeholder="Tên sản phẩm"></td>
        <td><input type="number" value="0"></td>
        <td><input type="number" value="0"></td>
        <td><div class="image-dropzone"><i data-lucide="image"></i></div></td>
        <td><input type="text" placeholder="VD: Size S, Màu đỏ"></td>
        <td class="action-cell">
            <button class="btn-action delete" title="Xóa" onclick="this.closest('tr').remove(); window.updateRowNumbersProductModal();"><i data-lucide="trash-2"></i></button>
        </td>
    `;
    tbody.appendChild(newRow);

    const dropzone = newRow.querySelector('.image-dropzone');
    dropzone.addEventListener('paste', handlePasteProductModal);

    updateRowNumbersProductModal();
    window.lucide.createIcons();
}

export async function saveNewProducts() {
    const rows = document.querySelectorAll('#newProductList tr');
    const newProducts = [];

    rows.forEach(row => {
        const code = row.querySelector('td:nth-child(2) input').value.trim();
        let name = row.querySelector('td:nth-child(3) input').value.trim();
        const variant = row.querySelector('td:nth-child(7) input').value.trim();

        if (code && name) {
            if (variant) {
                name = `${name} (${variant})`;
            }
            newProducts.push({ code, name });
        }
    });

    if (newProducts.length === 0) {
        window.showNotification("Không có sản phẩm nào để lưu.", "warning");
        return;
    }

    try {
        const response = await fetch('/api/products/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProducts)
        });
        const result = await response.json();
        if (result.success) {
            window.showNotification(`Đã lưu thành công ${result.added} sản phẩm mới!`, "success");
            closeCreateProductModal();
            await loadProductSuggestions(); // Refresh client-side suggestions
        } else {
            throw new Error(result.error || 'Lỗi không xác định từ server');
        }
    } catch (error) {
        console.error('Error saving new products:', error);
        window.showNotification(`Lỗi khi lưu sản phẩm: ${error.message}`, "error");
    }
}

// Expose functions to window for inline event handlers
window.updateRowNumbersProductModal = updateRowNumbersProductModal;

// Setup event listeners for the new modal
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeCreateProductModalBtn')?.addEventListener('click', closeCreateProductModal);
    document.getElementById('addProductRowProductModalBtn')?.addEventListener('click', addProductRowProductModal);
    document.getElementById('saveNewProductsBtn')?.addEventListener('click', saveNewProducts);
});