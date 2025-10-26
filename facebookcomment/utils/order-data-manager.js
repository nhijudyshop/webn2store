// facebookcomment/utils/order-data-manager.js

/**
 * Fetches detailed order information from the API and maps it for quick lookup.
 * @param {string} postId - The ID of the post to fetch orders for.
 * @param {object} appState - The global application state object.
 */
export async function fetchOrders(postId, appState) {
    if (appState.ordersFetched) {
        console.log("⏭️ Orders already fetched, using existing data");
        return;
    }

    try {
        console.log("📦 Fetching detailed orders mapping...");
        const startTime = Date.now();

        const data = await window.TPOS_API.tposRequest(`/api/orders-detail?postId=${postId}`);

        const fetchTime = Date.now() - startTime;

        if (data._cached) {
            console.log(
                `💾 Using cached orders data (age: ${data._cacheAge}s, fetch time: ${fetchTime}ms)`,
            );
        } else {
            console.log(
                `🌐 Fresh orders data fetched from API (fetch time: ${fetchTime}ms)`,
            );
        }

        if (data.value && Array.isArray(data.value)) {
            appState.ordersMap.clear();

            let mappedCount = 0;
            data.value.forEach((order) => {
                const commentId = order.Facebook_CommentId;
                const asUserId = order.Facebook_ASUserId;

                const orderInfo = {
                    sessionIndex: order.SessionIndex,
                    printCount: order.PrintCount,
                    telephone: order.Telephone,
                    partnerStatus: order.PartnerStatus,
                    partnerName: order.PartnerName,
                    address: order.Address,
                    note: order.Note,
                    code: order.Code,
                };

                if (commentId) {
                    appState.ordersMap.set(commentId, orderInfo);
                    mappedCount++;
                }

                if (asUserId && !appState.ordersMap.has(asUserId)) {
                    appState.ordersMap.set(asUserId, orderInfo);
                    mappedCount++;
                }
            });

            console.log(`✅ Orders mapping complete:`);
            console.log(
                `   - Total orders: ${data["@odata.count"] || data.value.length}`,
            );
            console.log(`   - Mapped entries: ${mappedCount}`);
            console.log(`   - Unique IDs: ${appState.ordersMap.size}`);
            appState.ordersFetched = true;
        } else {
            console.warn("⚠️ No orders data found in response");
        }
    } catch (error) {
        console.error("❌ Error fetching orders:", error);
        window.showNotification(`Lỗi tải orders: ${error.message}`, "error");
    }
}

/**
 * Forces a refresh of order data from the API and re-renders comments.
 * @param {object} appState - The global application state object.
 * @param {function} filterAndDisplayComments - Function to filter and display comments.
 * @param {function} renderAllComments - Function to render all comments.
 */
export async function refreshOrders(appState, filterAndDisplayComments, renderAllComments) {
    const videoId = document.getElementById("selectedVideoId").value.trim();

    if (!videoId) {
        alert("Vui lòng chọn Video/Post trước!");
        return;
    }

    const postId = videoId;

    const errorContainer = document.getElementById("errorContainer");
    const refreshBtn = document.getElementById("refreshOrdersBtn");

    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Đang làm mới...';
    window.lucide.createIcons();
    
    try {
        console.log("🔄 Force refreshing orders from API...");
        errorContainer.innerHTML =
            '<div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; border-radius: 4px; color: #1565c0;">🔄 Đang làm mới dữ liệu orders...</div>';

        const startTime = Date.now();

        const data = await window.TPOS_API.tposRequest(
            `/api/orders-detail?postId=${postId}&forceRefresh=true`,
        );

        const fetchTime = Date.now() - startTime;

        appState.ordersMap.clear();

        let mappedCount = 0;
        if (data.value && Array.isArray(data.value)) {
            data.value.forEach((order) => {
                const commentId = order.Facebook_CommentId;
                const asUserId = order.Facebook_ASUserId;

                const orderInfo = {
                    sessionIndex: order.SessionIndex,
                    printCount: order.PrintCount,
                    telephone: order.Telephone,
                    partnerStatus: order.PartnerStatus,
                    partnerName: order.PartnerName,
                    address: order.Address,
                    note: order.Note,
                    code: order.Code,
                };

                if (commentId) {
                    appState.ordersMap.set(commentId, orderInfo);
                    mappedCount++;
                }

                if (asUserId && !appState.ordersMap.has(asUserId)) {
                    appState.ordersMap.set(asUserId, orderInfo);
                    mappedCount++;
                }
            });

            console.log(`✅ Orders refreshed successfully!`);
            console.log(
                `   - Total orders: ${data["@odata.count"] || data.value.length}`,
            );
            console.log(`   - Mapped entries: ${mappedCount}`);
            console.log(`   - Fetch time: ${fetchTime}ms`);

            errorContainer.innerHTML = `<div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; border-radius: 4px; color: #2e7d32;">✅ Đã làm mới ${data["@odata.count"] || data.value.length} orders (${fetchTime}ms)</div>`;

            setTimeout(() => (errorContainer.innerHTML = ""), 3000);

            if (appState.allCommentsData.length > 0) {
                console.log("🔄 Re-rendering comments with updated orders...");

                appState.allCommentsData.forEach((comment) => {
                    const orderInfo =
                        appState.ordersMap.get(comment.id) ||
                        appState.ordersMap.get(comment.from?.id) ||
                        null;
                    comment.orderInfo = orderInfo;
                });

                if (appState.currentSearchTerm) {
                    filterAndDisplayComments(appState.currentSearchTerm, appState);
                } else {
                    renderAllComments(appState);
                }
            }
        } else {
            throw new Error("No orders data received");
        }
    } catch (error) {
        console.error("❌ Error refreshing orders:", error);
        errorContainer.innerHTML = `<div class="error">❌ Lỗi làm mới orders: ${error.message}</div>`;
        window.showNotification(`Lỗi làm mới orders: ${error.message}`, "error");
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Refresh Orders';
        window.lucide.createIcons();
    }
}