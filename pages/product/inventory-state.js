// pages/product/inventory-state.js

export let currentProduct = null;
export let currentVariants = [];

export function setCurrentProduct(product) {
    currentProduct = product;
}

export function setCurrentVariants(variants) {
    currentVariants = variants;
}