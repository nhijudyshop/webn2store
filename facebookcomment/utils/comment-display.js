// facebookcomment/utils/comment-display.js
import { normalizeVietnamese } from '../../shared/utils/text-utils.js';

/**
 * Gets the initials from a given name.
 * @param {string} name - The full name.
 * @returns {string} The initials (e.g., "NV" for "Nguyen Van A").
 */
export function getInitials(name) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}

/**
 * Formats an ISO date string to GMT+7 time.
 * @param {string} isoString - The ISO date string.
 * @returns {string} The formatted date and time.
 */
export function formatTimeToGMT7(isoString) {
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

/**
 * Highlights a search term within a text.
 * @param {string} text - The original text.
 * @param {string} searchTerm - The term to highlight.
 * @returns {string} The text with the search term highlighted.
 */
export function highlightText(text, searchTerm) {
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

/**
 * Creates the HTML element for a single comment.
 * @param {object} comment - The comment data.
 * @param {boolean} isNew - Whether the comment is new (for animation).
 * @param {object} appState - The global application state object.
 * @returns {string} The HTML string for the comment.
 */
export function createCommentElement(comment, isNew = false, appState) {
    const name = comment.from?.name || "Unknown";
    const message = comment.message || "(No message)";
    const time = comment.created_time;
    const userId = comment.from?.id;
    const commentId = comment.id;

    let avatarBlockHTML = '';
    if (appState.connectionMode !== 'polling') { // Only show avatar if not in polling mode
        let avatarHTML = "";
        const avatarUrl = comment.from?.picture?.data?.url;

        if (avatarUrl) {
            avatarHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-fallback\\'>${getInitials(name)}</div>';">`;
        } else if (userId) {
            avatarHTML = `<img src="/api/avatar/${userId}?size=50" alt="${name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-fallback\\'>${getInitials(name)}</div>';">`;
        } else {
            avatarHTML = `<div class="avatar-fallback">${getInitials(name)}</div>`;
        }
        avatarBlockHTML = `<div class="avatar">${avatarHTML}</div>`;
    }

    // Check if user has order
    let orderHTML = "";
    let nameClass = "";
    let orderInfo = null;
    let inlineCustomerDetails = ""; // New variable for inline details

    if (commentId && appState.ordersMap.has(commentId)) {
        orderInfo = appState.ordersMap.get(commentId);
    } else if (userId && appState.ordersMap.has(userId)) {
        orderInfo = appState.ordersMap.get(userId);
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

        // Always display phone number if orderInfo exists, with N/A fallback
        if (orderInfo.telephone !== undefined) {
            const displayPhone = orderInfo.telephone ? orderInfo.telephone : 'N/A';
            details.push(`
                <div class="customer-detail-item">
                    <span class="icon">📱</span>
                    <span class="value phone-value">${displayPhone}</span>
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
        
        // Add PartnerStatus badge
        if (orderInfo.partnerStatus) {
            const statusClass = orderInfo.partnerStatus.toLowerCase(); // e.g., "vip", "normal", "blacklist"
            details.push(`
                <div class="customer-detail-item status-badge status-${statusClass}">
                    <span class="icon">⭐</span>
                    <span class="value">${orderInfo.partnerStatus}</span>
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
            <button class="action-btn action-create-order" onclick="window.handleCreateOrder('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}', '${userId || ""}')" title="Tạo đơn hàng">
                <i data-lucide="shopping-cart"></i>
            </button>
            <button class="action-btn action-info" onclick="window.handleViewInfo('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}')" title="Thông tin">
                <i data-lucide="info"></i>
            </button>
        </div>
    `;

    const newClass = isNew ? "new" : "";

    return `
        <div class="comment-item ${newClass}">
            ${avatarBlockHTML}
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

/**
 * Creates the HTML element for a single comment with search term highlighting.
 * @param {object} comment - The comment data.
 * @param {string} searchTerm - The search term to highlight.
 * @param {boolean} isNew - Whether the comment is new (for animation).
 * @param {object} appState - The global application state object.
 * @returns {string} The HTML string for the highlighted comment.
 */
export function createCommentElementWithHighlight(comment, searchTerm, isNew = false, appState) {
    const name = comment.from?.name || "Unknown";
    const message = comment.message || "(No message)";
    const time = comment.created_time;
    const userId = comment.from?.id;
    const commentId = comment.id;

    const highlightedName = highlightText(name, searchTerm);
    const highlightedMessage = highlightText(message, searchTerm);

    let avatarBlockHTML = '';
    if (appState.connectionMode !== 'polling') { // Only show avatar if not in polling mode
        let avatarHTML = "";
        const avatarUrl = comment.from?.picture?.data?.url;

        if (avatarUrl) {
            avatarHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-fallback\\'>${getInitials(name)}</div>';">`;
        } else if (userId) {
            avatarHTML = `<img src="/api/avatar/${userId}?size=50" alt="${name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-fallback\\'>${getInitials(name)}</div>';">`;
        } else {
            avatarHTML = `<div class="avatar-fallback">${getInitials(name)}</div>`;
        }
        avatarBlockHTML = `<div class="avatar">${avatarHTML}</div>`;
    }

    let orderHTML = "";
    let nameClass = "";
    let orderInfo = null;
    let inlineCustomerDetails = ""; // New variable for inline details

    if (commentId && appState.ordersMap.has(commentId)) {
        orderInfo = appState.ordersMap.get(commentId);
    } else if (userId && appState.ordersMap.has(userId)) {
        orderInfo = appState.ordersMap.get(userId);
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

        // Always display phone number if orderInfo exists, with N/A fallback
        if (orderInfo.telephone !== undefined) {
            const displayPhone = orderInfo.telephone ? orderInfo.telephone : 'N/A';
            details.push(`
                <div class="customer-detail-item">
                    <span class="icon">📱</span>
                    <span class="value phone-value">${highlightText(displayPhone, searchTerm)}</span>
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

        // Add PartnerStatus badge
        if (orderInfo.partnerStatus) {
            const statusClass = orderInfo.partnerStatus.toLowerCase(); // e.g., "vip", "normal", "blacklist"
            details.push(`
                <div class="customer-detail-item status-badge status-${statusClass}">
                    <span class="icon">⭐</span>
                    <span class="value">${highlightText(orderInfo.partnerStatus, searchTerm)}</span>
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
            <button class="action-btn action-create-order" onclick="window.handleCreateOrder('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}', '${userId || ""}')" title="Tạo đơn hàng">
                <i data-lucide="shopping-cart"></i>
            </button>
            <button class="action-btn action-info" onclick="window.handleViewInfo('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}')" title="Thông tin">
                <i data-lucide="info"></i>
            </button>
        </div>
    `;

    const newClass = isNew ? "new" : "";

    return `
        <div class="comment-item ${newClass}">
            ${avatarBlockHTML}
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

/**
 * Renders all comments currently in appState.allCommentsData.
 * @param {object} appState - The global application state object.
 * @param {function} renderPaginationControls - Function to render pagination controls.
 */
export function renderAllComments(appState, renderPaginationControls) {
    const commentsList = document.getElementById("commentsList");

    if (appState.allCommentsData.length === 0) {
        commentsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>Chưa có comment nào</p>
            </div>
        `;
    } else {
        let html = "";
        appState.allCommentsData.forEach((comment) => {
            html += createCommentElement(comment, false, appState);
        });
        commentsList.innerHTML = html;
        // Re-initialize icons after rendering
        window.lucide.createIcons();
    }

    document.getElementById("filteredComments").textContent =
        appState.allCommentsData.length;
    
    // Show pagination if in polling mode and not searching
    if (appState.connectionMode === "polling" && !appState.currentSearchTerm) {
        document.getElementById("paginationControls").style.display = "flex";
    } else {
        document.getElementById("paginationControls").style.display = "none";
    }
    renderPaginationControls(appState);
}