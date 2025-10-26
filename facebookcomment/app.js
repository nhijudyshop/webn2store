// ===== INITIALIZE LUCIDE ICONS =====
lucide.createIcons();

// ===== GLOBAL VARIABLES =====
let accountsData = [];
let videosData = [];
let refreshInterval = null;
let eventSource = null;
let knownCommentIds = new Set();
let isFirstLoad = true;
let connectionMode = "stream";
let sidebarOpen = false;

// Orders mapping
let ordersMap = new Map();
let ordersFetched = false;

// Search functionality
let allCommentsData = [];
let currentSearchTerm = "";

// Printer management (for settings.html)
let printers = [];
let serverOnline = false;

// Template settings
let templateSettings = {
    width: 1152,
    height: 'auto',
    threshold: 95,
    scale: 2,
    fonts: {
        session: 72,
        phone: 52,
        customer: 52,
        product: 36,
        comment: 32,
        time: 28
    },
    alignment: 'center',
    bold: true,
    italic: false,
    padding: 20,
    lineSpacing: 12
};

// Last session
let lastSession = {
    pageId: null,
    videoId: null,
    connectionMode: 'stream',
    refreshInterval: 10,
    autoStart: false
};

// ===== SIDEBAR FUNCTIONS =====
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

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === "info" ? "#2196f3" : type === "success" ? "#4caf50" : "#f44336"};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1002;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const animationStyles = document.createElement("style");
animationStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(animationStyles);

// Close sidebar on escape key
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sidebarOpen) {
        closeSidebar();
    }
});

// ===== LAST SESSION FUNCTIONS =====
async function loadLastSession() {
    try {
        const response = await fetch('/api/settings/last-session');
        const result = await response.json();
        
        if (result.success) {
            lastSession = result.data;
            console.log('✅ Last session loaded:', lastSession);
            return lastSession;
        }
    } catch (error) {
        console.error('❌ Error loading last session:', error);
    }
    return null;
}

async function saveLastSession() {
    try {
        const response = await fetch('/api/settings/last-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lastSession)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Last session saved');
        }
    } catch (error) {
        console.error('❌ Error saving last session:', error);
    }
}

