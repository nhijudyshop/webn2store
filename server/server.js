const express = require("express");
const cors = require("cors");
const path = require("path");

// Import routes
const settingsRoutes = require("./routes/settings-routes");
const facebookProxyRoutes = require("./routes/facebook-proxy-routes");
const productSuggestionsRoutes = require("./routes/product-suggestions-routes");
const inventoryRoutes = require("./routes/inventory-routes");
const ordersRoutes = require("./routes/orders-routes");
const tposAuthRoutes = require("./routes/tpos-auth-routes");
const variantRoutes = require("./routes/variant-routes");
const authRoutes = require("./routes/auth-routes");
const userManagementRoutes = require("./routes/user-management-routes"); // New

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the project root directory
const projectRoot = path.join(__dirname, '..');
app.use(express.static(projectRoot));

// API Routes - prefix with /api
app.use("/api", settingsRoutes);
app.use("/api", facebookProxyRoutes);
app.use("/api", productSuggestionsRoutes);
app.use("/api", inventoryRoutes);
app.use("/api", ordersRoutes);
app.use("/api", tposAuthRoutes);
app.use("/api", variantRoutes);
app.use("/api", authRoutes);
app.use("/api", userManagementRoutes); // New

// Redirect root to the login page
app.get('/', (req, res) => {
    res.redirect('/public/login.html');
});

// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});