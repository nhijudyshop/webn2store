// facebookcomment/utils/settings-page-initializer.js

import { loadPrinters, addPrinter, deletePrinter, setActivePrinter, testPrinterConnection } from './settings/printer-management.js';
import { loadTemplateSettings, populateTemplateForm, saveTemplateSettings, resetTemplateSettings, setAlignment, previewTemplate } from './settings/template-management.js';
import { checkServerStatus } from './settings/server-status.js';
import { toggleTokenVisibilitySettings, saveTokenSettings } from './settings/token-management.js';
import { loadToken, saveToken } from '../../shared/api/tpos-api.js'; // Import loadToken and saveToken directly
import { generateBillHTML } from '../../shared/utils/printer-template-generator.js'; // Import generateBillHTML from shared utils

/**
 * Initiates a test print using the active printer and current template settings.
 * @param {object} appState - The global application state object.
 */
export async function testPrint(appState) {
    const activePrinter = appState.printers.find(p => p.isActive);
    
    if (!activePrinter) {
        window.showNotification("⚠️ Chưa có máy in active! Vui lòng thêm và chọn máy in.", "error");
        return;
    }
    
    if (!appState.serverOnline) {
        window.showNotification("❌ Server chưa chạy! Vui lòng chạy: node server.js", "error");
        return;
    }
    
    const testData = {
        sessionIndex: document.getElementById("testSessionIndex").value,
        phone: document.getElementById("testPhone").value,
        customerName: document.getElementById("testCustomerName").value,
        productCode: document.getElementById("testProductCode").value,
        productName: document.getElementById("testProductName").value,
        comment: document.getElementById("testComment").value,
        createdTime: new Date().toISOString()
    };
    
    const btn = document.getElementById("testPrintBtn");
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Đang in...';
    window.lucide.createIcons();
    
    try {
        const htmlContent = generateBillHTML(testData, appState.templateSettings);
        
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
        window.showNotification("✅ In thành công!", "success");
        console.log("Print result:", result);
        
    } catch (error) {
        window.showNotification(`❌ Lỗi in: ${error.message}`, "error");
        console.error("Print error:", error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="printer"></i> Test In Bill';
        window.lucide.createIcons();
    }
}

/**
 * Initializes the settings page by loading data and setting up event listeners.
 * @param {object} appState - The global application state object.
 */
export function initializeSettingsPage(appState) {
    loadPrinters(appState);
    loadTemplateSettings(appState);
    checkServerStatus(appState);
    
    // Check server status every 5 seconds
    setInterval(() => checkServerStatus(appState), 5000);

    const addPrinterForm = document.getElementById("addPrinterForm");
    if (addPrinterForm) {
        addPrinterForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const printerName = document.getElementById("printerName").value;
            const printerIp = document.getElementById("printerIp").value;
            const printerPort = document.getElementById("printerPort").value;
            const printerBridge = document.getElementById("printerBridge").value;
            addPrinter(printerName, printerIp, printerPort, printerBridge, appState);
            addPrinterForm.reset(); // Clear form fields
        });
    }

    // Handle tab switching
    const tabButtons = document.querySelectorAll(".tabs-nav .tab-button");
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const tabId = button.dataset.tab;

            // Remove active from all buttons and content
            tabButtons.forEach(btn => btn.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

            // Add active to clicked button and corresponding content
            button.classList.add("active");
            document.getElementById(tabId).classList.add("active");
            window.lucide.createIcons(); // Re-initialize icons for newly active tab content
        });
    });

    // Load token for settings page
    loadToken('bearerTokenSettings'); // Use imported loadToken directly

    // Expose functions globally for onclick attributes in HTML
    window.setActivePrinter = (index) => setActivePrinter(index, appState);
    window.testPrinterConnection = (index) => testPrinterConnection(index, appState);
    window.deletePrinter = (index) => deletePrinter(index, appState);
    window.saveTemplateSettings = () => saveTemplateSettings(appState);
    window.resetTemplateSettings = () => resetTemplateSettings(appState);
    window.setAlignment = (align) => setAlignment(align, appState);
    window.previewTemplate = () => previewTemplate(appState);
    window.toggleTokenVisibilitySettings = toggleTokenVisibilitySettings;
    window.saveTokenSettings = () => saveTokenSettings('bearerTokenSettings'); // Pass inputId
    window.testPrint = () => testPrint(appState);
}