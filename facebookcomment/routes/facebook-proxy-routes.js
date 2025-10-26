const express = require("express");
const axios = require("axios");
const { getAuthHeader, generateGuid } = require("../utils/server-utils");
const { CACHE_DURATION } = require("../config");

const router = express.Router();

// Cache for orders data (in-memory cache to avoid spamming API)
const ordersCache = new Map();

// Proxy endpoint for getting Facebook accounts/pages
router.get("/accounts", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const url = `https://tomato.tpos.vn/odata/CRMTeam/ODataService.GetAllFacebook?$expand=Childs`;

        console.log(`📡 Fetching accounts: ${url}`);

        const response = await axios.get(url, {
            headers: {
                accept: "application/json, text/plain, */*",
                authorization: authHeader,
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "content-type": "application/json;charset=UTF-8",
                origin: "https://tomato.tpos.vn",
                referer: "https://tomato.tpos.vn/",
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            },
        });

        console.log("✅ Accounts loaded successfully!");
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error fetching accounts:", error.message);

        if (error.message.includes("Authorization header")) {
            return res.status(401).json({ error: error.message });
        }

        if (error.response) {
            res.status(error.response.status).json({
                error: error.message,
                details: error.response.data,
            });
        } else {
            res.status(500).json({
                error: error.message,
            });
        }
    }
});

// Proxy endpoint for getting videos from a page
router.get("/videos", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const { pageid, limit = 10 } = req.query;

        if (!pageid) {
            return res.status(400).json({
                error: "Missing required parameter: pageid",
            });
        }

        const url = `https://tomato.tpos.vn/api/facebook-graph/livevideo?pageid=${pageid}&limit=${limit}&facebook_Type=page`;

        console.log(`🎥 Fetching videos: ${url}`);

        const response = await axios.get(url, {
            headers: {
                accept: "application/json, text/plain, */*",
                authorization: authHeader,
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "content-type": "application/json;charset=UTF-8",
                origin: "https://tomato.tpos.vn",
                referer: "https://tomato.tpos.vn/",
                "sec-ch-ua":
                    '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                tposappversion: "5.9.10.1",
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "x-request-id": generateGuid(),
            },
        });

        console.log("✅ Videos loaded successfully!");
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error fetching videos:", error.message);

        if (error.message.includes("Authorization header")) {
            return res.status(401).json({ error: error.message });
        }

        if (error.response) {
            res.status(error.response.status).json({
                error: error.message,
                details: error.response.data,
            });
        } else {
            res.status(500).json({
                error: error.message,
            });
        }
    }
});

// Proxy endpoint for regular polling
router.get("/comments", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const { pageid, postId, limit = 50, skip = 0 } = req.query; // Add limit and skip

        if (!pageid || !postId) {
            return res.status(400).json({
                error: "Missing required parameters: pageid and postId",
            });
        }

        // Construct URL with limit and offset (skip)
        const url = `https://tomato.tpos.vn/api/facebook-graph/comment?pageid=${pageid}&facebook_type=Page&postId=${postId}&limit=${limit}&offset=${skip}&order=reverse_chronological`;

        console.log(`📡 Fetching: ${url}`);

        const response = await axios.get(url, {
            headers: {
                accept: "application/json, text/plain, */*",
                authorization: authHeader,
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "content-type": "application/json;charset=UTF-8",
                origin: "https://tomato.tpos.vn",
                referer: "https://tomato.tpos.vn/",
                "sec-ch-ua":
                    '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                tposappversion: "5.9.10.1",
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "x-request-id": generateGuid(),
            },
        });

        console.log("✅ Success!");
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error:", error.message);

        if (error.message.includes("Authorization header")) {
            return res.status(401).json({ error: error.message });
        }

        if (error.response) {
            // API returned error
            res.status(error.response.status).json({
                error: error.message,
                details: error.response.data,
            });
        } else {
            // Network or other error
            res.status(500).json({
                error: error.message,
            });
        }
    }
});

