// pages/orders/modal-create-product/api.js

import { tposRequest } from '../../../shared/api/tpos-api.js';
import { loadProductSuggestions } from '../api.js';
import { addProductRow, fetchProductAndPopulateRow } from '../modal-create-order.js';
import { closeCreateProductModal } from './ui.js';
import { parseAndMultiplyPrice } from './utils.js';
import { variantData } from './variant-selector.js';

function getImageAsBase64(imgElement) {
    if (!imgElement || !imgElement.src) {
        return Promise.resolve(null);
    }
    if (imgElement.src.startsWith('data:image')) {
        return Promise.resolve(imgElement.src);
    }
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = () => resolve(null);
        img.src = imgElement.src;
    });
}

function getAttributeId(category) {
    switch (category) {
        case 'colors': return 3;
        case 'letterSizes': return 1;
        case 'numberSizes': return 4;
        default: return 0;
    }
}

function buildAttributeLines(row) {
    const attributeLines = [];
    const { selectedVariants, variantSelectionOrder } = row;

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

function buildProductVariants(row, productName, purchasePrice, listPrice) {
    const { selectedVariants, variantSelectionOrder } = row;

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
            Id: 0,
            DefaultCode: null, // TPOS will generate this
            NameTemplate: productName,
            Name: variantName,
            ProductTmplId: 0,
            UOMId: 0,
            UOMPOId: 0,
            NameGet: variantName,
            Barcode: null, // TPOS will generate this
            PriceVariant: listPrice,
            SaleOK: true,
            PurchaseOK: true,
            Active: true,
            ListPrice: 0, // Use PriceVariant for sale price
            StandardPrice: 0, // Cost is defined on the template
            PurchasePrice: null,
            Type: "product",
            CategId: 0,
            InvoicePolicy: "order",
            PurchaseMethod: "receive",
            Tracking: "none",
            AvailableInPOS: true,
            NameTemplateNoSign: productName,
            AttributeValues: attributeValues,
            InitInventory: 0,
            Weight: 0,
        };
    });
}

export async function saveNewProducts() {
    const btn = document.getElementById('saveNewProductsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Đang lưu...';
    window.lucide.createIcons();

    const rows = document.querySelectorAll('#newProductList tr');
    const productsToCreate = [];
    const successfullyCreated = [];

    for (const row of rows) {
        const code = row.querySelector('td:nth-child(2) input').value.trim();
        const name = row.querySelector('td:nth-child(3) input').value.trim();
        const purchasePriceInput = row.querySelector('td:nth-child(4) input').value;
        const listPriceInput = row.querySelector('td:nth-child(5) input').value;
        const imgElement = row.querySelector('td:nth-child(6) .image-dropzone img');

        if (!code || !name) continue;

        const purchasePrice = parseAndMultiplyPrice(purchasePriceInput);
        const listPrice = parseAndMultiplyPrice(listPriceInput);

        const imageBase64WithPrefix = await getImageAsBase64(imgElement);
        const imageBase64 = imageBase64WithPrefix ? imageBase64WithPrefix.split(',')[1] : null;
        const attributeLines = buildAttributeLines(row);
        let productVariants = buildProductVariants(row, name, purchasePrice, listPrice);

        // If no variants are generated, create a default one
        if (productVariants.length === 0 && attributeLines.length === 0) {
            productVariants.push({
                Id: 0,
                DefaultCode: code,
                NameTemplate: name,
                Name: name,
                Barcode: code,
                PriceVariant: listPrice,
                StandardPrice: purchasePrice,
                ListPrice: listPrice,
                PurchasePrice: purchasePrice,
                SaleOK: true,
                PurchaseOK: true,
                Active: true,
                Type: "product",
                UOMId: 1,
                UOMPOId: 1,
                CategId: 2,
                InvoicePolicy: "order",
                PurchaseMethod: "receive",
                Tracking: "none",
                AvailableInPOS: true,
                AttributeValues: []
            });
        }

        const payload = {
            Id: 0,
            Name: name,
            Type: "product",
            ListPrice: listPrice,
            PurchasePrice: purchasePrice,
            StandardPrice: purchasePrice, // For template, this should be the cost price
            SaleOK: true,
            PurchaseOK: true,
            Active: true,
            UOMId: 1,
            UOMPOId: 1,
            DefaultCode: code,
            CategId: 2,
            Barcode: code,
            AvailableInPOS: true,
            Tracking: "none",
            InvoicePolicy: "order",
            PurchaseMethod: "receive",
            Image: imageBase64,
            UOM: { Id: 1 },
            Categ: { Id: 2 },
            UOMPO: { Id: 1 },
            AttributeLines: attributeLines,
            ProductVariants: productVariants,
            ProductVariantCount: productVariants.length,
            Items: [], UOMLines: [], ComboProducts: [], ProductSupplierInfos: [],
        };
        productsToCreate.push({ payload, original: { code, name } });
    }

    if (productsToCreate.length === 0) {
        window.showNotification("Không có sản phẩm hợp lệ để tạo.", "warning");
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save"></i> Lưu Sản Phẩm';
        window.lucide.createIcons();
        return;
    }

    for (const product of productsToCreate) {
        try {
            await tposRequest('/api/products/insert', { method: 'POST', body: product.payload });
            successfullyCreated.push(product.original);
        } catch (error) {
            window.showNotification(`Lỗi khi tạo sản phẩm ${product.original.code}: ${error.message}`, "error");
        }
    }

    if (successfullyCreated.length > 0) {
        try {
            const response = await fetch('/api/products/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(successfullyCreated)
            });
            const result = await response.json();
            if (result.success) {
                window.showNotification(`Đã tạo ${successfullyCreated.length} sản phẩm trên TPOS và cập nhật ${result.added} gợi ý!`, "success");
                await loadProductSuggestions();
            }
        } catch (error) {
            window.showNotification("Tạo sản phẩm TPOS thành công, nhưng lỗi cập nhật danh sách gợi ý.", "warning");
        }
    }

    if (successfullyCreated.length > 0) {
        const orderTbody = document.getElementById("modalProductList");
        for (const product of successfullyCreated) {
            let targetRow = orderTbody.lastElementChild;
            const isLastRowEmpty = targetRow && targetRow.querySelector('input[placeholder="Mã SP"]').value.trim() === '';

            if (!isLastRowEmpty) {
                addProductRow();
                targetRow = orderTbody.lastElementChild;
            }
            
            const codeInput = targetRow.querySelector('input[placeholder="Mã SP"]');
            const sparkleButton = targetRow.querySelector('button[title="Gợi ý thông minh"]');

            if (codeInput && sparkleButton) {
                codeInput.value = product.code;
                await fetchProductAndPopulateRow({ currentTarget: sparkleButton });
            }
        }
    }

    if (successfullyCreated.length === productsToCreate.length) {
        closeCreateProductModal();
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save"></i> Lưu Sản Phẩm';
    window.lucide.createIcons();
}