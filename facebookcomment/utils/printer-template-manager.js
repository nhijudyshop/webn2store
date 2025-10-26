// facebookcomment/utils/printer-template-manager.js

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

/**
 * Generates the HTML content for a print bill based on provided data and template settings.
 * @param {object} data - The data for the bill (sessionIndex, phone, customerName, etc.).
 * @param {object} templateSettings - The template configuration settings.
 * @returns {string} The HTML string for the bill.
 */
export function generateBillHTML(data, templateSettings) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    
    const fontWeight = templateSettings.bold ? '900' : 'normal';
    const fontStyle = templateSettings.italic ? 'italic' : 'normal';
    const textAlign = templateSettings.alignment;
    
    // Escape HTML to prevent encoding issues
    const escapeHtml = (text) => {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
    
    return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=${templateSettings.width}, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: ${templateSettings.width}px; margin: 0; padding: 0; background: white; }
                body { 
                    width: ${templateSettings.width}px;
                    min-width: ${templateSettings.width}px;
                    max-width: ${templateSettings.width}px;
                    margin: 0 auto;
                    padding: ${templateSettings.padding}px;
                    font-family: Arial, 'Segoe UI', Tahoma, 'DejaVu Sans', sans-serif; 
                    font-weight: ${fontWeight};
                    font-style: ${fontStyle};
                }
                .center { text-align: ${textAlign}; width: 100%; }
                .session { font-size: ${templateSettings.fonts.session}px; margin: ${templateSettings.lineSpacing}px 0; letter-spacing: 2px; text-shadow: 2px 2px 0px #000; }
                .phone { font-size: ${templateSettings.fonts.phone}px; margin: ${templateSettings.lineSpacing}px 0; }
                .customer { font-size: ${templateSettings.fonts.customer}px; margin: ${templateSettings.lineSpacing}px 0; }
                .product-code { font-size: ${templateSettings.fonts.product}px; margin: ${templateSettings.lineSpacing}px 0; }
                .product-name { font-size: ${templateSettings.fonts.product}px; margin: ${templateSettings.lineSpacing}px 0; line-height: 1.4; word-wrap: break-word; }
                .comment { font-size: ${templateSettings.fonts.comment}px; margin: ${templateSettings.lineSpacing}px 0; font-weight: ${fontWeight}; }
                .time { font-size: ${templateSettings.fonts.time}px; margin: ${templateSettings.lineSpacing * 1.5}px 0; }
                .separator { border-top: 3px dashed #000; margin: ${templateSettings.lineSpacing}px 0; }
                .thank-you { font-size: ${templateSettings.fonts.time}px; margin-top: ${templateSettings.lineSpacing}px; }
            </style>
        </head>
        <body>
            <div class="center session">#${escapeHtml(data.sessionIndex)}</div>
            ${data.phone ? `<div class="center phone">${escapeHtml(data.phone)}</div>` : ''}
            <div class="center customer">${escapeHtml(data.customerName)}</div>
            <div class="center product-code">${escapeHtml(data.productCode)}</div>
            <div class="center product-name">${escapeHtml(data.productName)}</div>
            ${data.comment ? `<div class="center comment">${escapeHtml(data.comment)}</div>` : ''}
            <div class="center time">${timeStr}</div>
            <div class="separator"></div>
            <div class="center thank-you">Cảm ơn quý khách!</div>
        </body>
        </html>
    `;
}