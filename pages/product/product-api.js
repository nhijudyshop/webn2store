// pages/product/product-api.js

import { getProductByCode } from '../../shared/api/tpos-api.js';
import { setCurrentProduct, setCurrentVariants, setOriginalProductPayload } from './inventory-state.js';
import { displayProductInfo, displayVariants } from './product-display.js';
import { showLoading, showEmptyState } from './product-utils.js';
import { saveProductData, loadAllSavedProducts } from './product-storage.js';

export async function searchProduct(event) {
    event.preventDefault();

    const productCode = document.getElementById("productCode").value.trim();

    if (!productCode) {
        window.showNotification("Vui lòng nhập mã sản phẩm", "error");
        return;
    }

    try {
        showLoading("variantsTableWrapper");

        const detailData = await getProductByCode(productCode);

        setOriginalProductPayload(detailData); // Store the raw payload
        setCurrentProduct(detailData);
        setCurrentVariants(detailData.ProductVariants || []);

        displayProductInfo(detailData);
        displayVariants(detailData.ProductVariants || []);

        await saveProductData(detailData); // Auto-save after successful search

        window.showNotification("Tải dữ liệu thành công!", "success");
    } catch (error) {
        console.error("Error:", error);
        window.showNotification(error.message, "error");
        showEmptyState("variantsTableWrapper", "Không thể tải dữ liệu biến thể");
    }
}