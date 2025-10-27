// pages/product/product-storage.js

import { setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { displayProductInfo, displayVariants } from './product-display.js';
import { showEmptyState } from './product-utils.js';

/**
 * Saves the entire list of products to the server.
 * @param {Array<Object>} products - The full array of products to save.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function saveAllProducts(products) {
    try {
        const response = await fetch('/api/inventory/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(products)
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error("❌ Error saving products to server:", error);
        window.showNotification("Lỗi lưu sản phẩm vào server", "error");
        return false;
    }
}

export async function saveProductData(product) {
    const dataToSave = {
        id: product.Id,
        timestamp: new Date().toISOString(),
        productCode: product.DefaultCode,
        productName: product.Name,
        product: product,
        savedAt: new Date().toLocaleString("vi-VN"),
    };

    let savedProducts = await loadAllSavedProducts();

    const existingIndex = savedProducts.findIndex(
        (p) => p.productCode === product.DefaultCode,
    );

    if (existingIndex >= 0) {
        savedProducts[existingIndex] = dataToSave;
        console.log("🔄 Đã cập nhật sản phẩm trên server:", product.DefaultCode);
    } else {
        savedProducts.unshift(dataToSave);
        console.log("✅ Đã thêm sản phẩm mới vào server:", product.DefaultCode);
    }

    await saveAllProducts(savedProducts);
}

export async function loadAllSavedProducts() {
    try {
        const response = await fetch('/api/inventory/products');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            return result.data;
        }
        console.error("Lỗi khi load dữ liệu từ server:", result.error);
        return [];
    } catch (error) {
        console.error("Lỗi khi load dữ liệu:", error);
        return [];
    }
}

export async function loadSavedProduct(productCode) {
    const savedProducts = await loadAllSavedProducts();
    return savedProducts.find((p) => p.productCode === productCode);
}

export async function clearSavedData() {
    if (!confirm("Bạn có chắc muốn xóa TẤT CẢ sản phẩm đã lưu trên server?")) {
        return;
    }
    const success = await saveAllProducts([]);
    if (success) {
        window.showNotification("Đã xóa tất cả dữ liệu đã lưu trên server", "info");
        console.log("🗑️ Đã xóa tất cả dữ liệu đã lưu trên server");
    }
}

export async function exportToJSON() {
    const savedProducts = await loadAllSavedProducts();
    if (savedProducts.length === 0) {
        window.showNotification("Không có dữ liệu để export", "error");
        return;
    }

    const dataStr = JSON.stringify(savedProducts, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products_backup_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    window.showNotification(`Đã export ${savedProducts.length} sản phẩm`, "success");
}

export function importFromJSON() {
    document.getElementById("dataFileInput").click();
}

export async function handleDataFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);
            let productsToImport = [];

            if (Array.isArray(data)) {
                productsToImport = data;
            } else if (data.product) {
                productsToImport = [data];
            } else {
                window.showNotification("File JSON không đúng định dạng", "error");
                return;
            }

            let importCount = 0;
            productsToImport.forEach((item) => {
                if (item.product && item.productCode) {
                    importCount++;
                }
            });

            if (importCount === 0) {
                window.showNotification("Không tìm thấy sản phẩm hợp lệ trong file", "error");
                return;
            }

            let existingProducts = await loadAllSavedProducts();

            productsToImport.forEach((newProduct) => {
                if (newProduct.product && newProduct.productCode) {
                    const existingIndex = existingProducts.findIndex(
                        (p) => p.productCode === newProduct.productCode,
                    );
                    if (existingIndex >= 0) {
                        existingProducts[existingIndex] = newProduct;
                    } else {
                        existingProducts.push(newProduct);
                    }
                }
            });

            const success = await saveAllProducts(existingProducts);
            if (success) {
                window.showNotification(`Đã import và lưu ${importCount} sản phẩm!`, "success");
            }

        } catch (error) {
            window.showNotification("Lỗi khi đọc file: " + error.message, "error");
        }
    };
    reader.readAsText(file);

    event.target.value = "";
}

export async function loadProductFromList(productCode) {
    const savedData = await loadSavedProduct(productCode);
    if (!savedData) {
        window.showNotification("Không tìm thấy sản phẩm", "error");
        return;
    }

    setCurrentProduct(savedData.product);
    setCurrentVariants(savedData.product.ProductVariants || []);

    displayProductInfo(savedData.product);
    displayVariants(savedData.product.ProductVariants || []);

    document.getElementById("productCode").value = savedData.productCode;

    window.showNotification(`Đã load sản phẩm ${productCode}`, "success");
}

export async function autoLoadSavedData() {
    const savedProducts = await loadAllSavedProducts();

    if (savedProducts.length === 0) {
        return false; // Indicate no product was loaded
    }

    const latestProduct = savedProducts[0];

    // Only populate the input field, don't display stale data
    document.getElementById("productCode").value = latestProduct.productCode;

    return true; // Indicate a product code was populated
}