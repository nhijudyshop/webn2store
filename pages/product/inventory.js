// pages/product/inventory.js

import { loadToken } from '../../shared/api/tpos-api.js';
import { currentProduct, setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { showEmptyState } from './product-utils.js';
import { autoLoadSavedData, clearSavedData, exportToJSON, importFromJSON, handleDataFile, loadProductFromList, saveProductData } from './product-storage.js';
import { searchProduct } from './product-api.js';
import { displayProductInfo, displayParentProduct, displayVariants, updateStats, switchTab } from './product-display.js';
import { normalizeVietnamese } from '../../shared/utils/text-utils.js';

// ===== GLOBAL EXPORTS (for HTML onclicks and shared access) =====
window.searchProduct = searchProduct;
window.clearData = clearData;
window.exportToJSON = exportToJSON;
window.importFromJSON = importFromJSON;
window.handleDataFile = handleDataFile;
window.clearSavedData = clearSavedData;
window.loadProductFromList = loadProductFromList;
window.switchTab = switchTab;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveProductChanges = saveProductChanges;

// ===== CORE APPLICATION LOGIC =====

let allProductSuggestions = []; // Cache for product suggestions

function clearData() {
    document.getElementById("productCode").value = "";

    setCurrentProduct(null);
    setCurrentVariants([]);

    document.getElementById("productInfoCard").classList.remove("show");

    document.getElementById("totalProducts").textContent = "0";
    document.getElementById("totalVariants").textContent = "0";
    document.getElementById("totalQty").textContent = "0";
    document.getElementById("totalValue").textContent = "0đ";

    showEmptyState("parentTableWrapper", 'Nhập mã sản phẩm và nhấn "Thêm" để xem thông tin');
    showEmptyState("variantsTableWrapper", 'Nhập mã sản phẩm và nhấn "Thêm" để xem danh sách biến thể');

    window.showNotification("Đã xóa dữ liệu", "info");
}

/**
 * Loads product suggestions from the server and caches them.
 */
async function loadProductSuggestions() {
    try {
        const response = await fetch('/api/products/suggestions');
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            allProductSuggestions = result.data;
            console.log(`✅ Loaded ${allProductSuggestions.length} product suggestions.`);
        } else {
            console.error('❌ Failed to load product suggestions:', result.error);
            window.showNotification('Lỗi tải gợi ý sản phẩm', 'error');
        }
    } catch (error) {
        console.error('❌ Error fetching product suggestions:', error);
        window.showNotification('Lỗi kết nối để tải gợi ý sản phẩm', 'error');
    }
}

/**
 * Filters, sorts, and displays product suggestions based on user input.
 * @param {Event} event - The input event from the text field.
 */
function updateSuggestions(event) {
    const query = event.target.value.trim();
    const datalist = document.getElementById('productSuggestions');
    if (!datalist) return;

    datalist.innerHTML = ''; // Clear previous suggestions

    if (!query) return;

    const normalizedQuery = normalizeVietnamese(query);
    const queryWords = normalizedQuery.split(' ').filter(w => w);

    const filtered = allProductSuggestions.filter(item => {
        const normalizedCode = normalizeVietnamese(item.code || '');
        const normalizedName = normalizeVietnamese(item.name || '');

        // Check code: must contain the full query string
        if (normalizedCode.includes(normalizedQuery)) {
            return true;
        }

        // Check name: must contain all words from the query
        if (queryWords.every(word => normalizedName.includes(word))) {
            return true;
        }

        return false;
    });

    // Sort results for relevance
    filtered.sort((a, b) => {
        const normACode = normalizeVietnamese(a.code || '');
        const normBCode = normalizeVietnamese(b.code || '');
        const normAName = normalizeVietnamese(a.name || '');
        const normBName = normalizeVietnamese(b.name || '');

        // Scoring function for relevance
        const score = (itemCode, itemName) => {
            if (itemCode === normalizedQuery) return 10; // Exact code match
            if (itemCode.startsWith(normalizedQuery)) return 9; // Code starts with query
            if (itemName.startsWith(normalizedQuery)) return 8; // Name starts with query
            if (queryWords.every(word => itemName.includes(word))) return 7; // Name contains all words
            if (itemCode.includes(normalizedQuery)) return 6; // Code contains query
            return 0;
        };

        const scoreA = score(normACode, normAName);
        const scoreB = score(normBCode, normBName);

        if (scoreA !== scoreB) {
            return scoreB - scoreA; // Higher score comes first
        }

        // Fallback sort by name length
        return a.name.length - b.name.length;
    });

    const suggestionsToShow = filtered.slice(0, 50);

    suggestionsToShow.forEach(item => {
        const option = document.createElement('option');
        option.value = item.code;
        option.textContent = `${item.code} - ${item.name}`;
        datalist.appendChild(option);
    });
}

