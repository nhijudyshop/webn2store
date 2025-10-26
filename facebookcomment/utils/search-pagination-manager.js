// facebookcomment/utils/search-pagination-manager.js

import { createCommentElement, createCommentElementWithHighlight, renderAllComments, normalizeVietnamese } from './comment-display.js';
import { fetchOrders } from './order-data-manager.js';

/**
 * Filters and displays comments based on a search term.
 * @param {string} searchTerm - The search term.
 * @param {object} appState - The global application state object.
 */
export function filterAndDisplayComments(searchTerm, appState) {
    const normalizedSearch = normalizeVietnamese(searchTerm);

    const filtered = appState.allCommentsData.filter((comment) => {
        // Search in name
        const name = normalizeVietnamese(comment.from?.name || "");
        if (name.includes(normalizedSearch)) return true;

        // Search in message
        const message = normalizeVietnamese(comment.message || "");
        if (message.includes(normalizedSearch)) return true;

        // Search in order info
        const commentId = comment.id;
        const userId = comment.from?.id;
        let orderInfo = null;

        if (commentId && appState.ordersMap.has(commentId)) {
            orderInfo = appState.ordersMap.get(commentId);
        } else if (userId && appState.ordersMap.has(userId)) {
            orderInfo = appState.ordersMap.get(userId);
        }

        if (orderInfo) {
            const phone = normalizeVietnamese(orderInfo.telephone || "");
            if (phone.includes(normalizedSearch)) return true;

            const address = normalizeVietnamese(orderInfo.address || "");
            if (address.includes(normalizedSearch)) return true;

            const sessionIndex = String(orderInfo.sessionIndex || "");
            if (sessionIndex.includes(searchTerm)) return true;

            const partnerName = normalizeVietnamese(
                orderInfo.partnerName || "",
            );
            if (partnerName.includes(normalizedSearch)) return true;
        }

        return false;
    });

    // Render filtered comments
    const commentsList = document.getElementById("commentsList");
    if (filtered.length === 0) {
        commentsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>Không tìm thấy kết quả phù hợp với "${searchTerm}"</p>
            </div>
        `;
    } else {
        let html = "";
        filtered.forEach((comment) => {
            html += createCommentElementWithHighlight(
                comment,
                searchTerm,
                false,
                appState
            );
        });
        commentsList.innerHTML = html;
        // Re-initialize icons after rendering
        window.lucide.createIcons();
    }

    // Update search stats
    const searchStats = document.getElementById("searchStats");
    searchStats.textContent = `Tìm thấy ${filtered.length} / ${appState.allCommentsData.length} comments`;
    searchStats.classList.add("show");

    // Update filtered count
    document.getElementById("filteredComments").textContent = filtered.length;

    // Hide pagination when searching
    document.getElementById("paginationControls").style.display = "none";
}

/**
 * Processes incoming comment data, updates the UI, and manages new comments.
 * @param {object} data - The raw comment data from the API.
 * @param {object} appState - The global application state object.
 */
export function processComments(data, appState) {
    const commentsList = document.getElementById("commentsList");
    const errorContainer = document.getElementById("errorContainer");

    errorContainer.innerHTML = "";

    if (data.data && Array.isArray(data.data)) {
        appState.allCommentsData = data.data;
        appState.totalCommentsCount = data.totalCount || data.data.length; // Assuming API returns totalCount

        if (appState.currentSearchTerm) {
            filterAndDisplayComments(appState.currentSearchTerm, appState);

            let newCommentsCount = 0;
            data.data.forEach((comment) => {
                if (!appState.knownCommentIds.has(comment.id)) {
                    appState.knownCommentIds.add(comment.id);
                    newCommentsCount++;
                }
            });

            if (newCommentsCount > 0) {
                const currentNewCount =
                    parseInt(
                        document.getElementById("newComments").textContent,
                    ) || 0;
                document.getElementById("newComments").textContent =
                    currentNewCount + newCommentsCount;
            }

            appState.isFirstLoad = false;

            const now = new Date();
            document.getElementById("lastUpdate").textContent =
                `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

            return;
        }

        let newCommentsCount = 0;
        let newCommentsHTML = "";

        if (appState.isFirstLoad) {
            let allCommentsHTML = "";
            data.data.forEach((comment) => {
                allCommentsHTML += createCommentElement(comment, false, appState);
                appState.knownCommentIds.add(comment.id);
            });

            if (allCommentsHTML) {
                commentsList.innerHTML = allCommentsHTML;
                window.lucide.createIcons();
            } else {
                commentsList.innerHTML =
                    '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Chưa có comment nào</p></div>';
            }

            document.getElementById("filteredComments").textContent =
                data.data.length;
            appState.isFirstLoad = false;
        } else {
            const newComments = [];

            data.data.forEach((comment) => {
                if (!appState.knownCommentIds.has(comment.id)) {
                    newComments.push(comment);
                    appState.knownCommentIds.add(comment.id);
                    newCommentsCount++;
                }
            });

            newComments.reverse().forEach((comment) => {
                newCommentsHTML += createCommentElement(comment, true, appState);
            });

            if (newCommentsHTML) {
                const emptyState = commentsList.querySelector(".empty-state");
                if (emptyState) {
                    emptyState.remove();
                }

                commentsList.insertAdjacentHTML("afterbegin", newCommentsHTML);
                window.lucide.createIcons();

                commentsList.parentElement.scrollTop = 0;

                setTimeout(() => {
                    const newItems =
                        commentsList.querySelectorAll(".comment-item.new");
                    newItems.forEach((item) => item.classList.remove("new"));
                }, 3000);
            }

            document.getElementById("filteredComments").textContent =
                appState.allCommentsData.length;
        }

        const currentTotal =
            commentsList.querySelectorAll(".comment-item").length;
        document.getElementById("totalComments").textContent = currentTotal;

        if (newCommentsCount > 0) {
            const currentNewCount =
                parseInt(document.getElementById("newComments").textContent) ||
                0;
            document.getElementById("newComments").textContent =
                currentNewCount + newCommentsCount;
        }
    }

    const now = new Date();
    document.getElementById("lastUpdate").textContent =
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    
    // Update pagination controls after processing comments
    renderPaginationControls(appState);
}

