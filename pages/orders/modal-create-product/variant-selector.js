// pages/orders/modal-create-product/variant-selector.js

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

export async function openVariantSelector(inputElement) {
    await loadAllVariantData();
    activeVariantInput = inputElement;
    const panel = document.getElementById('variantSelector');
    const rect = inputElement.getBoundingClientRect();
    
    panel.style.top = `${rect.bottom + window.scrollY + 5}px`;
    panel.style.left = `${rect.left + window.scrollX}px`;

    populateVariantSelector();
    panel.classList.add('show');
}

export function closeVariantSelector() {
    const panel = document.getElementById('variantSelector');
    if (panel) {
        panel.classList.remove('show');
    }
    activeVariantInput = null;
}

export function handleVariantSelection(event) {
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

export { variantData };