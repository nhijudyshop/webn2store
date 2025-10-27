/**
 * ===== SIDEBAR COMPONENT JS =====
 * Shared sidebar functionality for all pages
 * Version: 2.2.0
 */

// ===== SIDEBAR STATE =====
let sidebarOpen = false;

// ===== SIDEBAR FUNCTIONS =====
/**
 * Toggle sidebar open/close
 */
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    const toggleBtn = document.getElementById("sidebarToggle");

    sidebarOpen = !sidebarOpen;

    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
    toggleBtn.classList.toggle("open");
    document.body.classList.toggle("sidebar-open");
}

/**
 * Close sidebar
 */
function closeSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    const toggleBtn = document.getElementById("sidebarToggle");

    sidebarOpen = false;
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    toggleBtn.classList.remove("open");
    document.body.classList.remove("sidebar-open");
}

/**
 * Highlight active menu item based on current page
 */
function highlightActiveMenuItem() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll(".nav-item[data-path]");

    navItems.forEach((item) => {
        const targetPath = item.getAttribute("data-path");
        
        // Check if current page path is exactly the target path
        if (targetPath && currentPath === targetPath) {
            item.classList.add("active");
        }
    });
}

/**
 * Setup navigation links with correct absolute paths
 */
function setupNavigationLinks() {
    const navItems = document.querySelectorAll(".nav-item[data-path]");
    
    navItems.forEach((item) => {
        const targetPath = item.getAttribute("data-path");
        if (targetPath) {
            item.setAttribute("href", targetPath); // Use the absolute path directly
        }
    });
}

/**
 * Show notification message
 * @param {string} message - Message to display
 * @param {string} type - Type of notification: 'info', 'success', 'error'
 */
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    
    const bgColors = {
        info: "#3b82f6",
        success: "#10b981",
        error: "#ef4444",
    };

    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${bgColors[type] || bgColors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 2200;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        max-width: 350px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Handles logout functionality.
 */
function logout() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('tpos_bearer_token');
        window.location.href = '/public/login.html';
    }
}

/**
 * Filters sidebar menu items based on user role.
 */
function filterSidebarByRole() {
    const userRole = localStorage.getItem('userRole');
    if (!userRole) return;

    const navItems = document.querySelectorAll('.nav-item[data-roles]');
    navItems.forEach(item => {
        const allowedRoles = item.dataset.roles.split(',');
        if (!allowedRoles.includes(userRole)) {
            item.style.display = 'none';
        }
    });
}

/**
 * Load sidebar HTML and initialize
 */
async function initSidebar() {
    try {
        const sidebarPath = '/shared/sidebar/sidebar.html';
        
        const response = await fetch(sidebarPath);
        if (!response.ok) {
            throw new Error(`Failed to load sidebar: ${response.statusText}`);
        }
        const sidebarHTML = await response.text();

        document.body.insertAdjacentHTML("afterbegin", sidebarHTML);

        setupNavigationLinks();

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        // Filter menu items based on role
        filterSidebarByRole();

        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }

        highlightActiveMenuItem();

        console.log("✅ Sidebar initialized successfully");
    } catch (error) {
        console.error("❌ Error loading sidebar:", error);
    }
}

// ===== AUTO-INITIALIZE ON DOCUMENT READY =====
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebar);
} else {
    initSidebar();
}

// ===== EXPORT FUNCTIONS =====
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.showNotification = showNotification;