// pages/product/edit-modal/ui-manager.js

import { currentProduct, originalProductPayload } from '../inventory-state.js';
import { editModalState, getCategoryFromAttributeId, updateVariantInput, openVariantSelector, variantData } from '../variant-editor.js';
import { initImageLightbox } from '../../../shared/components/image-lightbox/image-lightbox.js';
import { getImageAsBase64 } from '../utils/image-utils.js'; // Corrected path
import { quantityTransferState } from './state.js';

export function recalculateTotalQuantities() {
  const variantRows = document.querySelectorAll('#editVariantsTableBody tr');
  let totalQty = 0;
  let totalVirtual = 0;

  variantRows.forEach(row => {
    const qtyInput = row.querySelector('input.quantity-input[data-field="QtyAvailable"]');
    const virtualInput = row.querySelector('input.quantity-input[data-field="VirtualAvailable"]');
    if (qtyInput) totalQty += parseInt(qtyInput.value, 10) || 0;
    if (virtualInput) totalVirtual += parseInt(virtualInput.value, 10) || 0;
  });

  document.getElementById('editQtyAvailable').textContent = totalQty;
  document.getElementById('editVirtualAvailable').textContent = totalVirtual;
}

export function handleImagePaste(event) {
  const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items;
  const dropzone = event.currentTarget;
  if (!items) return;
  for (let item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      const reader = new FileReader();
      reader.onload = (e) => {
        dropzone.innerHTML = `<img src="${e.target.result}" alt="Pasted image">`;
        dropzone.classList.add('has-image');
        const delBtn = document.getElementById('deleteEditImageBtn');
        if (delBtn) delBtn.style.display = 'flex';
        initImageLightbox();
      };
      reader.readAsDataURL(file);
      event.preventDefault();
      break;
    }
  }
}

export function activateModalTab(tabId) {
  document.querySelectorAll('#editProductModal .modal-tab-button').forEach(button => {
    button.classList.remove('active');
  });
  document.querySelectorAll('#editProductModal .modal-tab-content').forEach(content => {
    content.classList.remove('active');
  });

  document.querySelector(`#editProductModal .modal-tab-button[data-tab="${tabId}"]`)?.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');

  // Show/hide appropriate footer button
  const saveChangesBtn = document.getElementById('saveChangesBtn');
  const saveQuantityTransferBtn = document.getElementById('saveQuantityTransferBtn');

  if (tabId === 'general-info') {
    if (saveChangesBtn) saveChangesBtn.style.display = 'block';
    if (saveQuantityTransferBtn) saveQuantityTransferBtn.style.display = 'none';
  } else if (tabId === 'quantity-transfer') {
    if (saveChangesBtn) saveChangesBtn.style.display = 'none';
    if (saveQuantityTransferBtn) saveQuantityTransferBtn.style.display = 'block';
    renderQuantityTransferTab(); // Render content for the new tab
  }
  window.lucide.createIcons();
}

export function populateTransferVariantSelect(selectElement, excludeVariantId = null) {
  selectElement.innerHTML = '<option value="">-- Chọn biến thể --</option>';
  if (currentProduct && currentProduct.ProductVariants) {
    currentProduct.ProductVariants.forEach(variant => {
      if (variant.Id !== excludeVariantId) {
        const option = document.createElement('option');
        option.value = variant.Id;
        option.textContent = variant.NameGet || variant.Name;
        selectElement.appendChild(option);
      }
    });
  }
}

export function updateTransferQuantitiesDisplay() {
  const qty1El = document.getElementById('transferQty1');
  const qty2El = document.getElementById('transferQty2');
  const saveBtn = document.getElementById('saveQuantityTransferBtn');

  if (qty1El) qty1El.textContent = quantityTransferState.currentQty1;
  if (qty2El) qty2El.textContent = quantityTransferState.currentQty2;

  // Enable save button if quantities have changed from initial
  const changed = quantityTransferState.currentQty1 !== quantityTransferState.initialQty1 ||
                  quantityTransferState.currentQty2 !== quantityTransferState.initialQty2;
  if (saveBtn) saveBtn.disabled = !changed;
}

export function renderQuantityTransferTab() {
  const select1 = document.getElementById('transferVariant1');
  const select2 = document.getElementById('transferVariant2');

  // Reset state
  quantityTransferState.variant1 = null;
  quantityTransferState.variant2 = null;
  quantityTransferState.initialQty1 = 0;
  quantityTransferState.initialQty2 = 0;
  quantityTransferState.currentQty1 = 0;
  quantityTransferState.currentQty2 = 0;
  quantityTransferState.changedQtyMap = {};

  // Populate selects
  populateTransferVariantSelect(select1);
  populateTransferVariantSelect(select2);

  // Update display
  updateTransferQuantitiesDisplay();
}

