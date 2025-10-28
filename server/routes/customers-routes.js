const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { getAuthHeader, generateGuid } = require("../utils/server-utils");
const { DATA_DIR, HEADER_TEMPLATE_FILE } = require("../config");

const router = express.Router();

const CUSTOMER_FILE = path.join(DATA_DIR, "customer.json");

let headerTemplateCache = null;
function getHeaderTemplate() {
  if (headerTemplateCache) return headerTemplateCache;
  try {
    if (fs.existsSync(HEADER_TEMPLATE_FILE)) {
      const data = fs.readFileSync(HEADER_TEMPLATE_FILE, "utf8");
      headerTemplateCache = JSON.parse(data);
      return headerTemplateCache;
    }
  } catch (err) {
    console.error("Error reading header template:", err.message);
  }
  return {};
}

function getProxyHeaders(authHeader) {
  return {
    ...getHeaderTemplate(),
    authorization: authHeader,
    accept: "application/json, text/plain, */*",
    "content-type": "application/json;charset=UTF-8",
    "x-request-id": generateGuid(),
  };
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CUSTOMER_FILE)) {
    fs.writeFileSync(CUSTOMER_FILE, JSON.stringify({}, null, 2), "utf8");
  }
}

function readCustomerCache() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(CUSTOMER_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    console.error("Failed to read customer.json:", e.message);
    return {};
  }
}

function writeCustomerCache(cacheObj) {
  ensureDataFile();
  fs.writeFileSync(CUSTOMER_FILE, JSON.stringify(cacheObj, null, 2), "utf8");
}

/**
 * Chuẩn hóa số điện thoại: giữ lại chữ số
 */
function normalizePhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  // Ưu tiên số Việt Nam bắt đầu bằng 0 nếu đang có
  if (digits.startsWith("0")) return digits;
  return digits;
}

/**
 * GET /api/customer?phone=0971061998
 * - Ưu tiên đọc cache trong server/data/customer.json
 * - Nếu chưa có thì gọi TPOS: /odata/Partner/ODataService.GetViewV2?Type=Customer&Active=true&Phone=...&$top=1
 * - Nếu TPOS không có thì lưu StatusText="Khách lạ"
 */
router.get("/customer", async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const rawPhone = req.query.phone;
    if (!rawPhone) {
      return res.status(400).json({ error: "Missing required parameter: phone" });
    }
    const phone = normalizePhone(rawPhone);

    const cache = readCustomerCache();
    if (cache[phone]) {
      return res.json({ success: true, data: cache[phone], source: "cache" });
    }

    const url = `https://tomato.tpos.vn/odata/Partner/ODataService.GetViewV2?Type=Customer&Active=true&Phone=${encodeURIComponent(phone)}&$top=1`;
    console.log(`📞 Fetching customer by phone from TPOS: ${phone}`);

    const response = await axios.get(url, {
      headers: getProxyHeaders(authHeader),
    });

    const first = response?.data?.value?.[0];

    let record;
    if (first) {
      record = {
        Id: first.Id,
        Name: first.Name,
        Street: first.Street || first.FullAddress || "",
        Phone: first.Phone || phone,
        Credit: first.Credit || 0,
        StatusText: first.StatusText || "Bình thường",
      };
    } else {
      record = {
        Id: null,
        Name: "",
        Street: "",
        Phone: phone,
        Credit: 0,
        StatusText: "Khách lạ",
      };
    }

    cache[phone] = record;
    writeCustomerCache(cache);

    res.json({ success: true, data: record, source: first ? "tpos" : "fallback" });
  } catch (error) {
    console.error("❌ Error in /api/customer:", error.response ? error.response.data : error.message);
    // Trong trường hợp lỗi, vẫn cố gắng ghi bản ghi "Khách lạ" nếu có phone
    const phone = normalizePhone(req.query.phone || "");
    if (phone) {
      const cache = readCustomerCache();
      if (!cache[phone]) {
        cache[phone] = {
          Id: null,
          Name: "",
          Street: "",
          Phone: phone,
          Credit: 0,
          StatusText: "Khách lạ",
        };
        writeCustomerCache(cache);
      }
      return res.json({ success: true, data: cache[phone], source: "fallback-error" });
    }
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ success: false, error: error.message, details: error.response?.data });
  }
});

module.exports = router;