// ===== GLOBAL VARIABLES =====
let orders = [];
let currentTab = 'orders';
let inventoryProducts = []; // To store products for the selection modal

// ===== SIDEBAR FUNCTIONS =====
// Note: The functions toggleSidebar, closeSidebar, and showNotification are now globally available from sidebar.js

// ===== TAB FUNCTIONS =====
function switchTab(tab) {
    // Update tab buttons
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach((btn) => btn.classList.remove("active"));
    event.target.closest(".tab-btn").classList.add("active");

    currentTab = tab;
    
    // Update content based on tab
    if (tab === 'orders') {
        loadOrders();
    } else if (tab === 'drafts') {
        loadDrafts();
    } else if (tab === 'products') {
        loadProducts();
    }
}

// ===== ORDER MANAGEMENT =====
function exportExcel(type) {
    if (type === 'purchase') {
        showNotification("Đang xuất Excel mua hàng...", "info");
    } else {
        showNotification("Đang xuất Excel thêm sản phẩm...", "info");
    }
}

function selectDate(type) {
    showNotification(`Chọn ngày ${type === 'from' ? 'từ' : 'đến'} đang được phát triển`, "info");
}

// ===== LOAD DATA =====
async function loadInventoryProducts() {
    try {
        const response = await fetch('/api/products/suggestions');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            inventoryProducts = result.data;
            console.log(`✅ Loaded ${inventoryProducts.length} inventory products.`);
        } else {
            console.error('❌ Failed to load inventory products.');
            const tbody = document.getElementById("inventoryProductList");
            if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">Lỗi tải danh sách sản phẩm.</td></tr>`;
        }
    } catch (error) {
        console.error('❌ Error fetching inventory products:', error);
        const tbody = document.getElementById("inventoryProductList");
        if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">Lỗi kết nối. Không thể tải sản phẩm.</td></tr>`;
    }
}


function loadOrders() {
    // Sample data
    const sampleOrders = [
        {
            id: 1,
            date: "25/10/2025",
            time: "18:15",
            supplier: "A79",
            totalQty: 1,
            invoice: "100.000 ₫",
            productName: "2510 A79 SET ÁO TD + Q.DÀI TRƠN ĐEN",
            productCode: "N1213",
            variant: "-",
            quantity: 1,
            purchasePrice: "100.000 ₫",
            salePrice: "195.000 ₫",
            note: "",
            status: "waiting"
        },
        {
            id: 2,
            date: "25/10/2025",
            time: "17:30",
            supplier: "B45",
            totalQty: 2,
            invoice: "250.000 ₫",
            productName: "2510 B45 ÁO THUN NAM TRƠN XANH",
            productCode: "N1214",
            variant: "Size M",
            quantity: 2,
            purchasePrice: "125.000 ₫",
            salePrice: "220.000 ₫",
            note: "Giao hàng nhanh",
            status: "delivered"
        },
        {
            id: 3,
            date: "24/10/2025",
            time: "16:45",
            supplier: "C12",
            totalQty: 1,
            invoice: "80.000 ₫",
            productName: "2410 C12 QUẦN JEAN NAM XANH",
            productCode: "N1215",
            variant: "Size L",
            quantity: 1,
            purchasePrice: "80.000 ₫",
            salePrice: "150.000 ₫",
            note: "",
            status: "cancelled"
        }
    ];

    orders = sampleOrders;
    displayOrders();
    updateStats();
}

function loadDrafts() {
    showNotification("Không có bản nháp nào", "info");
}

function loadProducts() {
    showNotification("Tính năng sản phẩm đã đặt đang được phát triển", "info");
}