async function clearLastSession() {
    if (!confirm('Bạn có chắc chắn muốn xóa session đã lưu?')) return;
    
    try {
        const response = await fetch('/api/settings/last-session', {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reset session data
            lastSession = {
                pageId: null,
                videoId: null,
                connectionMode: 'stream',
                refreshInterval: 10,
                autoStart: false
            };
            
            // Reset UI
            document.getElementById("selectedPageId").value = "";
            document.getElementById("selectedVideoId").innerHTML = '<option value="">Chọn page và nhấn "Tải Video" trước...</option>';
            document.getElementById("connectionMode").value = "stream";
            document.getElementById("refreshInterval").value = "10";
            
            showNotification('🗑️ Đã xóa session đã lưu!', 'success');
            console.log('✅ Last session cleared');
        }
    } catch (error) {
        console.error('❌ Error clearing last session:', error);
        showNotification('❌ Lỗi xóa session!', 'error');
    }
}

async function restoreLastSession() {
    const session = await loadLastSession();
    
    if (!session || !session.pageId || !session.videoId) {
        console.log('⏭️ No previous session to restore');
        return;
    }
    
    console.log('🔄 Restoring last session...');
    
    // Set page
    const pageSelector = document.getElementById("selectedPageId");
    if (pageSelector && session.pageId) {
        pageSelector.value = session.pageId;
        
        // Load videos for this page
        await loadVideosForPage(session.pageId);
        
        // Set video
        const videoSelector = document.getElementById("selectedVideoId");
        if (videoSelector && session.videoId) {
            videoSelector.value = session.videoId;
        }
    }
    
    // Set connection mode
    const connectionModeSelector = document.getElementById("connectionMode");
    if (connectionModeSelector && session.connectionMode) {
        connectionModeSelector.value = session.connectionMode;
        connectionMode = session.connectionMode;
        
        // Show/hide refresh interval
        const refreshGroup = document.getElementById("refreshIntervalGroup");
        if (refreshGroup) {
            refreshGroup.style.display = session.connectionMode === "stream" ? "none" : "flex";
        }
    }
    
    // Set refresh interval
    const refreshIntervalInput = document.getElementById("refreshInterval");
    if (refreshIntervalInput && session.refreshInterval) {
        refreshIntervalInput.value = session.refreshInterval;
    }
    
    // Auto start if enabled and has both page and video
    if (session.autoStart && session.pageId && session.videoId) {
        console.log('▶️ Auto-starting session...');
        showNotification('🔄 Đang khôi phục session và tự động bắt đầu...', 'info');

        // Immediately disable autoStart in the session file to prevent loops on page refresh
        lastSession.autoStart = false;
        await saveLastSession(); // Await to ensure the file is updated before proceeding

        // Start fetching after a short delay
        setTimeout(() => {
            startFetching();
        }, 1000);
    } else if (session.pageId && session.videoId) {
        showNotification('✅ Đã khôi phục session trước đó. Nhấn "Bắt Đầu" để chạy.', 'success');
    } else {
        showNotification('✅ Đã khôi phục một phần session trước đó', 'info');
    }
}

async function loadVideosForPage(pageId) {
    const limit = document.getElementById("videoLimit")?.value || 10;
    const videoSelector = document.getElementById("selectedVideoId");

    if (!videoSelector) return;

    videoSelector.innerHTML = '<option value="">Đang tải videos...</option>';

    try {
        const response = await fetch(`/api/videos?pageid=${pageId}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        videosData = data.data || [];

        if (videosData.length === 0) {
            videoSelector.innerHTML = '<option value="">Không có video nào</option>';
            return;
        }

        populateVideoSelector(videosData);
        console.log(`✅ Loaded ${videosData.length} videos for page ${pageId}`);
    } catch (error) {
        console.error("Error loading videos:", error);
        videoSelector.innerHTML = '<option value="">Lỗi tải videos</option>';
    }
}

// ===== SEARCH FUNCTIONS (Only for index.html) =====
function initializeIndexPage() {
    const searchBox = document.getElementById("searchBox");
    const clearSearch = document.getElementById("clearSearch");
    const searchStats = document.getElementById("searchStats");

    searchBox.addEventListener("input", function (e) {
        currentSearchTerm = e.target.value.toLowerCase().trim();

        if (currentSearchTerm) {
            clearSearch.classList.add("show");
            filterAndDisplayComments(currentSearchTerm);
        } else {
            clearSearch.classList.remove("show");
            searchStats.classList.remove("show");
            renderAllComments();
        }
    });

    clearSearch.addEventListener("click", function () {
        searchBox.value = "";
        currentSearchTerm = "";
        clearSearch.classList.remove("show");
        searchStats.classList.remove("show");
        renderAllComments();
        searchBox.focus();
    });

    // Load accounts on page load
    loadAccounts().then(() => {
        // After accounts loaded, restore last session
        restoreLastSession();
    });

    // Load printers and template settings for printing
    loadPrintersForPrinting();
    loadTemplateSettingsForPrinting();

    // Connection mode change handler
    document.getElementById("connectionMode").addEventListener("change", function (e) {
        connectionMode = e.target.value;
        const refreshGroup = document.getElementById("refreshIntervalGroup");

        if (connectionMode === "stream") {
            refreshGroup.style.display = "none";
        } else {
            refreshGroup.style.display = "flex";
        }
        
        // Save to session
        lastSession.connectionMode = connectionMode;
        saveLastSession();
    });

    // Save page selection
    document.getElementById("selectedPageId").addEventListener("change", function (e) {
        lastSession.pageId = e.target.value;
        lastSession.videoId = null; // Reset video when page changes
        lastSession.autoStart = false; // Reset auto-start
        saveLastSession();
    });

    // Save video selection
    document.getElementById("selectedVideoId").addEventListener("change", function (e) {
        lastSession.videoId = e.target.value;
        lastSession.autoStart = true; // Enable auto-start when video is selected
        saveLastSession();
        showNotification('💾 Đã lưu lựa chọn - sẽ tự động bắt đầu lần sau!', 'success');
    });

    // Save refresh interval
    document.getElementById("refreshInterval").addEventListener("change", function (e) {
        lastSession.refreshInterval = parseInt(e.target.value) || 10;
        saveLastSession();
    });

    // Initialize - hide refresh interval for stream mode
    document.getElementById("refreshIntervalGroup").style.display = "none";
}

function normalizeVietnamese(str) {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function highlightText(text, searchTerm) {
    if (!text || !searchTerm) return text;

    const normalizedText = normalizeVietnamese(text);
    const normalizedSearch = normalizeVietnamese(searchTerm);

    if (!normalizedText.includes(normalizedSearch)) return text;

    const regex = new RegExp(
        `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi",
    );
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function filterAndDisplayComments(searchTerm) {
    const normalizedSearch = normalizeVietnamese(searchTerm);

    const filtered = allCommentsData.filter((comment) => {
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

        if (commentId && ordersMap.has(commentId)) {
            orderInfo = ordersMap.get(commentId);
        } else if (userId && ordersMap.has(userId)) {
            orderInfo = ordersMap.get(userId);
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
            );
        });
        commentsList.innerHTML = html;
        // Re-initialize icons after rendering
        lucide.createIcons();
    }

    // Update search stats
    const searchStats = document.getElementById("searchStats");
    searchStats.textContent = `Tìm thấy ${filtered.length} / ${allCommentsData.length} comments`;
    searchStats.classList.add("show");

    // Update filtered count
    document.getElementById("filteredComments").textContent = filtered.length;
}

function renderAllComments() {
    const commentsList = document.getElementById("commentsList");

    if (allCommentsData.length === 0) {
        commentsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>Chưa có comment nào</p>
            </div>
        `;
    } else {
        let html = "";
        allCommentsData.forEach((comment) => {
            html += createCommentElement(comment, false);
        });
        commentsList.innerHTML = html;
        // Re-initialize icons after rendering
        lucide.createIcons();
    }

    document.getElementById("filteredComments").textContent =
        allCommentsData.length;
}

// ===== LOAD ACCOUNTS/PAGES =====
async function loadAccounts() {
    const selector = document.getElementById("selectedPageId");
    selector.innerHTML =
        '<option value="">Đang tải danh sách pages...</option>';

    try {
        const response = await fetch("/api/accounts");
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        accountsData = data.value || [];

        if (accountsData.length === 0) {
            selector.innerHTML = '<option value="">Không có page nào</option>';
            return;
        }

        populatePageSelector(accountsData);
        console.log(`✅ Loaded ${accountsData.length} accounts`);
    } catch (error) {
        console.error("Error loading accounts:", error);
        selector.innerHTML = '<option value="">Lỗi tải pages</option>';
    }
}

// Populate page selector
function populatePageSelector(accounts) {
    const selector = document.getElementById("selectedPageId");
    const currentValue = selector.value; // Remember current value

    selector.innerHTML = '<option value="">-- Chọn Page --</option>';

    accounts.forEach((account) => {
        const pages = account.Childs || [];
        pages.forEach((page) => {
            const option = document.createElement("option");
            option.value = page.Facebook_PageId;
            option.textContent = `${page.Facebook_PageName} (${page.Facebook_PageId})`;
            option.dataset.pageName = page.Facebook_PageName;
            selector.appendChild(option);
        });
    });

    // Re-apply the remembered value if it's still valid
    if (currentValue) {
        selector.value = currentValue;
    }
}

// ===== LOAD VIDEOS =====
async function loadVideos(event) {
    if (event) {
        event.preventDefault(); // Prevent default form submission if any
    }

    const pageSelector = document.getElementById("selectedPageId");
    const limitInput = document.getElementById("videoLimit");
    const videoSelector = document.getElementById("selectedVideoId");

    if (!pageSelector || !limitInput || !videoSelector) {
        console.error("Missing one or more required DOM elements for loading videos.");
        showNotification("Lỗi: Không tìm thấy các phần tử UI cần thiết.", "error");
        return;
    }

    const pageId = pageSelector.value;
    const limit = limitInput.value;

    if (!pageId) {
        showNotification("Vui lòng chọn page trước!", "error");
        return;
    }

    videoSelector.innerHTML = '<option value="">Đang tải videos...</option>';

    try {
        const response = await fetch(
            `/api/videos?pageid=${pageId}&limit=${limit}`,
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `HTTP Error: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();
        videosData = data.data || [];

        if (videosData.length === 0) {
            videoSelector.innerHTML =
                '<option value="">Không có video nào</option>';
            showNotification("Không có video nào được tìm thấy.", "info");
            return;
        }

        populateVideoSelector(videosData);
        console.log(`✅ Loaded ${videosData.length} videos`);
        showNotification(`Đã tải ${videosData.length} video thành công!`, "success");
    } catch (error) {
        console.error("Error loading videos:", error);
        videoSelector.innerHTML = `<option value="">Lỗi tải videos</option>`;
        showNotification(`Lỗi tải videos: ${error.message}`, "error");
    }
}

// Populate video selector
function populateVideoSelector(videos) {
    const selector = document.getElementById("selectedVideoId");
    selector.innerHTML = '<option value="">-- Chọn Video/Post --</option>';

    videos.forEach((video) => {
        const isLive = video.statusLive === 1;
        const statusIcon = isLive ? "🔴 LIVE" : "⏹️";
        const option = document.createElement("option");
        option.value = video.objectId;
        option.textContent = `${statusIcon} ${video.title} (💬 ${video.countComment || 0})`;
        option.dataset.pageId = video.objectId.split("_")[0];
        selector.appendChild(option);
    });
}

// ===== HELPER FUNCTIONS =====
function getInitials(name) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}

function formatTimeToGMT7(isoString) {
    const date = new Date(isoString);
    const gmt7Time = new Date(date.getTime() + 7 * 60 * 60 * 1000);

    const hours = String(gmt7Time.getUTCHours()).padStart(2, "0");
    const minutes = String(gmt7Time.getUTCMinutes()).padStart(2, "0");
    const seconds = String(gmt7Time.getUTCSeconds()).padStart(2, "0");

    const day = String(gmt7Time.getUTCDate()).padStart(2, "0");
    const month = String(gmt7Time.getUTCMonth() + 1).padStart(2, "0");
    const year = gmt7Time.getUTCFullYear();

    return `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;
}

// ===== FETCH ORDERS =====
async function fetchOrders(postId) {
    if (ordersFetched) {
        console.log("⏭️ Orders already fetched, using existing data");
        return;
    }

    try {
        console.log("📦 Fetching detailed orders mapping...");
        const startTime = Date.now();

        const response = await fetch(`/api/orders-detail?postId=${postId}`);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        const fetchTime = Date.now() - startTime;

        if (data._cached) {
            console.log(
                `💾 Using cached data (age: ${data._cacheAge}s, fetch time: ${fetchTime}ms)`,
            );
        } else {
            console.log(
                `🌐 Fresh data fetched from API (fetch time: ${fetchTime}ms)`,
            );
        }

        if (data.value && Array.isArray(data.value)) {
            ordersMap.clear();

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
                    ordersMap.set(commentId, orderInfo);
                    mappedCount++;
                }

                if (asUserId && !ordersMap.has(asUserId)) {
                    ordersMap.set(asUserId, orderInfo);
                    mappedCount++;
                }
            });

            console.log(`✅ Orders mapping complete:`);
            console.log(
                `   - Total orders: ${data["@odata.count"] || data.value.length}`,
            );
            console.log(`   - Mapped entries: ${mappedCount}`);
            console.log(`   - Unique IDs: ${ordersMap.size}`);
            ordersFetched = true;
        } else {
            console.warn("⚠️ No orders data found in response");
        }
    } catch (error) {
        console.error("❌ Error fetching orders:", error);
    }
}

// ===== CREATE COMMENT ELEMENT =====
function createCommentElement(comment, isNew = false) {
    const name = comment.from?.name || "Unknown";
    const message = comment.message || "(No message)";
    const time = comment.created_time;
    const userId = comment.from?.id;
    const commentId = comment.id;

    // Create avatar HTML
    let avatarHTML = "";
    const avatarUrl = comment.from?.picture?.data?.url;

    if (avatarUrl) {
        avatarHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-fallback\\'>${getInitials(name)}</div>';">`;
    } else if (userId) {
        avatarHTML = `<img src="/api/avatar/${userId}?size=50" alt="${name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-fallback\\'>${getInitials(name)}</div>';">`;
    } else {
        avatarHTML = `<div class="avatar-fallback">${getInitials(name)}</div>`;
    }

    // Check if user has order
    let orderHTML = "";
    let nameClass = "";
    let orderInfo = null;
    let inlineCustomerDetails = ""; // New variable for inline details

    if (commentId && ordersMap.has(commentId)) {
        orderInfo = ordersMap.get(commentId);
    } else if (userId && ordersMap.has(userId)) {
        orderInfo = ordersMap.get(userId);
    }

    if (orderInfo) {
        orderHTML = `
            <span class="order-badge">
                <span class="crown-icon">👑</span>
                <span>#${orderInfo.sessionIndex}</span>
            </span>
            <span class="verified-icon">✓</span>
        `;

        nameClass = "has-order";

        const details = [];

        if (orderInfo.printCount) {
            details.push(`
                <div class="customer-detail-item" style="border-left: 2px solid #10b981; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);">
                    <span class="icon">🛒</span>
                    <span class="value" style="color: #047857; font-weight: 700;">${orderInfo.printCount}</span>
                </div>
            `);
        }

        if (orderInfo.telephone) {
            details.push(`
                <div class="customer-detail-item">
                    <span class="icon">📱</span>
                    <span class="value phone-value">${orderInfo.telephone}</span>
                </div>
            `);
        }

        if (orderInfo.address) {
            details.push(`
                <div class="customer-detail-item">
                    <span class="icon">📍</span>
                    <span class="value">${orderInfo.address}</span>
                </div>
            `);
        }

        if (orderInfo.partnerName) {
            details.push(`
                <div class="customer-detail-item">
                    <span class="icon">🤝</span>
                    <span class="value">${orderInfo.partnerName}</span>
                </div>
            `);
        }

        // New: put details directly into inlineCustomerDetails
        if (details.length > 0) {
            inlineCustomerDetails = details.join("");
        }
    }

    // Action buttons - icon only, no text
    const actionsHTML = `
        <div class="comment-actions">
            <button class="action-btn action-create-order" onclick="handleCreateOrder('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}', '${userId || ""}')" title="Tạo đơn hàng">
                <i data-lucide="shopping-cart"></i>
            </button>
            <button class="action-btn action-info" onclick="handleViewInfo('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}')" title="Thông tin">
                <i data-lucide="info"></i>
            </button>
        </div>
    `;

    const newClass = isNew ? "new" : "";

    return `
        <div class="comment-item ${newClass}">
            <div class="avatar">
                ${avatarHTML}
            </div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author ${nameClass}">${name}</span>
                    ${orderHTML}
                    ${inlineCustomerDetails}
                </div>
                <div class="comment-message">
                    <span class="message-text">${message}</span>
                    <span class="comment-time">${time ? formatTimeToGMT7(time) : ""}</span>
                </div>
                ${actionsHTML}
            </div>
        </div>
    `;
}

