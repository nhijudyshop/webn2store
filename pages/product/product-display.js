// pages/product/product-display.js

import { formatCurrency, showEmptyState } from './product-utils.js';
import { currentProduct } from './inventory-state.js';
import { loadAllSavedProducts } from './product-storage.js'; // Import loadAllSavedProducts

export function displayProductInfo(product) {
    const card = document.getElementById("productInfoCard");
    const image = document.getElementById("productInfoImage");
    const name = document.getElementById("productInfoName");
    const code = document.getElementById("productInfoCode");
    const listPrice = document.getElementById("productInfoListPrice");
    const purchasePrice = document.getElementById("productInfoPurchasePrice");
    const qtyAvailable = document.getElementById("productInfoQtyAvailable");
    const virtualAvailable = document.getElementById("productInfoVirtualAvailable");
    const variantCount = document.getElementById("productInfoVariantCount");

    if (!card || !image || !name || !code || !listPrice || !purchasePrice || !qtyAvailable || !virtualAvailable || !variantCount) {
        console.error("Missing one or more product info card DOM elements.");
        return;
    }

    image.src = product.ImageUrl || "../../shared/assets/placeholder.png";
    image.onerror = () => {
        image.onerror = null; // Prevent infinite loop
        image.src = "../../shared/assets/placeholder.png";
    };
    name.textContent = product.Name || "-";
    code.textContent = product.DefaultCode || "-";
    listPrice.textContent = formatCurrency(product.ListPrice);
    purchasePrice.textContent = formatCurrency(product.PurchasePrice);
    qtyAvailable.textContent = product.QtyAvailable || 0;
    virtualAvailable.textContent = product.VirtualAvailable || 0;
    variantCount.textContent = product.ProductVariantCount || 0;

    card.classList.add("show");
}

