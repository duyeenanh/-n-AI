# Mô Tả Chi Tiết Quá Trình Thực Hiện Đồ Án (Từ Khởi Đầu Đến Hoàn Thiện)

- **Đề tài:** Xây dựng hệ thống Web bán hoa tươi thông minh **Mộc Miên Flower Shop** tích hợp Trợ lý AI tư vấn theo ngữ cảnh  
- **Học phần:** Phương Pháp Lập Trình Dựa Trên AI (*AI-based Programming Methods*)  
- **Sinh viên thực hiện:** Phan Duyên Anh — **GVHD:** Trần Thanh Bình  
- **Địa chỉ Web thực tế (Vercel Production):** https://moc-mien-flower-shop.vercel.app  
- **Mã nguồn GitHub:** https://github.com/duyeenanh/-n-AI  

---

## 1. Kiến trúc tổng thể & Hai chế độ vận hành

Hệ thống được thiết kế theo mô hình **Dual-Mode (Song song Online & Local)**:

```text
[ Người dùng (Trình duyệt React 18 + Vite 6) ]
        │
        ├──► Chế độ Online (Vercel + Supabase):
        │       React (src/api.js) ──► /api/* (api/index.js → server/index.js)
        │                                  ├──► Supabase PostgreSQL (pg SSL :6543)
        │                                  └──► RAG / TF-IDF / Gemini (server/rag.js)
        │
        └──► Chế độ Local (0-API / Dự phòng):
                React (src/api.js) ──► src/utils/localApi.js (localStorage)
                                   └──► Engine AI nội bộ (src/utils/localAi.js)
```

---

## 2. Nhật ký chi tiết 6 giai đoạn thực hiện

### Giai đoạn 1: Xây dựng dữ liệu & Giao diện cửa hàng hoa Mộc Miên
- **Mục tiêu:** Chuẩn hóa danh mục hoa Việt Nam và xây dựng trải nghiệm mua sắm đầy đủ cho khách hàng.
- **Công việc đã thực hiện:**
  - Biên tập bộ dữ liệu gốc gồm **65 sản phẩm hoa** và danh mục trong `src/data/products.js` (mã `p01` đến `p65`), mỗi mẫu có tên, giá, giá cũ, chi tiết loài hoa & số cành (`detail`), dịp tặng (`occasion`), nhãn nổi bật (`tag`), ảnh và tông màu nền.
  - Sưu tầm ảnh hoa từ nguồn mở hợp pháp **Wikimedia Commons** (chi tiết bản quyền trong `public/flowers/IMAGE-CREDITS.md`) và **Unsplash**, nén sang PNG đặt tại `public/flowers/`.
  - Phát hiện và khắc phục **4 sản phẩm thiếu/lỗi ảnh** (`p03`, `p05`, `p30`, `p63`) trong `src/data/products.js`.
  - Xây dựng giao diện cửa hàng trong `src/App.jsx`: lọc danh mục, tìm kiếm từ khóa, xem chi tiết bó hoa, đánh giá sao, danh sách yêu thích, giỏ hàng.
  - Xây dựng hệ thống mã giảm giá (`src/utils/coupons.js`) gồm `MOCMIEN10` (giảm 10% tối đa 80.000₫), `HOATUOI50K` (giảm 50.000₫ đơn từ 500.000₫), `FREESHIP` (miễn phí vận chuyển 30.000₫), cùng quy tắc tự động Freeship cho đơn từ `600.000₫`.
  - Hoàn thiện luồng đặt hàng nhanh không cần đăng nhập (Guest Checkout), chọn thanh toán **COD** hoặc **Chuyển khoản ngân hàng (QR MB Bank `public/qr-chuyen-khoan.png`)**, tải ảnh biên lai có tự động nén ảnh qua Canvas (`src/components/PaymentProof.jsx`, `src/utils/imageFile.js`), xem/in hóa đơn (`src/components/OrderInvoice.jsx`), tra cứu và hủy đơn hàng.

---

### Giai đoạn 2: Chuyển đổi Database từ MySQL sang Supabase PostgreSQL & Chuẩn bị Serverless
- **Mục tiêu:** Đưa cơ sở dữ liệu lên đám mây để chạy trực tuyến cùng Vercel Serverless thay vì chỉ chạy MySQL cục bộ.
- **Công việc đã thực hiện:**
  - Chuyển đổi toàn bộ truy vấn và cấu hình kết nối sang **PostgreSQL (`pg`)** trong `server/db.js`, `server/schema.sql`, `server/seed.js` và `server/index.js`.
  - Thiết kế **13 bảng dữ liệu** trong `server/schema.sql`:
    - `users`, `categories`, `products`
    - `orders`, `order_items`, `order_status_history`
    - `stock_receipts`, `stock_receipt_items`
    - `rag_documents`, `ai_messages`
    - `conversations`, `chat_messages`, `product_reviews`, `favorites`
  - Thêm entrypoint `api/index.js` và cấu hình định tuyến trong `vercel.json` (`/api/(.*)` → Serverless Function, `/(.*)` → `index.html`).
  - **Sự cố thực tế & cách khắc phục:** Khi chạy `npm run db:seed`, gặp lỗi `password authentication failed for user "postgres"` do sai mật khẩu database trong `.env`. Đã reset mật khẩu database trên Supabase, sử dụng chuỗi **Transaction Pooler (cổng `6543`)** với `DB_SSL=true`, sau đó chạy `npm run db:seed` thành công — tạo đủ bảng, **65 mẫu hoa**, tài khoản `admin@mocmien.local` và 3 tài khoản nhân viên (`nhanvien1..3@mocmien.local`).