/**
 * Connects to the EventStream for real-time comment fetching.
 * @param {object} appState - The global application state object.
 */
export function connectStream(appState) {
    const videoId = document.getElementById("selectedVideoId").value.trim();
    const errorContainer = document.getElementById("errorContainer");
    const refreshIndicator = document.getElementById("refreshIndicator");
    const refreshStatus = document.getElementById("refreshStatus");

    if (!videoId) {
        errorContainer.innerHTML =
            '<div class="error">⚠️ Vui lòng chọn Page và Video/Post trước!</div>';
        window.stopFetching(appState); // Assuming stopFetching is global or passed
        return;
    }

    const pageId = videoId.split("_")[0];
    const postId = videoId;

    const token = window.TPOS_API.getToken();
    if (!token) {
        errorContainer.innerHTML = '<div class="error">⚠️ Vui lòng nhập Bearer Token trước khi kết nối stream!</div>';
        window.stopFetching(appState);
        window.showNotification("Vui lòng nhập Bearer Token trước khi kết nối stream!", "error");
        return;
    }

    const url = `/api/stream?pageid=${pageId}&postId=${postId}&token=${token}`;

    console.log("🌊 Connecting to stream...");
    refreshIndicator.classList.add("active");
    refreshStatus.innerHTML = '<span class="pulse"></span> Kết nối...';

    appState.eventSource = new EventSource(url);

    appState.eventSource.onopen = function () {
        console.log("✅ Stream connected!");
        refreshStatus.textContent = "🌊 Đang theo dõi (Stream)";
        refreshIndicator.classList.remove("active");
        errorContainer.innerHTML =
            '<div class="success" style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; border-radius: 4px; color: #2e7d32;">✅ Đã kết nối EventStream - Đang chờ comments mới...</div>';
        setTimeout(() => (errorContainer.innerHTML = ""), 3000);
    };

    appState.eventSource.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);

            if (Array.isArray(data) && data.length === 0) {
                console.log("⏭️ Skipping empty array");
                return;
            }

            console.log("📨 Received comments:", data);

            let processData;
            if (Array.isArray(data)) {
                processData = { data: data };
                console.log(`✨ Processing ${data.length} comment(s)`);
            } else if (data.data) {
                processData = data;
                console.log(`✨ Processing ${data.data.length} comment(s)`);
            } else {
                console.warn("⚠️ Unknown data format:", data);
                return;
            }

            processComments(processData, appState);
        } catch (error) {
            console.error("❌ Parse error:", error);
        }
    };

    appState.eventSource.onerror = function (error) {
        console.error("❌ Stream error:", error);
        errorContainer.innerHTML =
            '<div class="error">❌ Lỗi kết nối stream. Đang thử kết nối lại...</div>';
        refreshStatus.textContent = "Lỗi stream";

        setTimeout(() => {
            if (appState.eventSource && appState.eventSource.readyState === EventSource.CLOSED) {
                console.log("🔄 Reconnecting...");
                connectStream(appState);
            }
        }, 5000);
    };
}

