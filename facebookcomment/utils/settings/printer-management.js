// facebookcomment/utils/settings/printer-management.js

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