// ===== DISPLAY FUNCTIONS =====
function displayOrders() {
    const tbody = document.getElementById("ordersTableBody");
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; padding: 40px; color: #64748b;">
                    <i data-lucide="inbox" style="width: 48px; height: 48px; margin: 0 auto 16px; display: block;"></i>
                    <p>Chưa có đơn hàng nào</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    const html = orders.map(order => `
        <tr>
            <td>
                <div class="order-date">
                    <i data-lucide="calendar"></i>
                    <div>
                        <div>${order.date}</div>
                        <div style="font-size: 12px; color: #64748b;">(${order.time})</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="supplier-info">${order.supplier}</div>
                <div class="supplier-qty">Tổng SL: ${order.totalQty}</div>
            </td>
            <td>
                <div class="invoice-info">
                    <div class="invoice-images">
                        <img src="../../shared/assets/placeholder.png" class="invoice-image" alt="Product">
                        <img src="../../shared/assets/placeholder.png" class="invoice-image" alt="Product">
                    </div>
                    <div class="invoice-value">${order.invoice}</div>
                </div>
            </td>
            <td>
                <div class="product-name">${order.productName}</div>
            </td>
            <td>
                <span class="product-code">${order.productCode}</span>
            </td>
            <td>
                <div class="variant">${order.variant}</div>
            </td>
            <td>
                <div class="quantity">${order.quantity}</div>
            </td>
            <td>
                <div class="price-cell">
                    <div class="price-text">Chưa có hình</div>
                    <div class="price">${order.purchasePrice}</div>
                </div>
            </td>
            <td>
                <div class="price-cell">
                    <img src="../../shared/assets/placeholder.png" class="price-image" alt="Product">
                    <div class="price">${order.salePrice}</div>
                </div>
            </td>
            <td>
                <div style="color: #64748b; font-size: 14px;">${order.note || '-'}</div>
            </td>
            <td>
                <span class="status-badge status-${order.status}">
                    ${getStatusText(order.status)}
                </span>
            </td>
            <td>
                <button class="btn-edit" onclick="editOrder(${order.id})" title="Chỉnh sửa đơn hàng">
                    <i data-lucide="edit"></i>
                </button>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-delete" onclick="deleteOrder(${order.id})" title="Xóa đơn hàng">
                        <i data-lucide="trash-2"></i>
                    </button>
                    <input type="checkbox" class="checkbox" onchange="toggleOrderSelection(${order.id})">
                </div>
            </td>
        </tr>
    `).join('');

    tbody.innerHTML = html;
    lucide.createIcons();
}

function getStatusText(status) {
    const statusMap = {
        'waiting': 'Chờ Hàng',
        'delivered': 'Đã giao',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}

// ===== ORDER ACTIONS =====
function editOrder(orderId) {
    showNotification(`Chỉnh sửa đơn hàng #${orderId}`, "info");
}

function deleteOrder(orderId) {
    if (confirm(`Bạn có chắc muốn xóa đơn hàng #${orderId}?`)) {
        orders = orders.filter(order => order.id !== orderId);
        displayOrders();
        updateStats();
        showNotification(`Đã xóa đơn hàng #${orderId}`, "success");
    }
}

function toggleOrderSelection(orderId) {
    showNotification(`Đã chọn đơn hàng #${orderId}`, "info");
}

// ===== UPDATE STATS =====
function updateStats() {
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, order) => {
        const value = parseInt(order.invoice.replace(/[^\d]/g, ''));
        return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    const today = new Date().toLocaleDateString('vi-VN');
    const todayOrders = orders.filter(order => order.date === today).length;
    const todayValue = orders.filter(order => order.date === today)
        .reduce((sum, order) => {
            const value = parseInt(order.invoice.replace(/[^\d]/g, ''));
            return sum + (isNaN(value) ? 0 : value);
        }, 0);

    document.getElementById("totalOrders").textContent = totalOrders;
    document.getElementById("totalValue").textContent = formatCurrency(totalValue);
    document.getElementById("todayOrders").textContent = todayOrders;
    document.getElementById("todayValue").textContent = formatCurrency(todayValue);
    document.getElementById("syncStatus").textContent = "0/328";
}

function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
}

