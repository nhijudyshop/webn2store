const express = require("express");
const fs = require("fs");
const path = require("path");
const { INVENTORY_PRODUCTS_FILE } = require("../config");

const router = express.Router();

// Ensure the data directory and file exist
const dataDir = path.dirname(INVENTORY_PRODUCTS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(INVENTORY_PRODUCTS_FILE)) {
    fs.writeFileSync(INVENTORY_PRODUCTS_FILE, "[]", "utf8");
}

// Get all saved inventory products
router.get("/inventory/products", (req, res) => {
    try {
        const data = fs.readFileSync(INVENTORY_PRODUCTS_FILE, "utf8");
        const products = JSON.parse(data);
        res.json({ success: true, data: products });
    } catch (error) {
        console.error("❌ Error reading inventory products:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save/update the entire list of inventory products
router.post("/inventory/products", (req, res) => {
    try {
        const products = req.body;
        if (!Array.isArray(products)) {
            return res.status(400).json({ success: false, error: "Request body must be an array of products." });
        }
        fs.writeFileSync(INVENTORY_PRODUCTS_FILE, JSON.stringify(products, null, 2));
        console.log(`✅ Inventory products saved successfully (${products.length} items)`);
        res.json({ success: true, message: "Inventory products saved successfully" });
    } catch (error) {
        console.error("❌ Error saving inventory products:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;