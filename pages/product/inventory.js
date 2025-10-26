// ===== GLOBAL VARIABLES =====
let currentProduct = null;
let currentVariants = [];

// ===== SAVED DATA MANAGEMENT =====
const STORAGE_KEY = "tpos_saved_products_list"; // Changed to list

function saveProductData(product) {
    const dataToSave = {
        id: product.Id,
        timestamp: new Date().toISOString(),
        productCode: product.DefaultCode,
        productName: product.Name,
        product: product,
        savedAt: new Date().toLocaleString("vi-VN"),
    };

    // Get existing products
    let savedProducts = loadAllSavedProducts();

    // Check if product already exists (by code)
    const existingIndex = savedProducts.findIndex(
        (p) => p.productCode === product.DefaultCode,
    );

    if (existingIndex >= 0) {
        // Update existing product
        savedProducts[existingIndex] = dataToSave;
        console.log("🔄 Đã cập nhật sản phẩm:", product.DefaultCode);
    } else {
        // Add new product to the beginning
        savedProducts.unshift(dataToSave);
        console.log("✅ Đã thêm sản phẩm mới:", product.DefaultCode);
    }

    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProducts));
    updateSavedDataList();
}

function loadAllSavedProducts() {
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

function loadSavedProduct(productCode) {
    const savedProducts = loadAllSavedProducts();
    return savedProducts.find((p) => p.productCode === productCode);
}

function clearSavedData() {
    if (!confirm("Bạn có chắc muốn xóa TẤT CẢ sản phẩm đã lưu?")) {
        return;
    }
    localStorage.removeItem(STORAGE_KEY);
    updateSavedDataList();
    showNotification("Đã xóa tất cả dữ liệu đã lưu", "info");
    console.log("🗑️ Đã xóa tất cả dữ liệu đã lưu");
}

function deleteSavedProduct(productCode) {
    let savedProducts = loadAllSavedProducts();
    savedProducts = savedProducts.filter((p) => p.productCode !== productCode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProducts));
    updateSavedDataList();
    showNotification(`Đã xóa sản phẩm ${productCode}`, "info");
}

function exportToJSON() {
    const savedProducts = loadAllSavedProducts();
    if (savedProducts.length === 0) {
        showNotification("Không có dữ liệu để export", "error");
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

    showNotification(`Đã export ${savedProducts.length} sản phẩm`, "success");
}

function importFromJSON() {
    document.getElementById("dataFileInput").click();
}

function handleDataFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            // Check if it's an array (multiple products) or single product
            let productsToImport = [];

            if (Array.isArray(data)) {
                // Multiple products
                productsToImport = data;
            } else if (data.product) {
                // Single product (old format)
                productsToImport = [data];
            } else {
                showNotification("File JSON không đúng định dạng", "error");
                return;
            }

            // Validate and save
            let importCount = 0;
            productsToImport.forEach((item) => {
                if (item.product && item.productCode) {
                    importCount++;
                }
            });

            if (importCount === 0) {
                showNotification(
                    "Không tìm thấy sản phẩm hợp lệ trong file",
                    "error",
                );
                return;
            }

            // Save to localStorage (merge with existing)
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

            showNotification(`Đã import ${importCount} sản phẩm!`, "success");
        } catch (error) {
            showNotification("Lỗi khi đọc file: " + error.message, "error");
        }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = "";
}

