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

function buildProductVariants(row, productName) {
    const { selectedVariants, variantSelectionOrder } = row;
    const listPriceInput = row.querySelector('td:nth-child(5) input').value;
    const listPrice = parseAndMultiplyPrice(listPriceInput);

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
        const productVariants = buildProductVariants(row, name);

        const payload = {
            Id: 0, Name: name, NameNoSign: null, Description: null, Type: "product", ShowType: "Có thể lưu trữ", ListPrice: listPrice, DiscountSale: 0, DiscountPurchase: 0, PurchasePrice: purchasePrice, StandardPrice: 0, SaleOK: true, PurchaseOK: true, Active: true, UOMId: 1, UOMName: null, UOMPOId: 1, UOMPOName: null, UOSId: null, IsProductVariant: false, EAN13: null, DefaultCode: code, QtyAvailable: 0, VirtualAvailable: 0, OutgoingQty: 0, IncomingQty: 0, PropertyCostMethod: null, CategId: 2, CategCompleteName: null, CategName: null, Weight: 0, Tracking: "none", DescriptionPurchase: null, DescriptionSale: null, CompanyId: 1, NameGet: null, PropertyStockProductionId: null, SaleDelay: 0, InvoicePolicy: "order", PurchaseMethod: "receive", PropertyValuation: null, Valuation: null, AvailableInPOS: true, POSCategId: null, CostMethod: null, Barcode: code, Image: imageBase64, ImageUrl: null, Thumbnails: [], ProductVariantCount: 0, LastUpdated: null, UOMCategId: null, BOMCount: 0, Volume: null, CategNameNoSign: null, UOMNameNoSign: null, UOMPONameNoSign: null, IsCombo: false, EnableAll: false, ComboPurchased: null, TaxAmount: null, Version: 0, VariantFirstId: null, VariantFistId: null, ZaloProductId: null, CompanyName: null, CompanyNameNoSign: null, DateCreated: null, InitInventory: 0, UOMViewId: null, ImporterId: null, ImporterName: null, ImporterAddress: null, ProducerId: null, ProducerName: null, ProducerAddress: null, DistributorId: null, DistributorName: null, DistributorAddress: null, OriginCountryId: null, OriginCountryName: null, InfoWarning: null, Element: null, YearOfManufacture: null, Specifications: null, Tags: null, CreatedByName: null, OrderTag: null, StringExtraProperties: null, CreatedById: null, Error: null,
            UOM: { Id: 1, Name: "Cái", NameNoSign: null, Rounding: 0.001, Active: true, Factor: 1, FactorInv: 1, UOMType: "reference", CategoryId: 1, CategoryName: "Đơn vị", Description: null, ShowUOMType: "Đơn vị gốc của nhóm này", NameGet: "Cái", ShowFactor: 1, DateCreated: "2018-05-25T15:44:44.14+07:00" },
            Categ: { Id: 2, Name: "Có thể bán", CompleteName: "Có thể bán", ParentId: null, ParentCompleteName: null, ParentLeft: 0, ParentRight: 1, Sequence: null, Type: "normal", AccountIncomeCategId: null, AccountExpenseCategId: null, StockJournalId: null, StockAccountInputCategId: null, StockAccountOutputCategId: null, StockValuationAccountId: null, PropertyValuation: null, PropertyCostMethod: "average", NameNoSign: "Co the ban", IsPos: true, Version: null, IsDelete: false },
            UOMPO: { Id: 1, Name: "Cái", NameNoSign: null, Rounding: 0.001, Active: true, Factor: 1, FactorInv: 1, UOMType: "reference", CategoryId: 1, CategoryName: "Đơn vị", Description: null, ShowUOMType: "Đơn vị gốc của nhóm này", NameGet: "Cái", ShowFactor: 1, DateCreated: "2018-05-25T15:44:44.14+07:00" },
            AttributeLines: attributeLines,
            Items: [], UOMLines: [], ComboProducts: [], ProductSupplierInfos: [],
            ProductVariants: productVariants
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