function createCommentElementWithHighlight(comment, searchTerm, isNew = false) {
    // Similar to createCommentElement but with highlighting
    const name = comment.from?.name || "Unknown";
    const message = comment.message || "(No message)";
    const time = comment.created_time;
    const userId = comment.from?.id;
    const commentId = comment.id;

    const highlightedName = highlightText(name, searchTerm);
    const highlightedMessage = highlightText(message, searchTerm);

    let avatarHTML = "";
    const avatarUrl = comment.from?.picture?.data?.url;

    if (avatarUrl) {
        avatarHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-fallback\\'>${getInitials(name)}</div>';">`;
    } else if (userId) {
        avatarHTML = `<img src="/api/avatar/${userId}?size=50" alt="${name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-fallback\\'>${getInitials(name)}</div>';">`;
    } else {
        avatarHTML = `<div class="avatar-fallback">${getInitials(name)}</div>`;
    }

    let orderHTML = "";
    let nameClass = "";
    let orderInfo = null;
    let inlineCustomerDetails = ""; // New variable for inline details

    if (commentId && ordersMap.has(commentId)) {
        orderInfo = ordersMap.get(commentId);
    } else if (userId && ordersMap.has(userId)) {
        orderInfo = ordersMap.get(userId);
    }

    if (orderInfo) {
        orderHTML = `
            <span class="order-badge">
                <span class="crown-icon">👑</span>
                <span>#${highlightText(String(orderInfo.sessionIndex), searchTerm)}</span>
            </span>
            <span class="verified-icon">✓</span>
        `;

        nameClass = "has-order";

        const details = [];

        if (orderInfo.printCount) {
            details.push(`
                <div class="customer-detail-item" style="border-left: 2px solid #10b981; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);">
                    <span class="icon">🛒</span>
                    <span class="value" style="color: #047857; font-weight: 700;">${orderInfo.printCount}</span>
                </div>
            `);
        }

        if (orderInfo.telephone) {
            details.push(`
                <div class="customer-detail-item">
                    <span class="icon">📱</span>
                    <span class="value phone-value">${highlightText(orderInfo.telephone, searchTerm)}</span>
                </div>
            `);
        }

        if (orderInfo.address) {
            details.push(`
                <div class="customer-detail-item">
                    <span class="icon">📍</span>
                    <span class="value">${highlightText(orderInfo.address, searchTerm)}</span>
                </div>
            `);
        }

        if (orderInfo.partnerName) {
            details.push(`
                <div class="customer-detail-item">
                    <span class="icon">🤝</span>
                    <span class="value">${highlightText(orderInfo.partnerName, searchTerm)}</span>
                </div>
            `);
        }

        if (details.length > 0) {
            inlineCustomerDetails = details.join("");
        }
    }

    // Action buttons - icon only, no text
    const actionsHTML = `
        <div class="comment-actions">
            <button class="action-btn action-create-order" onclick="handleCreateOrder('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}', '${userId || ""}')" title="Tạo đơn hàng">
                <i data-lucide="shopping-cart"></i>
            </button>
            <button class="action-btn action-info" onclick="handleViewInfo('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}')" title="Thông tin">
                <i data-lucide="info"></i>
            </button>
        </div>
    `;

    const newClass = isNew ? "new" : "";

    return `
        <div class="comment-item ${newClass}">
            <div class="avatar">
                ${avatarHTML}
            </div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author ${nameClass}">${highlightedName}</span>
                    ${orderHTML}
                    ${inlineCustomerDetails}
                </div>
                <div class="comment-message">
                    <span class="message-text">${highlightedMessage}</span>
                    <span class="comment-time">${time ? formatTimeToGMT7(time) : ""}</span>
                </div>
                ${actionsHTML}
            </div>
        </div>
    `;
}