/**
 * Fetches comments using polling method.
 * @param {object} appState - The global application state object.
 */
export async function fetchComments(appState) {
    const videoId = document.getElementById("selectedVideoId").value.trim();
    const errorContainer = document.getElementById("errorContainer");
    const refreshIndicator = document.getElementById("refreshIndicator");
    const refreshStatus = document.getElementById("refreshStatus");

    if (!videoId) {
        errorContainer.innerHTML =
            '<div class="error">⚠️ Vui lòng chọn Page và Video/Post trước!</div>';
        window.stopFetching(appState);
        return;
    }

    const pageId = videoId.split("_")[0];
    const postId = videoId;
    const skip = (appState.currentPage - 1) * appState.commentsPerPage;

    refreshIndicator.classList.add("active");
    refreshStatus.innerHTML = '<span class="pulse"></span> Đang tải...';

    try {
        const data = await window.TPOS_API.tposRequest(`/api/comments?pageid=${pageId}&postId=${postId}&limit=${appState.commentsPerPage}&skip=${skip}`);
        processComments(data, appState);
        refreshStatus.textContent = "Đang theo dõi (Polling)...";
    } catch (error) {
        errorContainer.innerHTML = `<div class="error">❌ Lỗi: ${error.message}</div>`;
        refreshStatus.textContent = "Lỗi kết nối";
        window.showNotification(`Lỗi tải comments: ${error.message}`, "error");
    } finally {
        refreshIndicator.classList.remove("active");
    }
}

/**
 * Renders the pagination controls based on current state.
 * @param {object} appState - The global application state object.
 */
export function renderPaginationControls(appState) {
    const paginationControls = document.getElementById("paginationControls");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const pageInfo = document.getElementById("pageInfo");

    if (appState.connectionMode === "stream" || appState.currentSearchTerm) {
        paginationControls.style.display = "none";
        return;
    }

    const totalPages = Math.ceil(appState.totalCommentsCount / appState.commentsPerPage);

    if (totalPages <= 1) {
        paginationControls.style.display = "none";
        return;
    }

    paginationControls.style.display = "flex";
    pageInfo.textContent = `Trang ${appState.currentPage}/${totalPages}`;

    prevBtn.disabled = appState.currentPage === 1;
    nextBtn.disabled = appState.currentPage === totalPages;
}

/**
 * Navigates to a specific page of comments.
 * @param {number} pageNumber - The page number to go to.
 * @param {object} appState - The global application state object.
 */
export function goToPage(pageNumber, appState) {
    if (pageNumber < 1) pageNumber = 1;
    const totalPages = Math.ceil(appState.totalCommentsCount / appState.commentsPerPage);
    if (pageNumber > totalPages) pageNumber = totalPages;

    if (pageNumber !== appState.currentPage) {
        appState.currentPage = pageNumber;
        fetchComments(appState); // Fetch comments for the new page
        document.getElementById("commentsList").scrollTop = 0; // Scroll to top
    }
}