// pages/product/product-utils.js

export function formatCurrency(value) {
    if (!value && value !== 0) return "-";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
}

export function showLoading(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    wrapper.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>Đang tải dữ liệu...</p>
        </div>
    `;
    window.lucide.createIcons(); // Re-initialize icons
}

export function showEmptyState(wrapperId, message) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    wrapper.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <p>${message}</p>
        </div>
    `;
    window.lucide.createIcons(); // Re-initialize icons
}