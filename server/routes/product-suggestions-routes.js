const express = require("express");
const fs = require("fs");
const { PRODUCT_SUGGESTIONS_FILE } = require("../config");

const router = express.Router();

// In-memory cache for product suggestions
let productSuggestionsCache = null;

/**
 * Reads product data from the JSON file and caches it.
 * @returns {Array<Object>} An array of product suggestions.
 */
function loadProductSuggestionsFromJSON() {
    if (productSuggestionsCache) {
        console.log("💾 Returning cached product suggestions.");
        return productSuggestionsCache;
    }

    console.log("📊 Loading product suggestions from JSON...");
    try {
        if (!fs.existsSync(PRODUCT_SUGGESTIONS_FILE)) {
            console.warn(`⚠️ Product suggestions file not found: ${PRODUCT_SUGGESTIONS_FILE}`);
            return [];
        }

        const data = fs.readFileSync(PRODUCT_SUGGESTIONS_FILE, "utf8");
        const suggestions = JSON.parse(data);

        productSuggestionsCache = suggestions;
        console.log(`✅ Loaded ${suggestions.length} product suggestions from JSON.`);
        return suggestions;
    } catch (error) {
        console.error("❌ Error loading product suggestions from JSON:", error);
        return [];
    }
}

// Endpoint for product suggestions
router.get("/products/suggestions", (req, res) => {
    try {
        const suggestions = loadProductSuggestionsFromJSON();
        res.json({ success: true, data: suggestions });
    } catch (error) {
        console.error("❌ Error serving product suggestions:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;