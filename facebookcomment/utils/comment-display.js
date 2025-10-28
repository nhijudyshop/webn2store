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
        `(${searchTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")})`,
        "gi",
    );
    return String(text).replace(regex, '<span class="highlight">$1</span>');
}

// Safe attribute escaping for onclick parameters
function escapeAttr(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Builds common visual blocks used by both render functions.
 */
function buildAvatarBlock(comment, name, orderInfo) {
    let avatarHTML = "";
    const userId = comment.from?.id;
    const avatarUrl = comment.from?.picture?.data?.url;

    if (avatarUrl) {
        avatarHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    } else if (userId) {
        avatarHTML = `<img src="/api/avatar/${userId}?size=60" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    }

    const avatarBadge = orderInfo && orderInfo.sessionIndex !== undefined && orderInfo.sessionIndex !== null
        ? `<div class="avatar-badge">${orderInfo.sessionIndex}</div>`
        : '';

    return `
        <div class="avatar">
            ${avatarHTML}
            <div class="avatar-fallback" style="${avatarUrl || userId ? 'display: none;' : ''}">${getInitials(name)}</div>
            ${avatarBadge}
        </div>
    `;
}

function buildIconsRow() {
    return `
        <div class="comment-icons">
            <i data-lucide="phone" class="comment-icon"></i>
            <i data-lucide="message-circle" class="comment-icon messenger"></i>
        </div>
    `;
}

function buildSessionPhoneBadge(orderInfo) {
    if (!orderInfo) return '';
    const parts = [];
    if (orderInfo.sessionIndex !== undefined && orderInfo.sessionIndex !== null) {
        parts.push(`#${orderInfo.sessionIndex}.`);
    }
    if (orderInfo.telephone) {
        parts.push(orderInfo.telephone);
    }
    if (parts.length === 0) return '';
    return `
        <div class="comment-badges">
            <span class="session-phone-badge">${parts.join(' ')}</span>
        </div>
    `;
}

function mapStatus(orderInfo) {
    const raw = (orderInfo && (orderInfo.status || orderInfo.partnerStatus)) || 'normal';
    const key = String(raw).toLowerCase();
    if (key.includes('black')) return { label: 'Blacklist', cls: 'blacklist' };
    if (key.includes('vip')) return { label: 'VIP', cls: 'vip' };
    if (key.includes('warn') || key.includes('alert') || key.includes('cảnh')) return { label: 'Cảnh báo', cls: 'warning' };
    return { label: 'Bình thường', cls: '' };
}

function buildActionsRow(comment, name, message, time, orderInfo) {
    const userId = comment.from?.id || '';
    const commentId = comment.id || '';
    const status = mapStatus(orderInfo);

    const safeName = escapeAttr(name);
    const safeMessage = escapeAttr(message);
    const safeTime = escapeAttr(time);
    const safeUserId = escapeAttr(userId);
    const safeCommentId = escapeAttr(commentId);

    return `
        <div class="comment-actions">
            <button class="action-btn action-create-order" onclick="handleCreateOrder('${safeCommentId}','${safeName}','${safeMessage}','${safeTime}','${safeUserId}')">Tạo đơn hàng</button>
            <button class="action-btn action-info" onclick="handleViewInfo('${safeUserId}')">Thông tin</button>
            <button class="action-btn action-status ${status.cls}">${status.label}</button>
        </div>
    `;
}

/**
 * Creates the HTML element for a single comment.
 * Khớp ảnh: 
 *   - Dòng 1: tên đậm + nội dung inline
 *   - Dòng 2: icon điện thoại + messenger
 *   - Dòng 3: badge xám "#<session>. <phone>"
 *   - Dòng 4: các nút hành động
 */
export function createCommentElement(comment, isNew = false, appState) {
    const name = comment.from?.name || "Unknown";
    const message = comment.message || "";
    const time = comment.created_time;
    const userId = comment.from?.id;
    const commentId = comment.id;

    // Order info resolution
    let orderInfo = null;
    if (commentId && appState.ordersMap.has(commentId)) {
        orderInfo = appState.ordersMap.get(commentId);
    } else if (userId && appState.ordersMap.has(userId)) {
        orderInfo = appState.ordersMap.get(userId);
    }

    const avatarBlockHTML = buildAvatarBlock(comment, name, orderInfo);
    const iconsRow = buildIconsRow();
    const sessionPhoneBadge = buildSessionPhoneBadge(orderInfo);
    const actionsRow = buildActionsRow(comment, name, message, time, orderInfo);

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
                ${iconsRow}
                ${sessionPhoneBadge}
                ${actionsRow}
            </div>
        </div>
    `;
}

/**
 * Creates the HTML element for a single comment with search term highlighting.
 */
export function createCommentElementWithHighlight(comment, searchTerm, isNew = false, appState) {
    const name = comment.from?.name || "Unknown";
    const message = comment.message || "";
    const time = comment.created_time;
    const userId = comment.from?.id;
    const commentId = comment.id;

    const highlightedName = highlightText(name, searchTerm);
    const highlightedMessage = highlightText(message, searchTerm);

    // Order info
    let orderInfo = null;
    if (commentId && appState.ordersMap.has(commentId)) {
        orderInfo = appState.ordersMap.get(commentId);
    } else if (userId && appState.ordersMap.has(userId)) {
        orderInfo = appState.ordersMap.get(userId);
    }

    const avatarBlockHTML = buildAvatarBlock(comment, name, orderInfo);

    // Build session + phone badge with highlights
    let sessionPhoneBadge = '';
    if (orderInfo) {
        const parts = [];
        if (orderInfo.sessionIndex !== undefined && orderInfo.sessionIndex !== null) {
            parts.push(`#${highlightText(String(orderInfo.sessionIndex), searchTerm)}.`);
        }
        if (orderInfo.telephone) {
            parts.push(highlightText(orderInfo.telephone, searchTerm));
        }
        if (parts.length) {
            sessionPhoneBadge = `
                <div class="comment-badges">
                    <span class="session-phone-badge">${parts.join(' ')}</span>
                </div>
            `;
        }
    }

    const actionsRow = buildActionsRow(comment, name, message, time, orderInfo);
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
                ${buildIconsRow()}
                ${sessionPhoneBadge}
                ${actionsRow}
            </div>
        </div>
    `;
}

/**
 * Renders all comments currently in appState.allCommentsData.
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