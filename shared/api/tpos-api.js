/**
 * ===== TPOS API SERVICE =====
 * Shared API functions for TPOS integration
 * Version: 2.2.0
 * 
 * This module provides common functions to interact with TPOS API
 * All pages should use these functions instead of direct fetch calls
 */

// ===== CONFIGURATION =====
const TPOS_CONFIG = {
    baseUrl: "https://tomato.tpos.vn/odata",
    storageKey: "tpos_bearer_token",
    appVersion: "5.9.10.1",
};

// ===== TOKEN MANAGEMENT =====

/**
 * Get Bearer Token from localStorage or input field
 * @param {string} inputId - Optional input field ID to get token from
 * @returns {string|null} Bearer token or null if not found
 */
function getToken(inputId = "bearerToken") {
    // Try to get from input field first
    const inputElement = document.getElementById(inputId);
    let token = inputElement ? inputElement.value.trim() : null;

    // If not found in input, try localStorage
    if (!token) {
        token = localStorage.getItem(TPOS_CONFIG.storageKey);
        // Update input field if token found in storage
        if (token && inputElement) {
            inputElement.value = token;
        }
    }

    return token;
}

/**
 * Save Bearer Token to localStorage
 * @param {string} token - Bearer token to save
 * @param {string} inputId - Optional input field ID to save token from
 * @returns {boolean} Success status
 */
function saveToken(token = null, inputId = "bearerToken") {
    if (!token) {
        const inputElement = document.getElementById(inputId);
        token = inputElement ? inputElement.value.trim() : null;
    }

    if (!token) {
        if (typeof showNotification !== "undefined") {
            showNotification("Vui lòng nhập Bearer Token", "error");
        }
        return false;
    }

    // Remove "Bearer " prefix if exists
    token = token.replace(/^Bearer\s+/i, "");

    localStorage.setItem(TPOS_CONFIG.storageKey, token);
    
    if (typeof showNotification !== "undefined") {
        showNotification("Đã lưu token thành công!", "success");
    }
    
    return true;
}

/**
 * Load token from localStorage and set to input field
 * @param {string} inputId - Input field ID to set token to
 * @returns {string|null} Token or null
 */
function loadToken(inputId = "bearerToken") {
    const token = localStorage.getItem(TPOS_CONFIG.storageKey);
    const inputElement = document.getElementById(inputId);
    
    if (token && inputElement) {
        inputElement.value = token;
    }
    
    return token;
}

/**
 * Clear token from localStorage
 */
function clearToken() {
    localStorage.removeItem(TPOS_CONFIG.storageKey);
    if (typeof showNotification !== "undefined") {
        showNotification("Đã xóa token", "info");
    }
}

// ===== REQUEST HELPERS =====

/**
 * Generate unique request ID for TPOS API
 * @returns {string} UUID v4 string
 */
function generateRequestId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        }
    );
}

/**
 * Get standard headers for TPOS API requests
 * @param {string} token - Optional bearer token (if not provided, will try to get from storage)
 * @returns {Object} Headers object
 * @throws {Error} If token not found
 */
function getTPOSHeaders(token = null) {
    if (!token) {
        token = getToken();
    }

    if (!token) {
        throw new Error("Vui lòng nhập Bearer Token trước khi gọi API");
    }

    return {
        accept: "application/json, text/plain, */*",
        "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        authorization: `Bearer ${token}`,
        "content-type": "application/json;charset=UTF-8",
        priority: "u=1, i",
        "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-fetch-storage-access": "active",
        tposappversion: TPOS_CONFIG.appVersion,
        "x-request-id": generateRequestId(),
    };
}

// ===== API METHODS =====

/**
 * Search products by DefaultCode
 * @param {string} productCode - Product code to search
 * @param {Object} options - Optional search parameters
 * @returns {Promise<Object>} Search results
 */
