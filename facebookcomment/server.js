const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files (HTML)
app.use(express.static(__dirname));

// Settings directory
const SETTINGS_DIR = path.join(__dirname, "settings");
const PRINTERS_FILE = path.join(SETTINGS_DIR, "printers.json");
const TEMPLATE_FILE = path.join(SETTINGS_DIR, "template.json");
const LAST_SESSION_FILE = path.join(SETTINGS_DIR, "last-session.json");

// Ensure settings directory exists
if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    console.log("📁 Created settings directory");
}

// Initialize default files if they don't exist
if (!fs.existsSync(PRINTERS_FILE)) {
    fs.writeFileSync(PRINTERS_FILE, JSON.stringify([], null, 2));
    console.log("📄 Created printers.json");
}

if (!fs.existsSync(TEMPLATE_FILE)) {
    const defaultTemplate = {
        width: 1152,
        height: "auto",
        threshold: 95,
        scale: 2,
        fonts: {
            session: 72,
            phone: 52,
            customer: 52,
            product: 36,
            comment: 32,
            time: 28,
        },
        alignment: "center",
        bold: true,
        italic: false,
        padding: 20,
        lineSpacing: 12,
    };
    fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(defaultTemplate, null, 2));
    console.log("📄 Created template.json");
}

if (!fs.existsSync(LAST_SESSION_FILE)) {
    const defaultSession = {
        pageId: null,
        videoId: null,
        connectionMode: "stream",
        refreshInterval: 10,
        autoStart: false,
    };
    fs.writeFileSync(
        LAST_SESSION_FILE,
        JSON.stringify(defaultSession, null, 2),
    );
    console.log("📄 Created last-session.json");
}

// ===== SETTINGS ENDPOINTS =====

