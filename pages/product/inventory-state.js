// pages/product/inventory-state.js

export let currentProduct = null;
export let currentVariants = [];
export let originalProductPayload = null; // Add this

export function setCurrentProduct(product) {
    currentProduct = product;
}

export function setCurrentVariants(variants) {
    currentVariants = variants;
}

export function setOriginalProductPayload(payload) { // Add this
    originalProductPayload = payload;
}