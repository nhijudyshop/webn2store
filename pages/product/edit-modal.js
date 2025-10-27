// pages/product/edit-modal.js

import { tposRequest, getProductByCode } from '../../shared/api/tpos-api.js';
import { currentProduct, originalProductPayload, setOriginalProductPayload, setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { displayProductInfo, displayParentProduct, displayVariants, updateStats } from './product-display.js';
import { saveProductData } from './product-storage.js';
import { editModalState, getCategoryFromAttributeId, updateVariantInput, openVariantSelector } from './variant-editor.js';

async function getImageAsBase64(imgElement) {
    if (!imgElement || !imgElement.src) {
        return null;
    }
    if (imgElement.src.startsWith('data:image')) {
        return imgElement.src.split(',')[1];
    }
    try {
        const response = await fetch(imgElement.src);
        if (!response.ok) throw new Error('Network response was not ok.');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting image to base64:", error);
        window.showNotification("Không thể chuyển đổi hình ảnh. Vui lòng thử lại.", "error");
        return null;
    }
}

export function recalculateTotalQuantities() {
    const variantRows = document.querySelectorAll('#editVariantsTableBody tr');
    let totalQty = 0;
    let totalVirtual = 0;

    variantRows.forEach(row => {
        const qtyInput = row.querySelector('input[data-field="QtyAvailable"]');
        const virtualInput = row.querySelector('input[data-field="VirtualAvailable"]');
        totalQty += parseInt(qtyInput.value, 10) || 0;
        totalVirtual += parseInt(virtualInput.value, 10) || 0;
    });

    document.getElementById('editQtyAvailable').textContent = totalQty;
    document.getElementById('editVirtualAvailable').textContent = totalVirtual;
}

export function handleImagePaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    const dropzone = event.currentTarget;
    for (let item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
                dropzone.innerHTML = `<img src="${e.target.result}" alt="Pasted image">`;
                dropzone.classList.add('has-image');
                document.getElementById('deleteEditImageBtn').style.display = 'flex';
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
        deleteBtn.style.display = 'flex';
    } else {
        dropzone.innerHTML = '<i data-lucide="image"></i><span>Ctrl+V</span>';
        dropzone.classList.remove('has-image');
        deleteBtn.style.display = 'none';
    }

    // Populate variants table
    const variantsTbody = document.getElementById('editVariantsTableBody');
    variantsTbody.innerHTML = '';
    if (currentProduct.ProductVariants && currentProduct.ProductVariants.length > 0) {
        currentProduct.ProductVariants.forEach(variant => {
            const row = document.createElement('tr');
            row.dataset.variantId = variant.Id;
            row.innerHTML = `
                <td style="text-align: left;">${variant.Name}</td>
                <td><span class="product-code">${variant.DefaultCode || '-'}</span></td>
                <td><input type="number" value="${variant.QtyAvailable || 0}" data-field="QtyAvailable" oninput="recalculateTotalQuantities()"></td>
                <td><input type="number" value="${variant.VirtualAvailable || 0}" data-field="VirtualAvailable" oninput="recalculateTotalQuantities()"></td>
            `;
            variantsTbody.appendChild(row);
        });
    }
    recalculateTotalQuantities();

    // Logic for disabling variant editing
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
        // Step 1: Update general product info (name, price, image)
        const infoPayload = JSON.parse(JSON.stringify(originalProductPayload));
        infoPayload.Name = document.getElementById('editProductName').value;
        infoPayload.PurchasePrice = parseFloat(document.getElementById('editPurchasePrice').value) || 0;
        infoPayload.ListPrice = parseFloat(document.getElementById('editListPrice').value) || 0;
        infoPayload.StandardPrice = infoPayload.PurchasePrice;

        const imgElement = document.querySelector('#editImageDropzone img');
        if (imgElement && imgElement.src.startsWith('data:image')) {
            infoPayload.Image = await getImageAsBase64(imgElement);
            infoPayload.ImageUrl = null;
            if (infoPayload.Images) infoPayload.Images = [];
        }
        // We no longer send quantity fields in this payload
        if (infoPayload.ProductVariants) {
            infoPayload.ProductVariants.forEach(v => {
                delete v.QtyAvailable;
                delete v.VirtualAvailable;
            });
        }

        await tposRequest('/api/products/update', { method: 'POST', body: infoPayload });
        console.log("✅ Product info updated.");

        // Step 2: Update stock quantities for changed variants
        const stockUpdatePromises = [];
        const variantRows = document.querySelectorAll('#editVariantsTableBody tr');
        
        variantRows.forEach(row => {
            const variantId = parseInt(row.dataset.variantId, 10);
            const originalVariant = currentProduct.ProductVariants.find(v => v.Id === variantId);
            if (!originalVariant) return;

            const newQty = parseInt(row.querySelector('input[data-field="QtyAvailable"]').value, 10) || 0;
            const originalQty = originalVariant.QtyAvailable || 0;

            if (newQty !== originalQty) {
                console.log(`🔄 Scheduling stock update for variant ${variantId}: ${originalQty} -> ${newQty}`);
                stockUpdatePromises.push(
                    tposRequest('/api/stock/update', {
                        method: 'POST',
                        body: { productId: variantId, newQuantity: newQty }
                    })
                );
            }
        });

        if (stockUpdatePromises.length > 0) {
            await Promise.all(stockUpdatePromises);
            console.log(`✅ ${stockUpdatePromises.length} stock quantities updated.`);
        }

        // Step 3: Fetch fresh data and update UI
        const updatedProductData = await getProductByCode(currentProduct.DefaultCode);
        
        setOriginalProductPayload(updatedProductData);
        setCurrentProduct(updatedProductData);
        setCurrentVariants(updatedProductData.ProductVariants || []);
        displayProductInfo(updatedProductData);
        displayParentProduct(updatedProductData);
        displayVariants(updatedProductData.ProductVariants || []);
        updateStats(updatedProductData);
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