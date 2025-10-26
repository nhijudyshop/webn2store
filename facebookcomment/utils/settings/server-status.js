// facebookcomment/utils/settings/server-status.js

/**
 * Checks the status of the print server.
 * @param {object} appState - The global application state object.
 */
export async function checkServerStatus(appState) {
    const statusEl = document.getElementById("serverStatus");
    if (!statusEl) return;
    
    const bridgeUrl = document.getElementById("bridgeUrl")?.textContent || 'http://localhost:3001';
    
    try {
        const response = await fetch(`${bridgeUrl}/health`);
        appState.serverOnline = response.ok;
        
        if (appState.serverOnline) {
            statusEl.innerHTML = '<span class="status-dot online"></span><span class="status-text">Server Online</span>';
        } else {
            statusEl.innerHTML = '<span class="status-dot offline"></span><span class="status-text">Server Offline</span>';
        }
    } catch (error) {
        appState.serverOnline = false;
        statusEl.innerHTML = '<span class="status-dot offline"></span><span class="status-text">Server Offline</span>';
    }
}