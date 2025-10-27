// pages/product/variant-editor.js

export const variantData = { colors: [], letterSizes: [], numberSizes: [] };
let variantDataLoaded = false;
export let activeVariantInput = null;

export const editModalState = {
    selectedVariants: { colors: new Set(), letterSizes: new Set(), numberSizes: new Set() },
    variantSelectionOrder: []
};

export async function loadAllVariantData() {
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

export function getCategoryFromAttributeId(id) {
    if (id === 3) return 'colors';
    if (id === 1) return 'letterSizes';
    if (id === 4) return 'numberSizes';
    return null;
}

export function updateVariantInput(inputElement, state) {
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
    if (panel) panel.classList.remove('show');
    activeVariantInput = null;
}

export function handleVariantSelection(event) {
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