async function searchProductByCode(productCode, options = {}) {
    const {
        top = 50,
        orderby = "DateCreated desc",
        token = null,
    } = options;

    const headers = getTPOSHeaders(token);
    const url = `${TPOS_CONFIG.baseUrl}/ProductTemplate/OdataService.GetViewV2?Active=true&DefaultCode=${productCode}&$top=${top}&$orderby=${orderby}&$filter=Active+eq+true&$count=true`;

    console.log("🔍 Searching product by code:", productCode);

    const response = await fetch(url, {
        method: "GET",
        headers: headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Token không hợp lệ hoặc đã hết hạn. Vui lòng nhập token mới.");
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Search results:", data);

    return data;
}

/**
 * Get product details by ID with variants
 * @param {number} productId - Product ID
 * @param {string} token - Optional bearer token
 * @returns {Promise<Object>} Product details with variants
 */
async function getProductDetails(productId, token = null) {
    const headers = getTPOSHeaders(token);
    const url = `${TPOS_CONFIG.baseUrl}/ProductTemplate(${productId})?$expand=UOM,UOMCateg,Categ,UOMPO,POSCateg,Taxes,SupplierTaxes,Product_Teams,Images,UOMView,Distributor,Importer,Producer,OriginCountry,ProductVariants($expand=UOM,Categ,UOMPO,POSCateg,AttributeValues)`;

    console.log("📦 Fetching product details:", productId);

    const response = await fetch(url, {
        method: "GET",
        headers: headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Token không hợp lệ hoặc đã hết hạn. Vui lòng nhập token mới.");
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Product details:", data);

    return data;
}

/**
 * Search product by code and get full details
 * @param {string} productCode - Product code to search
 * @param {string} token - Optional bearer token
 * @returns {Promise<Object>} Full product details with variants
 */
async function getProductByCode(productCode, token = null) {
    try {
        // Step 1: Search for product
        const searchResults = await searchProductByCode(productCode, { token });

        // Find exact match
        const product = searchResults.value.find(
            (p) => p.DefaultCode === productCode
        );

        if (!product) {
            throw new Error(`Không tìm thấy sản phẩm với mã: ${productCode}`);
        }

        console.log("✅ Found product ID:", product.Id);

        // Step 2: Get full details
        const productDetails = await getProductDetails(product.Id, token);

        return productDetails;
    } catch (error) {
        console.error("❌ Error getting product:", error);
        throw error;
    }
}

/**
 * Get product list with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Product list
 */
async function getProductList(filters = {}) {
    const {
        top = 50,
        skip = 0,
        orderby = "DateCreated desc",
        filter = "Active eq true",
        token = null,
    } = filters;

    const headers = getTPOSHeaders(token);
    const url = `${TPOS_CONFIG.baseUrl}/ProductTemplate/OdataService.GetViewV2?$top=${top}&$skip=${skip}&$orderby=${orderby}&$filter=${filter}&$count=true`;

    console.log("📋 Fetching product list");

    const response = await fetch(url, {
        method: "GET",
        headers: headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Token không hợp lệ hoặc đã hết hạn. Vui lòng nhập token mới.");
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Product list:", data);

    return data;
}

/**
 * Generic TPOS API request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function tposRequest(endpoint, options = {}) {
    const { method = "GET", body = null, token = null } = options;

    const headers = getTPOSHeaders(token);
    let url;

    if (endpoint.startsWith("http")) {
        // Absolute URL provided, use as is
        url = endpoint;
    } else if (endpoint.startsWith("/api/")) {
        // Local proxy endpoint, use relative path to current origin
        // The server.js is configured to handle /api routes directly.
        url = endpoint; 
    } else {
        // TPOS OData API endpoint, prepend TPOS_CONFIG.baseUrl
        // Remove leading slash from endpoint if it exists, to avoid double slashes
        const cleanedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        url = `${TPOS_CONFIG.baseUrl}/${cleanedEndpoint}`;
    }

    console.log(`🌐 TPOS API Request: ${method} ${url}`);

    const fetchOptions = {
        method,
        headers,
    };

    if (body && method !== "GET") {
        fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Token không hợp lệ hoặc đã hết hạn. Vui lòng nhập token mới.");
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Response:", data);

    return data;
}

// ===== EXPORT FUNCTIONS =====
// Make functions available globally
window.TPOS_API = {
    // Token management
    getToken,
    saveToken,
    loadToken,
    clearToken,
    
    // Request helpers
    generateRequestId,
    getTPOSHeaders,
    
    // API methods
    searchProductByCode,
    getProductDetails,
    getProductByCode,
    getProductList,
    tposRequest,
    
    // Config
    config: TPOS_CONFIG,
};

console.log("✅ TPOS API Service loaded");