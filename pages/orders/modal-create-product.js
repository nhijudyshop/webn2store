// pages/orders/modal-create-product.js

import { loadProductSuggestions } from './api.js';

let variantData = { colors: [], letterSizes: [], numberSizes: [] };
let variantDataLoaded = false;
let activeVariantInput = null;

async function loadAllVariantData() {
    if (variantDataLoaded) return;
    try {
        const [colorsRes, letterSizesRes, numberSizesRes] = await Promise.all([
            fetch('/api/variants/colors'),
            fetch('/api/variants/sizes-letter'),
            fetch('/api/variants/sizes-number')
        ]);
        const colorsData = await colorsRes.json();
        const letterSizesData = await letterSizesRes.json();
        const numberSizesData = await numberSizesRes.json();

        if (colorsData.success) variantData.colors = colorsData.data;
        if (letterSizesData.success) variantData.letterSizes = letterSizesData.data;
        if (numberSizesData.success) variantData.numberSizes = numberSizesData.data;
        
        variantDataLoaded = true;
        console.log("✅ Variant data loaded");
    } catch (error) {
        console.error("❌ Error loading variant data:", error);
    }
}

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
        loadAllVariantData(); // Pre-load variant data
        window.lucide.createIcons();
    }
}

export function closeCreateProductModal() {
    const modal = document.getElementById("createProductModal");
    if (modal) {
        modal.style.display = "none";
    }
    closeVariantSelector();
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
        <td><input type="text" placeholder="VD: Size S, Màu đỏ" class="variant-input" readonly></td>
        <td class="action-cell">
            <button class="btn-action delete" title="Xóa" onclick="this.closest('tr').remove(); window.updateRowNumbersProductModal();"><i data-lucide="trash-2"></i></button>
        </td>
    `;
    tbody.appendChild(newRow);

    // Attach an object to the row to hold the state of selected variants
    newRow.selectedVariants = {
        colors: new Set(),
        letterSizes: new Set(),
        numberSizes: new Set()
    };
    newRow.variantSelectionOrder = [];

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
        const variantText = row.querySelector('td:nth-child(7) input').value.trim();

        if (code && name) {
            if (variantText) {
                name = `${name} ${variantText}`;
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

function openVariantSelector(inputElement) {
    activeVariantInput = inputElement;
    const panel = document.getElementById('variantSelector');
    const rect = inputElement.getBoundingClientRect();
    
    panel.style.top = `${rect.bottom + window.scrollY + 5}px`;
    panel.style.left = `${rect.left + window.scrollX}px`;

    populateVariantSelector();
    panel.classList.add('show');
}

function closeVariantSelector() {
    const panel = document.getElementById('variantSelector');
    if (panel) {
        panel.classList.remove('show');
    }
    activeVariantInput = null;
}

function populateVariantSelector() {
    if (!activeVariantInput) return;
    const row = activeVariantInput.closest('tr');
    const selected = row.selectedVariants;

    const createCheckboxes = (data, category, containerId) => {
        const container = document.getElementById(containerId);
        container.innerHTML = data.map(item => `
            <label>
                <input type="checkbox" data-category="${category}" value="${item.Name}" ${selected[category].has(item.Name) ? 'checked' : ''}>
                ${item.Name}
            </label>
        `).join('');
    };

    createCheckboxes(variantData.colors, 'colors', 'variantColors');
    createCheckboxes(variantData.letterSizes, 'letterSizes', 'variantLetterSizes');
    createCheckboxes(variantData.numberSizes, 'numberSizes', 'variantNumberSizes');
}

function handleVariantSelection(event) {
    const checkbox = event.target;
    if (checkbox.type !== 'checkbox' || !activeVariantInput) return;

    const row = activeVariantInput.closest('tr');
    const category = checkbox.dataset.category;
    const value = checkbox.value;

    if (checkbox.checked) {
        row.selectedVariants[category].add(value);
        // Add category to order if it's not there
        if (!row.variantSelectionOrder.includes(category)) {
            row.variantSelectionOrder.push(category);
        }
    } else {
        row.selectedVariants[category].delete(value);
        // If no items left in this category, remove it from the order
        if (row.selectedVariants[category].size === 0) {
            row.variantSelectionOrder = row.variantSelectionOrder.filter(
                (cat) => cat !== category
            );
        }
    }

    updateVariantInput();
}

function updateVariantInput() {
    if (!activeVariantInput) return;
    const row = activeVariantInput.closest('tr');
    
    const order = row.variantSelectionOrder;
    
    const parts = order.map(category => {
        const selectedSet = row.selectedVariants[category];
        if (selectedSet.size > 0) {
            return `(${[...selectedSet].join(' | ')})`;
        }
        return null;
    }).filter(part => part !== null);

    activeVariantInput.value = parts.join(' ');
}

// Expose functions to window for inline event handlers
window.updateRowNumbersProductModal = updateRowNumbersProductModal;

// Setup event listeners for the new modal
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeCreateProductModalBtn')?.addEventListener('click', closeCreateProductModal);
    document.getElementById('addProductRowProductModalBtn')?.addEventListener('click', addProductRowProductModal);
    document.getElementById('saveNewProductsBtn')?.addEventListener('click', saveNewProducts);

    // Event delegation for opening the variant selector
    document.getElementById('newProductList')?.addEventListener('focusin', (event) => {
        if (event.target.classList.contains('variant-input')) {
            openVariantSelector(event.target);
        }
    });

    // Event delegation for checkbox changes in the selector
    document.getElementById('variantSelector')?.addEventListener('change', handleVariantSelection);

    // Close selector when clicking outside
    document.addEventListener('click', (event) => {
        const panel = document.getElementById('variantSelector');
        if (panel && !panel.contains(event.target) && !event.target.classList.contains('variant-input')) {
            closeVariantSelector();
        }
    });
    document.querySelector('.btn-close-selector')?.addEventListener('click', closeVariantSelector);
});