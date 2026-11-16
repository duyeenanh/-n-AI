# 🌸 Mộc Miên — Flower Studio (AI-Powered E-Commerce)

> **Đồ án học phần:** Phương Pháp Lập Trình Dựa Trên AI (*AI-based Programming Methods*)  
> **Trường Đại học Phú Xuân** — Ngành Công nghệ Thông tin  
> **Sinh viên thực hiện:** Phan Duyên Anh | **GVHD:** Trần Thanh Bình  

- 🌐 **Website triển khai thực tế (Vercel Production):** [https://moc-mien-flower-shop.vercel.app](https://moc-mien-flower-shop.vercel.app)  
- 📦 **Mã nguồn GitHub:** [https://github.com/duyeenanh/-n-AI](https://github.com/duyeenanh/-n-AI)  
- 📄 **Báo cáo đồ án (Markdown & Word):** [`docs/BAO-CAO-DO-AN.md`](./docs/BAO-CAO-DO-AN.md) | [`BAO-CAO-DO-AN-HOAN-CHINH.docx`](./BAO-CAO-DO-AN-HOAN-CHINH.docx)  

---

## 1. Giới thiệu đề tài

**Mộc Miên Flower Studio** là hệ thống website thương mại điện tử bán hoa tươi nghệ thuật tích hợp **Trợ lý ảo Mộc Miên AI** tư vấn theo ngữ cảnh tiếng Việt. Hệ thống kết hợp kiến trúc **Full-stack Serverless (React + Express + Vercel + Supabase PostgreSQL)** với pipeline **Truy xuất thông tin giải thích được (Explainable AI / RAG)** giúp:
- Gợi ý đúng mẫu hoa theo **dịp tặng, người nhận, màu sắc và ngân sách** (ví dụ: *“Tặng mẹ ngân sách 500k”*, *“Hoa tốt nghiệp giá sinh viên”*).
- **Chống ảo giác (Zero Hallucination):** Chỉ gợi ý các sản phẩm đang còn hàng trong kho (`stock > 0`) và nằm trong ngân sách (`price <= budget`).
- Hỗ trợ **2 chế độ vận hành linh hoạt:** Chạy trực tuyến với cơ sở dữ liệu đám mây **Supabase PostgreSQL** hoặc chạy **100% Local (0-API)** ngay trên trình duyệt.

---

## 2. Công nghệ sử dụng (Tech Stack)

| Tầng hệ thống | Công nghệ & Thư viện | Vai trò trong dự án |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 6, Lucide React | Giao diện cửa hàng, giỏ hàng, thanh toán QR, khung chat AI, Admin & Staff Dashboard |
| **Backend API** | Node.js, Express 5 (`server/index.js`, `api/index.js`) | RESTful API, kiểm tra dữ liệu đầu vào (`zod`), chạy được cả Local và Vercel Serverless |
| **Cơ sở dữ liệu** | Supabase PostgreSQL (`pg`, `server/schema.sql`) | Lưu trữ người dùng, danh mục, 65 mẫu hoa, đơn hàng, phiếu nhập kho, vector RAG & lịch sử AI |
| **AI & RAG Engine** | `src/utils/localAi.js`, `server/rag.js`, `server/ai-budget.js` | Phân loại ý định, Bản đồ ngữ nghĩa ngành hoa (Ontology), TF-IDF + Cosine Similarity, lọc ngân sách & tồn kho, kết nối tùy chọn Gemini API |
| **Bảo mật & Tiện ích** | `jsonwebtoken` (JWT), `bcryptjs`, `write-excel-file` | Xác thực phân quyền 3 vai trò (`customer`, `staff`, `admin`) và xuất báo cáo Excel (`.xlsx`) |

---

## 3. Kiến trúc Trợ lý Mộc Miên AI

Pipeline AI của hệ thống gồm 4 bước xử lý minh bạch:
1. **Phân loại ý định (`classifyIntent`) & Tri thức cửa hàng:** Nhận diện câu hỏi về *mã giảm giá, phí giao hàng, thanh toán QR/COD, cách bảo quản hoa* hoặc *tư vấn chọn hoa*.
2. **Ngữ cảnh đa lượt (`inferContextFromHistory`) & Mở rộng ngữ nghĩa (`DOMAIN_ONTOLOGY`):** Tự động kế thừa ngân sách từ câu hỏi trước khi khách hỏi nối tiếp (*“Có màu trắng không?”*) và mở rộng từ khóa theo dịp tặng (*tặng mẹ* → *cẩm chướng, mẫu đơn, lan, ly*).
3. **Trích xuất ngân sách tiếng Việt (`extractLocalBudget` / `extractBudget`):** Hiểu các cách viết *“500k”*, *“1,5 triệu”*, *“250 ngàn đồng”* và phân biệt chính xác với số lượng cành (*“10 cành”*).
4. **Xếp hạng TF-IDF + Cosine Similarity & Giải thích XAI:** Chấm điểm tương đồng, lọc cứng `stock > 0` và `price <= budget`, hiển thị rõ nhãn ý định (`🎯`), ngân sách (`💰`), số mẫu đạt chuẩn (`📦`) và nút **`+ Giỏ`** ngay trong khung chat.

---

## 4. Tính năng theo 3 phân hệ người dùng

- **Khách hàng:**
  - Duyệt và lọc **65 mẫu hoa** thuộc 4 danh mục (*Hoa hồng, Tulip nhập khẩu, Bó hoa tươi, Hoa chậu xinh*), yêu thích và đánh giá sao.
  - Hỏi đáp với **Mộc Miên AI**, xem giải thích XAI và thêm nhanh sản phẩm vào giỏ hàng.
  - Áp mã giảm giá (`MOCMIEN10`, `HOATUOI50K`, `FREESHIP`), miễn phí giao hàng cho đơn từ `600.000₫`.
  - Đặt hàng nhanh không cần đăng nhập (Guest Checkout), chọn **COD** hoặc **Chuyển khoản QR MB Bank**, tải ảnh biên lai (tự động nén ảnh qua Canvas), xem/in hóa đơn, tra cứu và hủy đơn hàng.
- **Nhân viên (Staff Portal):**
  - Theo dõi tổng quan đơn hàng & tồn kho, cập nhật tiến trình giao hàng (*Chờ xác nhận → Đã xác nhận → Đang chuẩn bị → Đang giao → Đã giao*).
  - Xem ảnh bill chuyển khoản, xác nhận đã thu tiền, cộng tồn kho và trả lời nhanh tin nhắn khách hàng.
- **Quản trị viên (Admin Dashboard):**
  - Thống kê doanh thu theo Ngày / Tháng / Năm và top sản phẩm bán chạy.
  - Quản lý sản phẩm (thêm, sửa, ẩn, hiện lại, xóa), quản lý danh mục, lập phiếu nhập hàng từ nhà cung cấp, quản lý nhân viên, khách hàng, xem lịch sử tư vấn AI và **xuất báo cáo Excel (`.xlsx`)** tồn kho / đơn hàng.

---

## 5. Tài khoản Demo

| Vai trò | Email đăng nhập | Mật khẩu |
| :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@mocmien.local` | `123456789` |
| **Nhân viên 1 (Staff)** | `nhanvien1@mocmien.local` | `12346755` |
| **Nhân viên 2 (Staff)** | `nhanvien2@mocmien.local` | `67891211` |
| **Nhân viên 3 (Staff)** | `nhanvien3@mocmien.local` | `2345660` |
| **Khách hàng mẫu** | `khach@mocmien.local` | `Password123!` |

**Mã giảm giá dùng thử ở Giỏ hàng:**
- `MOCMIEN10`: Giảm 10% (tối đa 80.000₫)
- `HOATUOI50K`: Giảm 50.000₫ cho đơn từ 500.000₫
- `FREESHIP`: Miễn phí vận chuyển 30.000₫

---

## 6. Hướng dẫn cài đặt và chạy dự án

### Cách 1: Chạy nhanh chế độ Local (100% không cần cấu hình Database/API)
```powershell
npm install
npm run dev
```
Mở trình duyệt tại `http://127.0.0.1:5173`.

### Cách 2: Chạy Full-stack kết nối Supabase PostgreSQL
1. Tạo file `.env` từ `.env.example` và điền chuỗi kết nối Supabase (`DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET`):
   ```powershell
   Copy-Item .env.example .env
   ```
2. Khởi tạo bảng và nạp 65 mẫu hoa + tài khoản Admin/Nhân viên lên Supabase:
   ```powershell
   npm run db:seed
   ```
3. Chạy đồng thời Backend Express (`:3001`) và Frontend Vite (`:5173`):
   ```powershell
   npm run dev:full
   ```

### Kiểm thử & Đóng gói Production
```powershell
npm test          # Chạy 14/14 Unit Test kiểm tra trích xuất ngân sách & xếp hạng AI
npm run build     # Đóng gói bản Production vào thư mục dist/
```

---

## 7. Cấu trúc thư mục chính

```text
├── api/
│   └── index.js                # Entrypoint Serverless Function trên Vercel
├── docs/
│   ├── AI-ARCHITECTURE.md      # Tài liệu kiến trúc AI & RAG
│   ├── AI-EVALUATION.md        # Báo cáo đánh giá độ chính xác AI
│   └── BAO-CAO-DO-AN.md        # Nội dung báo cáo đồ án 5 chương
├── public/
│   ├── flowers/                # Bộ ảnh 65 mẫu hoa tươi
│   └── qr-chuyen-khoan.png     # Mã QR thanh toán ngân hàng
├── server/
│   ├── ai-budget.js            # Bộ trích xuất ngân sách tiếng Việt (Backend)
│   ├── auth.js                 # Xác thực JWT & middleware phân quyền
│   ├── db.js                   # Kết nối PostgreSQL Pool (Supabase)
│   ├── index.js                # Express REST API Server
│   ├── rag.js                  # Pipeline TF-IDF, Cosine Similarity & RAG
│   ├── schema.sql              # Cấu trúc bảng PostgreSQL
│   └── seed.js                 # Script tạo bảng & nạp dữ liệu mẫu
├── src/
│   ├── components/             # AdminDashboard, StaffDashboard, AccountPanel, PaymentProof, OrderInvoice
│   ├── data/products.js        # Dữ liệu chuẩn 65 sản phẩm & 4 danh mục
│   ├── utils/localAi.js        # Engine Mộc Miên AI (Intent, Ontology, TF-IDF, XAI)
│   ├── utils/localApi.js       # Bộ giả lập API & LocalStorage khi chạy 0-API
│   ├── App.jsx                 # Giao diện cửa hàng chính & hộp thoại Mộc Miên AI
│   └── api.js                  # Client gọi API kèm cơ chế tự động fallback Local
├── tests/
│   └── ai-budget.test.js       # 14 bài kiểm thử tự động cho AI
└── vercel.json                 # Cấu hình định tuyến Frontend & Serverless API trên Vercel
```