// ===== EDIT MODAL & VARIANT LOGIC =====

let variantData = { colors: [], letterSizes: [], numberSizes: [] };
let variantDataLoaded = false;
let activeVariantInput = null;
const editModalState = {
    selectedVariants: { colors: new Set(), letterSizes: new Set(), numberSizes: new Set() },
    variantSelectionOrder: []
};

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
        console.log("✅ Variant data loaded for editing.");
    } catch (error) {
        console.error("❌ Error loading variant data:", error);
    }
}

function getCategoryFromAttributeId(id) {
    if (id === 3) return 'colors';
    if (id === 1) return 'letterSizes';
    if (id === 4) return 'numberSizes';
    return null;
}

function updateVariantInput(inputElement, state) {
    if (!inputElement) return;
    const parts = state.variantSelectionOrder.map(category => {
        const selectedSet = state.selectedVariants[category];
        if (selectedSet.size > 0) {
            return `(${[...selectedSet].join(' | ')})`;
        }
        return null;
    }).filter(part => part !== null);
    inputElement.value = parts.join(' ');
}

function populateVariantSelector() {
    const createCheckboxes = (data, category, containerId) => {
        const container = document.getElementById(containerId);
        container.innerHTML = data.map(item => `
            <label>
                <input type="checkbox" data-category="${category}" value="${item.Name}" ${editModalState.selectedVariants[category].has(item.Name) ? 'checked' : ''}>
                ${item.Name}
            </label>
        `).join('');
    };
    createCheckboxes(variantData.colors, 'colors', 'variantColors');
    createCheckboxes(variantData.letterSizes, 'letterSizes', 'variantLetterSizes');
    createCheckboxes(variantData.numberSizes, 'numberSizes', 'variantNumberSizes');
}

async function openVariantSelector(inputElement) {
    await loadAllVariantData();
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
    if (panel) panel.classList.remove('show');
    activeVariantInput = null;
}

function handleVariantSelection(event) {
    const checkbox = event.target;
    if (checkbox.type !== 'checkbox' || !activeVariantInput) return;

    const category = checkbox.dataset.category;
    const value = checkbox.value;

    if (checkbox.checked) {
        editModalState.selectedVariants[category].add(value);
        if (!editModalState.variantSelectionOrder.includes(category)) {
            editModalState.variantSelectionOrder.push(category);
        }
    } else {
        editModalState.selectedVariants[category].delete(value);
        if (editModalState.selectedVariants[category].size === 0) {
            editModalState.variantSelectionOrder = editModalState.variantSelectionOrder.filter(cat => cat !== category);
        }
    }
    updateVariantInput(activeVariantInput, editModalState);
}

