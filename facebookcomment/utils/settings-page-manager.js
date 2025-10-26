// facebookcomment/utils/settings-page-manager.js

import { generateBillHTML } from './printer-template-manager.js'; // Import generateBillHTML

/**
 * Loads printer configurations from the server and renders them.
 * @param {object} appState - The global application state object.
 */
export async function loadPrinters(appState) {
    try {
        const response = await fetch('/api/settings/printers');
        const result = await response.json();
        
        if (result.success) {
            appState.printers = result.data;
            renderPrinters(appState);
            console.log('✅ Printers loaded from server');
        }
    } catch (error) {
        console.error('❌ Error loading printers:', error);
        window.showNotification('Lỗi tải danh sách máy in', 'error');
    }
}

/**
 * Saves the current printer configurations to the server.
 * @param {object} appState - The global application state object.
 */
export async function savePrinters(appState) {
    try {
        const response = await fetch('/api/settings/printers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.printers)
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderPrinters(appState);
            console.log('✅ Printers saved to server');
        }
    } catch (error) {
        console.error('❌ Error saving printers:', error);
        window.showNotification('Lỗi lưu danh sách máy in', 'error');
    }
}

/**
 * Renders the list of printers in the UI.
 * @param {object} appState - The global application state object.
 */
export function renderPrinters(appState) {
    const printerListDiv = document.getElementById("printerList");
    if (!printerListDiv) return;

    if (appState.printers.length === 0) {
        printerListDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🖨️</div>
                <p>Chưa có máy in nào được thêm.</p>
            </div>
        `;
        return;
    }

    let html = "";
    appState.printers.forEach((printer, index) => {
        const isActive = printer.isActive || false;
        html += `
            <div class="printer-item ${isActive ? 'active' : ''}">
                <div class="printer-info">
                    <div class="printer-header">
                        <span class="printer-name">
                            <i data-lucide="printer"></i> ${printer.name}
                        </span>
                        ${isActive ? '<span class="active-badge">Active</span>' : ''}
                    </div>
                    <div class="printer-details">
                        <span class="printer-ip"><i data-lucide="wifi"></i> ${printer.ipAddress}:${printer.port}</span>
                        <span class="printer-bridge"><i data-lucide="link"></i> ${printer.bridgeUrl}</span>
                    </div>
                </div>
                <div class="printer-actions">
                    ${!isActive ? `<button class="btn-set-active" onclick="window.setActivePrinter(${index})"><i data-lucide="check-circle"></i> Set Active</button>` : ''}
                    <button class="btn-test" onclick="window.testPrinterConnection(${index})"><i data-lucide="zap"></i> Test</button>
                    <button class="btn-delete" onclick="window.deletePrinter(${index})"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `;
    });
    printerListDiv.innerHTML = html;
    window.lucide.createIcons(); // Re-initialize icons for new elements
}

/**
 * Adds a new printer to the list.
 * @param {string} name - Printer name.
 * @param {string} ipAddress - Printer IP address.
 * @param {number} port - Printer port.
 * @param {string} bridgeUrl - Printer bridge URL.
 * @param {object} appState - The global application state object.
 */
export function addPrinter(name, ipAddress, port, bridgeUrl, appState) {
    // Basic validation
    if (!name.trim() || !ipAddress.trim()) {
        window.showNotification("Tên máy in và IP không được để trống!", "error");
        return;
    }

    // Check for duplicate IP
    if (appState.printers.some(p => p.ipAddress === ipAddress && p.port === port)) {
        window.showNotification("Máy in với IP và Port này đã tồn tại!", "error");
        return;
    }

    const newPrinter = {
        id: Date.now().toString(),
        name: name.trim(),
        ipAddress: ipAddress.trim(),
        port: parseInt(port) || 9100,
        bridgeUrl: bridgeUrl.trim() || 'http://localhost:3001',
        isActive: appState.printers.length === 0, // First printer is active by default
        createdAt: new Date().toISOString()
    };

    appState.printers.push(newPrinter);
    savePrinters(appState);
    window.showNotification("Đã thêm máy in thành công!", "success");
}

/**
 * Deletes a printer from the list.
 * @param {number} index - The index of the printer to delete.
 * @param {object} appState - The global application state object.
 */
export function deletePrinter(index, appState) {
    if (confirm("Bạn có chắc chắn muốn xóa máy in này?")) {
        appState.printers.splice(index, 1);
        
        // If deleted printer was active, set first printer as active
        if (appState.printers.length > 0 && !appState.printers.some(p => p.isActive)) {
            appState.printers[0].isActive = true;
        }
        
        savePrinters(appState);
        window.showNotification("Đã xóa máy in.", "info");
    }
}

/**
 * Sets a printer as active.
 * @param {number} index - The index of the printer to set as active.
 * @param {object} appState - The global application state object.
 */
export function setActivePrinter(index, appState) {
    appState.printers.forEach((p, i) => {
        p.isActive = (i === index);
    });
    savePrinters(appState);
    window.showNotification("Đã đặt máy in active!", "success");
}

/**
 * Tests the connection to a specific printer.
 * @param {number} index - The index of the printer to test.
 * @param {object} appState - The global application state object.
 */
export async function testPrinterConnection(index, appState) {
    const printer = appState.printers[index];
    window.showNotification("Đang kiểm tra kết nối...", "info");
    
    try {
        const response = await fetch(`${printer.bridgeUrl}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            window.showNotification(`✅ Kết nối thành công! Server: ${data.service}`, "success");
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        window.showNotification(`❌ Không thể kết nối: ${error.message}`, "error");
    }
}

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

/**
 * Toggles the visibility of the Bearer Token input field.
 */
export function toggleTokenVisibilitySettings() {
    const input = document.getElementById("bearerTokenSettings");
    const icon = document.getElementById("eyeIconSettings");

    if (input.type === "password") {
        input.type = "text";
        icon.setAttribute("data-lucide", "eye-off");
    } else {
        input.type = "password";
        icon.setAttribute("data-lucide", "eye");
    }
    window.lucide.createIcons();
}

/**
 * Saves the Bearer Token from the settings page input.
 */
export function saveTokenSettings() {
    window.TPOS_API.saveToken(null, 'bearerTokenSettings'); // Use the new input ID
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
    window.TPOS_API.loadToken('bearerTokenSettings');

    // Expose functions globally for onclick attributes in HTML
    window.setActivePrinter = (index) => setActivePrinter(index, appState);
    window.testPrinterConnection = (index) => testPrinterConnection(index, appState);
    window.deletePrinter = (index) => deletePrinter(index, appState);
    window.saveTemplateSettings = () => saveTemplateSettings(appState);
    window.resetTemplateSettings = () => resetTemplateSettings(appState);
    window.setAlignment = (align) => setAlignment(align, appState);
    window.previewTemplate = () => previewTemplate(appState);
    window.toggleTokenVisibilitySettings = toggleTokenVisibilitySettings;
    window.saveTokenSettings = saveTokenSettings;
    window.testPrint = () => testPrint(appState);
}