// ===== ACTION BUTTON HANDLERS =====
async function handleCreateOrder(commentId, userName, message, time, userId) {
    console.log("Create order for:", commentId, userName, message, "userId:", userId);
    
    // Get order info from ordersMap
    let orderInfo = null;
    if (commentId && ordersMap.has(commentId)) {
        orderInfo = ordersMap.get(commentId);
    } else if (userId && ordersMap.has(userId)) {
        orderInfo = ordersMap.get(userId);
    }
    
    if (!orderInfo) {
        showNotification("⚠️ Không tìm thấy thông tin đơn hàng!", "error");
        console.error("Order not found for commentId:", commentId, "userId:", userId);
        console.log("ordersMap size:", ordersMap.size);
        return;
    }
    
    // Load printers if not loaded
    if (printers.length === 0) {
        await loadPrintersForPrinting();
    }
    
    // Load template settings if not loaded
    if (!templateSettings.width) {
        await loadTemplateSettingsForPrinting();
    }
    
    const activePrinter = printers.find(p => p.isActive);
    
    if (!activePrinter) {
        showNotification("⚠️ Chưa có máy in active! Vui lòng vào Settings để cấu hình máy in.", "error");
        return;
    }
    
    // Prepare bill data
    // Use ONLY comment.message (the actual Facebook comment text)
    let productMessage = message || '';
    
    if (Array.isArray(productMessage)) {
        productMessage = productMessage[productMessage.length - 1] || ''; // Get last (newest) message
    } else if (typeof productMessage === 'object') {
        productMessage = JSON.stringify(productMessage); // Fallback for object
    }
    
    // Convert to string
    productMessage = String(productMessage).trim();
    
    // Decode escape sequences (\r\n, \n, \t, etc.) and unicode sequences (\u00c1, etc.)
    try {
        // Replace literal \r\n, \n with actual newlines
        productMessage = productMessage
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .replace(/\\t/g, ' ');
        
        // Decode unicode sequences like \u00c1
        productMessage = productMessage.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
            return String.fromCharCode(parseInt(code, 16));
        });
    } catch (e) {
        console.warn('Error decoding message:', e);
    }
    
    // Split by newline characters and take first line
    const firstLine = productMessage.split(/[\r\n]+/)[0];
    
    // Clean and limit message length
    productMessage = firstLine.trim().substring(0, 100);
    
    const billData = {
        sessionIndex: orderInfo.sessionIndex || '---',
        phone: orderInfo.telephone || '',
        customerName: userName,
        productCode: orderInfo.code || '',
        productName: productMessage, // ONLY from comment.message
        comment: '', // Empty - don't use orderInfo.note
        createdTime: time || new Date().toISOString()
    };
    
    showNotification("🖨️ Đang in bill...", "info");
    
    try {
        const htmlContent = generateBillHTML(billData);
        
        const response = await fetch(`${activePrinter.bridgeUrl}/print/html`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                printerIp: activePrinter.ipAddress,
                printerPort: activePrinter.port,
                html: htmlContent,
                width: templateSettings.width,
                height: templateSettings.height === 'auto' ? null : templateSettings.height,
                threshold: templateSettings.threshold,
                scale: templateSettings.scale
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        showNotification(`✅ In bill thành công cho ${userName}!`, "success");
        console.log("Print result:", result);
        
    } catch (error) {
        showNotification(`❌ Lỗi in bill: ${error.message}`, "error");
        console.error("Print error:", error);
    }
}

