// pages/orders/modal-create-product.js

import { loadProductSuggestions } from './api.js';
import { tposRequest } from '../../shared/api/tpos-api.js';
import { addProductRow, fetchProductAndPopulateRow } from './modal-create-order.js';

let variantData = { colors: [], letterSizes: [], numberSizes: [] };
let variantDataLoaded = false;
let activeVariantInput = null;

/**
 * Parses a price string (e.g., "1.5", "1,5", "2") and multiplies by 1000.
 * @param {string} priceString - The input price string from the user.
 * @returns {number} The calculated price value.
 */
function parseAndMultiplyPrice(priceString) {
    if (!priceString) return 0;
    // Replace comma with dot for decimal conversion
    const normalizedPrice = String(priceString).replace(',', '.');
    const price = parseFloat(normalizedPrice);
    if (isNaN(price)) return 0;
    return price * 1000;
}

/**
 * Formats a number as Vietnamese currency for tooltips.
 * @param {number} value - The number to format.
 * @returns {string} The formatted currency string.
 */
function formatCurrencyForTooltip(value) {
    if (!value && value !== 0) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
}

/**
 * Handles input in price fields to show a warning tooltip for large numbers.
 * @param {InputEvent} event - The input event.
 */
function handlePriceInput(event) {
    const input = event.target;
    const tooltipHost = input.parentElement;
    const rawValue = input.value.replace(',', '.');
    const numericValue = parseFloat(rawValue);

    if (!isNaN(numericValue)) {
        // Always calculate and set tooltip for any valid number
        const calculatedPrice = numericValue * 1000;
        tooltipHost.dataset.tooltip = formatCurrencyForTooltip(calculatedPrice);

        // Conditionally add/remove warning class
        if (numericValue > 1000) {
            input.classList.add('price-warning');
        } else {
            input.classList.remove('price-warning');
        }
    } else {
        // If not a number, clear everything
        input.classList.remove('price-warning');
        tooltipHost.dataset.tooltip = '';
    }
}

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
                dropzone.classList.add('has-image');
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
        <td><div class="tooltip-host tooltip-always-visible"><input type="text" value="0" oninput="window.handlePriceInput(event)"></div></td>
        <td><div class="tooltip-host tooltip-always-visible"><input type="text" value="0" oninput="window.handlePriceInput(event)"></div></td>
        <td><div class="image-dropzone" tabindex="0"><i data-lucide="image"></i><span>Ctrl+V</span></div></td>
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
    dropzone.addEventListener('mouseenter', (e) => e.currentTarget.focus());
    dropzone.addEventListener('mouseleave', (e) => e.currentTarget.blur());

    updateRowNumbersProductModal();
    window.lucide.createIcons();
}

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
        img.crossOrigin = "Anonymous"; // Handle CORS if image is from another domain
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

    // Add successfully created products to the order modal
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
                // Use a mock event object to call the function
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
        if (!row.variantSelectionOrder.includes(category)) {
            row.variantSelectionOrder.push(category);
        }
    } else {
        row.selectedVariants[category].delete(value);
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
window.handlePriceInput = handlePriceInput;

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