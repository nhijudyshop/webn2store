const express = require("express");
const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("../config");

const router = express.Router();
const USERS_FILE = path.join(DATA_DIR, "users.json");

// Helper to read users
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data);
};

// Helper to write users
const writeUsers = (data) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
};

// GET all users
router.get("/users", (req, res) => {
    try {
        const users = readUsers().map(({ password, ...user }) => user); // Exclude passwords
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi server nội bộ." });
    }
});

// POST a new user
router.post("/users", (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập đủ thông tin." });
        }

        const users = readUsers();
        if (users.some(u => u.username === username)) {
            return res.status(409).json({ success: false, message: "Tên đăng nhập đã tồn tại." });
        }

        const newUser = {
            id: Date.now(),
            username,
            password, // In a real app, this should be hashed
            role,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        writeUsers(users);

        const { password: _, ...userToReturn } = newUser;
        res.status(201).json({ success: true, data: userToReturn });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi server nội bộ." });
    }
});

// PUT (update) a user
router.put("/users/:id", (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { password, role } = req.body;
        const users = readUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
        }

        if (role) users[userIndex].role = role;
        if (password) users[userIndex].password = password; // Again, should be hashed

        writeUsers(users);
        const { password: _, ...updatedUser } = users[userIndex];
        res.json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi server nội bộ." });
    }
});

// DELETE a user
router.delete("/users/:id", (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const users = readUsers();
        
        if (userId === 1) { // Prevent deleting the default admin
            return res.status(403).json({ success: false, message: "Không thể xóa tài khoản admin gốc." });
        }

        const updatedUsers = users.filter(u => u.id !== userId);

        if (users.length === updatedUsers.length) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
        }

        writeUsers(updatedUsers);
        res.json({ success: true, message: "Đã xóa người dùng." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi server nội bộ." });
    }
});

module.exports = router;