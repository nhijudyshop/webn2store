// pages/orders/orders.js

import { loadOrders, loadInventoryProducts } from './api.js';
import { setupEventListeners } from './events.js';

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    window.lucide.createIcons();
    loadOrders();
    loadInventoryProducts();
    setupEventListeners();
    console.log("Orders page initialized (modular).");
});