---

### Giai đoạn 3: Hoàn thiện phân hệ Admin, Nhân viên (Staff) & Giao diện tương tác AI
- **Mục tiêu:** Đảm bảo 3 phân hệ Khách hàng – Nhân viên – Admin phối hợp khép kín ngoài thực tế.
- **Công việc đã thực hiện:**
  - **Admin Dashboard (`src/components/AdminDashboard.jsx`):**
    - Sửa lỗi nút **Cộng kho (+)** để cộng dồn tồn kho chính xác.
    - Bổ sung nút **Hiện lại** (khôi phục sản phẩm đã ẩn) và nút **Xóa** sản phẩm.
    - Bổ sung tab **Khách hàng** theo dõi số đơn đã đặt và tổng chi tiêu (`lifetimeValue`).
    - Bổ sung tính năng **Xuất Excel (`.xlsx`)** cho cả bảng tồn kho và bảng đơn hàng (`src/utils/exportInventory.js` dùng `write-excel-file`).
    - Hoàn thiện biểu đồ doanh thu theo Ngày / Tháng / Năm, phiếu nhập kho (`stock_receipts`), quản lý danh mục, nhân viên và tab **Lịch sử AI**.
  - **Staff Dashboard (`src/components/StaffDashboard.jsx`):**
    - Bổ sung **Quick Replies (Trả lời nhanh)** giúp nhân viên phản hồi tin nhắn khách hàng chỉ với 1 lần bấm, song song với xử lý đơn hàng, xem ảnh bill, xác nhận thu tiền và cộng tồn kho.
  - **Nút nổi AI:** Thêm nút **“Hỏi Mộc Miên AI”** cố định ở góc phải dưới màn hình trong `src/App.jsx` để khách hàng mở tư vấn từ bất kỳ vị trí nào, đồng thời loại bỏ phần giới thiệu kỹ thuật thừa trên trang chủ theo yêu cầu giao diện gọn gàng.

---

### Giai đoạn 4: Đồng bộ 100% chế độ chạy Local (0-API)
- **Mục tiêu:** Đảm bảo website vẫn chạy đầy đủ mọi nút bấm ngay cả khi chạy offline không có server.
- **Sự cố thực tế & cách khắc phục:**
  - **Lỗi không bấm gửi đơn & không hiện QR ở chế độ Local:** Do `apiFetch('/orders', { method: 'POST' })` trả về lỗi `'Tính năng này cần kết nối máy chủ.'` mà điều kiện fallback trong `src/App.jsx` chưa bắt chuỗi `máy chủ`, dẫn tới hàm `submitOrder` thoát sớm. Đã sửa điều kiện fallback, cập nhật trừ tồn kho vào `moc-local-products-v2` và hướng dẫn chọn đúng radio *“Chuyển khoản ngân hàng”* để hiển thị mã QR.
  - **Rà soát toàn bộ `apiFetch(...)` trong 5 file (`App.jsx`, `AccountPanel.jsx`, `AdminDashboard.jsx`, `StaffDashboard.jsx`, `PaymentProof.jsx`):** Phát hiện và bổ sung đầy đủ vào `src/utils/localApi.js` + `src/api.js` các endpoint còn thiếu:
    - `GET` & `POST /orders/:id/payment-proof`: lưu và xem ảnh bill chuyển khoản trên `localStorage`.
    - `POST /orders/:id/report-payment` & `POST /orders/:id/cancel`: báo đã chuyển khoản và hủy đơn.
    - `POST /payments/:id/confirm`: Admin & Nhân viên xác nhận đã thu tiền.
    - `POST /staff/products` & `POST /ai/reindex`: Nhân viên thêm hoa mới và Admin lập chỉ mục lại AI.
    - Tự động ghi lịch sử tư vấn AI vào `moc-local-ai-history` và tự cộng `orderCount`, `lifetimeValue` thật cho tab Khách hàng trong Admin.

---