// Get printers
app.get("/api/settings/printers", (req, res) => {
    try {
        const data = fs.readFileSync(PRINTERS_FILE, "utf8");
        const printers = JSON.parse(data);
        res.json({ success: true, data: printers });
    } catch (error) {
        console.error("❌ Error reading printers:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save printers
app.post("/api/settings/printers", (req, res) => {
    try {
        const printers = req.body;
        fs.writeFileSync(PRINTERS_FILE, JSON.stringify(printers, null, 2));
        console.log("✅ Printers saved successfully");
        res.json({ success: true, message: "Printers saved successfully" });
    } catch (error) {
        console.error("❌ Error saving printers:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get template settings
app.get("/api/settings/template", (req, res) => {
    try {
        const data = fs.readFileSync(TEMPLATE_FILE, "utf8");
        const template = JSON.parse(data);
        res.json({ success: true, data: template });
    } catch (error) {
        console.error("❌ Error reading template:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save template settings
app.post("/api/settings/template", (req, res) => {
    try {
        const template = req.body;
        fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(template, null, 2));
        console.log("✅ Template saved successfully");
        res.json({ success: true, message: "Template saved successfully" });
    } catch (error) {
        console.error("❌ Error saving template:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get last session
app.get("/api/settings/last-session", (req, res) => {
    try {
        const data = fs.readFileSync(LAST_SESSION_FILE, "utf8");
        const session = JSON.parse(data);
        res.json({ success: true, data: session });
    } catch (error) {
        console.error("❌ Error reading last session:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save last session
app.post("/api/settings/last-session", (req, res) => {
    try {
        const session = req.body;
        fs.writeFileSync(LAST_SESSION_FILE, JSON.stringify(session, null, 2));
        console.log("✅ Last session saved successfully");
        res.json({ success: true, message: "Last session saved successfully" });
    } catch (error) {
        console.error("❌ Error saving last session:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete last session
app.delete("/api/settings/last-session", (req, res) => {
    try {
        if (fs.existsSync(LAST_SESSION_FILE)) {
            fs.unlinkSync(LAST_SESSION_FILE);
            console.log("🗑️ Last session deleted successfully");
        }
        res.json({
            success: true,
            message: "Last session deleted successfully",
        });
    } catch (error) {
        console.error("❌ Error deleting last session:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate GUID
function generateGuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
            var r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        },
    );
}

// Proxy endpoint for getting Facebook accounts/pages
app.get("/api/accounts", async (req, res) => {
    try {
        const url = `https://tomato.tpos.vn/odata/CRMTeam/ODataService.GetAllFacebook?$expand=Childs`;

        console.log(`📡 Fetching accounts: ${url}`);

        const response = await axios.get(url, {
            headers: {
                accept: "application/json, text/plain, */*",
                authorization:
                    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJDbGllbnRJZCI6InRtdFdlYkFwcCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiZmMwZjQ0MzktOWNmNi00ZDg4LWE4YzctNzU5Y2E4Mjk1MTQyIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6Im52MjAiLCJEaXNwbGF5TmFtZSI6IlTDuiIsIkF2YXRhclVybCI6IiIsIlNlY3VyaXR5U3RhbXAiOiI2NmQxNWRjMC03MTY3LTQzYjMtYTliNC00MjA2Yjk1NWM5YTIiLCJDb21wYW55SWQiOiIxIiwiVGVuYW50SWQiOiJ0b21hdG8udHBvcy52biIsIlJvbGVJZHMiOiI0MmZmYzk5Yi1lNGY2LTQwMDAtYjcyOS1hZTNmMDAyOGEyODksNmExZDAwMDAtNWQxYS0wMDE1LTBlNmMtMDhkYzM3OTUzMmU5LDc2MzlhMDQ4LTdjZmUtNDBiNS1hNDFkLWFlM2YwMDNiODlkZiw4YmM4ZjQ1YS05MWY4LTQ5NzMtYjE4Mi1hZTNmMDAzYWI4NTUsYTljMjAwMDAtNWRiNi0wMDE1LTQ1YWItMDhkYWIxYmZlMjIyIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjpbIlF14bqjbiBMw70gTWFpIiwiQ8OSSSIsIkNTS0ggLSBMw6BpIiwiS2hvIFBoxrDhu5tjLSBLaeG7h3QiLCJRdeG6o24gTMO9IEtobyAtIEJvIl0sImp0aSI6Ijc3MTY0ZWIyLWUwZTUtNDBkZS04OTE5LWU4YjBkNjBkYjQ0OCIsImlhdCI6IjE3NjEyMTQwNjIiLCJuYmYiOjE3NjEyMTQwNjIsImV4cCI6MTc2MjUxMDA2MiwiaXNzIjoiaHR0cHM6Ly90b21hdG8udHBvcy52biIsImF1ZCI6Imh0dHBzOi8vdG9tYXRvLnRwb3Mudm4saHR0cHM6Ly90cG9zLnZuIn0.YXH6yydrdR5goQ-jD7P-h1hN3cNA0tgy7VHOFwxGe7I",
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
app.get("/api/videos", async (req, res) => {
    try {
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
                authorization:
                    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJDbGllbnRJZCI6InRtdFdlYkFwcCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiZmMwZjQ0MzktOWNmNi00ZDg4LWE4YzctNzU5Y2E4Mjk1MTQyIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6Im52MjAiLCJEaXNwbGF5TmFtZSI6IlTDuiIsIkF2YXRhclVybCI6IiIsIlNlY3VyaXR5U3RhbXAiOiI2NmQxNWRjMC03MTY3LTQzYjMtYTliNC00MjA2Yjk1NWM5YTIiLCJDb21wYW55SWQiOiIxIiwiVGVuYW50SWQiOiJ0b21hdG8udHBvcy52biIsIlJvbGVJZHMiOiI0MmZmYzk5Yi1lNGY2LTQwMDAtYjcyOS1hZTNmMDAyOGEyODksNmExZDAwMDAtNWQxYS0wMDE1LTBlNmMtMDhkYzM3OTUzMmU5LDc2MzlhMDQ4LTdjZmUtNDBiNS1hNDFkLWFlM2YwMDNiODlkZiw4YmM4ZjQ1YS05MWY4LTQ5NzMtYjE4Mi1hZTNmMDAzYWI4NTUsYTljMjAwMDAtNWRiNi0wMDE1LTQ1YWItMDhkYWIxYmZlMjIyIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjpbIlF14bqjbiBMw70gTWFpIiwiQ8OSSSIsIkNTS0ggLSBMw6BpIiwiS2hvIFBoxrDhu5tjLSBLaeG7h3QiLCJRdeG6o24gTMO9IEtobyAtIEJvIl0sImp0aSI6Ijc3MTY0ZWIyLWUwZTUtNDBkZS04OTE5LWU4YjBkNjBkYjQ0OCIsImlhdCI6IjE3NjEyMTQwNjIiLCJuYmYiOjE3NjEyMTQwNjIsImV4cCI6MTc2MjUxMDA2MiwiaXNzIjoiaHR0cHM6Ly90b21hdG8udHBvcy52biIsImF1ZCI6Imh0dHBzOi8vdG9tYXRvLnRwb3Mudm4saHR0cHM6Ly90cG9zLnZuIn0.YXH6yydrdR5goQ-jD7P-h1hN3cNA0tgy7VHOFwxGe7I",
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
app.get("/api/comments", async (req, res) => {
    try {
        const { pageid, postId } = req.query;

        if (!pageid || !postId) {
            return res.status(400).json({
                error: "Missing required parameters: pageid and postId",
            });
        }

        const url = `https://tomato.tpos.vn/api/facebook-graph/comment?pageid=${pageid}&facebook_type=Page&postId=${postId}&limit=50&order=reverse_chronological`;

        console.log(`📡 Fetching: ${url}`);

        const response = await axios.get(url, {
            headers: {
                accept: "application/json, text/plain, */*",
                authorization:
                    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJDbGllbnRJZCI6InRtdFdlYkFwcCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiZmMwZjQ0MzktOWNmNi00ZDg4LWE4YzctNzU5Y2E4Mjk1MTQyIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6Im52MjAiLCJEaXNwbGF5TmFtZSI6IlTDuiIsIkF2YXRhclVybCI6IiIsIlNlY3VyaXR5U3RhbXAiOiI2NmQxNWRjMC03MTY3LTQzYjMtYTliNC00MjA2Yjk1NWM5YTIiLCJDb21wYW55SWQiOiIxIiwiVGVuYW50SWQiOiJ0b21hdG8udHBvcy52biIsIlJvbGVJZHMiOiI0MmZmYzk5Yi1lNGY2LTQwMDAtYjcyOS1hZTNmMDAyOGEyODksNmExZDAwMDAtNWQxYS0wMDE1LTBlNmMtMDhkYzM3OTUzMmU5LDc2MzlhMDQ4LTdjZmUtNDBiNS1hNDFkLWFlM2YwMDNiODlkZiw4YmM4ZjQ1YS05MWY4LTQ5NzMtYjE4Mi1hZTNmMDAzYWI4NTUsYTljMjAwMDAtNWRiNi0wMDE1LTQ1YWItMDhkYWIxYmZlMjIyIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjpbIlF14bqjbiBMw70gTWFpIiwiQ8OSSSIsIkNTS0ggLSBMw6BpIiwiS2hvIFBoxrDhu5tjLSBLaeG7h3QiLCJRdeG6o24gTMO9IEtobyAtIEJvIl0sImp0aSI6Ijc3MTY0ZWIyLWUwZTUtNDBkZS04OTE5LWU4YjBkNjBkYjQ0OCIsImlhdCI6IjE3NjEyMTQwNjIiLCJuYmYiOjE3NjEyMTQwNjIsImV4cCI6MTc2MjUxMDA2MiwiaXNzIjoiaHR0cHM6Ly90b21hdG8udHBvcy52biIsImF1ZCI6Imh0dHBzOi8vdG9tYXRvLnRwb3Mudm4saHR0cHM6Ly90cG9zLnZuIn0.YXH6yydrdR5goQ-jD7P-h1hN3cNA0tgy7VHOFwxGe7I",
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

// Cache for orders data (in-memory cache to avoid spamming API)
const ordersCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Endpoint to get detailed orders info (PrintCount, Telephone, PartnerStatus)
// Optimized with caching to prevent spam requests
app.get("/api/orders-detail", async (req, res) => {
    try {
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
                authorization:
                    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJDbGllbnRJZCI6InRtdFdlYkFwcCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiZmMwZjQ0MzktOWNmNi00ZDg4LWE4YzctNzU5Y2E4Mjk1MTQyIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6Im52MjAiLCJEaXNwbGF5TmFtZSI6IlTDuiIsIkF2YXRhclVybCI6IiIsIlNlY3VyaXR5U3RhbXAiOiI2NmQxNWRjMC03MTY3LTQzYjMtYTliNC00MjA2Yjk1NWM5YTIiLCJDb21wYW55SWQiOiIxIiwiVGVuYW50SWQiOiJ0b21hdG8udHBvcy52biIsIlJvbGVJZHMiOiI0MmZmYzk5Yi1lNGY2LTQwMDAtYjcyOS1hZTNmMDAyOGEyODksNmExZDAwMDAtNWQxYS0wMDE1LTBlNmMtMDhkYzM3OTUzMmU5LDc2MzlhMDQ4LTdjZmUtNDBiNS1hNDFkLWFlM2YwMDNiODlkZiw4YmM4ZjQ1YS05MWY4LTQ5NzMtYjE4Mi1hZTNmMDAzYWI4NTUsYTljMjAwMDAtNWRiNi0wMDE1LTQ1YWItMDhkYWIxYmZlMjIyIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjpbIlF14bqjbiBMw70gTWFpIiwiQ8OSSSIsIkNTS0ggLSBMw6BpIiwiS2hvIFBoxrDhu5tjLSBLaeG7h3QiLCJRdeG6o24gTMO9IEtobyAtIEJvIl0sImp0aSI6Ijc3MTY0ZWIyLWUwZTUtNDBkZS04OTE5LWU4YjBkNjBkYjQ0OCIsImlhdCI6IjE3NjEyMTQwNjIiLCJuYmYiOjE3NjEyMTQwNjIsImV4cCI6MTc2MjUxMDA2MiwiaXNzIjoiaHR0cHM6Ly90b21hdG8udHBvcy52biIsImF1ZCI6Imh0dHBzOi8vdG9tYXRvLnRwb3Mudm4saHR0cHM6Ly90cG9zLnZuIn0.YXH6yydrdR5goQ-jD7P-h1hN3cNA0tgy7VHOFwxGe7I",
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
app.get("/api/avatar/:psid", async (req, res) => {
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
app.get("/api/stream", async (req, res) => {
    const { pageid, postId } = req.query;

    if (!pageid || !postId) {
        return res.status(400).json({
            error: "Missing required parameters: pageid and postId",
        });
    }

    const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJDbGllbnRJZCI6InRtdFdlYkFwcCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiZmMwZjQ0MzktOWNmNi00ZDg4LWE4YzctNzU5Y2E4Mjk1MTQyIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6Im52MjAiLCJEaXNwbGF5TmFtZSI6IlTDuiIsIkF2YXRhclVybCI6IiIsIlNlY3VyaXR5U3RhbXAiOiI2NmQxNWRjMC03MTY3LTQzYjMtYTliNC00MjA2Yjk1NWM5YTIiLCJDb21wYW55SWQiOiIxIiwiVGVuYW50SWQiOiJ0b21hdG8udHBvcy52biIsIlJvbGVJZHMiOiI0MmZmYzk5Yi1lNGY2LTQwMDAtYjcyOS1hZTNmMDAyOGEyODksNmExZDAwMDAtNWQxYS0wMDE1LTBlNmMtMDhkYzM3OTUzMmU5LDc2MzlhMDQ4LTdjZmUtNDBiNS1hNDFkLWFlM2YwMDNiODlkZiw4YmM4ZjQ1YS05MWY4LTQ5NzMtYjE4Mi1hZTNmMDAzYWI4NTUsYTljMjAwMDAtNWRiNi0wMDE1LTQ1YWItMDhkYWIxYmZlMjIyIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjpbIlF14bqjbiBMw70gTWFpIiwiQ8OSSSIsIkNTS0ggLSBMw6BpIiwiS2hvIFBoxrDhu5tjLSBLaeG7h3QiLCJRdeG6o24gTMO9IEtobyAtIEJvIl0sImp0aSI6Ijc3MTY0ZWIyLWUwZTUtNDBkZS04OTE5LWU4YjBkNjBkYjQ0OCIsImlhdCI6IjE3NjEyMTQwNjIiLCJuYmYiOjE3NjEyMTQwNjIsImV4cCI6MTc2MjUxMDA2MiwiaXNzIjoiaHR0cHM6Ly90b21hdG8udHBvcy52biIsImF1ZCI6Imh0dHBzOi8vdG9tYXRvLnRwb3Mudm4saHR0cHM6Ly90cG9zLnZuIn0.YXH6yydrdR5goQ-jD7P-h1hN3cNA0tgy7VHOFwxGe7I";
    const url = `https://tomato.tpos.vn/api/facebook-graph/comment/stream?pageId=${pageid}&facebook_Type=Page&postId=${postId}&access_token=${token}`;

    console.log(`🌊 Streaming: ${url}`);

    try {
        // Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const response = await axios.get(url, {
            responseType: "stream",
            headers: {
                accept: "text/event-stream",
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
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║   🚀 SERVER ĐANG CHẠY!                                    ║
╠═══════════════════════════════════════════════════════════╣
║   📡 URL: http://localhost:${PORT}                           ║
╠═══════════════════════════════════════════════════════════╣
║   ✨ Giao diện chính:                                     ║
║      http://localhost:${PORT}/index.html                       ║
║                                                           ║
║   ⚙️ Cài đặt:                                             ║
║      http://localhost:${PORT}/settings.html                    ║
║                                                           ║
║   📁 Settings folder: ./settings/                         ║
║      - printers.json                                      ║
║      - template.json                                      ║
║      - last-session.json                                  ║
╠═══════════════════════════════════════════════════════════╣
║   🛑 Dừng server: Ctrl + C                                ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
