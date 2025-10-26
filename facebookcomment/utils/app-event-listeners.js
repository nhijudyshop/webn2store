// facebookcomment/utils/app-event-listeners.js

import { appState } from './app-state.js';
import { loadAccounts, loadVideos } from './facebook-ui-manager.js';
import { filterAndDisplayComments, renderAllComments, renderPaginationControls, goToPage } from './search-pagination-manager.js';
import { restoreLastSession, clearLastSession } from './session-manager.js';
import { refreshOrders } from './order-data-manager.js';
import { handleCreateOrder, handleViewInfo } from './printer-template-manager.js';
import { startFetching, stopFetching, clearComments } from './app-core-functions.js';

/**
 * Sets up all global event listeners for the application.
 */
export function setupEventListeners() {
    document.addEventListener("DOMContentLoaded", async () => {
        // Initialize Lucide icons
        window.lucide.createIcons();

        // Load accounts on page load
        await loadAccounts(appState);

        // Restore last session
        await restoreLastSession(appState, startFetching);

        // Event listener for connection mode change
        document.getElementById("connectionMode").addEventListener("change", (event) => {
            appState.connectionMode = event.target.value;
            document.getElementById("refreshIntervalGroup").style.display = appState.connectionMode === "stream" ? "none" : "flex";
            // If switching to polling, ensure pagination is rendered if not searching
            if (appState.connectionMode === "polling" && !appState.currentSearchTerm) {
                renderPaginationControls(appState);
            } else {
                document.getElementById("paginationControls").style.display = "none";
            }
        });

        // Search box functionality
        const searchBox = document.getElementById("searchBox");
        const clearSearchBtn = document.getElementById("clearSearch");
        const searchStats = document.getElementById("searchStats");

        searchBox.addEventListener("input", () => {
            const searchTerm = searchBox.value.trim();
            appState.currentSearchTerm = searchTerm;

            if (searchTerm) {
                filterAndDisplayComments(searchTerm, appState);
                clearSearchBtn.classList.add("show");
                searchStats.classList.add("show");
            } else {
                // If search term is cleared, re-render all comments
                renderAllComments(appState, renderPaginationControls);
                clearSearchBtn.classList.remove("show");
                searchStats.classList.remove("show");
            }
        });

        clearSearchBtn.addEventListener("click", () => {
            searchBox.value = "";
            appState.currentSearchTerm = "";
            renderAllComments(appState, renderPaginationControls);
            clearSearchBtn.classList.remove("show");
            searchStats.classList.remove("show");
        });

        // Expose core functions globally for HTML onclicks
        window.loadVideos = (event) => loadVideos(event, appState);
        window.startFetching = () => startFetching();
        window.stopFetching = () => stopFetching();
        window.refreshOrders = () => refreshOrders(appState, filterAndDisplayComments, renderAllComments);
        window.clearComments = () => clearComments();
        window.clearLastSession = () => clearLastSession(appState);
        window.handleCreateOrder = (commentId, userName, message, time, userId) => handleCreateOrder(commentId, userName, message, time, userId, appState);
        window.handleViewInfo = handleViewInfo;
        window.goToPage = (pageNumber) => goToPage(pageNumber, appState);

        console.log("Facebook Comments Viewer initialized");
    });
}

console.log("✅ App Event Listeners module loaded");