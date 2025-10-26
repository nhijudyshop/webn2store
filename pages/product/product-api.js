// pages/product/product-api.js

import { getProductByCode } from '../../shared/api/tpos-api.js';
import { setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { displayProductInfo, displayParentProduct, displayVariants, updateStats } from './product-display.js';
import { showLoading, showEmptyState } from './product-utils.js';
import { saveProductData } from './product-storage.js';

export async function searchProduct(event) {
    event.preventDefault();

    const productCode = document.getElementById("productCode").value.trim();

    if (!productCode) {
        window.showNotification("Vui lòng nhập mã sản phẩm", "error");
        return;
    }

    try {
        showLoading("parentTableWrapper");
        showLoading("variantsTableWrapper");

        const detailData = await getProductByCode(productCode);

        setCurrentProduct(detailData);
        setCurrentVariants(detailData.ProductVariants || []);

        displayProductInfo(detailData);
        displayParentProduct(detailData);
        displayVariants(detailData.ProductVariants || []);
        updateStats(detailData);

        saveProductData(detailData); // Auto-save after successful search

        window.showNotification("Tải dữ liệu thành công!", "success");
    } catch (error) {
        console.error("Error:", error);
        window.showNotification(error.message, "error");
        showEmptyState("parentTableWrapper", "Không thể tải dữ liệu sản phẩm");
        showEmptyState("variantsTableWrapper", "Không thể tải dữ liệu biến thể");
    }
}