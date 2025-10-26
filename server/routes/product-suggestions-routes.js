const express = require("express");
const fs = require("fs");
const XLSX = require("xlsx");
const { PRODUCT_EXCEL_FILE } = require("../config");

const router = express.Router();

// In-memory cache for product suggestions
let productSuggestionsCache = null;

/**
 * Reads product data from the Excel file and caches it.
 * @returns {Array<Object>} An array of product suggestions.
 */
function loadProductSuggestionsFromExcel() {
    if (productSuggestionsCache) {
        console.log("💾 Returning cached product suggestions.");
        return productSuggestionsCache;
    }

    console.log("📊 Loading product suggestions from Excel...");
    try {
        if (!fs.existsSync(PRODUCT_EXCEL_FILE)) {
            console.warn(`⚠️ Product Excel file not found: ${PRODUCT_EXCEL_FILE}`);
            return [];
        }

        const workbook = XLSX.readFile(PRODUCT_EXCEL_FILE);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const suggestions = json.map(row => ({
            code: row.DefaultCode ? String(row.DefaultCode).toUpperCase() : '',
            name: row.Name || ''
        })).filter(item => item.code); // Filter out items without a code

        productSuggestionsCache = suggestions;
        console.log(`✅ Loaded ${suggestions.length} product suggestions from Excel.`);
        return suggestions;
    } catch (error) {
        console.error("❌ Error loading product suggestions from Excel:", error);
        return [];
    }
}

// Endpoint for product suggestions
router.get("/products/suggestions", (req, res) => {
    try {
        const suggestions = loadProductSuggestionsFromExcel();
        res.json({ success: true, data: suggestions });
    } catch (error) {
        console.error("❌ Error serving product suggestions:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;