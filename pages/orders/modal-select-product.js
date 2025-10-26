// pages/orders/modal-select-product.js

import { inventoryProducts } from './state.js';

export function openSelectProductModal() {
    const modal = document.getElementById("selectProductModal");
    if (modal) {
        modal.style.display = "flex";
        window.lucide.createIcons();
        displayInventoryProducts(inventoryProducts.slice(0, 50));
    }
}

export function closeSelectProductModal() {
    const modal = document.getElementById("selectProductModal");
    if (modal) {
        modal.style.display = "none";
    }
}

export function displayInventoryProducts(productsToDisplay) {
    const tbody = document.getElementById("inventoryProductList");
    if (!productsToDisplay || productsToDisplay.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">Không tìm thấy sản phẩm.</td></tr>`;
        return;
    }

    const html = productsToDisplay.map(product => `
        <tr>
            <td><img src="../../shared/assets/placeholder.png" class="price-image" alt="Product"></td>
            <td><span class="product-code">${product.code}</span></td>
            <td>${product.name}</td>
            <td>-</td>
            <td>0 ₫</td>
            <td>0 ₫</td>
            <td><input type="checkbox" class="checkbox" data-product-code="${product.code}"></td>
        </tr>
    `).join('');
    tbody.innerHTML = html;
}

export function handleProductSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    if (searchTerm.length < 2) {
        displayInventoryProducts(inventoryProducts.slice(0, 50));
        return;
    }

    const filtered = inventoryProducts.filter(p => 
        p.code.toLowerCase().includes(searchTerm) || 
        p.name.toLowerCase().includes(searchTerm)
    );

    displayInventoryProducts(filtered.slice(0, 50));
}