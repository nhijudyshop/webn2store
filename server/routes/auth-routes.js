const express = require("express");
const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("../config");

const router = express.Router();
const USERS_FILE = path.join(DATA_DIR, "users.json");

router.post("/app-login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Vui lòng nhập đủ tên đăng nhập và mật khẩu." });
    }

    try {
        if (!fs.existsSync(USERS_FILE)) {
            return res.status(500).json({ success: false, message: "Lỗi: Không tìm thấy file người dùng." });
        }

        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
        const foundUser = users.find(user => user.username === username && user.password === password);

        if (foundUser) {
            // Return user role on successful login
            res.json({ success: true, message: "Đăng nhập thành công.", role: foundUser.role });
        } else {
            res.status(401).json({ success: false, message: "Tên đăng nhập hoặc mật khẩu không đúng." });
        }
    } catch (error) {
        console.error("❌ Error during app login:", error);
        res.status(500).json({ success: false, message: "Lỗi server nội bộ." });
    }
});

module.exports = router;