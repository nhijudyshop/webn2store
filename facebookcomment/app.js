// ===== GLOBAL APPLICATION STATE =====
const appState = {
    accountsData: [],
    videosData: [],
    refreshInterval: null,
    eventSource: null,
    knownCommentIds: new Set(),
    isFirstLoad: true,
    connectionMode: "stream",
    ordersMap: new Map(),
    ordersFetched: false,
    allCommentsData: [],
    currentSearchTerm: "",
    printers: [], // For index.html printing
    templateSettings: { // Default template settings
        width: 1152, height: 'auto', threshold: 95, scale: 2,
        fonts: { session: 72, phone: 52, customer: 52, product: 36, comment: 32, time: 28 },
        alignment: 'center', bold: true, italic: false, padding: 20, lineSpacing: 12
    },
    lastSession: {
        pageId: null, videoId: null, connectionMode: 'stream', refreshInterval: 10, autoStart: false
    },
    currentPage: 1,
    commentsPerPage: 50,
    totalCommentsCount: 0,
    serverOnline: false, // Added for settings page
};

// ===== IMPORT MODULES =====
import { loadLastSession, saveLastSession, clearLastSession, restoreLastSession } from './utils/session-manager.js';
import { loadAccounts, loadVideos, populateVideoSelector, loadVideosForPageId } from './utils/facebook-ui-manager.js'; // Added loadVideosForPageId
import { renderAllComments } from './utils/comment-display.js';
import { fetchOrders, refreshOrders } from './utils/order-data-manager.js';
import { loadPrintersForPrinting, loadTemplateSettingsForPrinting, handleCreateOrder, handleViewInfo } from './utils/printer-template-manager.js';
import { processComments, connectStream, fetchComments, renderPaginationControls, goToPage, filterAndDisplayComments } from './utils/search-pagination-manager.js';
import { initializeSettingsPage } from './utils/settings-page-initializer.js';

// ===== GLOBAL EXPORTS (for HTML onclicks and shared access) =====
window.clearLastSession = () => clearLastSession(appState);
window.loadVideos = (event) => loadVideos(event, appState);
window.startFetching = () => startFetching(appState);
window.stopFetching = () => stopFetching(appState);
window.clearComments = () => clearComments(appState);
window.refreshOrders = () => refreshOrders(appState, filterAndDisplayComments, renderAllComments);
window.goToPage = (pageNumber) => goToPage(pageNumber, appState);
window.handleCreateOrder = (commentId, userName, message, time, userId) => handleCreateOrder(commentId, userName, message, time, userId, appState);
window.handleViewInfo = handleViewInfo; // Placeholder, doesn't need appState for now

// ===== CORE APPLICATION LOGIC =====

/**
 * Initializes the main index page.
 */
async function initializeIndexPage() {
    const searchBox = document.getElementById("searchBox");
    const clearSearch = document.getElementById("clearSearch");
    const searchStats = document.getElementById("searchStats");
    const refreshGroup = document.getElementById("refreshIntervalGroup");
    const paginationControls = document.getElementById("paginationControls");

    searchBox.addEventListener("input", function (e) {
        appState.currentSearchTerm = e.target.value.toLowerCase().trim();

        if (appState.currentSearchTerm) {
            clearSearch.classList.add("show");
            filterAndDisplayComments(appState.currentSearchTerm, appState);
        } else {
            clearSearch.classList.remove("show");
            searchStats.classList.remove("show");
            renderAllComments(appState, renderPaginationControls);
        }
    });

    clearSearch.addEventListener("click", function () {
        searchBox.value = "";
        appState.currentSearchTerm = "";
        clearSearch.classList.remove("show");
        searchStats.classList.remove("show");
        renderAllComments(appState, renderPaginationControls);
        searchBox.focus();
    });

    window.TPOS_API.loadToken(); // Load token from localStorage

    await loadAccounts(appState); // Load accounts
    await restoreLastSession(appState, startFetching); // Removed loadVideos argument

    loadPrintersForPrinting(appState); // Load printers for printing
    loadTemplateSettingsForPrinting(appState); // Load template settings for printing

    // Connection mode change handler
    document.getElementById("connectionMode").addEventListener("change", async function (e) {
        appState.connectionMode = e.target.value;
        
        if (appState.connectionMode === "stream") {
            refreshGroup.style.display = "none";
            paginationControls.style.display = "none";
        } else {
            refreshGroup.style.display = "flex";
            if (appState.allCommentsData.length > 0 && !appState.currentSearchTerm) {
                paginationControls.style.display = "flex";
            }
        }
        
        appState.lastSession.connectionMode = appState.connectionMode;
        await saveLastSession(appState);
    });

    // Save page selection
    document.getElementById("selectedPageId").addEventListener("change", async function (e) {
        appState.lastSession.pageId = e.target.value;
        appState.lastSession.videoId = null;
        appState.lastSession.autoStart = false;
        await saveLastSession(appState);
    });

    // Save video selection
    document.getElementById("selectedVideoId").addEventListener("change", async function (e) {
        appState.lastSession.videoId = e.target.value;
        appState.lastSession.autoStart = true;
        await saveLastSession(appState);
        window.showNotification('💾 Đã lưu lựa chọn - sẽ tự động bắt đầu lần sau!', 'success');
    });

    // Save refresh interval
    document.getElementById("refreshInterval").addEventListener("change", async function (e) {
        appState.lastSession.refreshInterval = parseInt(e.target.value) || 10;
        await saveLastSession(appState);
    });

    // Set initial display for refresh interval group based on current connectionMode
    if (refreshGroup) {
        refreshGroup.style.display = appState.connectionMode === "stream" ? "none" : "flex";
    }
    // Set initial display for pagination controls
    if (paginationControls) {
        paginationControls.style.display = appState.connectionMode === "polling" && appState.allCommentsData.length > 0 && !appState.currentSearchTerm ? "flex" : "none";
    }
}

