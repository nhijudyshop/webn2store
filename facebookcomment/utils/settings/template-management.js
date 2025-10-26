// facebookcomment/utils/settings/template-management.js

import { generateBillHTML } from '../../../shared/utils/printer-template-generator.js'; // Import generateBillHTML from shared utils

/**
 * Loads template settings from the server and populates the form.
 * @param {object} appState - The global application state object.
 */
export async function loadTemplateSettings(appState) {
    try {
        const response = await fetch('/api/settings/template');
        const result = await response.json();
        
        if (result.success) {
            appState.templateSettings = result.data;
            populateTemplateForm(appState);
            console.log('✅ Template settings loaded from server');
        }
    } catch (error) {
        console.error('❌ Error loading template:', error);
        window.showNotification('Lỗi tải cài đặt template', 'error');
    }
}

/**
 * Populates the template settings form with current values.
 * @param {object} appState - The global application state object.
 */
export function populateTemplateForm(appState) {
    // Format settings
    document.getElementById('templateWidth').value = appState.templateSettings.width;
    document.getElementById('templateHeight').value = appState.templateSettings.height;
    document.getElementById('templateThreshold').value = appState.templateSettings.threshold;
    document.getElementById('templateScale').value = appState.templateSettings.scale;
    
    // Font sizes
    document.getElementById('fontSession').value = appState.templateSettings.fonts.session;
    document.getElementById('fontPhone').value = appState.templateSettings.fonts.phone;
    document.getElementById('fontCustomer').value = appState.templateSettings.fonts.customer;
    document.getElementById('fontProduct').value = appState.templateSettings.fonts.product;
    document.getElementById('fontComment').value = appState.templateSettings.fonts.comment;
    document.getElementById('fontTime').value = appState.templateSettings.fonts.time;
    
    // Alignment
    document.querySelectorAll('.align-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.align === appState.templateSettings.alignment) {
            btn.classList.add('active');
        }
    });
    
    // Font style
    document.getElementById('fontBold').checked = appState.templateSettings.bold;
    document.getElementById('fontItalic').checked = appState.templateSettings.italic;
    
    // Spacing
    document.getElementById('templatePadding').value = appState.templateSettings.padding;
    document.getElementById('templateLineSpacing').value = appState.templateSettings.lineSpacing;
}

/**
 * Saves the current template settings from the form to the server.
 * @param {object} appState - The global application state object.
 */
export async function saveTemplateSettings(appState) {
    // Format settings
    appState.templateSettings.width = parseInt(document.getElementById('templateWidth').value) || 1152;
    const heightValue = document.getElementById('templateHeight').value;
    appState.templateSettings.height = heightValue === 'auto' ? 'auto' : parseInt(heightValue);
    appState.templateSettings.threshold = parseInt(document.getElementById('templateThreshold').value) || 95;
    appState.templateSettings.scale = parseInt(document.getElementById('templateScale').value) || 2;
    
    // Font sizes
    appState.templateSettings.fonts.session = parseInt(document.getElementById('fontSession').value) || 72;
    appState.templateSettings.fonts.phone = parseInt(document.getElementById('fontPhone').value) || 52;
    appState.templateSettings.fonts.customer = parseInt(document.getElementById('fontCustomer').value) || 52;
    appState.templateSettings.fonts.product = parseInt(document.getElementById('fontProduct').value) || 36;
    appState.templateSettings.fonts.comment = parseInt(document.getElementById('fontComment').value) || 32;
    appState.templateSettings.fonts.time = parseInt(document.getElementById('fontTime').value) || 28;
    
    // Font style
    appState.templateSettings.bold = document.getElementById('fontBold').checked;
    appState.templateSettings.italic = document.getElementById('fontItalic').checked;
    
    // Spacing
    appState.templateSettings.padding = parseInt(document.getElementById('templatePadding').value) || 20;
    appState.templateSettings.lineSpacing = parseInt(document.getElementById('templateLineSpacing').value) || 12;
    
    // Save to server
    try {
        const response = await fetch('/api/settings/template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.templateSettings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.showNotification('✅ Đã lưu cài đặt template!', 'success');
            console.log('Template settings saved:', appState.templateSettings);
        }
    } catch (error) {
        console.error('❌ Error saving template:', error);
        window.showNotification('Lỗi lưu cài đặt template', 'error');
    }
}

/**
 * Resets template settings to default values.
 * @param {object} appState - The global application state object.
 */
export async function resetTemplateSettings(appState) {
    if (!confirm('Bạn có chắc chắn muốn đặt lại về mặc định?')) return;
    
    appState.templateSettings = {
        width: 1152,
        height: 'auto',
        threshold: 95,
        scale: 2,
        fonts: {
            session: 72,
            phone: 52,
            customer: 52,
            product: 36,
            comment: 32,
            time: 28
        },
        alignment: 'center',
        bold: true,
        italic: false,
        padding: 20,
        lineSpacing: 12
    };
    
    // Save to server
    try {
        const response = await fetch('/api/settings/template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.templateSettings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            populateTemplateForm(appState);
            window.showNotification('✅ Đã đặt lại về mặc định!', 'success');
        }
    } catch (error) {
        console.error('❌ Error resetting template:', error);
        window.showNotification('Lỗi đặt lại cài đặt', 'error');
    }
}

/**
 * Sets the text alignment for the template.
 * @param {string} align - The alignment value ('left', 'center', 'right').
 * @param {object} appState - The global application state object.
 */
export function setAlignment(align, appState) {
    appState.templateSettings.alignment = align;
    document.querySelectorAll('.align-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.align === align) {
            btn.classList.add('active');
        }
    });
}

/**
 * Previews the current template settings in a new window.
 * @param {object} appState - The global application state object.
 */
export function previewTemplate(appState) {
    const testData = {
        sessionIndex: '001',
        phone: '0901234567',
        customerName: 'Nguyễn Văn A',
        productCode: 'SP001',
        productName: 'Cà phê sữa đá',
        comment: 'Ít đường',
        createdTime: new Date().toISOString()
    };
    
    const htmlContent = generateBillHTML(testData, appState.templateSettings);
    
    // Open in new window
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    previewWindow.document.write(htmlContent);
    previewWindow.document.close();
}