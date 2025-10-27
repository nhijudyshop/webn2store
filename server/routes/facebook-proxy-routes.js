const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { getAuthHeader, generateGuid } = require("../utils/server-utils");
const { CACHE_DURATION, HEADER_TEMPLATE_FILE } = require("../config");

const router = express.Router();

// Cache for orders data and header template
const ordersCache = new Map();
let headerTemplateCache = null;

/**
 * Reads header template from JSON file and caches it.
 * @returns {object} The header template object.
 */
function getHeaderTemplate() {
    if (headerTemplateCache) {
        return headerTemplateCache;
    }
    try {
        if (fs.existsSync(HEADER_TEMPLATE_FILE)) {
            const data = fs.readFileSync(HEADER_TEMPLATE_FILE, "utf8");
            headerTemplateCache = JSON.parse(data);
            console.log("✅ Header template loaded and cached.");
            return headerTemplateCache;
        }
    } catch (error) {
        console.error("❌ Error loading header template:", error);
    }
    return {}; // Return empty object on error
}

/**
 * Generates the complete headers for a proxy request.
 * @param {string} authHeader - The full "Bearer ..." authorization header.
 * @returns {object} The complete headers object for the request.
 */
function getProxyHeaders(authHeader) {
    const template = getHeaderTemplate();
    return {
        ...template,
        authorization: authHeader,
        "x-request-id": generateGuid(),
    };
}

// Proxy endpoint for getting Facebook accounts/pages
router.get("/accounts", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const url = `https://tomato.tpos.vn/odata/CRMTeam/ODataService.GetAllFacebook?$expand=Childs`;

        console.log(`📡 Fetching accounts: ${url}`);

        const response = await axios.get(url, {
            headers: getProxyHeaders(authHeader),
        });

        console.log("✅ Accounts loaded successfully!");
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error fetching accounts:", error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: error.message, details: error.response?.data });
    }
});

// Proxy endpoint for getting videos from a page
router.get("/videos", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const { pageid, limit = 10 } = req.query;

        if (!pageid) {
            return res.status(400).json({ error: "Missing required parameter: pageid" });
        }

        const url = `https://tomato.tpos.vn/api/facebook-graph/livevideo?pageid=${pageid}&limit=${limit}&facebook_Type=page`;
        console.log(`🎥 Fetching videos: ${url}`);

        const response = await axios.get(url, {
            headers: getProxyHeaders(authHeader),
        });

        console.log("✅ Videos loaded successfully!");
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error fetching videos:", error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: error.message, details: error.response?.data });
    }
});

// Proxy endpoint for regular polling
router.get("/comments", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const { pageid, postId, limit = 50, skip = 0 } = req.query;

        if (!pageid || !postId) {
            return res.status(400).json({ error: "Missing required parameters: pageid and postId" });
        }

        const url = `https://tomato.tpos.vn/api/facebook-graph/comment?pageid=${pageid}&facebook_type=Page&postId=${postId}&limit=${limit}&offset=${skip}&order=reverse_chronological`;
        console.log(`📡 Fetching: ${url}`);

        const response = await axios.get(url, {
            headers: getProxyHeaders(authHeader),
        });

        console.log("✅ Success!");
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error:", error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: error.message, details: error.response?.data });
    }
});

// Endpoint to get detailed orders info
router.get("/orders-detail", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const { postId, top = 500, forceRefresh = false } = req.query;

        if (!postId) {
            return res.status(400).json({ error: "Missing required parameter: postId" });
        }

        const cacheKey = `${postId}_${top}`;
        const cachedData = ordersCache.get(cacheKey);

        if (cachedData && !forceRefresh) {
            const cacheAge = Date.now() - cachedData.timestamp;
            if (cacheAge < CACHE_DURATION) {
                console.log(`💾 Returning cached orders (age: ${Math.round(cacheAge / 1000)}s)`);
                return res.json({ ...cachedData.data, _cached: true, _cacheAge: Math.round(cacheAge / 1000) });
            } else {
                ordersCache.delete(cacheKey);
            }
        }

        const url = `https://tomato.tpos.vn/odata/SaleOnline_Order/ODataService.GetOrdersByPostId?PostId=${postId}&&$top=${top}&$orderby=DateCreated+desc&$count=true`;
        console.log(`📦 Fetching detailed orders from API: ${url}`);

        const response = await axios.get(url, {
            headers: getProxyHeaders(authHeader),
        });

        ordersCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        console.log(`✅ Detailed orders fetched successfully! Total: ${response.data["@odata.count"] || "N/A"}`);
        res.json({ ...response.data, _cached: false });
    } catch (error) {
        console.error("❌ Error fetching detailed orders:", error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: error.message, details: error.response?.data });
    }
});