// Endpoint to get detailed orders info (PrintCount, Telephone, PartnerStatus)
// Optimized with caching to prevent spam requests
router.get("/orders-detail", async (req, res) => {
    try {
        const authHeader = getAuthHeader(req);
        const { postId, top = 500, forceRefresh = false } = req.query;

        if (!postId) {
            return res.status(400).json({
                error: "Missing required parameter: postId",
            });
        }

        // Check cache first (unless forceRefresh is requested)
        const cacheKey = `${postId}_${top}`;
        const cachedData = ordersCache.get(cacheKey);

        if (cachedData && !forceRefresh) {
            const cacheAge = Date.now() - cachedData.timestamp;

            if (cacheAge < CACHE_DURATION) {
                console.log(
                    `💾 Returning cached orders (age: ${Math.round(cacheAge / 1000)}s)`,
                );
                return res.json({
                    ...cachedData.data,
                    _cached: true,
                    _cacheAge: Math.round(cacheAge / 1000),
                });
            } else {
                console.log(`🗑️ Cache expired, fetching fresh data...`);
                ordersCache.delete(cacheKey);
            }
        }

        const url = `https://tomato.tpos.vn/odata/SaleOnline_Order/ODataService.GetOrdersByPostId?PostId=${postId}&&$top=${top}&$orderby=DateCreated+desc&$count=true`;

        console.log(`📦 Fetching detailed orders from API: ${url}`);

        const response = await axios.get(url, {
            headers: {
                accept: "application/json, text/plain, */*",
                authorization: authHeader,
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "content-type": "application/json;charset=UTF-8",
                origin: "https://tomato.tpos.vn",
                referer: "https://tomato.tpos.vn/",
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            },
        });

        // Store in cache
        ordersCache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now(),
        });

        console.log(
            `✅ Detailed orders fetched successfully! Total: ${response.data["@odata.count"] || "N/A"}`,
        );
        console.log(`💾 Cached for ${CACHE_DURATION / 1000}s`);

        res.json({
            ...response.data,
            _cached: false,
        });
    } catch (error) {
        console.error("❌ Error fetching detailed orders:", error.message);

        if (error.message.includes("Authorization header")) {
            return res.status(401).json({ error: error.message });
        }

        if (error.response) {
            res.status(error.response.status).json({
                error: error.message,
                details: error.response.data,
            });
        } else {
            res.status(500).json({
                error: error.message,
            });
        }
    }
});

// Proxy endpoint for Avatar - with proper error handling
router.get("/avatar/:psid", async (req, res) => {
    try {
        const { psid } = req.params;
        const size = req.query.size || 50;

        if (!psid) {
            return res.status(400).json({
                error: "Missing required parameter: psid",
            });
        }

        // Facebook avatar URL pattern
        const url = `https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=${psid}&height=${size}&width=${size}&ext=1577880000&hash=AeQBDhZMBBCDEFGH`;

        console.log(`🎭 Fetching avatar for PSID: ${psid}`);

        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 5000, // 5 second timeout
            validateStatus: function (status) {
                // Accept any status code less than 500
                return status < 500;
            },
            headers: {
                accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                referer: "https://www.facebook.com/",
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            },
        });

        // Check if we got a valid image
        if (
            response.status === 200 &&
            response.data &&
            response.data.length > 0
        ) {
            // Set proper content type and cache headers
            res.set(
                "Content-Type",
                response.headers["content-type"] || "image/jpeg",
            );
            res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
            res.send(response.data);
            console.log(`✅ Avatar fetched successfully for PSID: ${psid}`);
        } else {
            // Return 404 so frontend can use fallback
            console.log(`⚠️ No avatar found for PSID: ${psid}`);
            res.status(404).json({
                error: "Avatar not found",
                psid: psid,
            });
        }
    } catch (error) {
        console.error(
            `❌ Error fetching avatar for PSID ${req.params.psid}:`,
            error.message,
        );

        // Return 404 instead of 500 so frontend can gracefully fallback to initials
        res.status(404).json({
            error: "Avatar not available",
            psid: req.params.psid,
            message: error.message,
        });
    }
});

// Proxy endpoint for EventStream (SSE)
router.get("/stream", async (req, res) => {
    const { pageid, postId, token } = req.query; // Get token from query parameter

    if (!pageid || !postId || !token) {
        return res.status(400).json({
            error: "Missing required parameters: pageid, postId, or token",
        });
    }

    try {
        const authHeader = `Bearer ${token}`; // Construct auth header from query token

        const url = `https://tomato.tpos.vn/api/facebook-graph/comment/stream?pageId=${pageid}&facebook_Type=Page&postId=${postId}&access_token=${token}`;

        console.log(`🌊 Streaming: ${url}`);

        // Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const response = await axios.get(url, {
            responseType: "stream",
            headers: {
                accept: "text/event-stream",
                authorization: authHeader, // Use full auth header for stream
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                origin: "https://tomato.tpos.vn",
                referer: "https://tomato.tpos.vn/",
                "sec-ch-ua":
                    '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            },
        });

        // Pipe the stream to client
        response.data.pipe(res);

        // Handle client disconnect
        req.on("close", () => {
            console.log("🔌 Client disconnected from stream");
            response.data.destroy();
        });
    } catch (error) {
        console.error("❌ Stream Error:", error.message);
        if (error.message.includes("Authorization header")) {
            res.status(401).write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        } else {
            res.status(500).write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        }
        res.end();
    }
});

module.exports = router;