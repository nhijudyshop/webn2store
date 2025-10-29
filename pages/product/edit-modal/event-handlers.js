// pages/product/edit-modal/event-handlers.js

import { tposRequest, getProductByCode } from '../../../shared/api/tpos-api.js';
import { currentProduct, originalProductPayload, setOriginalProductPayload, setCurrentProduct, setCurrentVariants } from '../inventory-state.js';
import { displayProductInfo, displayVariants } from '../product-display.js';
import { saveProductData } from '../product-storage.js';
import { editModalState } from '../variant-editor.js';

import { getImageAsBase64 } from '../utils/image-utils.js'; // Corrected path
import { buildAttributeLines, buildProductVariants } from '../services/variant-generation.js'; // Corrected path
import { updateVariantQuantitiesIfChanged } from '../services/quantity-update-service.js'; // Corrected path
import { quantityTransferState } from './state.js';
import { closeEditModal, updateTransferQuantitiesDisplay, renderQuantityTransferTab } from './ui-manager.js';


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

export function handleTransferQuantityChange(variantIndex, delta) {
  if (!quantityTransferState.variant1 || !quantityTransferState.variant2) {
    window.showNotification("Vui lòng chọn cả hai biến thể để chuyển đổi.", "warning");
    return;
  }

  let newQty1 = quantityTransferState.currentQty1;
  let newQty2 = quantityTransferState.currentQty2;

  if (variantIndex === 1) {
    newQty1 += delta;
    newQty2 -= delta;
  } else { // variantIndex === 2
    newQty2 += delta;
    newQty1 -= delta;
  }

  // Ensure quantities don't go below zero
  if (newQty1 < 0 || newQty2 < 0) {
    window.showNotification("Số lượng không thể nhỏ hơn 0.", "warning");
    return;
  }

  quantityTransferState.currentQty1 = newQty1;
  quantityTransferState.currentQty2 = newQty2;

  // Update changedQtyMap for saving
  quantityTransferState.changedQtyMap[quantityTransferState.variant1.Id] = newQty1;
  quantityTransferState.changedQtyMap[quantityTransferState.variant2.Id] = newQty2;

  updateTransferQuantitiesDisplay();
}

export async function saveQuantityTransfer() {
  if (!quantityTransferState.variant1 || !quantityTransferState.variant2) {
    window.showNotification("Vui lòng chọn cả hai biến thể để chuyển đổi.", "warning");
    return;
  }

  const saveBtn = document.getElementById('saveQuantityTransferBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Đang lưu...';
    window.lucide.createIcons();
  }

  try {
    await updateVariantQuantitiesIfChanged(currentProduct.Id, quantityTransferState.changedQtyMap);
    window.showNotification("Đã chuyển đổi số lượng thành công!", "success");
    
    // Refresh product data and UI
    const updatedProductData = await getProductByCode(currentProduct.DefaultCode);
    setOriginalProductPayload(updatedProductData);
    setCurrentProduct(updatedProductData);
    setCurrentVariants(updatedProductData.ProductVariants || []);
    displayProductInfo(updatedProductData);
    displayVariants(updatedProductData.ProductVariants || []);
    await saveProductData(updatedProductData);

    closeEditModal(); // Close modal after successful transfer
  } catch (error) {
    console.error("Lỗi khi lưu chuyển đổi số lượng:", error);
    window.showNotification("Lỗi khi lưu chuyển đổi số lượng: " + (error?.message || error), "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i data-lucide="save"></i> Lưu chuyển đổi số lượng';
      window.lucide.createIcons();
    }
  }
}