function updateSavedDataList() {
    const infoDiv = document.getElementById("savedDataInfo");
    const savedProducts = loadAllSavedProducts();

    if (savedProducts.length === 0) {
        infoDiv.innerHTML = `
            <div class="saved-data-empty">
                <i data-lucide="inbox"></i>
                <span>Chưa có sản phẩm nào được lưu</span>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    infoDiv.innerHTML = `
        <div class="saved-products-list">
            <div class="saved-products-count">
                <i data-lucide="database"></i>
                <span>Đã lưu ${savedProducts.length} sản phẩm</span>
            </div>
            ${savedProducts
                .map(
                    (data) => `
                <div class="saved-product-item" data-code="${data.productCode}">
                    <div class="saved-product-info" onclick="loadProductFromList('${data.productCode}')">
                        <div class="saved-product-main">
                            <i data-lucide="box"></i>
                            <div>
                                <div class="saved-product-name">${data.productName}</div>
                                <div class="saved-product-code">${data.productCode}</div>
                            </div>
                        </div>
                        <div class="saved-product-time">${data.savedAt}</div>
                    </div>
                    <button class="btn-delete-product" onclick="event.stopPropagation(); deleteSavedProduct('${data.productCode}')" title="Xóa sản phẩm này">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `,
                )
                .join("")}
        </div>
    `;
    lucide.createIcons();
}

function loadProductFromList(productCode) {
    const savedData = loadSavedProduct(productCode);
    if (!savedData) {
        showNotification("Không tìm thấy sản phẩm", "error");
        return;
    }

    currentProduct = savedData.product;
    currentVariants = savedData.product.ProductVariants || [];

    displayProductInfo(currentProduct);
    displayParentProduct(currentProduct);
    displayVariants(currentVariants);
    updateStats(currentProduct);

    // Update search input
    document.getElementById("productCode").value = savedData.productCode;

    // Highlight selected product
    document.querySelectorAll(".saved-product-item").forEach((item) => {
        item.classList.remove("active");
    });
    document
        .querySelector(`.saved-product-item[data-code="${productCode}"]`)
        ?.classList.add("active");

    showNotification(`Đã load sản phẩm ${productCode}`, "success");
}

function autoLoadSavedData() {
    const savedProducts = loadAllSavedProducts();

    // Update the list display
    updateSavedDataList();

    if (savedProducts.length === 0) {
        return;
    }

    // Auto-load the most recent product (first in array)
    const latestProduct = savedProducts[0];

    currentProduct = latestProduct.product;
    currentVariants = latestProduct.product.ProductVariants || [];

    displayProductInfo(currentProduct);
    displayParentProduct(currentProduct);
    displayVariants(currentVariants);
    updateStats(currentProduct);

    // Update search input
    document.getElementById("productCode").value = latestProduct.productCode;

    // Highlight selected product
    setTimeout(() => {
        document
            .querySelector(
                `.saved-product-item[data-code="${latestProduct.productCode}"]`,
            )
            ?.classList.add("active");
    }, 100);

    showNotification(
        `✅ Đã tự động tải sản phẩm gần nhất: ${latestProduct.productCode}`,
        "success",
    );
}

// ===== TOKEN MANAGEMENT =====
function saveToken() {
    const token = document.getElementById("bearerToken").value.trim();

    if (!token) {
        showNotification("Vui lòng nhập Bearer Token", "error");
        return;
    }

    // Save to localStorage
    localStorage.setItem("tpos_bearer_token", token);
    showNotification("Đã lưu token thành công!", "success");
}

function loadToken() {
    const token = localStorage.getItem("tpos_bearer_token");
    if (token) {
        document.getElementById("bearerToken").value = token;
        return token;
    }
    return null;
}

function getToken() {
    let token = document.getElementById("bearerToken").value.trim();
    if (!token) {
        token = localStorage.getItem("tpos_bearer_token");
        if (token) {
            document.getElementById("bearerToken").value = token;
        }
    }
    return token;
}

function toggleTokenVisibility() {
    const input = document.getElementById("bearerToken");
    const icon = document.getElementById("eyeIcon");

    if (input.type === "password") {
        input.type = "text";
        icon.setAttribute("data-lucide", "eye-off");
    } else {
        input.type = "password";
        icon.setAttribute("data-lucide", "eye");
    }
    lucide.createIcons();
}

function loadTokenFromFile() {
    document.getElementById("tokenFileInput").click();
}

function handleTokenFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const content = e.target.result;
            let token = null;

            // Try to parse as JSON first
            if (file.name.endsWith(".json")) {
                const json = JSON.parse(content);
                token =
                    json.token ||
                    json.bearerToken ||
                    json.authorization ||
                    json.bearer;
            } else {
                // Plain text file
                token = content.trim();
            }

            if (token) {
                // Remove "Bearer " prefix if exists
                token = token.replace(/^Bearer\s+/i, "");
                document.getElementById("bearerToken").value = token;
                localStorage.setItem("tpos_bearer_token", token);
                showNotification("Đã tải token từ file thành công!", "success");
            } else {
                showNotification("Không tìm thấy token trong file", "error");
            }
        } catch (error) {
            showNotification("Lỗi khi đọc file: " + error.message, "error");
        }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = "";
}

// ===== API HEADERS =====
function generateRequestId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        },
    );
}

function getHeaders() {
    const token = getToken();

    if (!token) {
        throw new Error("Vui lòng nhập Bearer Token trước khi tìm kiếm");
    }

    return {
        accept: "application/json, text/plain, */*",
        "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        authorization: `Bearer ${token}`,
        "content-type": "application/json;charset=UTF-8",
        priority: "u=1, i",
        "sec-ch-ua":
            '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-fetch-storage-access": "active",
        tposappversion: "5.9.10.1",
        "x-request-id": generateRequestId(),
    };
}

// ===== SIDEBAR FUNCTIONS =====
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    const body = document.body;
    const toggle = document.getElementById("sidebarToggle");

    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
    body.classList.toggle("sidebar-open");
    toggle.classList.toggle("active");
}

function closeSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    const body = document.body;
    const toggle = document.getElementById("sidebarToggle");

    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    body.classList.remove("sidebar-open");
    toggle.classList.remove("active");
}

// ===== NOTIFICATION FUNCTION =====
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "error" ? "#ef4444" : type === "success" ? "#10b981" : "#3b82f6"};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== TAB FUNCTIONS =====
function switchTab(tab) {
    // Update tab buttons
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach((btn) => btn.classList.remove("active"));
    event.target.closest(".tab-btn").classList.add("active");

    // Update tab content
    const tabContents = document.querySelectorAll(".tab-content");
    tabContents.forEach((content) => content.classList.remove("active"));

    if (tab === "parent") {
        document.getElementById("parentTab").classList.add("active");
    } else {
        document.getElementById("variantsTab").classList.add("active");
    }
}

// ===== SEARCH PRODUCT =====
async function searchProduct(event) {
    event.preventDefault();

    const productCode = document.getElementById("productCode").value.trim();

    if (!productCode) {
        showNotification("Vui lòng nhập mã sản phẩm", "error");
        return;
    }

    try {
        // Get headers with token
        const headers = getHeaders();

        // Show loading
        showLoading("parentTableWrapper");
        showLoading("variantsTableWrapper");

        // Step 1: Search for product by DefaultCode
        const searchUrl = `https://tomato.tpos.vn/odata/ProductTemplate/OdataService.GetViewV2?Active=true&DefaultCode=${productCode}&$top=50&$orderby=DateCreated+desc&$filter=Active+eq+true&$count=true`;

        console.log("Fetching search results...", searchUrl);
        const searchResponse = await fetch(searchUrl, {
            method: "GET",
            headers: headers,
            body: null,
        });

        if (!searchResponse.ok) {
            if (searchResponse.status === 401) {
                throw new Error(
                    "Token không hợp lệ hoặc đã hết hạn. Vui lòng nhập token mới.",
                );
            }
            throw new Error(
                `HTTP Error: ${searchResponse.status} - ${searchResponse.statusText}`,
            );
        }

        const searchData = await searchResponse.json();
        console.log("Search results:", searchData);

        // Find product with exact DefaultCode
        const product = searchData.value.find(
            (p) => p.DefaultCode === productCode,
        );

        if (!product) {
            throw new Error(`Không tìm thấy sản phẩm với mã: ${productCode}`);
        }

        const productId = product.Id;
        console.log("Found product ID:", productId);

        // Step 2: Get product details with variants
        const detailUrl = `https://tomato.tpos.vn/odata/ProductTemplate(${productId})?$expand=UOM,UOMCateg,Categ,UOMPO,POSCateg,Taxes,SupplierTaxes,Product_Teams,Images,UOMView,Distributor,Importer,Producer,OriginCountry,ProductVariants($expand=UOM,Categ,UOMPO,POSCateg,AttributeValues)`;

        console.log("Fetching product details...", detailUrl);
        const detailResponse = await fetch(detailUrl, {
            method: "GET",
            headers: headers,
            body: null,
        });

        if (!detailResponse.ok) {
            if (detailResponse.status === 401) {
                throw new Error(
                    "Token không hợp lệ hoặc đã hết hạn. Vui lòng nhập token mới.",
                );
            }
            throw new Error(
                `HTTP Error: ${detailResponse.status} - ${detailResponse.statusText}`,
            );
        }

        const detailData = await detailResponse.json();
        console.log("Product details:", detailData);

        // Store current data
        currentProduct = detailData;
        currentVariants = detailData.ProductVariants || [];

        // Display data
        displayProductInfo(detailData);
        displayParentProduct(detailData);
        displayVariants(detailData.ProductVariants || []);
        updateStats(detailData);

        // AUTO-SAVE: Tự động lưu dữ liệu sau khi search thành công
        saveProductData(detailData);

        showNotification("Tải dữ liệu thành công!", "success");
    } catch (error) {
        console.error("Error:", error);
        showNotification(error.message, "error");
        showEmptyState("parentTableWrapper", "Không thể tải dữ liệu sản phẩm");
        showEmptyState(
            "variantsTableWrapper",
            "Không thể tải dữ liệu biến thể",
        );
    }
}