function handleImagePaste(event) {
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

function openEditModal() {
    if (!currentProduct) {
        window.showNotification("Chưa có sản phẩm nào được chọn.", "error");
        return;
    }

    // Reset and populate variant state
    editModalState.selectedVariants = { colors: new Set(), letterSizes: new Set(), numberSizes: new Set() };
    editModalState.variantSelectionOrder = [];

    // Primary method: Use AttributeLines if available and populated
    if (currentProduct.AttributeLines && currentProduct.AttributeLines.length > 0) {
        console.log("Populating variants from AttributeLines.");
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
    } 
    // Fallback method: Parse from ProductVariants if AttributeLines is empty/missing
    else if (currentProduct.ProductVariants && currentProduct.ProductVariants.length > 0) {
        console.log("Populating variants from ProductVariants (fallback).");
        const attributeOrderMap = { 'Màu': 1, 'Size Chữ': 2, 'Size Số': 3 };
        const foundCategories = new Map();

        currentProduct.ProductVariants.forEach(variant => {
            if (variant.AttributeValues && Array.isArray(variant.AttributeValues)) {
                variant.AttributeValues.forEach(attrValue => {
                    let category = null;
                    switch (attrValue.AttributeName) {
                        case 'Màu': category = 'colors'; break;
                        case 'Size Chữ': category = 'letterSizes'; break;
                        case 'Size Số': category = 'numberSizes'; break;
                    }
                    
                    if (category) {
                        if (!foundCategories.has(category)) {
                            foundCategories.set(category, attributeOrderMap[attrValue.AttributeName] || 99);
                        }
                        editModalState.selectedVariants[category].add(attrValue.Name);
                    }
                });
            }
        });
        
        // Sort categories based on a predefined order for consistency
        editModalState.variantSelectionOrder = [...foundCategories.keys()].sort((a, b) => {
            const categoryA = Object.keys(editModalState.selectedVariants).find(key => key === a);
            const categoryB = Object.keys(editModalState.selectedVariants).find(key => key === b);
            const nameA = categoryA === 'colors' ? 'Màu' : (categoryA === 'letterSizes' ? 'Size Chữ' : 'Size Số');
            const nameB = categoryB === 'colors' ? 'Màu' : (categoryB === 'letterSizes' ? 'Size Chữ' : 'Size Số');
            return (attributeOrderMap[nameA] || 99) - (attributeOrderMap[nameB] || 99);
        });
    }

    // Populate form fields
    document.getElementById('editProductName').value = currentProduct.Name || '';
    document.getElementById('editPurchasePrice').value = currentProduct.PurchasePrice || 0;
    document.getElementById('editListPrice').value = currentProduct.ListPrice || 0;
    document.getElementById('editQtyAvailable').value = currentProduct.QtyAvailable || 0;
    document.getElementById('editVirtualAvailable').value = currentProduct.VirtualAvailable || 0;
    updateVariantInput(document.getElementById('editVariants'), editModalState);

    // Populate image dropzone
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

    document.getElementById('editProductModal').style.display = 'flex';
    window.lucide.createIcons();
}

function closeEditModal() {
    document.getElementById('editProductModal').style.display = 'none';
    closeVariantSelector();
}

async function saveProductChanges(event) {
    event.preventDefault();
    if (!currentProduct) return;

    // Update basic info
    currentProduct.Name = document.getElementById('editProductName').value;
    currentProduct.PurchasePrice = parseFloat(document.getElementById('editPurchasePrice').value) || 0;
    currentProduct.ListPrice = parseFloat(document.getElementById('editListPrice').value) || 0;
    currentProduct.QtyAvailable = parseInt(document.getElementById('editQtyAvailable').value) || 0;
    currentProduct.VirtualAvailable = parseInt(document.getElementById('editVirtualAvailable').value) || 0;

    // Update image
    const imgElement = document.querySelector('#editImageDropzone img');
    currentProduct.ImageUrl = imgElement ? imgElement.src : null;

    // TODO: Update variants logic if needed. For now, we just save the main product info.
    // This part is complex as it requires regenerating all variant combinations.
    // For now, we will focus on updating the parent product.
    
    try {
        await saveProductData(currentProduct);
        displayProductInfo(currentProduct);
        displayParentProduct(currentProduct);
        displayVariants(currentProduct.ProductVariants || []);
        updateStats(currentProduct);
        closeEditModal();
        window.showNotification("Đã cập nhật sản phẩm!", "success");
    } catch (error) {
        window.showNotification("Lỗi khi lưu thay đổi: " + error.message, "error");
    }
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
    window.lucide.createIcons();
    loadToken();
    await loadProductSuggestions();
    await autoLoadSavedData();

    // Event Listeners
    document.getElementById('productCode')?.addEventListener('input', updateSuggestions);
    
    // Edit Modal Listeners
    const editImageDropzone = document.getElementById('editImageDropzone');
    const deleteEditImageBtn = document.getElementById('deleteEditImageBtn');
    const editVariantsInput = document.getElementById('editVariants');
    const variantSelector = document.getElementById('variantSelector');

    if (editImageDropzone) editImageDropzone.addEventListener('paste', handleImagePaste);
    if (deleteEditImageBtn) {
        deleteEditImageBtn.addEventListener('click', () => {
            editImageDropzone.innerHTML = '<i data-lucide="image"></i><span>Ctrl+V</span>';
            editImageDropzone.classList.remove('has-image');
            deleteEditImageBtn.style.display = 'none';
            window.lucide.createIcons();
        });
    }
    if (editVariantsInput) editVariantsInput.addEventListener('focusin', () => openVariantSelector(editVariantsInput));
    if (variantSelector) {
        variantSelector.addEventListener('change', handleVariantSelection);
        variantSelector.querySelector('.btn-close-selector')?.addEventListener('click', closeVariantSelector);
    }
    document.addEventListener('click', (event) => {
        if (variantSelector && !variantSelector.contains(event.target) && event.target !== activeVariantInput) {
            closeVariantSelector();
        }
    });

    console.log("Inventory page initialized");
});