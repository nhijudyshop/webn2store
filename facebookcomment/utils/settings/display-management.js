/**
 * Local cache for last applied settings
 */
let currentSettings = {
    commentMessageFontSize: 18,
    commentMessageFontFamily: ''
};

/**
 * Internal: update style element from currentSettings
 */
function updateDynamicStyles() {
    let styleEl = document.getElementById('dynamic-comment-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-comment-styles';
        document.head.appendChild(styleEl);
    }
    const size = currentSettings.commentMessageFontSize || 18;
    const family = (currentSettings.commentMessageFontFamily || '').trim();
    const familyCSS = family ? `font-family: ${family}, inherit !important;` : '';
    styleEl.textContent = `
        .comment-message-inline {
            font-size: ${size}px !important;
            ${familyCSS}
        }
    `;
}

/**
 * Loads display settings from the server and applies them.
 */
export async function loadDisplaySettings() {
    try {
        const response = await fetch('/api/settings/display');
        const result = await response.json();
        
        if (result.success) {
            const settings = result.data || {};
            currentSettings = { ...currentSettings, ...settings };

            const fontSizeInput = document.getElementById('commentMessageFontSize');
            if (fontSizeInput) {
                fontSizeInput.value = currentSettings.commentMessageFontSize || 18;
            }

            updateDynamicStyles();
            console.log('✅ Display settings loaded:', currentSettings);
        }
    } catch (error) {
        console.error('❌ Error loading display settings:', error);
    }
}

/**
 * Saves display settings from Settings page (reads input).
 */
export async function saveDisplaySettings() {
    const fontSizeInput = document.getElementById('commentMessageFontSize');
    const fontSize = parseInt(fontSizeInput?.value, 10) || 18;
    const settings = {
        ...currentSettings,
        commentMessageFontSize: fontSize
    };
    
    try {
        const response = await fetch('/api/settings/display', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentSettings = settings;
            updateDynamicStyles();
            window.showNotification && window.showNotification('✅ Đã lưu cài đặt hiển thị!', 'success');
            console.log('Display settings saved:', settings);
        }
    } catch (error) {
        console.error('❌ Error saving display settings:', error);
        window.showNotification && window.showNotification('Lỗi lưu cài đặt hiển thị', 'error');
    }
}

/**
 * Directly save settings (for inline controls on comment page)
 */
export async function saveDisplaySettingsDirect(partialSettings = {}) {
    const nextSettings = { ...currentSettings, ...partialSettings };
    const response = await fetch('/api/settings/display', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings)
    });
    const result = await response.json();
    if (result.success) {
        currentSettings = nextSettings;
        updateDynamicStyles();
        return true;
    }
    return false;
}

/**
 * Applies comment font size to CSS and cache.
 */
export function applyCommentFontSize(fontSize) {
    currentSettings.commentMessageFontSize = parseInt(fontSize, 10) || 18;
    updateDynamicStyles();
}

/**
 * Applies comment font family to CSS and cache.
 * @param {string} fontFamily - '', 'serif', 'monospace', or any valid CSS font-family
 */
export function applyCommentFontFamily(fontFamily) {
    currentSettings.commentMessageFontFamily = fontFamily || '';
    updateDynamicStyles();
}

/**
 * Get last applied settings
 */
export function getDisplaySettings() {
    return { ...currentSettings };
}