export function displayParentProduct(product) {
    const wrapper = document.getElementById("parentTableWrapper");
    if (!wrapper) return;

    if (!product) {
        showEmptyState(wrapper.id, 'Nhập mã sản phẩm và nhấn "Thêm" để xem thông tin');
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Hình ảnh</th>
                    <th>Tên sản phẩm</th>
                    <th>Mã SP</th>
                    <th>Giá bán</th>
                    <th>Giá mua</th>
                    <th>SL Thực tế</th>
                    <th>SL Dự báo</th>
                    <th>Số biến thể</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${product.Id}</td>
                    <td>
                        <img src="${product.ImageUrl || "../../shared/assets/placeholder.png"}" 
                             class="product-image" 
                             onerror="this.onerror=null; this.src='../../shared/assets/placeholder.png';"
                             alt="${product.Name}">
                    </td>
                    <td><strong>${product.Name || "-"}</strong></td>
                    <td><span class="product-code">${product.DefaultCode || "-"}</span></td>
                    <td class="price-cell">${formatCurrency(product.ListPrice)}</td>
                    <td>${formatCurrency(product.PurchasePrice)}</td>
                    <td class="qty-cell qty-available">${product.QtyAvailable || 0}</td>
                    <td class="qty-cell qty-forecast">${product.VirtualAvailable || 0}</td>
                    <td><span class="variant-count">${product.ProductVariantCount || 0}</span></td>
                </tr>
            </tbody>
        </table>
    `;

    wrapper.innerHTML = html;
    window.lucide.createIcons(); // Re-initialize icons
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
                            <img src="${currentProduct?.ImageUrl || "../../shared/assets/placeholder.png"}" 
                                 class="product-image" 
                                 onerror="this.onerror=null; this.src='../../shared/assets/placeholder.png';"
                                 alt="${variant.NameTemplate}">
                        </td>
                        <td><strong>${variant.NameTemplate || "-"}</strong></td>
                        <td><span class="product-code">${variant.DefaultCode || "-"}</span></td>
                        <td>${variant.ProductTmplId}</td>
                        <td class="price-cell">${formatCurrency(variant.PriceVariant || variant.ListPrice)}</td>
                        <td>${formatCurrency(variant.ListPrice)}</td>
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

export function updateStats(product) {
    const variants = product.ProductVariants || [];

    // Total products (always 1 parent)
    document.getElementById("totalProducts").textContent = "1";

    // Total variants
    document.getElementById("totalVariants").textContent = variants.length;

    // Total quantity (parent + all variants)
    const totalQty =
        (product.QtyAvailable || 0) +
        variants.reduce((sum, v) => sum + (v.QtyAvailable || 0), 0);
    document.getElementById("totalQty").textContent = totalQty;

    // Total value (quantity * price for parent and variants)
    const parentValue = (product.QtyAvailable || 0) * (product.ListPrice || 0);
    const variantsValue = variants.reduce(
        (sum, v) =>
            sum + (v.QtyAvailable || 0) * (v.PriceVariant || v.ListPrice || 0),
        0,
    );
    const totalValue = parentValue + variantsValue;
    document.getElementById("totalValue").textContent =
        formatCurrency(totalValue);
}

export function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));

    document.querySelector(`.tab-btn[onclick="switchTab('${tab}')"]`).classList.add("active");
    document.getElementById(`${tab}Tab`).classList.add("active");
    window.lucide.createIcons();
}

/**
 * Renders a table of all saved products, including their variants.
 * @param {Array<Object>} savedProducts - An array of saved product objects.
 */
export function renderAllSavedProductsTable(savedProducts) {
    const wrapper = document.getElementById("allProductsTableWrapper");
    if (!wrapper) return;

    if (!savedProducts || savedProducts.length === 0) {
        showEmptyState(wrapper.id, "Chưa có sản phẩm nào được thêm.");
        return;
    }

    const allRows = savedProducts.flatMap(data => {
        const product = data.product;
        const variants = product.ProductVariants || [];

        // Parent product row
        const parentRow = `
            <tr onclick="window.loadProductFromList('${data.productCode}')" style="cursor: pointer; background-color: #f8fafc;">
                <td>${product.Id}</td>
                <td>
                    <img src="${product.ImageUrl || "../../shared/assets/placeholder.png"}" 
                         class="product-image" 
                         onerror="this.onerror=null; this.src='../../shared/assets/placeholder.png';"
                         alt="${product.Name}">
                </td>
                <td><strong>${product.Name || "-"}</strong></td>
                <td><span class="product-code">${product.DefaultCode || "-"}</span></td>
                <td class="price-cell">${formatCurrency(product.ListPrice)}</td>
                <td>${formatCurrency(product.PurchasePrice)}</td>
                <td class="qty-cell qty-available">${product.QtyAvailable || 0}</td>
                <td class="qty-cell qty-forecast">${product.VirtualAvailable || 0}</td>
                <td>${data.savedAt}</td>
            </tr>
        `;

        // Variant rows
        const variantRows = variants.map(variant => `
            <tr onclick="window.loadProductFromList('${data.productCode}')" style="cursor: pointer;">
                <td>${variant.Id}</td>
                <td>
                    <img src="${product.ImageUrl || "../../shared/assets/placeholder.png"}" 
                         class="product-image" 
                         onerror="this.onerror=null; this.src='../../shared/assets/placeholder.png';"
                         alt="${variant.NameTemplate}">
                </td>
                <td style="padding-left: 30px;">${variant.NameTemplate || "-"}</td>
                <td><span class="product-code">${variant.DefaultCode || "-"}</span></td>
                <td class="price-cell">${formatCurrency(product.ListPrice)}</td>
                <td>${formatCurrency(product.PurchasePrice)}</td>
                <td class="qty-cell qty-available">${variant.QtyAvailable || 0}</td>
                <td class="qty-cell qty-forecast">${variant.VirtualAvailable || 0}</td>
                <td></td>
            </tr>
        `).join('');

        return parentRow + variantRows;
    }).join('');

    const html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Hình ảnh</th>
                    <th>Tên sản phẩm</th>
                    <th>Mã SP</th>
                    <th>Giá bán</th>
                    <th>Giá mua</th>
                    <th>SL Thực tế</th>
                    <th>SL Dự báo</th>
                    <th>Đã lưu lúc</th>
                </tr>
            </thead>
            <tbody>
                ${allRows}
            </tbody>
        </table>
    `;

    wrapper.innerHTML = html;
    window.lucide.createIcons(); // Re-initialize icons
}