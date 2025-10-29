// pages/product/edit-modal/state.js

/**
 * Internal state for quantity transfer tab
 */
export const quantityTransferState = {
  variant1: null, // Selected variant object for slot 1
  variant2: null, // Selected variant object for slot 2
  initialQty1: 0,
  initialQty2: 0,
  currentQty1: 0,
  currentQty2: 0,
  changedQtyMap: {}, // Map of {variantId: newQty} for transfer
};