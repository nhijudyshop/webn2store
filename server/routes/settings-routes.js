const express = require("express");
const fs = require("fs");
const { PRINTERS_FILE, TEMPLATE_FILE, LAST_SESSION_FILE, HEADER_TEMPLATE_FILE } = require("../config");

const router = express.Router();

// Get printers
router.get("/settings/printers", (req, res) => {
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
router.post("/settings/printers", (req, res) => {
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
router.get("/settings/template", (req, res) => {
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
router.post("/settings/template", (req, res) => {
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
router.get("/settings/last-session", (req, res) => {
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
router.post("/settings/last-session", (req, res) => {
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
router.delete("/settings/last-session", (req, res) => {
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

// Get header template
router.get("/settings/header-template", (req, res) => {
    try {
        if (fs.existsSync(HEADER_TEMPLATE_FILE)) {
            const data = fs.readFileSync(HEADER_TEMPLATE_FILE, "utf8");
            res.json(JSON.parse(data));
        } else {
            res.json({}); // Return empty object if file doesn't exist
        }
    } catch (error) {
        console.error("❌ Error reading header template:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save header template
router.post("/settings/header-template", (req, res) => {
    try {
        const template = req.body;
        fs.writeFileSync(HEADER_TEMPLATE_FILE, JSON.stringify(template, null, 2));
        console.log("✅ Header template saved successfully");
        res.json({ success: true, message: "Header template saved successfully" });
    } catch (error) {
        console.error("❌ Error saving header template:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;