// pages/product/services/quantity-update-service.js

import { tposRequest } from '../../../shared/api/tpos-api.js';

/**
 * Updates variant quantities on TPOS using the 3-step wizard process.
 * @param {number} productTemplateId - The ID of the product template.
 * @param {Object.<number, number>} changedQtyMap - A map of {variantId: newQuantity}.
 * @returns {Promise<void>}
 */
export async function updateVariantQuantitiesIfChanged(productTemplateId, changedQtyMap) {
    if (Object.keys(changedQtyMap).length === 0) {
        console.log("⏭️ No quantity changes detected, skipping update.");
        return;
    }

    console.log(`📦 Updating quantities for product template ${productTemplateId} with changes:`, changedQtyMap);

    for (const variantId in changedQtyMap) {
        const newQuantity = changedQtyMap[variantId];
        try {
            // Step 1: Get the wizard ID
            const wizardUrl = "/api/stock/update"; // Proxy endpoint for stock.inventory/change_product_qty/0
            const wizardPayload = { productId: parseInt(variantId, 10), newQuantity: newQuantity };
            
            console.log(`🚀 Requesting stock change for variant ${variantId} to ${newQuantity}`);
            const response = await tposRequest(wizardUrl, { method: 'POST', body: wizardPayload });

            if (!response.success) {
                throw new Error(response.error || "Failed to update stock via proxy.");
            }
            console.log(`✅ Stock update successful for variant ${variantId}.`);

        } catch (error) {
            console.error(`❌ Error updating stock for variant ${variantId}:`, error);
            throw new Error(`Lỗi cập nhật số lượng cho biến thể ${variantId}: ${error.message}`);
        }
    }
}