### Giai đoạn 5: Nâng cấp Mộc Miên AI thành Engine chuyên biệt cho tiệm hoa
- **Mục tiêu:** Chuyển từ bộ tìm kiếm từ khóa đơn giản thành một Trợ lý AI có kiến thức nghiệp vụ tiệm hoa, hiểu ngữ cảnh nhiều lượt và giải thích được (Explainable AI).
- **Kiến trúc 4 tầng trong `src/utils/localAi.js` & `src/App.jsx`:**
  1. **Phân loại ý định (`classifyIntent`) & Cơ sở tri thức cửa hàng (`POLICY_KNOWLEDGE`):**
     - Nhận diện và trả lời tự nhiên các câu hỏi chào hỏi, cảm ơn, hỏi **mã giảm giá** (`MOCMIEN10`, `HOATUOI50K`, `FREESHIP`), **phí ship & thời gian giao hàng**, **thanh toán QR/COD**, **cách bảo quản hoa tươi** và **liên hệ cửa hàng**.
  2. **Bản đồ ngữ nghĩa ngành hoa (`DOMAIN_ONTOLOGY`):**
     - Tự động mở rộng từ khóa theo 6 nhóm dịp tặng & người nhận: *Tri ân mẹ/cô giáo* (cẩm chướng, mẫu đơn, lan, ly), *Tình yêu/bạn gái* (hồng, ohara, tulip, baby), *Sinh nhật*, *Tốt nghiệp* (hướng dương, vàng), *Khai trương*, *Trang nhã/chia buồn*.
     - Nhận diện ưu tiên **màu sắc** (`đỏ, trắng, hồng, vàng, tím, xanh, cam, pastel`) và **phân khúc giá** (*rẻ/sinh viên* hoặc *sang trọng/cao cấp*).
  3. **Ngữ cảnh hội thoại nhiều lượt (`inferContextFromHistory`):**
     - Đọc tối đa 3 lượt hỏi gần nhất để tự kế thừa ngân sách và ngữ cảnh khi khách hỏi nối tiếp (ví dụ: *"Tặng mẹ, ngân sách 500k"* → *"Có màu trắng không?"* → *"Rẻ hơn chút đi"*).
  4. **Trích xuất ngân sách (`extractLocalBudget`) + TF-IDF & Cosine Similarity + XAI:**
     - Hiểu các cách viết *"500k"*, *"1,5 triệu"*, *"250 ngàn đồng"*; bỏ qua các con số đi kèm đơn vị đếm (`cành, bông, nhành, chậu, giỏ, lẵng, bó`) để không nhầm *"10 cành"* thành `10đ`.
     - Lọc cứng `stock > 0` và `price <= budget`, vẫn gợi ý tốt khi khách chỉ hỏi theo ngân sách (*"dưới 300k có bó nào?"*).
     - Hiển thị nhãn ý định (`🎯`), ngân sách (`💰`), số mẫu đạt chuẩn (`📦`), lý do khớp và nút **`+ Giỏ`** ngay trong khung chat.
- **Kiểm thử tự động:** Chạy `npm test` (`tests/ai-budget.test.js`) đạt **14/14 test pass (100%)** và `npm run build` hoàn tất trong `2.00s`.

---

### Giai đoạn 6: Đẩy mã nguồn lên GitHub, Deploy Vercel & Hoàn thiện báo cáo
- **Đẩy GitHub an toàn:** Khởi tạo Git, kiểm tra `.gitignore` chặn `.env` và `node_modules/`, push toàn bộ mã nguồn lên `https://github.com/duyeenanh/-n-AI.git`.
- **Deploy Production trên Vercel:** Import repo `-n-AI`, import biến môi trường từ `.env`, triển khai thành công tại **`https://moc-mien-flower-shop.vercel.app`**.
- **Sửa lỗi sau Deploy:** Khắc phục lỗi thiếu `const [customers, setCustomers] = useState([])` và lệnh gọi `apiFetch('/admin/customers')` trong `src/components/AdminDashboard.jsx` gây trắng trang khi bấm tab *Khách hàng*, commit (`56266cb`) và push để Vercel tự động cập nhật.
- **Hoàn thiện hồ sơ nộp đồ án:**
  - Cập nhật `README.md` chuẩn dự án (kèm mục nguồn dữ liệu & cơ chế lưu trữ).
  - Soạn báo cáo chi tiết 5 chương tại `docs/BAO-CAO-DO-AN.md` và xuất file Word giữ nguyên trang bìa Đại học Phú Xuân tại `BAO-CAO-DO-AN-HOAN-CHINH.docx`.

---

## 3. Phân quyền 3 vai trò trong hệ thống

| Vai trò | Tài khoản mẫu | Quyền hạn chính |
| :--- | :--- | :--- |
| **Khách hàng** | Khách vãng lai hoặc `khach@mocmien.local` / `Password123!` | Xem/lọc 65 mẫu hoa, hỏi Mộc Miên AI, giỏ hàng, áp mã giảm giá, đặt hàng COD/QR, gửi ảnh bill, tra cứu/hủy đơn, chat với nhân viên |
| **Nhân viên** | `nhanvien1@mocmien.local` / `12346755` | Xem tổng quan vận hành, cập nhật trạng thái giao hàng, xem bill & xác nhận thu tiền, cộng tồn kho, thêm mẫu hoa mới, trả lời nhanh chat khách |
| **Quản trị (Admin)** | `admin@mocmien.local` / `123456789` | Toàn quyền: thống kê doanh thu Ngày/Tháng/Năm, thêm/sửa/ẩn/hiện/xóa sản phẩm, quản lý danh mục, nhập kho, xuất Excel, quản lý khách hàng/nhân viên, xem lịch sử AI |
