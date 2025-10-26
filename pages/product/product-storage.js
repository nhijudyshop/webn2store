// pages/product/product-storage.js

import { setCurrentProduct, setCurrentVariants } from './inventory-state.js';
import { displayProductInfo, displayParentProduct, displayVariants, updateStats } from './product-display.js';
import { showEmptyState } from './product-utils.js';

const STORAGE_KEY = "tpos_saved_products_list";

export function saveProductData(product) {
    const dataToSave = {
        id: product.Id,
        timestamp: new Date().toISOString(),
        productCode: product.DefaultCode,
        productName: product.Name,
        product: product,
        savedAt: new Date().toLocaleString("vi-VN"),
    };

    let savedProducts = loadAllSavedProducts();

    const existingIndex = savedProducts.findIndex(
        (p) => p.productCode === product.DefaultCode,
    );

    if (existingIndex >= 0) {
        savedProducts[existingIndex] = dataToSave;
        console.log("🔄 Đã cập nhật sản phẩm:", product.DefaultCode);
    } else {
        savedProducts.unshift(dataToSave);
        console.log("✅ Đã thêm sản phẩm mới:", product.DefaultCode);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProducts));
    updateSavedDataList();
}

export function loadAllSavedProducts() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
        return [];
    }

    try {
        const data = JSON.parse(savedData);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Lỗi khi load dữ liệu:", error);
        return [];
    }
}

export function loadSavedProduct(productCode) {
    const savedProducts = loadAllSavedProducts();
    return savedProducts.find((p) => p.productCode === productCode);
}

export function clearSavedData() {
    if (!confirm("Bạn có chắc muốn xóa TẤT CẢ sản phẩm đã lưu?")) {
        return;
    }
    localStorage.removeItem(STORAGE_KEY);
    updateSavedDataList();
    window.showNotification("Đã xóa tất cả dữ liệu đã lưu", "info");
    console.log("🗑️ Đã xóa tất cả dữ liệu đã lưu");
}

export function exportToJSON() {
    const savedProducts = loadAllSavedProducts();
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

export function handleDataFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
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

            let existingProducts = loadAllSavedProducts();

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

            localStorage.setItem(STORAGE_KEY, JSON.stringify(existingProducts));
            updateSavedDataList();

            window.showNotification(`Đã import ${importCount} sản phẩm!`, "success");
        } catch (error) {
            window.showNotification("Lỗi khi đọc file: " + error.message, "error");
        }
    };
    reader.readAsText(file);

    event.target.value = "";
}

export function updateSavedDataList() {
    const infoDiv = document.getElementById("savedDataInfo");
    if (!infoDiv) return;

    const savedProducts = loadAllSavedProducts();

    if (savedProducts.length === 0) {
        infoDiv.innerHTML = ``; // Set innerHTML to empty string
        return;
    }

    infoDiv.innerHTML = `
        <div class="saved-products-list">
            ${savedProducts
                .map(
                    (data) => `
                <div class="saved-product-item" data-code="${data.productCode}">
                    <div class="saved-product-info" onclick="window.loadProductFromList('${data.productCode}')">
                        <div class="saved-product-main">
                            <i data-lucide="box"></i>
                            <div>
                                <div class="saved-product-name">${data.productName}</div>
                                <div class="saved-product-code">${data.productCode}</div>
                            </div>
                        </div>
                        <div class="saved-product-time">${data.savedAt}</div>
                    </div>
                </div>
            `,
                )
                .join("")}
        </div>
    `;
    window.lucide.createIcons();
}

export function loadProductFromList(productCode) {
    const savedData = loadSavedProduct(productCode);
    if (!savedData) {
        window.showNotification("Không tìm thấy sản phẩm", "error");
        return;
    }

    setCurrentProduct(savedData.product);
    setCurrentVariants(savedData.product.ProductVariants || []);

    displayProductInfo(savedData.product);
    displayParentProduct(savedData.product);
    displayVariants(savedData.product.ProductVariants || []);
    updateStats(savedData.product);

    document.getElementById("productCode").value = savedData.productCode;

    document.querySelectorAll(".saved-product-item").forEach((item) => {
        item.classList.remove("active");
    });
    document
        .querySelector(`.saved-product-item[data-code="${productCode}"]`)
        ?.classList.add("active");

    window.showNotification(`Đã load sản phẩm ${productCode}`, "success");
}

export function autoLoadSavedData() {
    const savedProducts = loadAllSavedProducts();
    updateSavedDataList();

    if (savedProducts.length === 0) {
        return;
    }

    const latestProduct = savedProducts[0];

    setCurrentProduct(latestProduct.product);
    setCurrentVariants(latestProduct.product.ProductVariants || []);

    displayProductInfo(latestProduct.product);
    displayParentProduct(latestProduct.product);
    displayVariants(latestProduct.product.ProductVariants || []);
    updateStats(latestProduct.product);

    document.getElementById("productCode").value = latestProduct.productCode;

    setTimeout(() => {
        document
            .querySelector(
                `.saved-product-item[data-code="${latestProduct.productCode}"]`,
            )
            ?.classList.add("active");
    }, 100);

    window.showNotification(
        `✅ Đã tự động tải sản phẩm gần nhất: ${latestProduct.productCode}`,
        "success",
    );
}