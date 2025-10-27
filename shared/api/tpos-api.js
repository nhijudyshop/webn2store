/**
 * ===== TPOS API SERVICE =====
 * Shared API functions for TPOS integration
 * Version: 2.3.0
 * 
 * This module provides common functions to interact with TPOS API
 * All pages should use these functions instead of direct fetch calls
 */

// ===== CONFIGURATION =====
export const TPOS_CONFIG = {
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
export function getToken(inputId = "bearerToken") {
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
 * Save Bearer Token to localStorage and updates relevant input fields.
 * @param {string} token - Bearer token to save
 * @param {string} primaryInputId - The main input field ID to update.
 * @returns {boolean} Success status
 */
export function saveToken(token = null, primaryInputId = "bearerToken") {
    if (!token) {
        const inputElement = document.getElementById(primaryInputId);
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
    
    // Update all known token input fields
    const tokenInputIds = ['bearerToken', 'bearerTokenSettings'];
    tokenInputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.value = token;
        }
    });
    
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
export function loadToken(inputId = "bearerToken") {
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
export function clearToken() {
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
export function generateRequestId() {
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
 * Get standard headers for TPOS API requests, including custom template
 * @param {string} token - Optional bearer token (if not provided, will try to get from storage)
 * @returns {Promise<Object>} Headers object
 * @throws {Error} If token not found
 */
export async function getTPOSHeaders(token = null) {
    if (!token) {
        token = getToken();
    }

    if (!token) {
        throw new Error("Vui lòng nhập Bearer Token trước khi gọi API");
    }

    let customHeaders = {};
    try {
        const response = await fetch('/api/settings/header-template');
        if (response.ok) {
            customHeaders = await response.json();
        }
    } catch (error) {
        console.warn("Could not load custom header template:", error);
    }

    const standardHeaders = {
        accept: "application/json, text/plain, */*",
        authorization: `Bearer ${token}`,
        "content-type": "application/json;charset=UTF-8",
        "x-request-id": generateRequestId(),
    };

    return { ...customHeaders, ...standardHeaders };
}

/**
 * Attempts to log in to TPOS using the active account on the server,
 * saves the new token, and returns success status.
 * @returns {Promise<boolean>} True if re-login and token save were successful, false otherwise.
 */
async function reLoginAndGetNewToken() {
    try {
        console.log("🔄 Attempting to auto re-login to TPOS...");
        const response = await fetch('/api/tpos-login', { method: 'POST' });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Đăng nhập tự động thất bại');
        }

        const accessToken = result.data.access_token;
        if (accessToken) {
            // Save token to localStorage and update any visible input fields
            saveToken(accessToken, 'bearerTokenSettings'); 
            console.log("✅ Auto re-login successful. New token saved.");
            return true;
        } else {
            throw new Error('Không nhận được access token mới từ TPOS.');
        }
    } catch (error) {
        console.error('❌ Auto re-login failed:', error);
        window.showNotification(`❌ Đăng nhập lại tự động thất bại: ${error.message}`, "error");
        return false;
    }
}

// ===== API METHODS =====

/**
 * Search products by DefaultCode
 * @param {string} productCode - Product code to search
 * @param {Object} options - Optional search parameters
 * @returns {Promise<Object>} Search results
 */
export async function searchProductByCode(productCode, options = {}) {
    const {
        top = 50,
        orderby = "DateCreated desc",
        token = null,
    } = options;

    const endpoint = `/ProductTemplate/OdataService.GetViewV2?Active=true&DefaultCode=${productCode}&$top=${top}&$orderby=${orderby}&$filter=Active+eq+true&$count=true`;
    
    console.log("🔍 Searching product by code:", productCode);
    return tposRequest(endpoint, { token });
}

/**
 * Get product details by ID with variants
 * @param {number} productId - Product ID
 * @param {string} token - Optional bearer token
 * @returns {Promise<Object>} Product details with variants
 */
export async function getProductDetails(productId, token = null) {
    const endpoint = `/ProductTemplate(${productId})?$expand=UOM,UOMCateg,Categ,UOMPO,POSCateg,Taxes,SupplierTaxes,Product_Teams,Images,UOMView,Distributor,Importer,Producer,OriginCountry,ProductVariants($expand=UOM,Categ,UOMPO,POSCateg,AttributeValues)`;
    
    console.log("📦 Fetching product details:", productId);
    return tposRequest(endpoint, { token });
}

/**
 * Search product by code and get full details
 * @param {string} productCode - Product code to search
 * @param {string} token - Optional bearer token
 * @returns {Promise<Object>} Full product details with variants
 */
export async function getProductByCode(productCode, token = null) {
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
export async function getProductList(filters = {}) {
    const {
        top = 50,
        skip = 0,
        orderby = "DateCreated desc",
        filter = "Active eq true",
        token = null,
    } = filters;

    const endpoint = `/ProductTemplate/OdataService.GetViewV2?$top=${top}&$skip=${skip}&$orderby=${orderby}&$filter=${filter}&$count=true`;

    console.log("📋 Fetching product list");
    return tposRequest(endpoint, { token });
}

/**
 * Generic TPOS API request with automatic re-login on authentication failure.
 * @param {string} endpoint - API endpoint (without base URL for TPOS, or full URL for others)
 * @param {Object} options - Fetch options (method, body, token)
 * @param {boolean} isRetry - Internal flag to prevent infinite retry loops.
 * @returns {Promise<Object>} Response data
 */
export async function tposRequest(endpoint, options = {}, isRetry = false) {
    const { method = "GET", body = null, token = null } = options;

    let url;
    if (endpoint.startsWith("http")) {
        url = endpoint;
    } else if (endpoint.startsWith("/api/")) {
        url = endpoint; 
    } else {
        const cleanedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        url = `${TPOS_CONFIG.baseUrl}/${cleanedEndpoint}`;
    }

    console.log(`🌐 TPOS API Request: ${method} ${url}`);

    const headers = await getTPOSHeaders(token);
    const fetchOptions = { method, headers };
    if (body && method !== "GET") {
        fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (response.status === 401 && !isRetry) {
        console.warn('⚠️ Token expired or invalid. Attempting to re-login...');
        window.showNotification('Token đã hết hạn, đang tự động đăng nhập lại...', 'info');

        const loginSuccess = await reLoginAndGetNewToken();

        if (loginSuccess) {
            console.log('🔄 Retrying original request with new token...');
            return tposRequest(endpoint, options, true); // Retry the request
        } else {
            throw new Error("Đăng nhập lại tự động thất bại. Vui lòng kiểm tra tài khoản TPOS trong Cài đặt.");
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP Error ${response.status}:`, errorText);
        if (response.status === 401 && isRetry) {
             throw new Error("Token mới vẫn không hợp lệ. Vui lòng kiểm tra lại tài khoản TPOS.");
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Response:", data);

    return data;
}

console.log("✅ TPOS API Service loaded");