function handleViewInfo(commentId, userName, message, time) {
    showNotification(`Xem thông tin ${userName}`, "info");
    console.log("View info for:", commentId, userName, message, time);
    // TODO: Implement view info logic - show modal with full details
}

// ===== LOAD PRINTERS FOR PRINTING (in index.html) =====
async function loadPrintersForPrinting() {
    try {
        const response = await fetch('/api/settings/printers');
        const result = await response.json();
        
        if (result.success) {
            printers = result.data;
            console.log('✅ Printers loaded for printing:', printers.length);
        }
    } catch (error) {
        console.error('❌ Error loading printers for printing:', error);
    }
}

// ===== LOAD TEMPLATE SETTINGS FOR PRINTING (in index.html) =====
async function loadTemplateSettingsForPrinting() {
    try {
        const response = await fetch('/api/settings/template');
        const result = await response.json();
        
        if (result.success) {
            templateSettings = result.data;
            console.log('✅ Template settings loaded for printing');
        }
    } catch (error) {
        console.error('❌ Error loading template for printing:', error);
    }
}

// ===== PROCESS COMMENTS =====
function processComments(data) {
    const commentsList = document.getElementById("commentsList");
    const errorContainer = document.getElementById("errorContainer");

    errorContainer.innerHTML = "";

    if (data.data && Array.isArray(data.data)) {
        allCommentsData = data.data;

        if (currentSearchTerm) {
            filterAndDisplayComments(currentSearchTerm);

            let newCommentsCount = 0;
            data.data.forEach((comment) => {
                if (!knownCommentIds.has(comment.id)) {
                    knownCommentIds.add(comment.id);
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

            isFirstLoad = false;

            const now = new Date();
            document.getElementById("lastUpdate").textContent =
                `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

            return;
        }

        let newCommentsCount = 0;
        let newCommentsHTML = "";

        if (isFirstLoad) {
            let allCommentsHTML = "";
            data.data.forEach((comment) => {
                allCommentsHTML += createCommentElement(comment, false);
                knownCommentIds.add(comment.id);
            });

            if (allCommentsHTML) {
                commentsList.innerHTML = allCommentsHTML;
                lucide.createIcons();
            } else {
                commentsList.innerHTML =
                    '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Chưa có comment nào</p></div>';
            }

            document.getElementById("filteredComments").textContent =
                data.data.length;
            isFirstLoad = false;
        } else {
            const newComments = [];

            data.data.forEach((comment) => {
                if (!knownCommentIds.has(comment.id)) {
                    newComments.push(comment);
                    knownCommentIds.add(comment.id);
                    newCommentsCount++;
                }
            });

            newComments.reverse().forEach((comment) => {
                newCommentsHTML += createCommentElement(comment, true);
            });

            if (newCommentsHTML) {
                const emptyState = commentsList.querySelector(".empty-state");
                if (emptyState) {
                    emptyState.remove();
                }

                commentsList.insertAdjacentHTML("afterbegin", newCommentsHTML);
                lucide.createIcons();

                commentsList.parentElement.scrollTop = 0;

                setTimeout(() => {
                    const newItems =
                        commentsList.querySelectorAll(".comment-item.new");
                    newItems.forEach((item) => item.classList.remove("new"));
                }, 3000);
            }

            document.getElementById("filteredComments").textContent =
                allCommentsData.length;
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
}

// ===== STREAM CONNECTION =====
function connectStream() {
    const videoId = document.getElementById("selectedVideoId").value.trim();
    const errorContainer = document.getElementById("errorContainer");
    const refreshIndicator = document.getElementById("refreshIndicator");
    const refreshStatus = document.getElementById("refreshStatus");

    if (!videoId) {
        errorContainer.innerHTML =
            '<div class="error">⚠️ Vui lòng chọn Page và Video/Post trước!</div>';
        stopFetching();
        return;
    }

    const pageId = videoId.split("_")[0];
    const postId = videoId;

    const url = `/api/stream?pageid=${pageId}&postId=${postId}`;

    console.log("🌊 Connecting to stream...");
    refreshIndicator.classList.add("active");
    refreshStatus.innerHTML = '<span class="pulse"></span> Kết nối...';

    eventSource = new EventSource(url);

    eventSource.onopen = function () {
        console.log("✅ Stream connected!");
        refreshStatus.textContent = "🌊 Đang theo dõi (Stream)";
        refreshIndicator.classList.remove("active");
        errorContainer.innerHTML =
            '<div class="success" style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; border-radius: 4px; color: #2e7d32;">✅ Đã kết nối EventStream - Đang chờ comments mới...</div>';
        setTimeout(() => (errorContainer.innerHTML = ""), 3000);
    };

    eventSource.onmessage = function (event) {
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

            processComments(processData);
        } catch (error) {
            console.error("❌ Parse error:", error);
        }
    };

    eventSource.onerror = function (error) {
        console.error("❌ Stream error:", error);
        errorContainer.innerHTML =
            '<div class="error">❌ Lỗi kết nối stream. Đang thử kết nối lại...</div>';
        refreshStatus.textContent = "Lỗi stream";

        setTimeout(() => {
            if (eventSource && eventSource.readyState === EventSource.CLOSED) {
                console.log("🔄 Reconnecting...");
                connectStream();
            }
        }, 5000);
    };
}

// ===== POLLING =====
async function fetchComments() {
    const videoId = document.getElementById("selectedVideoId").value.trim();
    const errorContainer = document.getElementById("errorContainer");
    const refreshIndicator = document.getElementById("refreshIndicator");
    const refreshStatus = document.getElementById("refreshStatus");

    if (!videoId) {
        errorContainer.innerHTML =
            '<div class="error">⚠️ Vui lòng chọn Page và Video/Post trước!</div>';
        stopFetching();
        return;
    }

    const pageId = videoId.split("_")[0];
    const postId = videoId;

    refreshIndicator.classList.add("active");
    refreshStatus.innerHTML = '<span class="pulse"></span> Đang tải...';

    try {
        const url = `/api/comments?pageid=${pageId}&postId=${postId}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status} ${response.statusText}`,
            );
        }

        const data = await response.json();
        processComments(data);
        refreshStatus.textContent = "Đang theo dõi (Polling)...";
    } catch (error) {
        errorContainer.innerHTML = `<div class="error">❌ Lỗi: ${error.message}</div>`;
        refreshStatus.textContent = "Lỗi kết nối";
    } finally {
        refreshIndicator.classList.remove("active");
    }
}

// ===== START/STOP FUNCTIONS =====
async function startFetching() {
    connectionMode = document.getElementById("connectionMode").value;
    const videoId = document.getElementById("selectedVideoId").value.trim();

    if (!videoId) {
        alert("Vui lòng chọn Page và Video/Post trước!");
        return;
    }

    const postId = videoId;

    knownCommentIds.clear();
    isFirstLoad = true;
    document.getElementById("newComments").textContent = "0";

    document.getElementById("startBtn").disabled = true;
    document.getElementById("stopBtn").disabled = false;

    // Enable auto-start for next time
    lastSession.autoStart = true;
    saveLastSession();

    await fetchOrders(postId);

    if (connectionMode === "stream") {
        connectStream();
    } else {
        const interval =
            parseInt(document.getElementById("refreshInterval").value) || 10;

        if (interval < 5) {
            alert("Thời gian refresh tối thiểu là 5 giây!");
            return;
        }

        fetchComments();

        refreshInterval = setInterval(fetchComments, interval * 1000);
    }
}

function stopFetching() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
        console.log("🔌 Stream disconnected");
    }

    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }

    document.getElementById("startBtn").disabled = false;
    document.getElementById("stopBtn").disabled = true;

    document.getElementById("refreshStatus").textContent = "Đã dừng";
    
    // Disable auto-start
    lastSession.autoStart = false;
    saveLastSession();
}

function clearComments() {
    stopFetching();

    knownCommentIds.clear();
    isFirstLoad = true;

    allCommentsData = [];
    currentSearchTerm = "";
    const searchBox = document.getElementById("searchBox");
    if (searchBox) searchBox.value = "";
    const clearSearch = document.getElementById("clearSearch");
    if (clearSearch) clearSearch.classList.remove("show");
    const searchStats = document.getElementById("searchStats");
    if (searchStats) searchStats.classList.remove("show");

    ordersMap.clear();
    ordersFetched = false;

    document.getElementById("totalComments").textContent = "0";
    document.getElementById("newComments").textContent = "0";
    document.getElementById("filteredComments").textContent = "0";

    const commentsList = document.getElementById("commentsList");
    commentsList.innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">💬</div><p>Nhấn "Bắt Đầu" để xem comments real-time</p></div>';

    document.getElementById("errorContainer").innerHTML = "";

    document.getElementById("startBtn").disabled = false;
}

// ===== REFRESH ORDERS =====
async function refreshOrders() {
    const videoId = document.getElementById("selectedVideoId").value.trim();

    if (!videoId) {
        alert("Vui lòng chọn Video/Post trước!");
        return;
    }

    const postId = videoId;

    const errorContainer = document.getElementById("errorContainer");
    const refreshBtn = document.getElementById("refreshOrdersBtn");

    refreshBtn.disabled = true;
    refreshBtn.textContent = "⏳ Đang làm mới...";

    try {
        console.log("🔄 Force refreshing orders from API...");
        errorContainer.innerHTML =
            '<div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; border-radius: 4px; color: #1565c0;">🔄 Đang làm mới dữ liệu orders...</div>';

        const startTime = Date.now();

        const response = await fetch(
            `/api/orders-detail?postId=${postId}&forceRefresh=true`,
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        const fetchTime = Date.now() - startTime;

        ordersMap.clear();

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
                    ordersMap.set(commentId, orderInfo);
                    mappedCount++;
                }

                if (asUserId && !ordersMap.has(asUserId)) {
                    ordersMap.set(asUserId, orderInfo);
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

            if (allCommentsData.length > 0) {
                console.log("🔄 Re-rendering comments with updated orders...");

                allCommentsData.forEach((comment) => {
                    const orderInfo =
                        ordersMap.get(comment.id) ||
                        ordersMap.get(comment.from?.id) ||
                        null;
                    comment.orderInfo = orderInfo;
                });

                if (currentSearchTerm) {
                    filterAndDisplayComments(currentSearchTerm);
                } else {
                    renderAllComments();
                }
            }
        } else {
            throw new Error("No orders data received");
        }
    } catch (error) {
        console.error("❌ Error refreshing orders:", error);
        errorContainer.innerHTML = `<div class="error">❌ Lỗi làm mới orders: ${error.message}</div>`;
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = "🔄 Refresh Orders";
    }
}

// ===== PRINTER MANAGEMENT FUNCTIONS (for settings.html) =====
async function loadPrinters() {
    try {
        const response = await fetch('/api/settings/printers');
        const result = await response.json();
        
        if (result.success) {
            printers = result.data;
            renderPrinters();
            console.log('✅ Printers loaded from server');
        }
    } catch (error) {
        console.error('❌ Error loading printers:', error);
        showNotification('Lỗi tải danh sách máy in', 'error');
    }
}

async function savePrinters() {
    try {
        const response = await fetch('/api/settings/printers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(printers)
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderPrinters();
            console.log('✅ Printers saved to server');
        }
    } catch (error) {
        console.error('❌ Error saving printers:', error);
        showNotification('Lỗi lưu danh sách máy in', 'error');
    }
}

function renderPrinters() {
    const printerListDiv = document.getElementById("printerList");
    if (!printerListDiv) return;

    if (printers.length === 0) {
        printerListDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🖨️</div>
                <p>Chưa có máy in nào được thêm.</p>
            </div>
        `;
        return;
    }

    let html = "";
    printers.forEach((printer, index) => {
        const isActive = printer.isActive || false;
        html += `
            <div class="printer-item ${isActive ? 'active' : ''}">
                <div class="printer-info">
                    <div class="printer-header">
                        <span class="printer-name">
                            <i data-lucide="printer"></i> ${printer.name}
                        </span>
                        ${isActive ? '<span class="active-badge">Active</span>' : ''}
                    </div>
                    <div class="printer-details">
                        <span class="printer-ip"><i data-lucide="wifi"></i> ${printer.ipAddress}:${printer.port}</span>
                        <span class="printer-bridge"><i data-lucide="link"></i> ${printer.bridgeUrl}</span>
                    </div>
                </div>
                <div class="printer-actions">
                    ${!isActive ? `<button class="btn-set-active" onclick="setActivePrinter(${index})"><i data-lucide="check-circle"></i> Set Active</button>` : ''}
                    <button class="btn-test" onclick="testPrinterConnection(${index})"><i data-lucide="zap"></i> Test</button>
                    <button class="btn-delete" onclick="deletePrinter(${index})"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `;
    });
    printerListDiv.innerHTML = html;
    lucide.createIcons(); // Re-initialize icons for new elements
}

function addPrinter(name, ipAddress, port, bridgeUrl) {
    // Basic validation
    if (!name.trim() || !ipAddress.trim()) {
        showNotification("Tên máy in và IP không được để trống!", "error");
        return;
    }

    // Check for duplicate IP
    if (printers.some(p => p.ipAddress === ipAddress && p.port === port)) {
        showNotification("Máy in với IP và Port này đã tồn tại!", "error");
        return;
    }

    const newPrinter = {
        id: Date.now().toString(),
        name: name.trim(),
        ipAddress: ipAddress.trim(),
        port: parseInt(port) || 9100,
        bridgeUrl: bridgeUrl.trim() || 'http://localhost:3001',
        isActive: printers.length === 0, // First printer is active by default
        createdAt: new Date().toISOString()
    };

    printers.push(newPrinter);
    savePrinters();
    showNotification("Đã thêm máy in thành công!", "success");
}

function deletePrinter(index) {
    if (confirm("Bạn có chắc chắn muốn xóa máy in này?")) {
        printers.splice(index, 1);
        
        // If deleted printer was active, set first printer as active
        if (printers.length > 0 && !printers.some(p => p.isActive)) {
            printers[0].isActive = true;
        }
        
        savePrinters();
        showNotification("Đã xóa máy in.", "info");
    }
}

function setActivePrinter(index) {
    printers.forEach((p, i) => {
        p.isActive = (i === index);
    });
    savePrinters();
    showNotification("Đã đặt máy in active!", "success");
}

async function testPrinterConnection(index) {
    const printer = printers[index];
    showNotification("Đang kiểm tra kết nối...", "info");
    
    try {
        const response = await fetch(`${printer.bridgeUrl}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(`✅ Kết nối thành công! Server: ${data.service}`, "success");
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        showNotification(`❌ Không thể kết nối: ${error.message}`, "error");
    }
}

async function checkServerStatus() {
    const statusEl = document.getElementById("serverStatus");
    if (!statusEl) return;
    
    const bridgeUrl = document.getElementById("bridgeUrl")?.textContent || 'http://localhost:3001';
    
    try {
        const response = await fetch(`${bridgeUrl}/health`);
        serverOnline = response.ok;
        
        if (serverOnline) {
            statusEl.innerHTML = '<span class="status-dot online"></span><span class="status-text">Server Online</span>';
        } else {
            statusEl.innerHTML = '<span class="status-dot offline"></span><span class="status-text">Server Offline</span>';
        }
    } catch (error) {
        serverOnline = false;
        statusEl.innerHTML = '<span class="status-dot offline"></span><span class="status-text">Server Offline</span>';
    }
}

async function testPrint() {
    const activePrinter = printers.find(p => p.isActive);
    
    if (!activePrinter) {
        showNotification("⚠️ Chưa có máy in active! Vui lòng thêm và chọn máy in.", "error");
        return;
    }
    
    if (!serverOnline) {
        showNotification("❌ Server chưa chạy! Vui lòng chạy: node server.js", "error");
        return;
    }
    
    const testData = {
        sessionIndex: document.getElementById("testSessionIndex").value,
        phone: document.getElementById("testPhone").value,
        customerName: document.getElementById("testCustomerName").value,
        productCode: document.getElementById("testProductCode").value,
        productName: document.getElementById("testProductName").value,
        comment: document.getElementById("testComment").value,
        createdTime: new Date().toISOString()
    };
    
    const btn = document.getElementById("testPrintBtn");
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Đang in...';
    lucide.createIcons();
    
    try {
        const htmlContent = generateBillHTML(testData);
        
        const response = await fetch(`${activePrinter.bridgeUrl}/print/html`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                printerIp: activePrinter.ipAddress,
                printerPort: activePrinter.port,
                html: htmlContent,
                width: templateSettings.width,
                height: templateSettings.height === 'auto' ? null : templateSettings.height,
                threshold: templateSettings.threshold,
                scale: templateSettings.scale
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        showNotification("✅ In thành công!", "success");
        console.log("Print result:", result);
        
    } catch (error) {
        showNotification(`❌ Lỗi in: ${error.message}`, "error");
        console.error("Print error:", error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="printer"></i> Test In Bill';
        lucide.createIcons();
    }
}

function generateBillHTML(data) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    
    const fontWeight = templateSettings.bold ? '900' : 'normal';
    const fontStyle = templateSettings.italic ? 'italic' : 'normal';
    const textAlign = templateSettings.alignment;
    
    // Escape HTML to prevent encoding issues
    const escapeHtml = (text) => {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
    
    return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=${templateSettings.width}, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: ${templateSettings.width}px; margin: 0; padding: 0; background: white; }
                body { 
                    width: ${templateSettings.width}px;
                    min-width: ${templateSettings.width}px;
                    max-width: ${templateSettings.width}px;
                    margin: 0 auto;
                    padding: ${templateSettings.padding}px;
                    font-family: Arial, 'Segoe UI', Tahoma, 'DejaVu Sans', sans-serif; 
                    font-weight: ${fontWeight};
                    font-style: ${fontStyle};
                }
                .center { text-align: ${textAlign}; width: 100%; }
                .session { font-size: ${templateSettings.fonts.session}px; margin: ${templateSettings.lineSpacing}px 0; letter-spacing: 2px; text-shadow: 2px 2px 0px #000; }
                .phone { font-size: ${templateSettings.fonts.phone}px; margin: ${templateSettings.lineSpacing}px 0; }
                .customer { font-size: ${templateSettings.fonts.customer}px; margin: ${templateSettings.lineSpacing}px 0; }
                .product-code { font-size: ${templateSettings.fonts.product}px; margin: ${templateSettings.lineSpacing}px 0; }
                .product-name { font-size: ${templateSettings.fonts.product}px; margin: ${templateSettings.lineSpacing}px 0; line-height: 1.4; word-wrap: break-word; }
                .comment { font-size: ${templateSettings.fonts.comment}px; margin: ${templateSettings.lineSpacing}px 0; font-weight: ${fontWeight}; }
                .time { font-size: ${templateSettings.fonts.time}px; margin: ${templateSettings.lineSpacing * 1.5}px 0; }
                .separator { border-top: 3px dashed #000; margin: ${templateSettings.lineSpacing}px 0; }
                .thank-you { font-size: ${templateSettings.fonts.time}px; margin-top: ${templateSettings.lineSpacing}px; }
            </style>
        </head>
        <body>
            <div class="center session">#${escapeHtml(data.sessionIndex)}</div>
            ${data.phone ? `<div class="center phone">${escapeHtml(data.phone)}</div>` : ''}
            <div class="center customer">${escapeHtml(data.customerName)}</div>
            <div class="center product-code">${escapeHtml(data.productCode)}</div>
            <div class="center product-name">${escapeHtml(data.productName)}</div>
            ${data.comment ? `<div class="center comment">${escapeHtml(data.comment)}</div>` : ''}
            <div class="center time">${timeStr}</div>
            <div class="separator"></div>
            <div class="center thank-you">Cảm ơn quý khách!</div>
        </body>
        </html>
    `;
}

// ===== TEMPLATE SETTINGS FUNCTIONS =====
async function loadTemplateSettings() {
    try {
        const response = await fetch('/api/settings/template');
        const result = await response.json();
        
        if (result.success) {
            templateSettings = result.data;
            populateTemplateForm();
            console.log('✅ Template settings loaded from server');
        }
    } catch (error) {
        console.error('❌ Error loading template:', error);
        showNotification('Lỗi tải cài đặt template', 'error');
    }
}

function populateTemplateForm() {
    // Format settings
    document.getElementById('templateWidth').value = templateSettings.width;
    document.getElementById('templateHeight').value = templateSettings.height;
    document.getElementById('templateThreshold').value = templateSettings.threshold;
    document.getElementById('templateScale').value = templateSettings.scale;
    
    // Font sizes
    document.getElementById('fontSession').value = templateSettings.fonts.session;
    document.getElementById('fontPhone').value = templateSettings.fonts.phone;
    document.getElementById('fontCustomer').value = templateSettings.fonts.customer;
    document.getElementById('fontProduct').value = templateSettings.fonts.product;
    document.getElementById('fontComment').value = templateSettings.fonts.comment;
    document.getElementById('fontTime').value = templateSettings.fonts.time;
    
    // Alignment
    document.querySelectorAll('.align-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.align === templateSettings.alignment) {
            btn.classList.add('active');
        }
    });
    
    // Font style
    document.getElementById('fontBold').checked = templateSettings.bold;
    document.getElementById('fontItalic').checked = templateSettings.italic;
    
    // Spacing
    document.getElementById('templatePadding').value = templateSettings.padding;
    templateSettings.lineSpacing = parseInt(document.getElementById('templateLineSpacing').value) || 12;
}

async function saveTemplateSettings() {
    // Format settings
    templateSettings.width = parseInt(document.getElementById('templateWidth').value) || 1152;
    const heightValue = document.getElementById('templateHeight').value;
    templateSettings.height = heightValue === 'auto' ? 'auto' : parseInt(heightValue);
    templateSettings.threshold = parseInt(document.getElementById('templateThreshold').value) || 95;
    templateSettings.scale = parseInt(document.getElementById('templateScale').value) || 2;
    
    // Font sizes
    templateSettings.fonts.session = parseInt(document.getElementById('fontSession').value) || 72;
    templateSettings.fonts.phone = parseInt(document.getElementById('fontPhone').value) || 52;
    templateSettings.fonts.customer = parseInt(document.getElementById('fontCustomer').value) || 52;
    templateSettings.fonts.product = parseInt(document.getElementById('fontProduct').value) || 36;
    templateSettings.fonts.comment = parseInt(document.getElementById('fontComment').value) || 32;
    templateSettings.fonts.time = parseInt(document.getElementById('fontTime').value) || 28;
    
    // Font style
    templateSettings.bold = document.getElementById('fontBold').checked;
    templateSettings.italic = document.getElementById('fontItalic').checked;
    
    // Spacing
    templateSettings.padding = parseInt(document.getElementById('templatePadding').value) || 20;
    templateSettings.lineSpacing = parseInt(document.getElementById('templateLineSpacing').value) || 12;
    
    // Save to server
    try {
        const response = await fetch('/api/settings/template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templateSettings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Đã lưu cài đặt template!', 'success');
            console.log('Template settings saved:', templateSettings);
        }
    } catch (error) {
        console.error('❌ Error saving template:', error);
        showNotification('Lỗi lưu cài đặt template', 'error');
    }
}

async function resetTemplateSettings() {
    if (!confirm('Bạn có chắc chắn muốn đặt lại về mặc định?')) return;
    
    templateSettings = {
        width: 1152,
        height: 'auto',
        threshold: 95,
        scale: 2,
        fonts: {
            session: 72,
            phone: 52,
            customer: 52,
            product: 36,
            comment: 32,
            time: 28
        },
        alignment: 'center',
        bold: true,
        italic: false,
        padding: 20,
        lineSpacing: 12
    };
    
    // Save to server
    try {
        const response = await fetch('/api/settings/template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templateSettings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            populateTemplateForm();
            showNotification('✅ Đã đặt lại về mặc định!', 'success');
        }
    } catch (error) {
        console.error('❌ Error resetting template:', error);
        showNotification('Lỗi đặt lại cài đặt', 'error');
    }
}

function setAlignment(align) {
    templateSettings.alignment = align;
    document.querySelectorAll('.align-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.align === align) {
            btn.classList.add('active');
        }
    });
}

