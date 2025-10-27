// facebookcomment/utils/settings/token-management.js

import { saveToken } from '../../../shared/api/tpos-api.js'; // Import saveToken directly

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
    saveToken(null, inputId); // Use imported saveToken directly
}

/**
 * Loads TPOS account credentials from the server and populates the form.
 */
export async function loadTposAccount() {
    try {
        const response = await fetch('/api/tpos-account');
        const result = await response.json();
        if (result.success) {
            document.getElementById('tposUsername').value = result.data.username || '';
            document.getElementById('tposPassword').value = result.data.password || '';
        }
    } catch (error) {
        console.error('Error loading TPOS account:', error);
    }
}

/**
 * Saves TPOS account credentials to the server.
 */
async function saveTposAccount() {
    const username = document.getElementById('tposUsername').value;
    const password = document.getElementById('tposPassword').value;
    try {
        await fetch('/api/tpos-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    } catch (error) {
        console.error('Error saving TPOS account:', error);
    }
}

/**
 * Logs into TPOS using saved credentials, gets a new token, and saves it.
 */
export async function loginAndSaveToken() {
    const btn = document.getElementById('loginTposBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Đang đăng nhập...';
    window.lucide.createIcons();

    try {
        // 1. Save the credentials to the server first
        await saveTposAccount();

        // 2. Ask our server to perform the login
        const response = await fetch('/api/tpos-login', { method: 'POST' });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Đăng nhập thất bại');
        }

        // 3. If successful, save the new token
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
        btn.innerHTML = '<i data-lucide="log-in"></i> Đăng nhập & Lấy Token';
        window.lucide.createIcons();
    }
}