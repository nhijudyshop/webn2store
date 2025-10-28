import { getToken } from '../../shared/api/tpos-api.js';

/**
 * Chuẩn hóa số VN về dạng 0xxxxxxxxx từ nhiều format (+84/84/0 và có dấu cách/chấm/gạch nối)
 */
function normalizeVNPhone(raw = "") {
  const digits = String(raw).replace(/\D/g, ""); // bỏ mọi ký tự không phải số
  if (!digits) return "";

  // +84 / 84 => thay bằng 0
  if (digits.startsWith("84")) {
    const tail = digits.slice(2);
    if (tail.length === 9 || tail.length === 10) return "0" + tail;
  }

  // đã là dạng 0xxxxxxxxx
  if (digits.startsWith("0") && (digits.length === 10 || digits.length === 11)) {
    return digits;
  }

  return "";
}

/**
 * Trích số điện thoại Việt Nam từ text, hỗ trợ nhiều định dạng
 * Ví dụ: 0971 061 998, 0971.061.998, 09-71-061-998, +84 971 061 998, 84971061998
 * @param {string} text
 * @returns {string[]} phones (đã chuẩn hóa 0xxxxxxxxx, unique)
 */
export function extractPhonesFromText(text = "") {
  if (!text) return [];
  const set = new Set();

  // Bắt các cụm bắt đầu bằng +84/84/0 kèm số và các dấu phân tách phổ biến
  const candidates = String(text).match(/(\+?84|84|0)[\d\.\-\s\(\)]{8,20}/g) || [];

  // Cũng bắt trường hợp liền mạch 0 và 9-10 số tiếp theo
  const compact = String(text).match(/0\d{9,10}/g) || [];

  [...candidates, ...compact].forEach((raw) => {
    const normalized = normalizeVNPhone(raw);
    if (normalized) set.add(normalized);
  });

  return Array.from(set);
}

/**
 * Lấy và cache thông tin khách theo phone từ backend (/api/customer)
 * @param {string} phone
 * @param {object} appState
 * @returns {Promise<object|null>}
 */
export async function fetchCustomerByPhone(phone, appState) {
  const token = getToken();
  if (!token) {
    console.warn("Chưa có Bearer Token – không thể gọi /api/customer");
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification("Vui lòng nhập Bearer Token trước khi lấy trạng thái khách hàng", "error");
    }
    return null;
  }
  const url = `/api/customer?phone=${encodeURIComponent(phone)}`;
  const headers = {
    'accept': 'application/json, text/plain, */*',
    'authorization': `Bearer ${token}`,
    'content-type': 'application/json;charset=UTF-8'
  };
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error("fetchCustomerByPhone HTTP error:", res.status, txt);
    return null;
  }
  const data = await res.json();
  if (data?.success && data.data) {
    appState.customersMap.set(phone, data.data);
    return data.data;
  }
  return null;
}

/**
 * Sau khi render comments, đảm bảo các status theo phone được load và cập nhật UI.
 * Đưa tất cả phone chưa có vào hàng đợi và xử lý tuần tự.
 * @param {Array} comments
 * @param {object} appState
 */
export async function ensureCustomerStatusesForComments(comments, appState) {
  if (!Array.isArray(comments) || comments.length === 0) return;

  const toEnqueue = new Set();

  comments.forEach((c) => {
    const msg = c.message || "";
    const phones = extractPhonesFromText(msg);
    phones.forEach((p) => {
      if (!appState.customersMap.has(p) && !appState.customerFetchQueue.has(p)) {
        toEnqueue.add(p);
      }
    });
  });

  // Thêm vào queue
  toEnqueue.forEach(p => appState.customerFetchQueue.add(p));
  if (toEnqueue.size > 0) {
    console.log(`📞 Queued ${toEnqueue.size} phone(s) for customer status fetch`);
  }

  // Bắt đầu xử lý queue nếu chưa chạy
  processCustomerQueue(appState);
}

/**
 * Xử lý hàng đợi số điện thoại tuần tự để tránh đụng độ/đè cache.
 * @param {object} appState
 */
function processCustomerQueue(appState) {
  if (appState.isFetchingCustomers) return;
  const next = appState.customerFetchQueue.values().next().value;
  if (!next) {
    appState.isFetchingCustomers = false;
    return;
  }
  appState.isFetchingCustomers = true;
  appState.customerFetchQueue.delete(next);

  fetchCustomerByPhone(next, appState)
    .then(rec => {
      if (rec) {
        updateStatusBadgesForPhone(next, rec.StatusText);
      }
    })
    .finally(() => {
      // Nhả slot, tiếp tục số tiếp theo (thêm delay nhỏ để nhẹ server)
      appState.isFetchingCustomers = false;
      setTimeout(() => processCustomerQueue(appState), 60);
    });
}

/**
 * Cập nhật tất cả các status-badge của comments có chứa phone chỉ định.
 * Dựa trên data-phones của .comment-item
 * @param {string} phone
 * @param {string} statusText
 */
export function updateStatusBadgesForPhone(phone, statusText) {
  const items = document.querySelectorAll('.comment-item[data-phones]');
  items.forEach(item => {
    const phonesAttr = item.getAttribute('data-phones') || '';
    const list = phonesAttr.split(',').map(s => s.trim()).filter(Boolean);
    if (list.includes(phone)) {
      const badge = item.querySelector('.status-badge');
      if (badge) {
        // reset class (giữ nguyên nền default)
        badge.className = 'status-badge';
        badge.textContent = statusText || 'Bình thường';
      }
    }
  });
}