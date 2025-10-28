// facebookcomment/utils/comment-display.js
import { normalizeVietnamese } from '../../shared/utils/text-utils.js';
import { ensureCustomerStatusesForComments } from './customer-status-manager.js';

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
    const hasSession = orderInfo.sessionIndex !== undefined && orderInfo.sessionIndex !== null;
    if (!hasSession) return '';
    return `
        <div class="comment-badges">
            <span class="session-phone-badge">#${orderInfo.sessionIndex}.</span>
        </div>
    `;
}

function normalizeVNPhone(raw = "") {
    const digits = String(raw).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("84")) {
        const tail = digits.slice(2);
        if (tail.length === 9 || tail.length === 10) return "0" + tail;
    }
    if (digits.startsWith("0") && (digits.length === 10 || digits.length === 11)) {
        return digits;
    }
    return "";
}

function extractPhonesFromText(text = "") {
    if (!text) return [];
    const set = new Set();
    const candidates = String(text).match(/(\+?84|84|0)[\d\.\-\s\(\)]{8,20}/g) || [];
    const compact = String(text).match(/0\d{9,10}/g) || [];
    [...candidates, ...compact].forEach(raw => {
        const n = normalizeVNPhone(raw);
        if (n) set.add(n);
    });
    return Array.from(set);
}

function resolveStatusByPhone(message, appState) {
    const phones = extractPhonesFromText(message);
    for (const p of phones) {
        const rec = appState?.customersMap?.get?.(p);
        if (rec && rec.StatusText) {
            return { label: rec.StatusText, cls: '' };
        }
    }
    return { label: 'Bình thường', cls: '' };
}

function buildActionsRow(comment, name, message, time, orderInfo) {
    // REMOVED: không còn hiển thị nút hành động ở hàng dưới
    return '';
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

    // giữ session badge từ ordersMap nếu có, nhưng trạng thái chuyển qua theo phone
    let orderInfo = null;
    if (commentId && appState.ordersMap.has(commentId)) {
        orderInfo = appState.ordersMap.get(commentId);
    } else if (userId && appState.ordersMap.has(userId)) {
        orderInfo = appState.ordersMap.get(userId);
    }

    const status = resolveStatusByPhone(message, appState);
    const avatarBlockHTML = buildAvatarBlock(comment, name, orderInfo);
    const newClass = isNew ? "new" : "";
    const phones = extractPhonesFromText(message).join(',');

    return `
        <div class="comment-item ${newClass}" data-comment-id="${commentId}" data-phones="${phones}">
            ${avatarBlockHTML}
            <div class="comment-content">
                <div class="comment-meta">
                    <div class="comment-time">${time ? formatTimeToGMT7(time) : ""}</div>
                    <div class="status-badge ${status.cls}">${status.label}</div>
                </div>
                <div class="comment-header">
                    <span class="comment-author">${name}</span>
                    <span class="comment-message-inline">${message}</span>
                </div>
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

    let orderInfo = null;
    if (commentId && appState.ordersMap.has(commentId)) {
        orderInfo = appState.ordersMap.get(commentId);
    } else if (userId && appState.ordersMap.has(userId)) {
        orderInfo = appState.ordersMap.get(userId);
    }
    const status = resolveStatusByPhone(message, appState);
    const avatarBlockHTML = buildAvatarBlock(comment, name, orderInfo);
    const newClass = isNew ? "new" : "";
    const phones = extractPhonesFromText(message).join(',');

    return `
        <div class="comment-item ${newClass}" data-comment-id="${commentId}" data-phones="${phones}">
            ${avatarBlockHTML}
            <div class="comment-content">
                <div class="comment-meta">
                    <div class="comment-time">${time ? formatTimeToGMT7(time) : ""}</div>
                    <div class="status-badge ${status.cls}">${status.label}</div>
                </div>
                <div class="comment-header">
                    <span class="comment-author">${highlightedName}</span>
                    <span class="comment-message-inline">${highlightedMessage}</span>
                </div>
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
        window.lucide?.createIcons?.();
        // Đồng bộ độ rộng của status theo thời gian
        requestAnimationFrame(syncStatusWidths);
        // Sau khi render, đảm bảo lấy trạng thái cho TẤT CẢ comments đang hiển thị
        ensureCustomerStatusesForComments(appState.allCommentsData, appState);
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

// Đồng bộ chiều rộng status theo chiều rộng text thời gian
function syncStatusWidths() {
    const metas = document.querySelectorAll('.comment-item .comment-meta');
    metas.forEach(meta => {
        const timeEl = meta.querySelector('.comment-time');
        const statusEl = meta.querySelector('.status-badge');
        if (!timeEl || !statusEl) return;
        // Reset để đo chính xác
        statusEl.style.width = 'auto';
        // Dùng requestAnimationFrame để đảm bảo DOM đã layout xong
        const width = timeEl.offsetWidth;
        if (width > 0) {
            statusEl.style.width = width + 'px';
        }
    });
}