/**
 * Starts fetching comments based on the selected connection mode.
 * @param {object} appState - The global application state object.
 */
async function startFetching(appState) {
    appState.connectionMode = document.getElementById("connectionMode").value;
    const videoId = document.getElementById("selectedVideoId").value.trim();

    if (!videoId) {
        alert("Vui lòng chọn Page và Video/Post trước!");
        return;
    }

    const postId = videoId;

    appState.knownCommentIds.clear();
    appState.isFirstLoad = true;
    document.getElementById("newComments").textContent = "0";
    appState.currentPage = 1;

    document.getElementById("startBtn").disabled = true;
    document.getElementById("stopBtn").disabled = false;

    appState.lastSession.autoStart = true;
    await saveLastSession(appState);

    await fetchOrders(postId, appState);

    if (appState.connectionMode === "stream") {
        connectStream(appState);
        document.getElementById("paginationControls").style.display = "none";
    } else {
        const interval =
            parseInt(document.getElementById("refreshInterval").value) || 10;

        if (interval < 5) {
            alert("Thời gian refresh tối thiểu là 5 giây!");
            return;
        }

        fetchComments(appState);

        appState.refreshInterval = setInterval(() => fetchComments(appState), interval * 1000);
        document.getElementById("paginationControls").style.display = "flex";
    }
}

/**
 * Stops fetching comments and resets UI state.
 * @param {object} appState - The global application state object.
 */
function stopFetching(appState) {
    if (appState.eventSource) {
        appState.eventSource.close();
        appState.eventSource = null;
        console.log("🔌 Stream disconnected");
    }

    if (appState.refreshInterval) {
        clearInterval(appState.refreshInterval);
        appState.refreshInterval = null;
    }

    document.getElementById("startBtn").disabled = false;
    document.getElementById("stopBtn").disabled = true;

    document.getElementById("refreshStatus").textContent = "Đã dừng";
    
    appState.lastSession.autoStart = false;
    saveLastSession(appState);

    document.getElementById("paginationControls").style.display = "none";
}

/**
 * Clears all comments and resets the application state.
 * @param {object} appState - The global application state object.
 */
function clearComments(appState) {
    stopFetching(appState);

    appState.knownCommentIds.clear();
    appState.isFirstLoad = true;

    appState.allCommentsData = [];
    appState.currentSearchTerm = "";
    const searchBox = document.getElementById("searchBox");
    if (searchBox) searchBox.value = "";
    const clearSearch = document.getElementById("clearSearch");
    if (clearSearch) clear.classList.remove("show");
    const searchStats = document.getElementById("searchStats");
    if (searchStats) searchStats.classList.remove("show");

    appState.ordersMap.clear();
    appState.ordersFetched = false;

    document.getElementById("totalComments").textContent = "0";
    document.getElementById("newComments").textContent = "0";
    document.getElementById("filteredComments").textContent = "0";
    appState.currentPage = 1;
    appState.totalCommentsCount = 0;

    const commentsList = document.getElementById("commentsList");
    commentsList.innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">💬</div><p>Nhấn "Bắt Đầu" để xem comments real-time</p></div>';

    document.getElementById("errorContainer").innerHTML = "";

    document.getElementById("startBtn").disabled = false;
    document.getElementById("paginationControls").style.display = "none";
}

// ===== INITIALIZATION LOGIC (Handles different pages) =====
document.addEventListener("DOMContentLoaded", function () {
    window.lucide.createIcons(); // Initialize Lucide icons globally

    // Check current page and initialize specific logic
    if (document.querySelector(".comments-container")) {
        initializeIndexPage();
    } else if (document.querySelector(".settings-container")) {
        // This is settings.html, import and initialize its specific manager
        initializeSettingsPage(appState);
    }
});