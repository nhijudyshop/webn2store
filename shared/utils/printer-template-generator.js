// shared/utils/printer-template-generator.js

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