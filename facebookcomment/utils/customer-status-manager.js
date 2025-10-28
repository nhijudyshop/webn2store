import { tposRequest } from '../../shared/api/tpos-api.js';

/**
 * Trích số điện thoại Việt Nam đơn giản từ text (bắt đầu bằng 0, dài 10-11 số)
 * @param {string} text
 * @returns {string[]} phones
 */
export function extractPhonesFromText(text = "") {
  if (!text) return [];
  const matches = String(text).match(/0\d{9,10}/g);
  if (!matches) return [];
  // unique
  return Array.from(new Set(matches));
}

/**
 * Lấy và cache thông tin khách theo phone từ backend (/api/customer)
 * @param {string} phone
 * @param {object} appState
 * @returns {Promise<object|null>}
 */
export async function fetchCustomerByPhone(phone, appState) {
  try {
    const data = await tposRequest(`/api/customer?phone=${encodeURIComponent(phone)}`);
    if (data?.success && data.data) {
      appState.customersMap.set(phone, data.data);
      return data.data;
    }
  } catch (e) {
    console.error("fetchCustomerByPhone error:", e);
  }
  return null;
}

/**
 * Sau khi render comments, đảm bảo các status theo phone được load và cập nhật UI.
 * @param {Array} comments
 * @param {object} appState
 */
export async function ensureCustomerStatusesForComments(comments, appState) {
  if (!Array.isArray(comments) || comments.length === 0) return;

  const phonesToFetch = new Set();

  comments.forEach((c) => {
    const msg = c.message || "";
    const phones = extractPhonesFromText(msg);
    phones.forEach((p) => {
      if (!appState.customersMap.has(p)) {
        phonesToFetch.add(p);
      }
    });
  });

  // Fetch tuần tự để đơn giản (số lượng thường ít); có thể tối ưu song song nếu cần
  for (const phone of phonesToFetch) {
    const rec = await fetchCustomerByPhone(phone, appState);
    if (rec) {
      updateStatusBadgesForPhone(phone, rec.StatusText);
    }
  }
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