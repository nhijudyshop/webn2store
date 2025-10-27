// facebookcomment/utils/settings/token-management.js

import { saveToken } from '../../../shared/api/tpos-api.js';

let tposAccounts = [];

/**
 * Renders the list of TPOS accounts in the UI.
 */
function renderTposAccounts() {
    const listDiv = document.getElementById("tposAccountList");
    if (!listDiv) return;

    if (tposAccounts.length === 0) {
        listDiv.innerHTML = `<div class="empty-state"><p>Chưa có tài khoản nào.</p></div>`;
        return;
    }

    listDiv.innerHTML = tposAccounts.map(acc => `
        <div class="printer-item ${acc.isActive ? 'active' : ''}">
            <div class="printer-info">
                <div class="printer-header">
                    <span class="printer-name">
                        <i data-lucide="user-check"></i> ${acc.username}
                    </span>
                    ${acc.isActive ? '<span class="active-badge">Active</span>' : ''}
                </div>
                <div class="printer-details">
                    <span class="printer-bridge"><i data-lucide="lock"></i> Mật khẩu: ******</span>
                </div>
            </div>
            <div class="printer-actions">
                ${!acc.isActive ? `<button class="btn-set-active" onclick="setActiveTposAccount(${acc.id})"><i data-lucide="check-circle"></i> Set Active</button>` : ''}
                <button class="btn-delete" onclick="deleteTposAccount(${acc.id})"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
    `).join('');
    window.lucide.createIcons();
}

/**
 * Saves the entire list of TPOS accounts to the server.
 */
async function saveTposAccounts() {
    try {
        const response = await fetch('/api/tpos-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tposAccounts)
        });
        const result = await response.json();
        if (result.success) {
            renderTposAccounts(); // Re-render after saving
        } else {
            window.showNotification('Lỗi lưu tài khoản', 'error');
        }
    } catch (error) {
        console.error('Error saving TPOS accounts:', error);
        window.showNotification('Lỗi kết nối khi lưu tài khoản', 'error');
    }
}

/**
 * Adds a new TPOS account from the form inputs.
 */
export function addTposAccount() {
    const usernameInput = document.getElementById('tposUsername');
    const passwordInput = document.getElementById('tposPassword');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        window.showNotification('Vui lòng nhập cả username và password', 'error');
        return;
    }

    if (tposAccounts.some(acc => acc.username === username)) {
        window.showNotification('Tài khoản này đã tồn tại', 'warning');
        return;
    }

    const newAccount = {
        id: Date.now(),
        username,
        password,
        isActive: tposAccounts.length === 0 // First account is active by default
    };

    tposAccounts.push(newAccount);
    saveTposAccounts();
    
    usernameInput.value = '';
    passwordInput.value = '';
    window.showNotification('Đã thêm tài khoản thành công!', 'success');
}

/**
 * Deletes a TPOS account by its ID.
 * @param {number} id - The ID of the account to delete.
 */
export function deleteTposAccount(id) {
    if (!confirm('Bạn có chắc muốn xóa tài khoản này?')) return;

    tposAccounts = tposAccounts.filter(acc => acc.id !== id);

    // If the deleted account was active, make the first one active
    if (tposAccounts.length > 0 && !tposAccounts.some(acc => acc.isActive)) {
        tposAccounts[0].isActive = true;
    }

    saveTposAccounts();
    window.showNotification('Đã xóa tài khoản', 'info');
}

/**
 * Sets a TPOS account as active by its ID.
 * @param {number} id - The ID of the account to set as active.
 */
export function setActiveTposAccount(id) {
    tposAccounts.forEach(acc => {
        acc.isActive = (acc.id === id);
    });
    saveTposAccounts();
    window.showNotification('Đã đặt tài khoản active!', 'success');
}

/**
 * Toggles the visibility of the Bearer Token input field.
 */
export function toggleTokenVisibilitySettings() {
    const input = document.getElementById("bearerTokenSettings");
    const icon = document.getElementById("eyeIconSettings");

    if (input.type === "password") {
        input.type = "text";
        icon.setAttribute("data-lucide", "eye-off");
    } else {
        input.type = "password";
        icon.setAttribute("data-lucide", "eye");
    }
    window.lucide.createIcons();
}

/**
 * Saves the Bearer Token from the settings page input.
 * @param {string} inputId - The ID of the input field containing the token.
 */
export function saveTokenSettings(inputId = 'bearerTokenSettings') {
    saveToken(null, inputId);
}

/**
 * Loads TPOS account credentials from the server and populates the list.
 */
export async function loadTposAccount() {
    try {
        const response = await fetch('/api/tpos-account');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            tposAccounts = result.data;
            renderTposAccounts();
        }
    } catch (error) {
        console.error('Error loading TPOS accounts:', error);
    }
}

/**
 * Logs into TPOS using the active account, gets a new token, and saves it.
 */
export async function loginAndSaveToken() {
    const btn = document.getElementById('loginTposBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Đang đăng nhập...';
    window.lucide.createIcons();

    try {
        const response = await fetch('/api/tpos-login', { method: 'POST' });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Đăng nhập thất bại');
        }

        const accessToken = result.data.access_token;
        if (accessToken) {
            saveToken(accessToken, 'bearerTokenSettings');
            window.showNotification('✅ Đăng nhập và lưu token thành công!', 'success');
        } else {
            throw new Error('Không nhận được access token từ TPOS.');
        }

    } catch (error) {
        console.error('TPOS login failed:', error);
        window.showNotification(`❌ Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="log-in"></i> Đăng nhập & Lấy Token (từ tài khoản Active)';
        window.lucide.createIcons();
    }
}