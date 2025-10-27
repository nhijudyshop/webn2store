const express = require("express");
const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("../config");

const router = express.Router();

const COLOR_FILE = path.join(DATA_DIR, "variant_mau.json");
const LETTER_SIZE_FILE = path.join(DATA_DIR, "variant_sizechu.json");
const NUMBER_SIZE_FILE = path.join(DATA_DIR, "variant_sizeso.json");

/**
 * Helper function to read and parse variant JSON files.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Array} An array of variant values or an empty array on error.
 */
function readVariantFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, "utf8");
            const jsonData = JSON.parse(data);
            return jsonData.value || [];
        }
        return [];
    } catch (error) {
        console.error(`❌ Error reading variant file ${filePath}:`, error);
        return [];
    }
}

router.get("/variants/colors", (req, res) => {
    const colors = readVariantFile(COLOR_FILE);
    res.json({ success: true, data: colors });
});

router.get("/variants/sizes-letter", (req, res) => {
    const sizes = readVariantFile(LETTER_SIZE_FILE);
    res.json({ success: true, data: sizes });
});

router.get("/variants/sizes-number", (req, res) => {
    const sizes = readVariantFile(NUMBER_SIZE_FILE);
    res.json({ success: true, data: sizes });
});

module.exports = router;