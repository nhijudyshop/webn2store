const express = require("express");
const fs = require("fs");
const { PRODUCT_SUGGESTIONS_FILE } = require("../config");

const router = express.Router();

// In-memory cache for product suggestions
let productSuggestionsCache = null;

/**
 * Reads product data from the JSON file. Bypasses cache.
 * @returns {Array<Object>} An array of product suggestions.
 */
function readSuggestionsFromFile() {
    try {
        if (!fs.existsSync(PRODUCT_SUGGESTIONS_FILE)) {
            console.warn(`⚠️ Product suggestions file not found: ${PRODUCT_SUGGESTIONS_FILE}`);
            return [];
        }
        const data = fs.readFileSync(PRODUCT_SUGGESTIONS_FILE, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("❌ Error reading product suggestions from JSON:", error);
        return [];
    }
}

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
    const suggestions = readSuggestionsFromFile();
    productSuggestionsCache = suggestions;
    console.log(`✅ Loaded ${suggestions.length} product suggestions from JSON.`);
    return suggestions;
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

// Endpoint to add new product suggestions
router.post("/products/suggestions", (req, res) => {
    try {
        const newProducts = req.body;
        if (!Array.isArray(newProducts)) {
            return res.status(400).json({ success: false, error: "Request body must be an array." });
        }

        const existingSuggestions = readSuggestionsFromFile();
        const existingCodes = new Set(existingSuggestions.map(p => p.code.toLowerCase()));
        
        let addedCount = 0;
        const productsToAdd = [];

        newProducts.forEach(product => {
            if (product.code && product.name && !existingCodes.has(product.code.toLowerCase())) {
                productsToAdd.push(product);
                existingCodes.add(product.code.toLowerCase()); // Add to set to prevent duplicates within the same request
                addedCount++;
            }
        });

        if (productsToAdd.length > 0) {
            const updatedSuggestions = [...existingSuggestions, ...productsToAdd];
            fs.writeFileSync(PRODUCT_SUGGESTIONS_FILE, JSON.stringify(updatedSuggestions, null, 2));
            productSuggestionsCache = null; // Invalidate cache
            console.log(`✅ Added ${addedCount} new product suggestions.`);
        }

        res.json({ success: true, message: `Added ${addedCount} new products.`, added: addedCount });
    } catch (error) {
        console.error("❌ Error saving new product suggestions:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;