// pages/orders/modal-create-product/utils.js

/**
 * Parses a price string (e.g., "1.5", "1,5", "2") and multiplies by 1000.
 * @param {string} priceString - The input price string from the user.
 * @returns {number} The calculated price value.
 */
export function parseAndMultiplyPrice(priceString) {
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
export function handlePriceInput(event) {
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

// Expose to window for inline HTML attributes
window.handlePriceInput = handlePriceInput;