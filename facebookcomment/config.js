const path = require("path");

const BASE_DIR = __dirname;
const SETTINGS_DIR = path.join(BASE_DIR, "settings");
const PRINTERS_FILE = path.join(SETTINGS_DIR, "printers.json");
const TEMPLATE_FILE = path.join(SETTINGS_DIR, "template.json");
const LAST_SESSION_FILE = path.join(SETTINGS_DIR, "last-session.json");
const PRODUCT_EXCEL_FILE = path.join(BASE_DIR, "san_pham.xlsx");

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for orders data

module.exports = {
    BASE_DIR,
    SETTINGS_DIR,
    PRINTERS_FILE,
    TEMPLATE_FILE,
    LAST_SESSION_FILE,
    PRODUCT_EXCEL_FILE,
    CACHE_DURATION,
};