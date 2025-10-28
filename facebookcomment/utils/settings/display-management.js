/**
 * Loads display settings from the server and applies them.
 */
export async function loadDisplaySettings() {
    try {
        const response = await fetch('/api/settings/display');
        const result = await response.json();
        
        if (result.success) {
            const settings = result.data;
            
            // Populate form
            const fontSizeInput = document.getElementById('commentMessageFontSize');
            if (fontSizeInput) {
                fontSizeInput.value = settings.commentMessageFontSize || 18;
            }
            
            // Apply to CSS
            applyCommentFontSize(settings.commentMessageFontSize || 18);
            
            console.log('✅ Display settings loaded:', settings);
        }
    } catch (error) {
        console.error('❌ Error loading display settings:', error);
    }
}

/**
 * Saves display settings to the server.
 */
export async function saveDisplaySettings() {
    const fontSizeInput = document.getElementById('commentMessageFontSize');
    const fontSize = parseInt(fontSizeInput.value) || 18;
    
    const settings = {
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
            applyCommentFontSize(fontSize);
            window.showNotification('✅ Đã lưu cài đặt hiển thị!', 'success');
            console.log('Display settings saved:', settings);
        }
    } catch (error) {
        console.error('❌ Error saving display settings:', error);
        window.showNotification('Lỗi lưu cài đặt hiển thị', 'error');
    }
}

/**
 * Applies comment font size to CSS.
 * @param {number} fontSize - Font size in pixels
 */
export function applyCommentFontSize(fontSize) {
    // Create or update style element
    let styleEl = document.getElementById('dynamic-comment-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-comment-styles';
        document.head.appendChild(styleEl);
    }
    
    styleEl.textContent = `
        .comment-message-inline {
            font-size: ${fontSize}px !important;
        }
    `;
}