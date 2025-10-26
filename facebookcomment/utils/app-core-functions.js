// facebookcomment/utils/app-core-functions.js

import { appState } from './app-state.js';
import { loadVideos, populateVideoSelector } from './facebook-ui-manager.js';
import { processComments, connectStream, fetchComments, filterAndDisplayComments, renderPaginationControls, goToPage } from './search-pagination-manager.js';
import { fetchOrders, refreshOrders } from './order-data-manager.js';
import { saveLastSession } from './session-manager.js';
import { getToken } from '../../shared/api/tpos-api.js';

/**
 * Starts fetching comments based on the selected connection mode.
 */
export async function startFetching() {
    const pageId = document.getElementById("selectedPageId").value.trim();
    const videoId = document.getElementById("selectedVideoId").value.trim();
    const connectionMode = document.getElementById("connectionMode").value;
    const refreshInterval = parseInt(document.getElementById("refreshInterval").value);
    const errorContainer = document.getElementById("errorContainer");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");
    const clearBtn = document.getElementById("clearBtn");

    if (!pageId || !videoId) {
        errorContainer.innerHTML = '<div class="error">⚠️ Vui lòng chọn Page và Video/Post trước!</div>';
        window.showNotification("Vui lòng chọn Page và Video/Post trước!", "error");
        return;
    }

    const token = getToken();
    if (!token) {
        errorContainer.innerHTML = '<div class="error">⚠️ Vui lòng nhập Bearer Token trước khi bắt đầu!</div>';
        window.showNotification("Vui lòng nhập Bearer Token trước khi bắt đầu!", "error");
        return;
    }

    // Update appState
    appState.pageId = pageId;
    appState.videoId = videoId;
    appState.connectionMode = connectionMode;
    appState.refreshInterval = refreshInterval;
    appState.isFetching = true;
    appState.isFirstLoad = true; // Reset for new session
    appState.knownCommentIds.clear(); // Clear known comments for new session
    appState.ordersFetched = false; // Reset orders fetched status
    appState.currentPage = 1; // Reset page for polling

    // Save current session
    appState.lastSession = { pageId, videoId, connectionMode, refreshInterval, autoStart: false };
    await saveLastSession(appState);

    // Disable start button, enable stop button
    startBtn.disabled = true;
    stopBtn.disabled = false;
    refreshOrdersBtn.disabled = false;
    clearBtn.disabled = false;

    // Hide refresh interval for stream mode
    document.getElementById("refreshIntervalGroup").style.display = connectionMode === "stream" ? "none" : "flex";

    // Fetch orders data once at the start of a session
    await fetchOrders(videoId, appState);

    if (connectionMode === "stream") {
        connectStream(appState);
    } else {
        // Polling mode
        fetchComments(appState); // Initial fetch
        appState.pollingIntervalId = setInterval(() => fetchComments(appState), refreshInterval * 1000);
    }

    window.showNotification(`Bắt đầu theo dõi comments cho video ${videoId} (${connectionMode})`, "success");
}

/**
 * Stops fetching comments.
 */
export function stopFetching() {
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");
    const clearBtn = document.getElementById("clearBtn");
    const refreshStatus = document.getElementById("refreshStatus");
    const refreshIndicator = document.getElementById("refreshIndicator");

    if (appState.pollingIntervalId) {
        clearInterval(appState.pollingIntervalId);
        appState.pollingIntervalId = null;
    }

    if (appState.eventSource) {
        appState.eventSource.close();
        appState.eventSource = null;
    }

    appState.isFetching = false;

    startBtn.disabled = false;
    stopBtn.disabled = true;
    refreshOrdersBtn.disabled = true;
    clearBtn.disabled = false;

    refreshStatus.textContent = "Đã dừng";
    refreshIndicator.classList.remove("active");

    window.showNotification("Đã dừng theo dõi comments", "info");
}

/**
 * Clears all displayed comments and resets stats.
 */
export function clearComments() {
    if (!confirm("Bạn có chắc chắn muốn xóa tất cả comments đã hiển thị?")) {
        return;
    }

    document.getElementById("commentsList").innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <p>Nhấn "Bắt Đầu" để xem comments real-time</p>
        </div>
    `;
    document.getElementById("totalComments").textContent = "0";
    document.getElementById("newComments").textContent = "0";
    document.getElementById("filteredComments").textContent = "0";
    document.getElementById("lastUpdate").textContent = "--:--:--";
    document.getElementById("searchBox").value = "";
    document.getElementById("searchStats").classList.remove("show");
    document.getElementById("paginationControls").style.display = "none";

    appState.allCommentsData = [];
    appState.knownCommentIds.clear();
    appState.currentSearchTerm = "";
    appState.currentPage = 1;
    appState.totalCommentsCount = 0;

    window.showNotification("Đã xóa tất cả comments", "info");
    window.lucide.createIcons();
}

console.log("✅ App Core Functions module loaded");