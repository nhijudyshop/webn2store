// pages/orders/state.js

export let orders = [];
export let currentTab = 'orders';
export let inventoryProducts = [];

export function setOrders(newOrders) {
    orders = newOrders;
}

export function setInventoryProducts(products) {
    inventoryProducts = products;
}