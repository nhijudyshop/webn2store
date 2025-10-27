// pages/orders/modal-create-product/index.js

import { setupCreateProductModalEventListeners } from './events.js';
import { openCreateProductModal } from './ui.js';

// Initialize event listeners for the create product modal
setupCreateProductModalEventListeners();

// Expose the main function to be called from other parts of the application
export { openCreateProductModal };