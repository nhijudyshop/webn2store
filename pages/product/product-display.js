// pages/product/product-display.js

import { formatCurrency, showEmptyState } from './product-utils.js';
import { currentProduct, setCurrentProduct, setCurrentVariants } from './inventory-state.js';

export function displayProductInfo(product) {
    const card = document.getElementById("productInfoCard");
    const name = document.getElementById("productInfoName");
    const code = document.getElementById("productInfoCode");
    const listPrice = document.getElementById("productInfoListPrice");
    const purchasePrice = document.getElementById("productInfoPurchasePrice");
    const qtyAvailable = document.getElementById("productInfoQtyAvailable");
    const virtualAvailable = document.getElementById("productInfoVirtualAvailable");
    const variantCount = document.getElementById("productInfoVariantCount");

    // Handle image replacement safely to avoid issues with re-rendering
    const currentImageElement = document.getElementById("productInfoImage");
    if (currentImageElement) {
        const newElement = document.createElement(product.ImageUrl ? 'img' : 'div');
        newElement.id = "productInfoImage";

        if (product.ImageUrl) {
            newElement.className = 'product-info-image';
            newElement.src = product.ImageUrl;
            newElement.alt = product.Name || "Product";
            newElement.onerror = function() {
                this.outerHTML = `<div id="productInfoImage" class="product-info-image image-placeholder">Chưa có hình</div>`;
            };
        } else {
            newElement.className = 'product-info-image image-placeholder';
            newElement.textContent = 'Chưa có hình';
        }
        currentImageElement.replaceWith(newElement);
    }

    name.textContent = product.Name || "-";
    code.textContent = product.DefaultCode || "-";
    listPrice.textContent = formatCurrency(product.ListPrice);
    purchasePrice.textContent = formatCurrency(product.PurchasePrice);
    qtyAvailable.textContent = product.QtyAvailable || 0;
    virtualAvailable.textContent = product.VirtualAvailable || 0;
    variantCount.textContent = product.ProductVariantCount || 0;

    card.classList.add("show");
}

export function displayVariants(variants) {
    const wrapper = document.getElementById("variantsTableWrapper");
    if (!wrapper) return;

    if (!variants || variants.length === 0) {
        showEmptyState(wrapper.id, "Không có biến thể nào");
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Hình ảnh</th>
                    <th>Tên biến thể</th>
                    <th>Mã SP Con</th>
                    <th>ID SP Cha</th>
                    <th>Giá bán</th>
                    <th>Giá mua</th>
                    <th>SL Thực tế</th>
                    <th>SL Dự báo</th>
                </tr>
            </thead>
            <tbody>
                ${variants
                    .map(
                        (variant) => `
                    <tr>
                        <td>${variant.Id}</td>
                        <td>
                            ${currentProduct?.ImageUrl 
                                ? `<img src="${currentProduct.ImageUrl}" 
                                     class="product-image" 
                                     onerror="this.outerHTML = '<div class=\\'product-image image-placeholder\\'>Chưa có hình</div>';"
                                     alt="${variant.Name}">`
                                : `<div class="product-image image-placeholder">Chưa có hình</div>`
                            }
                        </td>
                        <td><strong>${variant.Name || "-"}</strong></td>
                        <td><span class="product-code">${variant.DefaultCode || "-"}</span></td>
                        <td>${variant.ProductTmplId}</td>
                        <td class="price-cell">${formatCurrency(variant.PriceVariant || variant.ListPrice)}</td>
                        <td>${formatCurrency(variant.StandardPrice)}</td>
                        <td class="qty-cell qty-available">${variant.QtyAvailable || 0}</td>
                        <td class="qty-cell qty-forecast">${variant.VirtualAvailable || 0}</td>
                    </tr>
                `,
                    )
                    .join("")}
            </tbody>
        </table>
    `;

    wrapper.innerHTML = html;
    window.lucide.createIcons(); // Re-initialize icons
}

export function clearData() {
    document.getElementById("productCode").value = "";

    setCurrentProduct(null);
    setCurrentVariants([]);

    document.getElementById("productInfoCard").classList.remove("show");

    showEmptyState("variantsTableWrapper", 'Nhập mã sản phẩm và nhấn "Thêm" để xem danh sách biến thể');

    window.showNotification("Đã xóa dữ liệu", "info");
}