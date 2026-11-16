# Mô Tả Chi Tiết Quá Trình Thực Hiện Đồ Án (Từ Khởi Đầu Đến Hoàn Thiện)

- **Đề tài:** Xây dựng hệ thống Web bán hoa tươi thông minh **Mộc Miên Flower Shop** tích hợp Trợ lý AI tư vấn theo ngữ cảnh  
- **Học phần:** Phương Pháp Lập Trình Dựa Trên AI (*AI-based Programming Methods*)  
- **Sinh viên thực hiện:** Phan Duyên Anh — **GVHD:** Trần Thanh Bình  
- **Link Web thực tế (Vercel):** https://moc-mien-flower-shop.vercel.app  
- **Link Mã nguồn (GitHub):** https://github.com/duyeenanh/-n-AI  

---

## Giai đoạn 1: Xây dựng dữ liệu & Giao diện cửa hàng hoa Mộc Miên
- **Chuẩn hóa dữ liệu gốc (`src/data/products.js`):** Biên tập 65 mẫu hoa tươi tiếng Việt chia theo các danh mục (*Hoa hồng, Tulip nhập khẩu, Bó hoa, Hoa ly, Chậu & dịp đặc biệt, Hoa tốt nghiệp*) với đầy đủ tên, giá bán, loài hoa, số lượng cành, màu sắc và dịp tặng.
- **Chuẩn bị hình ảnh (`public/flowers/`):** Sưu tầm và nén ảnh PNG từ nguồn mở hợp pháp (Wikimedia Commons & Unsplash), ghi rõ giấy phép tại `public/flowers/IMAGE-CREDITS.md`.
- **Xây dựng Frontend (`React 18 + Vite 6`):**
  - Giao diện bán hàng responsive trong `src/App.jsx`, tìm kiếm & lọc theo danh mục, yêu thích, đánh giá sao.
  - Giỏ hàng hỗ trợ mã giảm giá (`MOCMIEN10`, `HOATUOI50K`, `FREESHIP`) và miễn phí ship cho đơn từ `600.000₫`.
  - Luồng thanh toán hỗ trợ đặt hàng không cần đăng nhập (Guest Checkout), chọn **COD** hoặc **Chuyển khoản QR MB Bank**, tải ảnh biên lai có tự động nén ảnh (`PaymentProof.jsx`, `imageFile.js`), xem/in hóa đơn (`OrderInvoice.jsx`), tra cứu và hủy đơn hàng.

---

## Giai đoạn 2: Chuyển đổi Cơ sở dữ liệu sang Supabase PostgreSQL & Chuẩn bị Serverless
- **Chuyển đổi Database:** Nâng cấp Backend (`server/db.js`, `server/schema.sql`, `server/seed.js`, `server/index.js`) từ MySQL sang **PostgreSQL trên đám mây Supabase** sử dụng thư viện `pg` và SSL qua **Transaction Pooler (cổng 6543)**.
- **Khởi tạo & Nạp dữ liệu:** Chạy `npm run db:seed` để tự động tạo các bảng (`users`, `categories`, `products`, `orders`, `order_items`, `order_status_history`, `stock_receipts`, `rag_documents`, `ai_messages`, `conversations`, `chat_messages`...) và nạp đủ **65 sản phẩm + tài khoản Admin/Nhân viên** lên Supabase.
- **Cấu hình Vercel Serverless:** Bổ sung `api/index.js` và `vercel.json` để toàn bộ giao diện React (`dist/`) và API Express (`/api/*`) chạy chung trên nền tảng Vercel.

---

## Giai đoạn 3: Hoàn thiện Phân hệ Quản trị (Admin), Nhân viên (Staff) & Trải nghiệm AI
- **Admin Dashboard (`src/components/AdminDashboard.jsx`):**
  - Hoàn thiện thống kê doanh thu (Ngày/Tháng/Năm), top sản phẩm bán chạy, quản lý sản phẩm (thêm, sửa, ẩn, **Hiện lại**, xóa), quản lý danh mục, lập phiếu nhập kho và **Cộng kho (+)**.
  - Bổ sung tính năng **Xuất Excel (`.xlsx`)** cho bảng tồn kho và bảng đơn hàng (`src/utils/exportInventory.js`).
  - Bổ sung tab **Khách hàng** (thống kê số đơn & tổng chi tiêu) và tab **Lịch sử AI**.
- **Staff Dashboard (`src/components/StaffDashboard.jsx`):**
  - Hoàn thiện quản lý đơn hàng, đối soát ảnh bill, xác nhận thu tiền, cộng tồn kho và bổ sung các nút **trả lời nhanh (Quick Replies)** khi chat hỗ trợ khách hàng.
