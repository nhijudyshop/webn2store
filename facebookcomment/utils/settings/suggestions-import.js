// facebookcomment/utils/settings/suggestions-import.js

/**
 * Handles the Excel file import process.
 * @param {Event} event - The file input change event.
 */
export async function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    window.showNotification("Đang xử lý file Excel...", "info");

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
                throw new Error("File Excel rỗng hoặc không có dữ liệu.");
            }

            // Map to the required format, based on the user's screenshot
            const products = json.map(row => ({
                code: row['Mã sản phẩm'],
                name: row['Tên sản phẩm']
            })).filter(p => p.code && p.name); // Filter out invalid entries

            if (products.length === 0) {
                throw new Error("Không tìm thấy cột 'Mã sản phẩm' và 'Tên sản phẩm' hoặc không có dữ liệu hợp lệ.");
            }

            // Send to the existing endpoint
            const response = await fetch('/api/products/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(products)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Lỗi không xác định từ server.');
            }

            window.showNotification(`✅ Import thành công! Đã thêm ${result.added} sản phẩm mới.`, 'success');
            console.log(`Imported ${products.length} products, server added ${result.added} new unique products.`);

        } catch (error) {
            console.error('Error processing Excel file:', error);
            window.showNotification(`❌ Lỗi Import: ${error.message}`, 'error');
        } finally {
            // Reset file input to allow re-uploading the same file
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Initializes the event listener for the file input.
 */
export function initializeSuggestionsImport() {
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleExcelImport);
    }
}