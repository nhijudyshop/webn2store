// pages/product/services/quantity-update-service.js

import { tposRequest } from '../../../shared/api/tpos-api.js';
import { currentProduct } from '../inventory-state.js'; // Import currentProduct to get ProductTmplId

/**
 * Updates variant quantities on TPOS using the new 3-step OData process.
 * @param {Object.<number, number>} changedQtyMap - A map of {variantId: newQuantity}.
 * @returns {Promise<void>}
 */
export async function updateVariantQuantitiesIfChanged(changedQtyMap) {
    if (Object.keys(changedQtyMap).length === 0) {
        console.log("⏭️ No quantity changes detected, skipping update.");
        return;
    }

    if (!currentProduct || !currentProduct.Id) {
        throw new Error("Không tìm thấy thông tin sản phẩm cha (ProductTmplId) để cập nhật số lượng.");
    }

    console.log(`📦 Updating quantities for product template ${currentProduct.Id} with changes:`, changedQtyMap);

    try {
        // Step 1: Get Payload Template
        const getTemplatePayload = { "model": { "ProductTmplId": currentProduct.Id } };
        const templateResponse = await tposRequest('/api/stock-change-get-template', {
            method: 'POST',
            body: getTemplatePayload
        });

        if (!templateResponse || !Array.isArray(templateResponse.value) || templateResponse.value.length === 0) {
            throw new Error("Không thể lấy mẫu payload cập nhật số lượng từ TPOS.");
        }

        // The template response contains an array of objects, each representing a variant.
        // We need to find the specific variant(s) and update their NewQuantity.
        const modifiedTemplate = templateResponse.value.map(item => {
            const variantId = item.Product.Id;
            const newItem = { ...item }; // Create a mutable copy

            // Explicitly set LocationId to 12 as per the correct payload example
            newItem.LocationId = 12; 
            
            // Preserve QtyAvailable and VirtualAvailable in the nested Product object
            // No deletion is needed here.
            
            if (changedQtyMap.hasOwnProperty(variantId)) {
                newItem.NewQuantity = changedQtyMap[variantId]; // NewQuantity is at the top level of newItem
            }
            return newItem;
        });

        // Step 2: Post Changed Quantities
        const postQtyResponse = await tposRequest('/api/stock-change-post-qty', {
            method: 'POST',
            body: { model: modifiedTemplate } // Corrected to use 'model'
        });

        if (!postQtyResponse || !Array.isArray(postQtyResponse.value) || postQtyResponse.value.length === 0) {
            throw new Error("Không thể đăng tải số lượng đã thay đổi lên TPOS.");
        }

        const idsToExecute = postQtyResponse.value.map(item => item.Id);

        // Step 3: Execute Change
        const executePayload = { "ids": idsToExecute };
        await tposRequest('/api/stock-change-execute', {
            method: 'POST',
            body: executePayload
        });

        console.log(`✅ Stock update successful for product template ${currentProduct.Id}.`);

    } catch (error) {
        console.error(`❌ Error updating stock for product template ${currentProduct.Id}:`, error);
        throw new Error(`Lỗi cập nhật số lượng: ${error.message || "Lỗi không xác định."}`);
    }
}