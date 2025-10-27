// facebookcomment/utils/settings/header-management.js

/**
 * Loads the saved header template from the server and displays it.
 */
export async function loadHeaderTemplate() {
    try {
        const response = await fetch('/api/settings/header-template');
        if (!response.ok) throw new Error('Failed to fetch header template');
        
        const template = await response.json();
        const textarea = document.getElementById('headerTemplateInput');
        if (textarea) {
            textarea.value = JSON.stringify(template, null, 2);
        }
    } catch (error) {
        console.error('Error loading header template:', error);
        window.showNotification('Lỗi tải header mẫu', 'error');
    }
}

/**
 * Saves the header template from the textarea to the server.
 */
export async function saveHeaderTemplate() {
    const textarea = document.getElementById('headerTemplateInput');
    if (!textarea) return;

    let template;
    try {
        template = JSON.parse(textarea.value);
    } catch (error) {
        window.showNotification('Lỗi: Header không phải là định dạng JSON hợp lệ.', 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings/header-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template)
        });

        const result = await response.json();
        if (result.success) {
            window.showNotification('✅ Đã lưu header mẫu thành công!', 'success');
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error saving header template:', error);
        window.showNotification(`Lỗi lưu header mẫu: ${error.message}`, 'error');
    }
}