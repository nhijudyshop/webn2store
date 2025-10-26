// pages/orders/state.js

export let orders = [];
export let currentTab = 'orders';
export let productSuggestions = [];

export function setOrders(newOrders) {
    orders = newOrders;
}

export function setProductSuggestions(suggestions) {
    productSuggestions = suggestions;
}