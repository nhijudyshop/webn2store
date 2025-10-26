const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Import configuration and routes
const config = require("./config");
const settingsRoutes = require("./routes/settings-routes");
const facebookProxyRoutes = require("./routes/facebook-proxy-routes");
const productSuggestionsRoutes = require("./routes/product-suggestions-routes");

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files (HTML)
app.use(express.static(config.BASE_DIR));

// Also serve the shared and pages directories from the root
app.use('/shared', express.static(path.join(config.BASE_DIR, '..', 'shared')));
app.use('/pages', express.static(path.join(config.BASE_DIR, '..', 'pages')));

// Ensure settings directory exists
if (!fs.existsSync(config.SETTINGS_DIR)) {
    fs.mkdirSync(config.SETTINGS_DIR, { recursive: true });
    console.log("📁 Created settings directory");
}

// Initialize default files if they don't exist
if (!fs.existsSync(config.PRINTERS_FILE)) {
    fs.writeFileSync(config.PRINTERS_FILE, JSON.stringify([], null, 2));
    console.log("📄 Created printers.json");
}

if (!fs.existsSync(config.TEMPLATE_FILE)) {
    const defaultTemplate = {
        width: 1152,
        height: "auto",
        threshold: 95,
        scale: 2,
        fonts: {
            session: 72,
            phone: 52,
            customer: 52,
            product: 36,
            comment: 32,
            time: 28,
        },
        alignment: "center",
        bold: true,
        italic: false,
        padding: 20,
        lineSpacing: 12,
    };
    fs.writeFileSync(config.TEMPLATE_FILE, JSON.stringify(defaultTemplate, null, 2));
    console.log("📄 Created template.json");
}

if (!fs.existsSync(config.LAST_SESSION_FILE)) {
    const defaultSession = {
        pageId: null,
        videoId: null,
        connectionMode: "stream",
        refreshInterval: 10,
        autoStart: false,
    };
    fs.writeFileSync(
        config.LAST_SESSION_FILE,
        JSON.stringify(defaultSession, null, 2),
    );
    console.log("📄 Created last-session.json");
}

// Mount API routes
app.use("/api", settingsRoutes);
app.use("/api", facebookProxyRoutes);
app.use("/api", productSuggestionsRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║   🚀 SERVER ĐANG CHẠY!                                    ║
╠═══════════════════════════════════════════════════════════╣
║   📡 URL: http://localhost:${PORT}                           ║
╠═══════════════════════════════════════════════════════════╣
║   ✨ Giao diện chính:                                     ║
║      http://localhost:${PORT}/index.html                       ║
║                                                           ║
║   ⚙️ Cài đặt:                                             ║
║      http://localhost:${PORT}/settings.html                    ║
║                                                           ║
║   📁 Settings folder: ./settings/                         ║
║      - printers.json                                      ║
║      - template.json                                      ║
║      - last-session.json                                  ║
║   📁 Product data: ./san_pham.xlsx                        ║
╠═══════════════════════════════════════════════════════════╣
║   🛑 Dừng server: Ctrl + C                                ║
╚═══════════════════════════════════════════════════════════╝
    `);
});