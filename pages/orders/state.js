// pages/orders/state.js

export let orders = [];
export let currentTab = 'orders';
export let inventoryProducts = [];
export let productSuggestions = [];

export function setOrders(newOrders) {
    orders = newOrders;
}

export function setInventoryProducts(products) {
    inventoryProducts = products;
}

export function setProductSuggestions(suggestions) {
    productSuggestions = suggestions;
}