// ===== SEARCH AND FILTER =====
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", filterOrders);
    }

    // Quick filter
    const quickFilter = document.getElementById("quickFilter");
    if (quickFilter) {
        quickFilter.addEventListener("change", filterOrders);
    }

    // Status filter
    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", filterOrders);
    }

    // Product search in modal
    const productSearchInput = document.getElementById("productSearchInput");
    if (productSearchInput) {
        productSearchInput.addEventListener("input", handleProductSearch);
    }
}

function filterOrders() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    const quickFilter = document.getElementById("quickFilter").value;
    const statusFilter = document.getElementById("statusFilter").value;

    let filteredOrders = orders;

    // Search filter
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => 
            order.supplier.toLowerCase().includes(searchTerm) ||
            order.productName.toLowerCase().includes(searchTerm) ||
            order.productCode.toLowerCase().includes(searchTerm) ||
            order.date.includes(searchTerm)
        );
    }

    // Status filter
    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    // Quick filter
    if (quickFilter !== 'all') {
        const today = new Date();
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.date.split('/').reverse().join('-'));
            switch (quickFilter) {
                case 'today':
                    return orderDate.toDateString() === today.toDateString();
                case 'week':
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return orderDate >= weekAgo;
                case 'month':
                    return orderDate.getMonth() === today.getMonth() && 
                           orderDate.getFullYear() === today.getFullYear();
                default:
                    return true;
            }
        });
    }

    // Update display
    displayFilteredOrders(filteredOrders);
}

function displayFilteredOrders(filteredOrders) {
    const tbody = document.getElementById("ordersTableBody");
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; padding: 40px; color: #64748b;">
                    <i data-lucide="search" style="width: 48px; height: 48px; margin: 0 auto 16px; display: block;"></i>
                    <p>Không tìm thấy đơn hàng nào</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    const html = filteredOrders.map(order => `
        <tr>
            <td>
                <div class="order-date">
                    <i data-lucide="calendar"></i>
                    <div>
                        <div>${order.date}</div>
                        <div style="font-size: 12px; color: #64748b;">(${order.time})</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="supplier-info">${order.supplier}</div>
                <div class="supplier-qty">Tổng SL: ${order.totalQty}</div>
            </td>
            <td>
                <div class="invoice-info">
                    <div class="invoice-images">
                        <img src="../../shared/assets/placeholder.png" class="invoice-image" alt="Product">
                        <img src="../../shared/assets/placeholder.png" class="invoice-image" alt="Product">
                    </div>
                    <div class="invoice-value">${order.invoice}</div>
                </div>
            </td>
            <td>
                <div class="product-name">${order.productName}</div>
            </td>
            <td>
                <span class="product-code">${order.productCode}</span>
            </td>
            <td>
                <div class="variant">${order.variant}</div>
            </td>
            <td>
                <div class="quantity">${order.quantity}</div>
            </td>
            <td>
                <div class="price-cell">
                    <div class="price-text">Chưa có hình</div>
                    <div class="price">${order.purchasePrice}</div>
                </div>
            </td>
            <td>
                <div class="price-cell">
                    <img src="../../shared/assets/placeholder.png" class="price-image" alt="Product">
                    <div class="price">${order.salePrice}</div>
                </div>
            </td>
            <td>
                <div style="color: #64748b; font-size: 14px;">${order.note || '-'}</div>
            </td>
            <td>
                <span class="status-badge status-${order.status}">
                    ${getStatusText(order.status)}
                </span>
            </td>
            <td>
                <button class="btn-edit" onclick="editOrder(${order.id})" title="Chỉnh sửa đơn hàng">
                    <i data-lucide="edit"></i>
                </button>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-delete" onclick="deleteOrder(${order.id})" title="Xóa đơn hàng">
                        <i data-lucide="trash-2"></i>
                    </button>
                    <input type="checkbox" class="checkbox" onchange="toggleOrderSelection(${order.id})">
                </div>
            </td>
        </tr>
    `).join('');

    tbody.innerHTML = html;
    lucide.createIcons();
}

