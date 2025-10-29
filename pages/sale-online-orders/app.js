// pages/sale-online-orders/app.js
import { tposRequest } from '/shared/api/tpos-api.js';

const state = {
    orders: [],
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    startDate: '',
    endDate: '',
    isLoading: false,
};

const dom = {
    startDateInput: document.getElementById('startDate'),
    endDateInput: document.getElementById('endDate'),
    fetchButton: document.getElementById('fetchButton'),
    tableBody: document.getElementById('tableBody'),
    loader: document.getElementById('loader'),
    paginationControls: document.getElementById('paginationControls'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    pageInfo: document.getElementById('pageInfo'),
    statsBar: document.getElementById('statsBar'),
};

function formatDateForApi(date, isEnd = false) {
    if (!date) return null;
    const d = new Date(date);
    if (isEnd) {
        d.setHours(23, 59, 59, 999);
    } else {
        d.setHours(0, 0, 0, 0);
    }
    // Convert to UTC by subtracting 7 hours (for GMT+7)
    const utcDate = new Date(d.getTime() - 7 * 60 * 60 * 1000);
    return utcDate.toISOString().replace('.000Z', '+00:00').replace('.999Z', '+00:00');
}

function formatDisplayDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0';
    return amount.toLocaleString('vi-VN');
}

function parseTags(tagsString) {
    if (!tagsString || tagsString.trim() === '') return [];
    try {
        const tags = JSON.parse(tagsString);
        return Array.isArray(tags) ? tags : [];
    } catch (e) {
        return [];
    }
}

function getStatusClass(statusText) {
    const normalized = (statusText || '').toLowerCase();
    if (normalized.includes('bom')) return 'bom-hang';
    if (normalized.includes('cảnh báo')) return 'canh-bao';
    if (normalized.includes('nguy hiểm')) return 'nguy-hiem';
    if (normalized.includes('bình thường')) return 'binh-thuong';
    return 'default';
}

async function fetchOrders() {
    if (state.isLoading) return;
    state.isLoading = true;
    dom.loader.style.display = 'flex';
    dom.tableBody.innerHTML = '';

    const skip = (state.currentPage - 1) * state.itemsPerPage;
    const startDateFilter = formatDateForApi(state.startDate, false);
    const endDateFilter = formatDateForApi(state.endDate, true);

    if (!startDateFilter || !endDateFilter) {
        alert('Vui lòng chọn cả ngày bắt đầu và kết thúc.');
        state.isLoading = false;
        dom.loader.style.display = 'none';
        return;
    }

    const filter = `(DateCreated ge ${startDateFilter} and DateCreated le ${endDateFilter})`;
    const url = `/SaleOnline_Order/ODataService.GetView?$top=${state.itemsPerPage}&$skip=${skip}&$orderby=DateCreated desc&$filter=${filter}&$count=true`;

    try {
        const data = await tposRequest(url);
        state.orders = data.value || [];
        state.totalItems = data['@odata.count'] || 0;
        renderTable();
        renderPagination();
        renderStats();
    } catch (error) {
        console.error('Error fetching orders:', error);
        dom.tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: red;">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
    } finally {
        state.isLoading = false;
        dom.loader.style.display = 'none';
    }
}

function renderTable() {
    if (state.orders.length === 0) {
        dom.tableBody.innerHTML = '<tr><td colspan="12" style="text-align: center;">Không có dữ liệu</td></tr>';
        return;
    }

    const rowsHtml = state.orders.map(order => {
        const tags = parseTags(order.Tags);
        const statusClass = getStatusClass(order.PartnerStatusText);

        return `
            <tr data-order-id="${order.Id}">
                <td>
                    <div class="action-buttons">
                        <button title="Sửa"><i data-lucide="edit"></i></button>
                        <button title="Xóa"><i data-lucide="trash-2"></i></button>
                    </div>
                </td>
                <td>${order.SessionIndex || ''}</td>
                <td>
                    <div class="cell-content">
                        <span class="main-text">${order.Code || ''}</span>
                        <span class="sub-text">${order.LiveCampaignName || ''}</span>
                        ${tags.map(tag => `<span class="tag" style="background-color:${tag.Color || '#e9ecef'}; color: #fff;">${tag.Name}</span>`).join('')}
                    </div>
                </td>
                <td>${order.WarehouseName || ''}</td>
                <td>
                    <div class="cell-content">
                        <span class="main-text">${order.Name || ''}</span>
                        <span class="status-badge ${statusClass}">${order.PartnerStatusText || 'Chưa có'}</span>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <span class="main-text">${order.Telephone || ''}</span>
                        <span class="sub-text">${order.NameNetwork || ''}</span>
                    </div>
                </td>
                <td>${order.Address || ''}</td>
                <td style="text-align: right;">${formatCurrency(order.TotalAmount)}</td>
                <td style="text-align: center;">${order.TotalQuantity || 0}</td>
                <td>${order.StatusText || ''}</td>
                <td>${order.CreateByName || ''}</td>
                <td>${formatDisplayDate(order.DateCreated)}</td>
            </tr>
        `;
    }).join('');

    dom.tableBody.innerHTML = rowsHtml;
    lucide.createIcons();
}

function renderPagination() {
    const totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
    dom.pageInfo.textContent = `Trang ${state.currentPage} / ${totalPages > 0 ? totalPages : 1}`;
    dom.prevPageBtn.disabled = state.currentPage <= 1;
    dom.nextPageBtn.disabled = state.currentPage >= totalPages;
    dom.paginationControls.style.display = state.totalItems > 0 ? 'flex' : 'none';
}

function renderStats() {
    dom.statsBar.textContent = `Tìm thấy tổng cộng ${state.totalItems} đơn hàng.`;
}

function setupEventListeners() {
    dom.fetchButton.addEventListener('click', () => {
        state.currentPage = 1;
        state.startDate = dom.startDateInput.value;
        state.endDate = dom.endDateInput.value;
        fetchOrders();
    });

    dom.prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            fetchOrders();
        }
    });

    dom.nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            fetchOrders();
        }
    });
}

function initialize() {
    const today = new Date().toISOString().split('T')[0];
    dom.startDateInput.value = today;
    dom.endDateInput.value = today;
    state.startDate = today;
    state.endDate = today;

    setupEventListeners();
    fetchOrders();
    lucide.createIcons();
}

initialize();