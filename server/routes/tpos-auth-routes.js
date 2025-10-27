const express = require("express");
const fs = require("fs");
const axios = require("axios");
const { ACCOUNT_TPOS_FILE } = require("../config");

const router = express.Router();

// Get TPOS account
router.get("/tpos-account", (req, res) => {
    try {
        if (fs.existsSync(ACCOUNT_TPOS_FILE)) {
            const data = fs.readFileSync(ACCOUNT_TPOS_FILE, "utf8");
            res.json({ success: true, data: JSON.parse(data) });
        } else {
            res.json({ success: true, data: { username: "", password: "" } });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save TPOS account
router.post("/tpos-account", (req, res) => {
    try {
        fs.writeFileSync(ACCOUNT_TPOS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: "Account saved" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Login to TPOS and get token
router.post("/tpos-login", async (req, res) => {
    try {
        if (!fs.existsSync(ACCOUNT_TPOS_FILE)) {
            return res.status(400).json({ success: false, error: "TPOS account not configured." });
        }

        const accountData = JSON.parse(fs.readFileSync(ACCOUNT_TPOS_FILE, "utf8"));
        const { username, password } = accountData;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: "Username or password missing." });
        }

        const payload = new URLSearchParams();
        payload.append('grant_type', 'password');
        payload.append('username', username);
        payload.append('password', password);
        payload.append('client_id', 'tmtWebApp');

        const response = await axios.post("https://tomato.tpos.vn/token", payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json({ success: true, data: response.data });

    } catch (error) {
        console.error("❌ TPOS Login Error:", error.response ? error.response.data : error.message);
        const status = error.response ? error.response.status : 500;
        const message = error.response?.data?.error_description || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.";
        res.status(status).json({ success: false, error: message });
    }
});

module.exports = router;