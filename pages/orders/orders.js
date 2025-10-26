// pages/orders/orders.js

import { loadOrders, loadProductSuggestions } from './api.js';
import { setupEventListeners } from './events.js';

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
    window.lucide.createIcons();
    await loadProductSuggestions();
    loadOrders();
    setupEventListeners();
    console.log("Orders page initialized (modular).");
});