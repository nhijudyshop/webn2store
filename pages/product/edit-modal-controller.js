// pages/product/edit-modal-controller.js

import { openEditModal as openModal, closeEditModal as closeModal } from './edit-modal/ui-manager.js';
import { saveProductChanges as saveChanges, handleTransferQuantityChange as handleTransferChange, saveQuantityTransfer as saveTransfer } from './edit-modal/event-handlers.js';
import { recalculateTotalQuantities as recalculateTotals, handleImagePaste as handlePaste } from './edit-modal/ui-manager.js';

// Expose public API
export const openEditModal = openModal;
export const closeEditModal = closeModal;
export const saveProductChanges = saveChanges;
export const handleTransferQuantityChange = handleTransferChange;
export const saveQuantityTransfer = saveTransfer;
export const recalculateTotalQuantities = recalculateTotals;
export const handleImagePaste = handlePaste;