// Proxy endpoint for Avatar
router.get("/avatar/:psid", async (req, res) => {
    try {
        const { psid } = req.params;
        const size = req.query.size || 50;
        if (!psid) return res.status(400).json({ error: "Missing required parameter: psid" });

        const url = `https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=${psid}&height=${size}&width=${size}&ext=1577880000&hash=AeQBDhZMBBCDEFGH`;
        console.log(`🎭 Fetching avatar for PSID: ${psid}`);

        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 5000,
            validateStatus: (status) => status < 500,
        });

        if (response.status === 200 && response.data?.length > 0) {
            res.set("Content-Type", response.headers["content-type"] || "image/jpeg");
            res.set("Cache-Control", "public, max-age=86400");
            res.send(response.data);
        } else {
            res.status(404).json({ error: "Avatar not found" });
        }
    } catch (error) {
        console.error(`❌ Error fetching avatar for PSID ${req.params.psid}:`, error.message);
        res.status(404).json({ error: "Avatar not available" });
    }
});

// Proxy endpoint for EventStream (SSE)
router.get("/stream", async (req, res) => {
    const { pageid, postId, token } = req.query;
    if (!pageid || !postId || !token) {
        return res.status(400).json({ error: "Missing required parameters: pageid, postId, or token" });
    }

    try {
        const authHeader = `Bearer ${token}`;
        const url = `https://tomato.tpos.vn/api/facebook-graph/comment/stream?pageId=${pageid}&facebook_Type=Page&postId=${postId}&access_token=${token}`;
        console.log(`🌊 Streaming: ${url}`);

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const response = await axios.get(url, {
            responseType: "stream",
            headers: {
                ...getHeaderTemplate(),
                accept: "text/event-stream",
                authorization: authHeader,
            },
        });

        response.data.pipe(res);
        req.on("close", () => {
            console.log("🔌 Client disconnected from stream");
            response.data.destroy();
        });
    } catch (error) {
        console.error("❌ Stream Error:", error.message);
        res.status(500).write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// Proxy endpoint for creating a new product
router.post("/products/insert", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const productData = req.body;
        const url = "https://tomato.tpos.vn/odata/ProductTemplate/ODataService.InsertV2?$expand=ProductVariants,UOM,UOMPO";

        console.log(`🚀 Creating new product on TPOS: ${productData.Name}`);

        const response = await axios.post(url, productData, {
            headers: getProxyHeaders(authHeader),
        });

        console.log(`✅ Product created successfully on TPOS: ${response.data.Name}`);
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error creating product on TPOS:", error.response ? error.response.data : error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: "Failed to create product on TPOS", details: error.response?.data });
    }
});

// Proxy endpoint for updating a product
router.post("/products/update", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const productData = req.body;
        const url = "https://tomato.tpos.vn/odata/ProductTemplate/ODataService.UpdateV2";

        console.log(`🚀 Updating product on TPOS: ${productData.Name}`);

        const response = await axios.post(url, productData, {
            headers: getProxyHeaders(authHeader),
        });

        console.log(`✅ Product updated successfully on TPOS: ${productData.Name}`);
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error updating product on TPOS:", error.response ? error.response.data : error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: "Failed to update product on TPOS", details: error.response?.data });
    }
});

// New proxy endpoint for updating stock quantity
router.post("/stock/update", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const { productId, newQuantity } = req.body;

        if (productId === undefined || newQuantity === undefined) {
            return res.status(400).json({ error: "Missing productId or newQuantity" });
        }

        const wizardUrl = "https://tomato.tpos.vn/api/stock.inventory/change_product_qty/0";
        const wizardPayload = [[productId], { "new_quantity": newQuantity }];
        
        console.log(`📦 Getting stock change wizard for product ${productId}`);
        const wizardResponse = await axios.post(wizardUrl, wizardPayload, {
            headers: getProxyHeaders(authHeader),
        });

        const wizardId = wizardResponse.data.result.res_id;
        if (!wizardId) {
            throw new Error("Failed to get stock change wizard ID from TPOS");
        }

        const executeUrl = `https://tomato.tpos.vn/api/stock.change.product.qty/${wizardId}/action_change_product_qty`;
        console.log(`🚀 Executing stock change for product ${productId} to quantity ${newQuantity}`);
        
        const executeResponse = await axios.post(executeUrl, {}, {
            headers: getProxyHeaders(authHeader),
        });

        console.log(`✅ Stock updated successfully for product ${productId}`);
        res.json({ success: true, data: executeResponse.data });

    } catch (error) {
        console.error("❌ Error updating stock on TPOS:", error.response ? error.response.data : error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: "Failed to update stock on TPOS", details: error.response?.data });
    }
});

module.exports = router;