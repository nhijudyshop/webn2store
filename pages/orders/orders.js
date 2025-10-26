// pages/orders/orders.js

import { loadOrders, loadInventoryProducts, loadProductSuggestions } from './api.js';
import { setupEventListeners } from './events.js';

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
    window.lucide.createIcons();
    await loadProductSuggestions();
    loadOrders();
    loadInventoryProducts();
    setupEventListeners();
    console.log("Orders page initialized (modular).");
});