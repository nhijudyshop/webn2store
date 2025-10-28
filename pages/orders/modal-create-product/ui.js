// pages/orders/modal-create-product/ui.js

import { initImageLightbox } from '../../../shared/components/image-lightbox/image-lightbox.js'; // Import lightbox initializer

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
                dropzone.classList.add('has-image');
                initImageLightbox(); // Re-initialize lightbox for new image
            };
            reader.readAsDataURL(file);
            
            event.preventDefault();
            break; 
        }
    }
}

export function updateRowNumbersProductModal() {
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

export function addProductRowProductModal() {
    const tbody = document.getElementById("newProductList");
    const newRow = document.createElement("tr");
    
    newRow.innerHTML = `
        <td></td>
        <td><input type="checkbox" class="product-code-toggle" checked onchange="this.closest('tr').querySelector('input[placeholder=\\'Mã SP\\']').disabled = this.checked;"></td>
        <td><input type="text" placeholder="Mã SP" disabled></td>
        <td><input type="text" placeholder="Tên sản phẩm"></td>
        <td><div class="tooltip-host tooltip-always-visible"><input type="text" value="0" oninput="window.handlePriceInput(event)"></div></td>
        <td><div class="tooltip-host tooltip-always-visible"><input type="text" value="0" oninput="window.handlePriceInput(event)"></div></td>
        <td class="image-cell">
            <div class="image-dropzone" tabindex="0"><i data-lucide="image"></i><span>Ctrl+V</span></div>
            <button class="btn-delete-image"><i data-lucide="x" style="width:14px; height:14px;"></i></button>
        </td>
        <td><input type="text" placeholder="VD: Size S, Màu đỏ" class="variant-input" readonly></td>
        <td class="action-cell">
            <button class="btn-action delete" title="Xóa" onclick="this.closest('tr').remove(); window.updateRowNumbersProductModal();"><i data-lucide="trash-2"></i></button>
        </td>
    `;
    tbody.appendChild(newRow);

    newRow.selectedVariants = {
        colors: new Set(),
        letterSizes: new Set(),
        numberSizes: new Set()
    };
    newRow.variantSelectionOrder = [];

    const dropzone = newRow.querySelector('.image-dropzone');
    const deleteBtn = newRow.querySelector('.btn-delete-image');

    dropzone.addEventListener('paste', handlePasteProductModal);
    dropzone.addEventListener('mouseenter', (e) => e.currentTarget.focus());
    dropzone.addEventListener('mouseleave', (e) => e.currentTarget.blur());

    deleteBtn.addEventListener('click', () => {
        dropzone.innerHTML = '<i data-lucide="image"></i><span>Ctrl+V</span>';
        dropzone.classList.remove('has-image');
        deleteBtn.style.display = 'none';
        window.lucide.createIcons();
        initImageLightbox(); // Re-initialize lightbox after image deletion
    });

    updateRowNumbersProductModal();
    window.lucide.createIcons();
    initImageLightbox(); // Re-initialize lightbox for new row images
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
        initImageLightbox(); // Initialize lightbox for modal images
    }
}

export function closeCreateProductModal() {
    const modal = document.getElementById("createProductModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// Expose to window for inline HTML attributes
window.updateRowNumbersProductModal = updateRowNumbersProductModal;