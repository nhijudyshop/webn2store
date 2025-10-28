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

    const day = String(gmt7Time.getUTCDate()).padStart(2, "0");
    const month = String(gmt7Time.getUTCMonth() + 1).padStart(2, "0");
    const year = gmt7Time.getUTCFullYear();

    return `${day}/${month}/${year} ${hours}:${minutes}`;
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

    // Check if user has order
    let orderInfo = null;
    if (commentId && appState.ordersMap.has(commentId)) {
        orderInfo = appState.ordersMap.get(commentId);
    } else if (userId && appState.ordersMap.has(userId)) {
        orderInfo = appState.ordersMap.get(userId);
    }

    // Avatar with badge
    let avatarHTML = "";
    const avatarUrl = comment.from?.picture?.data?.url;
    
    if (avatarUrl) {
        avatarHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    } else if (userId) {
        avatarHTML = `<img src="/api/avatar/${userId}?size=60" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    }
    
    const avatarBadge = orderInfo ? `<div class="avatar-badge">${orderInfo.sessionIndex}</div>` : '';
    
    const avatarBlockHTML = `
        <div class="avatar">
            ${avatarHTML}
            <div class="avatar-fallback" style="${avatarUrl || userId ? 'display: none;' : ''}">${getInitials(name)}</div>
            ${avatarBadge}
        </div>
    `;

    // Icons (phone and messenger)
    const iconsHTML = `
        <div class="comment-icons">
            <i data-lucide="phone" class="comment-icon"></i>
            <i data-lucide="message-circle" class="comment-icon messenger"></i>
        </div>
    `;

    // Session and phone badge
    let sessionPhoneBadge = '';
    if (orderInfo) {
        const phone = orderInfo.telephone || 'N/A';
        sessionPhoneBadge = `
            <div class="comment-badges">
                <span class="session-phone-badge">#${orderInfo.sessionIndex}. ${phone}</span>
            </div>
        `;
    }

    // Customer details (address, partner name, etc.)
    let customerDetailsHTML = '';
    if (orderInfo) {
        const details = [];

        if (orderInfo.printCount) {
            details.push(`
                <div class="customer-detail-item" style="border-left-color: #10b981; background: #d1fae5;">
                    <span class="icon">🛒</span>
                    <span class="value" style="color: #047857;">${orderInfo.printCount}</span>
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

        if (details.length > 0) {
            customerDetailsHTML = `<div class="comment-badges">${details.join('')}</div>`;
        }
    }

    // Status badge (Bình thường, VIP, Blacklist)
    let statusBadge = 'Bình thường';
    let statusClass = 'normal';
    if (orderInfo && orderInfo.partnerStatus) {
        const status = orderInfo.partnerStatus.toLowerCase();
        if (status === 'vip') {
            statusBadge = 'VIP';
            statusClass = 'vip';
        } else if (status === 'blacklist') {
            statusBadge = 'Blacklist';
            statusClass = 'blacklist';
        }
    }

    // Action buttons with text
    const actionsHTML = `
        <div class="comment-actions">
            <button class="action-btn action-create-order" onclick="window.handleCreateOrder('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}', '${userId || ""}')">
                Tạo đơn hàng
            </button>
            <button class="action-btn action-info" onclick="window.handleViewInfo('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}')">
                Thông tin
            </button>
            <button class="action-btn action-message">
                Tin nhắn
                <i data-lucide="chevron-down"></i>
            </button>
            <button class="action-btn action-status ${statusClass}">
                ${statusBadge}
            </button>
        </div>
    `;

    const newClass = isNew ? "new" : "";

    return `
        <div class="comment-item ${newClass}">
            ${avatarBlockHTML}
            <div class="comment-content">
                <div class="comment-time">${time ? formatTimeToGMT7(time) : ""}</div>
                <div class="comment-header">
                    <span class="comment-author">${name}</span>
                    <span class="comment-message-inline">${message}</span>
                </div>
                ${iconsHTML}
                ${sessionPhoneBadge}
                ${customerDetailsHTML}
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

    // Check if user has order
    let orderInfo = null;
    if (commentId && appState.ordersMap.has(commentId)) {
        orderInfo = appState.ordersMap.get(commentId);
    } else if (userId && appState.ordersMap.has(userId)) {
        orderInfo = appState.ordersMap.get(userId);
    }

    // Avatar with badge
    let avatarHTML = "";
    const avatarUrl = comment.from?.picture?.data?.url;
    
    if (avatarUrl) {
        avatarHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    } else if (userId) {
        avatarHTML = `<img src="/api/avatar/${userId}?size=60" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    }
    
    const avatarBadge = orderInfo ? `<div class="avatar-badge">${highlightText(String(orderInfo.sessionIndex), searchTerm)}</div>` : '';
    
    const avatarBlockHTML = `
        <div class="avatar">
            ${avatarHTML}
            <div class="avatar-fallback" style="${avatarUrl || userId ? 'display: none;' : ''}">${getInitials(name)}</div>
            ${avatarBadge}
        </div>
    `;

    // Icons (phone and messenger)
    const iconsHTML = `
        <div class="comment-icons">
            <i data-lucide="phone" class="comment-icon"></i>
            <i data-lucide="message-circle" class="comment-icon messenger"></i>
        </div>
    `;

    // Session and phone badge
    let sessionPhoneBadge = '';
    if (orderInfo) {
        const phone = orderInfo.telephone || 'N/A';
        const highlightedPhone = highlightText(phone, searchTerm);
        const highlightedSession = highlightText(String(orderInfo.sessionIndex), searchTerm);
        sessionPhoneBadge = `
            <div class="comment-badges">
                <span class="session-phone-badge">#${highlightedSession}. ${highlightedPhone}</span>
            </div>
        `;
    }

    // Customer details (address, partner name, etc.)
    let customerDetailsHTML = '';
    if (orderInfo) {
        const details = [];

        if (orderInfo.printCount) {
            details.push(`
                <div class="customer-detail-item" style="border-left-color: #10b981; background: #d1fae5;">
                    <span class="icon">🛒</span>
                    <span class="value" style="color: #047857;">${orderInfo.printCount}</span>
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
            customerDetailsHTML = `<div class="comment-badges">${details.join('')}</div>`;
        }
    }

    // Status badge (Bình thường, VIP, Blacklist)
    let statusBadge = 'Bình thường';
    let statusClass = 'normal';
    if (orderInfo && orderInfo.partnerStatus) {
        const status = orderInfo.partnerStatus.toLowerCase();
        if (status === 'vip') {
            statusBadge = 'VIP';
            statusClass = 'vip';
        } else if (status === 'blacklist') {
            statusBadge = 'Blacklist';
            statusClass = 'blacklist';
        }
    }

    // Action buttons with text
    const actionsHTML = `
        <div class="comment-actions">
            <button class="action-btn action-create-order" onclick="window.handleCreateOrder('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}', '${userId || ""}')">
                Tạo đơn hàng
            </button>
            <button class="action-btn action-info" onclick="window.handleViewInfo('${commentId}', '${name.replace(/'/g, "\\'")}', '${message.replace(/'/g, "\\'")}', '${time || ""}')">
                Thông tin
            </button>
            <button class="action-btn action-message">
                Tin nhắn
                <i data-lucide="chevron-down"></i>
            </button>
            <button class="action-btn action-status ${statusClass}">
                ${statusBadge}
            </button>
        </div>
    `;

    const newClass = isNew ? "new" : "";

    return `
        <div class="comment-item ${newClass}">
            ${avatarBlockHTML}
            <div class="comment-content">
                <div class="comment-time">${time ? formatTimeToGMT7(time) : ""}</div>
                <div class="comment-header">
                    <span class="comment-author">${highlightedName}</span>
                    <span class="comment-message-inline">${highlightedMessage}</span>
                </div>
                ${iconsHTML}
                ${sessionPhoneBadge}
                ${customerDetailsHTML}
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