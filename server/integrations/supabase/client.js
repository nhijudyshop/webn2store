const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://iutxzuwexyiggenuebxw.supabase.co";
// Sử dụng Service Role Key cho các hoạt động phía server để bỏ qua RLS và đảm bảo toàn quyền truy cập.
// Khóa này phải được giữ bí mật và lý tưởng nhất là được tải từ các biến môi trường.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY chưa được thiết lập. Các hoạt động Supabase phía server có thể thất bại.");
  // Trong một ứng dụng thực tế, bạn có thể muốn báo lỗi hoặc thoát tại đây.
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = { supabase };