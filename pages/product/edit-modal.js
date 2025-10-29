// pages/product/edit-modal.js

import { tposRequest, getProductByCode } from '../../shared/api/tpos-api.js';
import { currentProduct, originalProductPayload, setOriginalProductPayload, setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { displayProductInfo, displayVariants } from './product-display.js';
import { saveProductData } from './product-storage.js';
import { editModalState, getCategoryFromAttributeId, updateVariantInput, openVariantSelector, variantData } from './variant-editor.js';
import { initImageLightbox } from '../../shared/components/image-lightbox/image-lightbox.js'; // Import lightbox initializer

// ===== Helper functions for variant generation (adapted from create-product modal) =====

function getAttributeId(category) {
    switch (category) {
        case 'colors': return 3;
        case 'letterSizes': return 1;
        case 'numberSizes': return 4;
        default: return 0;
    }
}

function buildAttributeLines(state) {
    const attributeLines = [];
    const { selectedVariants, variantSelectionOrder } = state;

    for (const category of variantSelectionOrder) {
        const selectedSet = selectedVariants[category];
        if (selectedSet.size > 0) {
            const attributeId = getAttributeId(category);
            const values = [...selectedSet].map(name => {
                return variantData[category].find(v => v.Name === name);
            }).filter(Boolean);

            if (values.length > 0) {
                attributeLines.push({
                    Attribute: { Id: attributeId },
                    Values: values,
                    AttributeId: attributeId
                });
            }
        }
    }
    return attributeLines;
}

function cartesian(...args) {
    const r = [], max = args.length - 1;
    function helper(arr, i) {
        for (let j = 0, l = args[i].length; j < l; j++) {
            const a = arr.slice(0);
            a.push(args[i][j]);
            if (i === max)
                r.push(a);
            else
                helper(a, i + 1);
        }
    }
    helper([], 0);
    return r;
}

function buildProductVariants(productName, listPrice, state) {
    const { selectedVariants, variantSelectionOrder } = state;

    const variantGroups = variantSelectionOrder
        .map(category => [...selectedVariants[category]])
        .filter(group => group.length > 0);

    if (variantGroups.length === 0) return [];

    const combinations = cartesian(...variantGroups);

    return combinations.map(combo => {
        const variantName = `${productName} (${combo.join(', ')})`;
        const attributeValues = combo.map(valueName => {
            for (const category of variantSelectionOrder) {
                const variant = variantData[category].find(v => v.Name === valueName);
                if (variant) return variant;
            }
            return null;
        }).filter(Boolean);

        return {
            Id: 0, EAN13: null, DefaultCode: null, NameTemplate: productName, NameNoSign: null, ProductTmplId: 0, UOMId: 0, UOMName: null, UOMPOId: 0, QtyAvailable: 0, VirtualAvailable: 0, OutgoingQty: null, IncomingQty: null, NameGet: variantName, POSCategId: null, Price: null, Barcode: null, Image: null, ImageUrl: null, Thumbnails: [], PriceVariant: listPrice, SaleOK: true, PurchaseOK: true, DisplayAttributeValues: null, LstPrice: 0, Active: true, ListPrice: 0, PurchasePrice: null, DiscountSale: null, DiscountPurchase: null, StandardPrice: 0, Weight: 0, Volume: null, OldPrice: null, IsDiscount: false, ProductTmplEnableAll: false, Version: 0, Description: null, LastUpdated: null, Type: "product", CategId: 0, CostMethod: null, InvoicePolicy: "order", Variant_TeamId: 0, Name: variantName, PropertyCostMethod: null, PropertyValuation: null, PurchaseMethod: "receive", SaleDelay: 0, Tracking: null, Valuation: null, AvailableInPOS: true, CompanyId: null, IsCombo: null, NameTemplateNoSign: productName, TaxesIds: [], StockValue: null, SaleValue: null, PosSalesCount: null, Factor: null, CategName: null, AmountTotal: null, NameCombos: [], RewardName: null, Product_UOMId: null, Tags: null, DateCreated: null, InitInventory: 0, OrderTag: null, StringExtraProperties: null, CreatedById: null, TaxAmount: null, Error: null,
            AttributeValues: attributeValues
        };
    });
}


// ===== Main Modal Logic =====

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
        const qtyDisplay = row.querySelectorAll('td .value-display')[0];
        const virtualDisplay = row.querySelectorAll('td .value-display')[1];
        if (qtyDisplay) totalQty += parseInt(qtyDisplay.textContent, 10) || 0;
        if (virtualDisplay) totalVirtual += parseInt(virtualDisplay.textContent, 10) || 0;
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
                initImageLightbox(); // Re-initialize lightbox for new image
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
    initImageLightbox(); // Initialize lightbox for modal images
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
        // --- Logic for updating product info (name, price, variants, etc.) ---
        const payload = JSON.parse(JSON.stringify(originalProductPayload));
        let productInfoChanged = false;

        const newName = document.getElementById('editProductName').value;
        const newListPrice = parseFloat(document.getElementById('editListPrice').value) || 0;
        const newPurchasePrice = parseFloat(document.getElementById('editPurchasePrice').value) || 0;

        if (payload.Name !== newName) { payload.Name = newName; productInfoChanged = true; }
        if (payload.ListPrice !== newListPrice) { payload.ListPrice = newListPrice; productInfoChanged = true; }
        if (payload.PurchasePrice !== newPurchasePrice) { 
            payload.PurchasePrice = newPurchasePrice; 
            payload.StandardPrice = newPurchasePrice;
            productInfoChanged = true; 
        }

        const imgElement = document.querySelector('#editImageDropzone img');
        if (imgElement && imgElement.src.startsWith('data:image')) {
            payload.Image = await getImageAsBase64(imgElement);
            payload.ImageUrl = null;
            if (payload.Images) payload.Images = [];
            productInfoChanged = true;
        }

        const hasStock = currentProduct.ProductVariants && currentProduct.ProductVariants.some(v => (v.QtyAvailable || 0) > 0 || (v.VirtualAvailable || 0) > 0);
        if (!hasStock) {
            const newAttributeLines = buildAttributeLines(editModalState);
            // A simple way to check for changes in variant structure
            if (JSON.stringify(payload.AttributeLines.map(l => l.AttributeId).sort()) !== JSON.stringify(newAttributeLines.map(l => l.AttributeId).sort()) ||
                JSON.stringify(payload.AttributeLines.flatMap(l => l.Values.map(v => v.Id)).sort()) !== JSON.stringify(newAttributeLines.flatMap(l => l.Values.map(v => v.Id)).sort())) {
                console.log("🔄 Variant structure changed, regenerating variants...");
                payload.AttributeLines = newAttributeLines;
                payload.ProductVariants = buildProductVariants(newName, newListPrice, editModalState);
                productInfoChanged = true;
            }
        }

        if (productInfoChanged) {
            console.log("ℹ️ Product info changed, sending update request...");
            if (payload.ProductVariants) {
                payload.ProductVariants.forEach(v => {
                    delete v.QtyAvailable;
                    delete v.VirtualAvailable;
                });
            }
            await tposRequest('/api/products/update', { method: 'POST', body: payload });
            console.log("✅ Product info update request sent.");
        }

        // --- Logic for updating inventory quantities ---
        const quantityUpdates = [];
        const variantRows = document.querySelectorAll('#editVariantsTableBody tr');
        variantRows.forEach(row => {
            const variantId = parseInt(row.dataset.variantId, 10);
            const originalVariant = currentProduct.ProductVariants.find(v => v.Id === variantId);
            
            const newQtyAvailable = parseInt(row.querySelector('input[data-field="QtyAvailable"]').value, 10);
            
            if (originalVariant && originalVariant.QtyAvailable !== newQtyAvailable) {
                quantityUpdates.push({ variantId, newQty: newQtyAvailable });
            }
        });

        if (quantityUpdates.length > 0) {
            console.log("🔄 Detected quantity changes, starting inventory update...", quantityUpdates);

            // Step 1: Get the stock change payload structure
            const stockPayloadTemplate = await tposRequest(
                '/StockChangeProductQty/ODataService.DefaultGetAll?$expand=ProductTmpl,Product,Location',
                { method: 'POST', body: { model: { ProductTmplId: currentProduct.Id } } }
            );

            if (!stockPayloadTemplate || !stockPayloadTemplate.value) {
                throw new Error("Không thể lấy cấu trúc payload để cập nhật tồn kho.");
            }

            const finalStockPayload = stockPayloadTemplate.value;
            let changesMade = false;

            // Step 2: Modify the payload with new quantities
            finalStockPayload.forEach(item => {
                const updateInfo = quantityUpdates.find(u => u.variantId === item.ProductId);
                if (updateInfo) {
                    item.NewQuantity = updateInfo.newQty;
                    changesMade = true;
                }
            });

            // Step 3: Post the updated payload
            if (changesMade) {
                console.log("📦 Posting updated inventory payload:", finalStockPayload);
                await tposRequest(
                    '/StockChangeProductQty/ODataService.PostChangeQtyProduct',
                    { method: 'POST', body: { datas: finalStockPayload } }
                );
                console.log("✅ Inventory update request sent.");
            } else {
                console.warn("⚠️ Quantity changes detected, but no matching variants found in stock payload.");
            }
        }

        // --- Fetch fresh data and update UI ---
        console.log("🔄 Fetching fresh product data to reflect all changes...");
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