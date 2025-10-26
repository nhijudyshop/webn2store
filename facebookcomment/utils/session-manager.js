// facebookcomment/utils/session-manager.js

import { loadVideosForPageId } from './facebook-ui-manager.js'; // Import the new function
import { getToken, saveToken } from '../../shared/api/tpos-api.js'; // Import directly

/**
 * Loads the last saved session from the server.
 * @param {object} appState - The global application state object.
 * @returns {Promise<object|null>} The last session data or null if not found/error.
 */
export async function loadLastSession(appState) {
    try {
        const response = await fetch('/api/settings/last-session');
        const result = await response.json();
        
        if (result.success) {
            appState.lastSession = result.data;
            console.log('✅ Last session loaded:', appState.lastSession);
            return appState.lastSession;
        }
    } catch (error) {
        console.error('❌ Error loading last session:', error);
    }
    return null;
}

/**
 * Saves the current session data to the server.
 * @param {object} appState - The global application state object.
 */
export async function saveLastSession(appState) {
    try {
        const response = await fetch('/api/settings/last-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.lastSession)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Last session saved');
        }
    } catch (error) {
        console.error('❌ Error saving last session:', error);
    }
}

/**
 * Clears the last saved session from the server and resets UI elements.
 * @param {object} appState - The global application state object.
 */
export async function clearLastSession(appState) {
    if (!confirm('Bạn có chắc chắn muốn xóa session đã lưu?')) return;
    
    try {
        const response = await fetch('/api/settings/last-session', {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reset session data
            appState.lastSession = {
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
            
            window.showNotification('🗑️ Đã xóa session đã lưu!', 'success');
            console.log('✅ Last session cleared');
        }
    } catch (error) {
        console.error('❌ Error clearing last session:', error);
        window.showNotification('❌ Lỗi xóa session!', 'error');
    }
}

/**
 * Restores the UI state based on the last saved session.
 * @param {object} appState - The global application state object.
 * @param {function} startFetching - Function to start fetching comments.
 */
export async function restoreLastSession(appState, startFetching) {
    const session = await loadLastSession(appState);
    
    if (!session || !session.pageId || !session.videoId) {
        console.log('⏭️ No previous session to restore');
        return;
    }
    
    console.log('🔄 Restoring last session...');
    
    // Set page
    const pageSelector = document.getElementById("selectedPageId");
    if (pageSelector && session.pageId) {
        pageSelector.value = session.pageId;
        
        // Load videos for this page using the new function
        // Need to get the limit from the UI or a default value
        const videoLimit = document.getElementById("videoLimit")?.value || 10;
        await loadVideosForPageId(session.pageId, videoLimit, appState);
        
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
        appState.connectionMode = session.connectionMode; // Update global variable
    }
    
    // Set refresh interval
    const refreshIntervalInput = document.getElementById("refreshInterval");
    if (refreshIntervalInput && session.refreshInterval) {
        refreshIntervalInput.value = session.refreshInterval;
    }
    
    // Auto start if enabled and has both page and video
    if (session.autoStart && session.pageId && session.videoId) {
        console.log('▶️ Auto-starting session...');
        window.showNotification('🔄 Đang khôi phục session và tự động bắt đầu...', 'info');

        // Immediately disable autoStart in the session file to prevent loops on page refresh
        appState.lastSession.autoStart = false;
        await saveLastSession(appState); // Await to ensure the file is updated before proceeding

        // Start fetching after a short delay
        setTimeout(() => {
            startFetching(appState);
        }, 1000);
    } else if (session.pageId && session.videoId) {
        window.showNotification('✅ Đã khôi phục session trước đó. Nhấn "Bắt Đầu" để chạy.', 'success');
    } else {
        window.showNotification('✅ Đã khôi phục một phần session trước đó', 'info');
    }
}