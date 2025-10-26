const express = require("express");
const fs = require("fs");
const { ORDERS_FILE } = require("../config");

const router = express.Router();

// Helper to read orders
const readOrders = () => {
    if (!fs.existsSync(ORDERS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(ORDERS_FILE, "utf8");
    return JSON.parse(data);
};

// Helper to write orders
const writeOrders = (data) => {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2));
};

// Get all orders
router.get("/orders", (req, res) => {
    try {
        const orders = readOrders();
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("❌ Error reading orders:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new orders
router.post("/orders", (req, res) => {
    try {
        const newOrders = req.body;
        if (!Array.isArray(newOrders)) {
            return res.status(400).json({ success: false, error: "Request body must be an array of orders." });
        }

        const existingOrders = readOrders();
        const updatedOrders = [...existingOrders, ...newOrders];
        writeOrders(updatedOrders);

        console.log(`✅ ${newOrders.length} new order(s) saved successfully.`);
        res.json({ success: true, message: "Orders saved successfully" });
    } catch (error) {
        console.error("❌ Error saving orders:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete an order
router.delete("/orders/:id", (req, res) => {
    try {
        const orderIdToDelete = parseFloat(req.params.id);
        if (isNaN(orderIdToDelete)) {
            return res.status(400).json({ success: false, error: "Invalid order ID." });
        }

        const existingOrders = readOrders();
        const updatedOrders = existingOrders.filter(order => order.id !== orderIdToDelete);

        if (existingOrders.length === updatedOrders.length) {
            return res.status(404).json({ success: false, error: "Order not found." });
        }

        writeOrders(updatedOrders);

        console.log(`🗑️ Order with ID ${orderIdToDelete} deleted successfully.`);
        res.json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
        console.error(`❌ Error deleting order with ID ${req.params.id}:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;