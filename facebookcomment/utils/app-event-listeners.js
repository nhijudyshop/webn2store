// facebookcomment/utils/app-event-listeners.js

import { appState } from './app-state.js';
import { loadAccounts, loadVideos } from './facebook-ui-manager.js';
import { filterAndDisplayComments, renderPaginationControls, goToPage } from './search-pagination-manager.js';
import { renderAllComments } from './comment-display.js';
import { restoreLastSession, clearLastSession } from './session-manager.js';
import { refreshOrders } from './order-data-manager.js';
import { handleCreateOrder, handleViewInfo } from './printer-template-manager.js';
import { startFetching, stopFetching, clearComments } from './app-core-functions.js';
import { applyCommentFontSize, applyCommentFontFamily, saveDisplaySettingsDirect, getDisplaySettings } from './settings/display-management.js';

/**
 * Sets up all global event listeners for the application.
 */
export function setupEventListeners() {
    // Wrap all init logic to run immediately if DOM is ready
    const init = async () => {
        // Initialize Lucide icons
        window.lucide && window.lucide.createIcons();

        // Load accounts on page load
        await loadAccounts(appState);

        // Restore last session
        await restoreLastSession(appState, startFetching);

        // Event listener for connection mode change
        document.getElementById("connectionMode").addEventListener("change", (event) => {
            appState.connectionMode = event.target.value;
            document.getElementById("refreshIntervalGroup").style.display = appState.connectionMode === "stream" ? "none" : "flex";
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

        // Toggle fullscreen for comments container
        const fsBtn = document.getElementById("toggleFullscreenBtn");
        const commentsContainer = document.querySelector(".comments-container");
        if (fsBtn && commentsContainer) {
            fsBtn.addEventListener("click", () => {
                const isFull = commentsContainer.classList.toggle("fullscreen");
                document.body.classList.toggle("no-scroll", isFull);
                fsBtn.innerHTML = isFull ? '<i data-lucide="minimize-2"></i>' : '<i data-lucide="maximize-2"></i>';
                window.lucide && window.lucide.createIcons();
            });
        }

        // NEW: Font size and family controls in header
        const smallerBtn = document.getElementById('fontSmallerBtn');
        const largerBtn = document.getElementById('fontLargerBtn');
        const familySelect = document.getElementById('fontFamilySelect');

        const clampSize = (v) => Math.max(12, Math.min(32, v));

        if (smallerBtn) {
            smallerBtn.addEventListener('click', async () => {
                const settings = getDisplaySettings();
                const next = clampSize((settings.commentMessageFontSize || 18) - 1);
                applyCommentFontSize(next);
                await saveDisplaySettingsDirect({ commentMessageFontSize: next });
            });
        }
        if (largerBtn) {
            largerBtn.addEventListener('click', async () => {
                const settings = getDisplaySettings();
                const next = clampSize((settings.commentMessageFontSize || 18) + 1);
                applyCommentFontSize(next);
                await saveDisplaySettingsDirect({ commentMessageFontSize: next });
            });
        }
        if (familySelect) {
            // Initialize select from current settings
            const s = getDisplaySettings();
            if (typeof s.commentMessageFontFamily === 'string') {
                familySelect.value = s.commentMessageFontFamily;
            }
            familySelect.addEventListener('change', async (e) => {
                const family = e.target.value; // '' | 'serif' | 'monospace'
                applyCommentFontFamily(family);
                await saveDisplaySettingsDirect({ commentMessageFontFamily: family });
            });
        }

        console.log("Facebook Comments Viewer initialized");
    };

    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}

console.log("✅ App Event Listeners module loaded");