- **Trải nghiệm người dùng:** Thêm nút nổi **“Hỏi Mộc Miên AI”** ở góc phải dưới màn hình để khách hàng mở tư vấn nhanh tại mọi vị trí trên trang.

---

## Giai đoạn 4: Đồng bộ hoàn chỉnh chế độ chạy Local (0-API)
- Xây dựng bộ giả lập API trên `localStorage` (`src/utils/localApi.js` kết hợp `src/api.js`) giúp toàn bộ hệ thống chạy mượt mà ngay cả khi không có máy chủ:
  - Xử lý đặt hàng Local + trừ tồn kho trực tiếp, sửa lỗi nút gửi đơn & hiển thị mã QR khi chọn chuyển khoản.
  - Bổ sung đầy đủ các endpoint Local cho: tải & xem ảnh biên lai (`/orders/:id/payment-proof`), báo chuyển khoản (`/orders/:id/report-payment`), hủy đơn (`/orders/:id/cancel`), xác nhận thu tiền (`/payments/:id/confirm`), ghi log lịch sử hỏi đáp AI (`moc-local-ai-history`), tính số đơn & chi tiêu thực tế của khách hàng, và thêm sản phẩm từ Staff.

---

## Giai đoạn 5: Nâng cấp Mộc Miên AI thành Engine chuyên biệt cho tiệm hoa
- Nâng cấp `src/utils/localAi.js` và `src/App.jsx` theo kiến trúc 4 tầng:
  1. **Phân loại ý định (`classifyIntent`) & Tri thức cửa hàng (`POLICY_KNOWLEDGE`):** Trả lời tức thì các câu hỏi chào hỏi, cảm ơn, mã giảm giá, phí ship, thanh toán QR/COD, cách bảo quản hoa tươi và thông tin liên hệ.
  2. **Bản đồ ngữ nghĩa ngành hoa (`DOMAIN_ONTOLOGY`):** Tự động hiểu dịp tặng và người nhận (*tặng mẹ, bạn gái, sinh nhật, tốt nghiệp, khai trương*) để mở rộng đúng loài hoa phù hợp, kết hợp nhận diện màu sắc và phân khúc giá (*rẻ/sinh viên* hoặc *sang trọng*).
  3. **Ngữ cảnh hội thoại nhiều lượt (`inferContextFromHistory`):** Ghi nhớ ngân sách và ngữ cảnh từ các câu hỏi trước khi khách hỏi nối tiếp (ví dụ: *"Có màu trắng không?"*, *"Rẻ hơn chút đi"*).
  4. **Trích xuất ngân sách tiếng Việt + TF-IDF & Cosine Similarity + XAI:** Phân biệt chính xác số tiền (*500k*, *1,5 triệu*) với số cành (*10 cành*), lọc cứng `stock > 0` và `price <= budget`, hiển thị nhãn ý định (`🎯`), lý do gợi ý và nút **`+ Giỏ`** ngay trong khung chat.
- **Kiểm thử tự động:** Chạy `npm test` (`tests/ai-budget.test.js`) đạt **14/14 test pass (100%)** và `npm run build` thành công.

---

## Giai đoạn 6: Đưa lên GitHub, Deploy Vercel & Hoàn thiện Báo cáo
- **GitHub & Bảo mật:** Khởi tạo Git, kiểm tra `.gitignore` để loại trừ hoàn toàn `.env`, đẩy toàn bộ mã nguồn sạch lên `https://github.com/duyeenanh/-n-AI`.
- **Deploy Production (Vercel + Supabase):** Kết nối repo GitHub với Vercel, cấu hình biến môi trường (`DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET`...), đưa website lên mạng tại **`https://moc-mien-flower-shop.vercel.app`**.
- **Sửa lỗi thực tế sau Deploy:** Phát hiện và khắc phục lỗi thiếu state `customers` trong `AdminDashboard.jsx` gây trắng trang khi bấm tab *Khách hàng*, cập nhật lại GitHub để Vercel tự động deploy bản chuẩn.
- **Hoàn thiện tài liệu nộp bài:**
  - Cập nhật [README.md](../README.md) chuẩn dự án Full-stack & AI.
  - Viết lại toàn bộ báo cáo 5 chương tại [docs/BAO-CAO-DO-AN.md](./BAO-CAO-DO-AN.md) và xuất file Word giữ nguyên trang bìa Trường ĐH Phú Xuân tại `BAO-CAO-DO-AN-HOAN-CHINH.docx`.