export function openEditModal() {
  if (!currentProduct) {
    window.showNotification("Chưa có sản phẩm nào được chọn.", "error");
    return;
  }

  // Reset and populate variant state
  editModalState.selectedVariants = { colors: new Set(), letterSizes: new Set(), numberSizes: new Set() };
  editModalState.variantSelectionOrder = [];

  if (currentProduct.AttributeLines && currentProduct.AttributeLines.length > 0) {
    currentProduct.AttributeLines.forEach(line => {
      const category = getCategoryFromAttributeId(line.AttributeId);
      if (category) {
        if (!editModalState.variantSelectionOrder.includes(category)) {
          editModalState.variantSelectionOrder.push(category);
        }
        if (line.Values && Array.isArray(line.Values)) {
          line.Values.forEach(value => editModalState.selectedVariants[category].add(value.Name));
        }
      }
    });
  } else if (currentProduct.ProductVariants && currentProduct.ProductVariants.length > 0) {
    const attributeOrderMap = { 'Màu': 1, 'Size Chữ': 2, 'Size Số': 3 };
    const foundCategories = new Map();
    currentProduct.ProductVariants.forEach(variant => {
      if (variant.AttributeValues && Array.isArray(variant.AttributeValues)) {
        variant.AttributeValues.forEach(attrValue => {
          let category = getCategoryFromAttributeId(attrValue.AttributeId);
          if (category) {
            if (!foundCategories.has(category)) {
              foundCategories.set(category, attributeOrderMap[attrValue.AttributeName] || 99);
            }
            editModalState.selectedVariants[category].add(attrValue.Name);
          }
        });
      }
    });
    editModalState.variantSelectionOrder = [...foundCategories.keys()].sort((a, b) => foundCategories.get(a) - foundCategories.get(b));
  }

  // Populate form fields
  document.getElementById('editProductName').value = currentProduct.Name || '';
  document.getElementById('editPurchasePrice').value = currentProduct.PurchasePrice || 0;
  document.getElementById('editListPrice').value = currentProduct.ListPrice || 0;

  const dropzone = document.getElementById('editImageDropzone');
  const deleteBtn = document.getElementById('deleteEditImageBtn');
  if (currentProduct.ImageUrl) {
    dropzone.innerHTML = `<img src="${currentProduct.ImageUrl}" alt="${currentProduct.Name}">`;
    dropzone.classList.add('has-image');
    if (deleteBtn) deleteBtn.style.display = 'flex';
  } else {
    dropzone.innerHTML = '<i data-lucide="image"></i><span>Ctrl+V</span>';
    dropzone.classList.remove('has-image');
    if (deleteBtn) deleteBtn.style.display = 'none';
  }

  // Populate variants table
  const variantsTbody = document.getElementById('editVariantsTableBody');
  variantsTbody.innerHTML = '';
  if (currentProduct.ProductVariants && currentProduct.ProductVariants.length > 0) {
    currentProduct.ProductVariants.forEach(variant => {
      const row = document.createElement('tr');
      row.dataset.variantId = variant.Id;
      row.innerHTML = `
        <td style="text-align: left;">
          <input 
            type="text" 
            class="variant-name-input" 
            value="${variant.NameGet || variant.Name || ''}" 
            style="width: 100%;"
          />
        </td>
        <td><span class="product-code">${variant.DefaultCode || '-'}</span></td>
        <td>
          <input 
            type="number" 
            class="price-input" 
            data-field="PriceVariant"
            step="any"
            value="${typeof variant.PriceVariant === 'number' ? variant.PriceVariant : (typeof variant.ListPrice === 'number' ? variant.ListPrice : 0)}"
          />
        </td>
        <td>
          <input 
            type="number" 
            class="quantity-input" 
            data-field="QtyAvailable"
            value="${variant.QtyAvailable || 0}"
            disabled
          />
        </td>
        <td>
          <input 
            type="number" 
            class="quantity-input" 
            data-field="VirtualAvailable"
            value="${variant.VirtualAvailable || 0}"
            disabled
          />
        </td>
      `;
      variantsTbody.appendChild(row);
    });
  }
  recalculateTotalQuantities();

  // Disable variant structure editing if any stock exists
  const hasStock = currentProduct.ProductVariants && currentProduct.ProductVariants.some(v => (v.QtyAvailable || 0) > 0 || (v.VirtualAvailable || 0) > 0);
  const editVariantsInput = document.getElementById('editVariants');
  const newEditVariantsInput = editVariantsInput.cloneNode(true);
  editVariantsInput.parentNode.replaceChild(newEditVariantsInput, editVariantsInput);

  if (hasStock) {
    newEditVariantsInput.disabled = true;
    newEditVariantsInput.style.cursor = 'not-allowed';
    newEditVariantsInput.addEventListener('click', () => {
      window.showNotification("Biến thể đã có số lượng, vui lòng vào TPOS chỉnh sửa.", "warning");
    });
  } else {
    newEditVariantsInput.disabled = false;
    newEditVariantsInput.style.cursor = '';
    newEditVariantsInput.addEventListener('focusin', () => openVariantSelector(newEditVariantsInput));
  }
  updateVariantInput(newEditVariantsInput, editModalState);

  document.getElementById('editProductModal').style.display = 'flex';
  window.lucide.createIcons();
  initImageLightbox();

  // Setup tab switching
  document.querySelectorAll('#editProductModal .modal-tab-button').forEach(button => {
    button.onclick = () => activateModalTab(button.dataset.tab);
  });
  activateModalTab('general-info'); // Default to general info tab
}

export function closeEditModal() {
  document.getElementById('editProductModal').style.display = 'none';
}