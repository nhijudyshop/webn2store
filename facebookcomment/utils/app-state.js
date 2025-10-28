// facebookcomment/utils/app-state.js

/**
 * ===== GLOBAL APP STATE =====
 * Centralized state management for the Facebook Comments Viewer application.
 */
export const appState = {
    pageId: null,
    videoId: null,
    connectionMode: "stream", // 'stream' or 'polling'
    refreshInterval: 10, // seconds
    pollingIntervalId: null,
    eventSource: null,
    allCommentsData: [], // Stores all comments fetched
    knownCommentIds: new Set(), // For tracking new comments
    isFetching: false,
    isFirstLoad: true,
    ordersMap: new Map(), // Maps commentId/userId to order details
    ordersFetched: false, // Flag to indicate if orders have been fetched for the current video
    customersMap: new Map(), // Maps phone -> customer info (Id, Name, Street, Phone, Credit, StatusText)
    // Thêm queue xử lý khách hàng
    customerFetchQueue: new Set(),
    isFetchingCustomers: false,
    currentSearchTerm: "", // Current search term
    currentPage: 1, // Current page for polling mode
    commentsPerPage: 50, // Number of comments per page for polling mode
    totalCommentsCount: 0, // Total comments available from API for polling mode
    accountsData: [], // Stores Facebook accounts/pages data
    videosData: [], // Stores videos/posts data for selected page
};

// Expose appState globally for debugging if needed, but only in the browser
if (typeof window !== 'undefined') {
    window.appState = appState;
}

console.log("✅ App State module loaded");