// ===== MODAL FUNCTIONS =====
function createOrder() {
    const modal = document.getElementById("createOrderModal");
    if (modal) {
        modal.style.display = "flex";
        // Set date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('orderDateInput').value = today;
        // Add a default product row if list is empty
        if (document.getElementById("modalProductList").children.length === 0) {
            addProductRow();
        }
        lucide.createIcons();
    }
}

function closeCreateOrderModal() {
    const modal = document.getElementById("createOrderModal");
    if (modal) {
        modal.style.display = "none";
    }
}

function clearOrderForm() {
    if (confirm("Bạn có chắc muốn xóa toàn bộ thông tin đã nhập?")) {
        const modal = document.getElementById("createOrderModal");
        modal.querySelectorAll('input, textarea').forEach(input => {
            if (input.type === 'date') {
                input.value = new Date().toISOString().split('T')[0];
            } else if (input.type === 'number') {
                input.value = '0';
            } else {
                input.value = '';
            }
        });
        document.getElementById("modalProductList").innerHTML = '';
        addProductRow();
        updateTotals();
        showNotification("Đã xóa thông tin trên form", "info");
    }
}

function addProductRow() {
    const tbody = document.getElementById("modalProductList");
    const newRow = document.createElement("tr");
    const rowIndex = tbody.children.length + 1;

    newRow.innerHTML = `
        <td>${rowIndex}</td>
        <td><input type="text" placeholder="Nhập tên sản phẩm"></td>
        <td><input type="text" placeholder="Mã SP"></td>
        <td><input type="number" value="1" style="width: 60px;"></td>
        <td><input type="number" value="0"></td>
        <td><input type="number" value="0"></td>
        <td>0 ₫</td>
        <td><div class="image-dropzone"><i data-lucide="image"></i></div></td>
        <td><div class="image-dropzone"><i data-lucide="image"></i></div></td>
        <td><select><option>Chọn biến thể...</option></select></td>
        <td class="action-cell">
            <button class="btn-action" title="Gợi ý thông minh"><i data-lucide="sparkles"></i></button>
            <button class="btn-action" title="Sao chép"><i data-lucide="copy"></i></button>
            <button class="btn-action delete" title="Xóa" onclick="this.closest('tr').remove(); updateTotals();"><i data-lucide="trash-2"></i></button>
        </td>
    `;
    tbody.appendChild(newRow);
    lucide.createIcons();
    updateTotals();
}

function updateTotals() {
    // This is a placeholder for now.
    // A full implementation would calculate totals based on product rows.
    document.getElementById("modalTotalQuantity").textContent = document.getElementById("modalProductList").children.length;
}

function openSelectProductModal() {
    const modal = document.getElementById("selectProductModal");
    if (modal) {
        modal.style.display = "flex";
        lucide.createIcons();
        // Display initial list of products (e.g., first 50)
        displayInventoryProducts(inventoryProducts.slice(0, 50));
    }
}

function closeSelectProductModal() {
    const modal = document.getElementById("selectProductModal");
    if (modal) {
        modal.style.display = "none";
    }
}

function displayInventoryProducts(productsToDisplay) {
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

function handleProductSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    if (searchTerm.length < 2) {
        displayInventoryProducts(inventoryProducts.slice(0, 50)); // Show default list if search is too short
        return;
    }

    const filtered = inventoryProducts.filter(p => 
        p.code.toLowerCase().includes(searchTerm) || 
        p.name.toLowerCase().includes(searchTerm)
    );

    displayInventoryProducts(filtered.slice(0, 50)); // Display filtered results, limited to 50
}


// Expose functions to global scope for onclick handlers
window.createOrder = createOrder;
window.closeCreateOrderModal = closeCreateOrderModal;
window.clearOrderForm = clearOrderForm;
window.addProductRow = addProductRow;
window.openSelectProductModal = openSelectProductModal;
window.closeSelectProductModal = closeSelectProductModal;


// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // Load initial data
    loadOrders();
    loadInventoryProducts();

    // Setup event listeners
    setupEventListeners();

    // Add CSS animations
    const style = document.createElement("style");
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    console.log("Orders page initialized");
});