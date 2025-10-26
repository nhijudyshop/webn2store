// facebookcomment/utils/printer-template-manager.js

import { generateBillHTML } from '../../shared/utils/printer-template-generator.js'; // Import generateBillHTML from shared utils
import { tposRequest } from '../../shared/api/tpos-api.js'; // Import tposRequest directly

/**
 * Loads printer configurations from the server for use in printing.
 * @param {object} appState - The global application state object.
 */
export async function loadPrintersForPrinting(appState) {
    try {
        const response = await fetch('/api/settings/printers');
        const result = await response.json();
        
        if (result.success) {
            appState.printers = result.data;
            console.log('✅ Printers loaded for printing:', appState.printers.length);
        }
    } catch (error) {
        console.error('❌ Error loading printers for printing:', error);
    }
}

/**
 * Loads template settings from the server for use in printing.
 * @param {object} appState - The global application state object.
 */
export async function loadTemplateSettingsForPrinting(appState) {
    try {
        const response = await fetch('/api/settings/template');
        const result = await response.json();
        
        if (result.success) {
            appState.templateSettings = result.data;
            console.log('✅ Template settings loaded for printing');
        }
    } catch (error) {
        console.error('❌ Error loading template for printing:', error);
    }
}

/**
 * Handles the creation and printing of an order bill.
 * @param {string} commentId - The ID of the comment.
 * @param {string} userName - The name of the customer.
 * @param {string} message - The comment message.
 * @param {string} time - The creation time of the comment.
 * @param {string} userId - The ID of the user.
 * @param {object} appState - The global application state object.
 */
export async function handleCreateOrder(commentId, userName, message, time, userId, appState) {
    console.log("Create order for:", commentId, userName, message, "userId:", userId);
    
    // Get order info from ordersMap
    let orderInfo = null;
    if (commentId && appState.ordersMap.has(commentId)) {
        orderInfo = appState.ordersMap.get(commentId);
    } else if (userId && appState.ordersMap.has(userId)) {
        orderInfo = appState.ordersMap.get(userId);
    }
    
    if (!orderInfo) {
        window.showNotification("⚠️ Không tìm thấy thông tin đơn hàng!", "error");
        console.error("Order not found for commentId:", commentId, "userId:", userId);
        console.log("ordersMap size:", appState.ordersMap.size);
        return;
    }
    
    // Load printers if not loaded
    if (appState.printers.length === 0) {
        await loadPrintersForPrinting(appState);
    }
    
    // Load template settings if not loaded
    if (!appState.templateSettings.width) {
        await loadTemplateSettingsForPrinting(appState);
    }
    
    const activePrinter = appState.printers.find(p => p.isActive);
    
    if (!activePrinter) {
        window.showNotification("⚠️ Chưa có máy in active! Vui lòng vào Settings để cấu hình máy in.", "error");
        return;
    }
    
    // Prepare bill data
    // Use ONLY comment.message (the actual Facebook comment text)
    let productMessage = message || '';
    
    if (Array.isArray(productMessage)) {
        productMessage = productMessage[productMessage.length - 1] || ''; // Get last (newest) message
    } else if (typeof productMessage === 'object') {
        productMessage = JSON.stringify(productMessage); // Fallback for object
    }
    
    // Convert to string
    productMessage = String(productMessage).trim();
    
    // Decode escape sequences (\r\n, \n, \t, etc.) and unicode sequences (\u00c1, etc.)
    try {
        // Replace literal \r\n, \n with actual newlines
        productMessage = productMessage
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .replace(/\\t/g, ' ');
        
        // Decode unicode sequences like \u00c1
        productMessage = productMessage.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
            return String.fromCharCode(parseInt(code, 16));
        });
    } catch (e) {
        console.warn('Error decoding message:', e);
    }
    
    // Split by newline characters and take first line
    const firstLine = productMessage.split(/[\r\n]+/)[0];
    
    // Clean and limit message length
    productMessage = firstLine.trim().substring(0, 100);
    
    const billData = {
        sessionIndex: orderInfo.sessionIndex || '---',
        phone: orderInfo.telephone || '',
        customerName: userName,
        productCode: orderInfo.code || '',
        productName: productMessage, // ONLY from comment.message
        comment: '', // Empty - don't use orderInfo.note
        createdTime: time || new Date().toISOString()
    };
    
    window.showNotification("🖨️ Đang in bill...", "info");
    
    try {
        const htmlContent = generateBillHTML(billData, appState.templateSettings);
        
        const response = await fetch(`${activePrinter.bridgeUrl}/print/html`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                printerIp: activePrinter.ipAddress,
                printerPort: activePrinter.port,
                html: htmlContent,
                width: appState.templateSettings.width,
                height: appState.templateSettings.height === 'auto' ? null : appState.templateSettings.height,
                threshold: appState.templateSettings.threshold,
                scale: appState.templateSettings.scale
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        window.showNotification(`✅ In bill thành công cho ${userName}!`, "success");
        console.log("Print result:", result);
        
    } catch (error) {
        window.showNotification(`❌ Lỗi in bill: ${error.message}`, "error");
        console.error("Print error:", error);
    }
}

/**
 * Placeholder function for viewing order information.
 * @param {string} commentId - The ID of the comment.
 * @param {string} userName - The name of the customer.
 * @param {string} message - The comment message.
 * @param {string} time - The creation time of the comment.
 */
export function handleViewInfo(commentId, userName, message, time) {
    window.showNotification(`Xem thông tin ${userName}`, "info");
    console.log("View info for:", commentId, userName, message, time);
    // TODO: Implement view info logic - show modal with full details
}