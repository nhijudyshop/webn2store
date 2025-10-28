const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const PRINTERS_FILE = path.join(__dirname, '../settings/printers.json');
const TEMPLATE_FILE = path.join(__dirname, '../settings/template.json');
const LAST_SESSION_FILE = path.join(__dirname, '../settings/last-session.json');
const HEADER_TEMPLATE_FILE = path.join(__dirname, '../settings/header-template.json');
const DISPLAY_FILE = path.join(__dirname, '../settings/display.json');

// ... existing code ...

// GET display settings
router.get('/display', (req, res) => {
    try {
        if (fs.existsSync(DISPLAY_FILE)) {
            const data = fs.readFileSync(DISPLAY_FILE, 'utf8');
            res.json({ success: true, data: JSON.parse(data) });
        } else {
            const defaultSettings = { commentMessageFontSize: 18 };
            res.json({ success: true, data: defaultSettings });
        }
    } catch (error) {
        console.error('Error loading display settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST display settings
router.post('/display', (req, res) => {
    try {
        fs.writeFileSync(DISPLAY_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving display settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ... existing code ...

module.exports = router;