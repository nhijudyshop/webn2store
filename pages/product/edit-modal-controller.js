import { tposRequest, getProductByCode } from '../../shared/api/tpos-api.js';
import { currentProduct, originalProductPayload, setOriginalProductPayload, setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { displayProductInfo, displayVariants } from './product-display.js';
import { saveProductData } from './product-storage.js';
import { editModalState, getCategoryFromAttributeId, updateVariantInput, openVariantSelector, variantData } from './variant-editor.js';
import { initImageLightbox } from '../../shared/components/image-lightbox/image-lightbox.js';

import { getImageAsBase64 } from './utils/image-utils.js';
import { buildAttributeLines, buildProductVariants } from './services/variant-generation.js';
import { updateVariantQuantitiesIfChanged } from './services/quantity-update-service.js';

export function recalculateTotalQuantities() {
  const variantRows = document.querySelectorAll('#editVariantsTableBody tr');
  let totalQty = 0;
  let totalVirtual = 0;

  variantRows.forEach(row => {
    const qtyDisplay = row.querySelectorAll('td .value-display')[0];
    const virtualDisplay = row.querySelectorAll('td .value-display')[1];
    if (qtyDisplay) totalQty += parseInt(qtyDisplay.textContent, 10) || 0;
    if (virtualDisplay) totalVirtual += parseInt(virtualDisplay.textContent, 10) || 0;
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
          />
        </td>
        <td>
          <input 
            type="number" 
            class="quantity-input" 
            data-field="VirtualAvailable"
            value="${variant.VirtualAvailable || 0}"
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
}

export function closeEditModal() {
  document.getElementById('editProductModal').style.display = 'none';
}

export async function saveProductChanges(event) {
  event.preventDefault();
  if (!currentProduct || !originalProductPayload) return;

  const btn = document.getElementById('saveChangesBtn');
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Đang lưu...';
  window.lucide.createIcons();

  try {
    const payload = JSON.parse(JSON.stringify(originalProductPayload));

    // Basic fields
    const newName = document.getElementById('editProductName').value;
    const newListPrice = parseFloat(document.getElementById('editListPrice').value) || 0;
    payload.Name = newName;
    payload.PurchasePrice = parseFloat(document.getElementById('editPurchasePrice').value) || 0;
    payload.ListPrice = newListPrice;
    payload.StandardPrice = payload.PurchasePrice;

    let imageUpdated = false;
    const imgElement = document.querySelector('#editImageDropzone img');
    if (imgElement && imgElement.src.startsWith('data:image')) {
      payload.Image = await getImageAsBase64(imgElement);
      payload.ImageUrl = null;
      if (payload.Images) payload.Images = [];
      imageUpdated = true;
    }

    // Collect variant edits
    const variantsTbody = document.getElementById('editVariantsTableBody');

    const editedNames = {};
    variantsTbody?.querySelectorAll('tr').forEach(row => {
      const id = parseInt(row.dataset.variantId, 10);
      const input = row.querySelector('.variant-name-input');
      if (!Number.isNaN(id) && input) {
        editedNames[id] = input.value.trim();
      }
    });

    const editedPrices = {};
    variantsTbody?.querySelectorAll('tr').forEach(row => {
      const id = parseInt(row.dataset.variantId, 10);
      const priceInput = row.querySelector('.price-input');
      if (!Number.isNaN(id) && priceInput) {
        const val = parseFloat(priceInput.value);
        if (!Number.isNaN(val)) {
          editedPrices[id] = val;
        }
      }
    });

    const editedQtyMap = {};
    variantsTbody?.querySelectorAll('tr').forEach(row => {
      const id = parseInt(row.dataset.variantId, 10);
      const qtyInput = row.querySelector('input.quantity-input[data-field="QtyAvailable"]');
      if (!Number.isNaN(id) && qtyInput) {
        const val = parseFloat(qtyInput.value);
        if (!Number.isNaN(val)) {
          editedQtyMap[id] = val;
        }
      }
    });

    const changedQtyMap = {};
    (currentProduct.ProductVariants || []).forEach(v => {
      const newQty = editedQtyMap[v.Id];
      const oldQty = v.QtyAvailable || 0;
      if (newQty !== undefined && newQty !== oldQty) {
        changedQtyMap[v.Id] = newQty;
      }
    });

    // Variant structure update if no stock
    const hasStock = currentProduct.ProductVariants && currentProduct.ProductVariants.some(v => (v.QtyAvailable || 0) > 0 || (v.VirtualAvailable || 0) > 0);

    if (!hasStock) {
      console.log("🔄 No stock found, regenerating variants based on new attributes...");
      payload.AttributeLines = buildAttributeLines(editModalState);
      payload.ProductVariants = buildProductVariants(newName, newListPrice, editModalState);
    } else {
      console.log("📦 Stock found, skipping variant structure update.");
      if (payload.ProductVariants) {
        payload.ProductVariants = payload.ProductVariants.map(v => {
          const nameEdited = editedNames[v.Id];
          const priceEdited = editedPrices[v.Id];
          if (nameEdited) {
            v.NameGet = nameEdited;
          }
          if (priceEdited !== undefined) {
            v.PriceVariant = priceEdited;
          }
          return v;
        });
      }
    }

    // Prevent quantity accidental updates
    if (payload.ProductVariants) {
      payload.ProductVariants.forEach(v => {
        delete v.QtyAvailable;
        delete v.VirtualAvailable;
      });
    }

    // Determine if non-quantity changes exist
    const topLevelChanged =
      (newName !== (currentProduct.Name || '')) ||
      (payload.PurchasePrice !== (currentProduct.PurchasePrice || 0)) ||
      (newListPrice !== (currentProduct.ListPrice || 0)) ||
      imageUpdated;

    const variantEditsExist = (currentProduct.ProductVariants || []).some(v => {
      const nameEdited = editedNames[v.Id];
      const priceEdited = editedPrices[v.Id];
      const currentName = v.NameGet || v.Name || '';
      const currentPrice = (typeof v.PriceVariant === 'number' ? v.PriceVariant :
                            (typeof v.ListPrice === 'number' ? v.ListPrice : 0));
      const nameChanged = (nameEdited !== undefined) && (nameEdited !== currentName);
      const priceChanged = (priceEdited !== undefined) && (priceEdited !== currentPrice);
      return nameChanged || priceChanged;
    });

    const requiresProductUpdate = !hasStock || topLevelChanged || variantEditsExist;

    // Try update product (name/price/image), independent of quantity flow
    if (requiresProductUpdate) {
      try {
        await tposRequest('/api/products/update', { method: 'POST', body: payload });
        console.log("✅ Product update request sent.");
      } catch (e) {
        console.warn("⚠️ Không thể cập nhật tên/giá qua API nội bộ:", e);
        window.showNotification("Không thể cập nhật tên/giá sản phẩm (API nội bộ chưa sẵn sàng). Vẫn tiếp tục cập nhật số lượng.", "warning");
      }
    } else {
      console.log("ℹ️ Chỉ thay đổi số lượng. Bỏ qua /api/products/update.");
    }

    // Always run last: quantity updates via 3-step flow
    if (Object.keys(changedQtyMap).length > 0) {
      try {
        window.showNotification("Đang cập nhật số lượng biến thể...", "info");
        await updateVariantQuantitiesIfChanged(currentProduct.Id, changedQtyMap);
        window.showNotification("Đã cập nhật số lượng biến thể!", "success");
      } catch (e) {
        console.error("Lỗi cập nhật số lượng biến thể:", e);
        window.showNotification("Lỗi khi cập nhật số lượng biến thể: " + (e?.message || e), "error");
      }
    }

    // Refresh UI with latest data
    const updatedProductData = await getProductByCode(currentProduct.DefaultCode);
    setOriginalProductPayload(updatedProductData);
    setCurrentProduct(updatedProductData);
    setCurrentVariants(updatedProductData.ProductVariants || []);
    displayProductInfo(updatedProductData);
    displayVariants(updatedProductData.ProductVariants || []);
    await saveProductData(updatedProductData);

    closeEditModal();
    window.showNotification("Đã cập nhật sản phẩm thành công!", "success");

  } catch (error) {
    window.showNotification("Lỗi khi cập nhật sản phẩm: " + error.message, "error");
    console.error("Update error:", error);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Lưu thay đổi';
    window.lucide.createIcons();
  }
}