function previewTemplate() {
    const testData = {
        sessionIndex: '001',
        phone: '0901234567',
        customerName: 'Nguyễn Văn A',
        productCode: 'SP001',
        productName: 'Cà phê sữa đá',
        comment: 'Ít đường',
        createdTime: new Date().toISOString()
    };
    
    const htmlContent = generateBillHTML(testData);
    
    // Open in new window
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    previewWindow.document.write(htmlContent);
    previewWindow.document.close();
}

// ===== INITIALIZATION LOGIC (Handles different pages) =====
document.addEventListener("DOMContentLoaded", function () {
    // Initialize Lucide icons globally
    lucide.createIcons();

    // Check current page and initialize specific logic
    if (document.querySelector(".comments-container")) {
        // This is index.html
        initializeIndexPage();
    } else if (document.querySelector(".settings-container")) {
        // This is settings.html
        loadPrinters();
        loadTemplateSettings();
        checkServerStatus();
        
        // Check server status every 5 seconds
        setInterval(checkServerStatus, 5000);

        const addPrinterForm = document.getElementById("addPrinterForm");
        if (addPrinterForm) {
            addPrinterForm.addEventListener("submit", function (e) {
                e.preventDefault();
                const printerName = document.getElementById("printerName").value;
                const printerIp = document.getElementById("printerIp").value;
                const printerPort = document.getElementById("printerPort").value;
                const printerBridge = document.getElementById("printerBridge").value;
                addPrinter(printerName, printerIp, printerPort, printerBridge);
                addPrinterForm.reset(); // Clear form fields
            });
        }

        // Handle tab switching
        const tabButtons = document.querySelectorAll(".tabs-nav .tab-button");
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                const tabId = button.dataset.tab;

                // Remove active from all buttons and content
                tabButtons.forEach(btn => btn.classList.remove("active"));
                document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

                // Add active to clicked button and corresponding content
                button.classList.add("active");
                document.getElementById(tabId).classList.add("active");
                lucide.createIcons(); // Re-initialize icons for newly active tab content
            });
        });
    }
});