// ===== DISPLAY FUNCTIONS =====
function displayProductInfo(product) {
    const card = document.getElementById("productInfoCard");
    const image = document.getElementById("productInfoImage");
    const name = document.getElementById("productInfoName");
    const code = document.getElementById("productInfoCode");
    const listPrice = document.getElementById("productInfoListPrice");
    const purchasePrice = document.getElementById("productInfoPurchasePrice");
    const qtyAvailable = document.getElementById("productInfoQtyAvailable");
    const virtualAvailable = document.getElementById(
        "productInfoVirtualAvailable",
    );
    const variantCount = document.getElementById("productInfoVariantCount");

    image.src = product.ImageUrl || "https://via.placeholder.com/120";
    image.onerror = () => {
        image.src = "https://via.placeholder.com/120";
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

function displayParentProduct(product) {
    const wrapper = document.getElementById("parentTableWrapper");

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
                        <img src="${product.ImageUrl || "https://via.placeholder.com/60"}" 
                             class="product-image" 
                             onerror="this.src='https://via.placeholder.com/60'"
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
}

function displayVariants(variants) {
    const wrapper = document.getElementById("variantsTableWrapper");

    if (!variants || variants.length === 0) {
        showEmptyState("variantsTableWrapper", "Không có biến thể nào");
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
                            <img src="${currentProduct.ImageUrl || "https://via.placeholder.com/60"}" 
                                 class="product-image" 
                                 onerror="this.src='https://via.placeholder.com/60'"
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
}

// ===== UPDATE STATS =====
function updateStats(product) {
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

// ===== HELPER FUNCTIONS =====
function formatCurrency(value) {
    if (!value && value !== 0) return "-";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
}

function showLoading(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    wrapper.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>Đang tải dữ liệu...</p>
        </div>
    `;
}

function showEmptyState(wrapperId, message) {
    const wrapper = document.getElementById(wrapperId);
    wrapper.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <p>${message}</p>
        </div>
    `;
}

// ===== CLEAR DATA =====
function clearData() {
    // Clear input
    document.getElementById("productCode").value = "";

    // Clear current data
    currentProduct = null;
    currentVariants = [];

    // Hide product info card
    document.getElementById("productInfoCard").classList.remove("show");

    // Reset stats
    document.getElementById("totalProducts").textContent = "0";
    document.getElementById("totalVariants").textContent = "0";
    document.getElementById("totalQty").textContent = "0";
    document.getElementById("totalValue").textContent = "0đ";

    // Show empty states
    showEmptyState(
        "parentTableWrapper",
        'Nhập mã sản phẩm và nhấn "Tìm kiếm" để xem thông tin',
    );
    showEmptyState(
        "variantsTableWrapper",
        'Nhập mã sản phẩm và nhấn "Tìm kiếm" để xem danh sách biến thể',
    );

    showNotification("Đã xóa dữ liệu", "info");
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // Load saved token
    loadToken();

    // AUTO-LOAD: Tự động load dữ liệu đã lưu (nếu có)
    setTimeout(() => {
        autoLoadSavedData();
    }, 500);

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

    console.log("Inventory page initialized");

    // Check if token is saved
    const savedToken = localStorage.getItem("tpos_bearer_token");
    if (savedToken) {
        console.log("Token loaded from localStorage");
    } else {
        console.log("No token found. Please enter Bearer Token.");
    }
});
