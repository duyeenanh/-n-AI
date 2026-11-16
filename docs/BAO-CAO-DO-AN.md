BỘ GIÁO DỤC VÀ ĐÀO TẠO  
**TRƯỜNG ĐẠI HỌC PHÚ XUÂN**  

---

**NGÀNH CÔNG NGHỆ THÔNG TIN**  

# BÁO CÁO ĐỒ ÁN HỌC PHẦN
**Học phần:** Phương Pháp Lập Trình Dựa Trên AI *(AI-based Programming Methods)*  

**Đề tài:**  
## Xây Dựng Hệ Thống Web Bán Hoa Tươi Thông Minh Mộc Miên Tích Hợp Trợ Lý AI Tư Vấn Theo Ngữ Cảnh

- **Giảng viên hướng dẫn:** Trần Thanh Bình  
- **Sinh viên thực hiện:** Phan Duyên Anh  
- **Học kỳ:** Spring — **Năm học:** 2026 – 2027  
- **Địa chỉ triển khai thực tế (Production):** https://moc-mien-flower-shop.vercel.app  
- **Mã nguồn GitHub:** https://github.com/duyeenanh/-n-AI  

*Huế, 2026*

---

## MỤC LỤC

- **CHƯƠNG 1: MỞ ĐẦU**
  - 1.1. Lý do chọn đề tài và tính cấp thiết
  - 1.2. Mục tiêu và nhiệm vụ nghiên cứu
  - 1.3. Đối tượng và phạm vi nghiên cứu
  - 1.4. Kết cấu của báo cáo
- **CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG**
  - 2.1. Tổng quan về React 18 và Vite trong phát triển Web hiện đại
  - 2.2. Kiến trúc Full-stack Serverless (Express.js, Vercel & Supabase PostgreSQL)
  - 2.3. Cơ sở lý thuyết về Trợ lý AI: TF-IDF, Cosine Similarity, RAG & Explainable AI (XAI)
  - 2.4. Các thư viện và công nghệ bổ trợ (JWT, Bcrypt, Zod, Write-Excel-File)
- **CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG**
  - 3.1. Phân tích yêu cầu người dùng (Use-case)
  - 3.2. Phân hệ Khách hàng: Mua sắm, QR thanh toán và Mộc Miên AI
  - 3.3. Phân hệ Nhân viên: Xử lý đơn hàng, tồn kho và chăm sóc khách hàng
  - 3.4. Phân hệ Admin: Quản trị danh mục, nhập kho, đối soát và lịch sử AI
  - 3.5. Thiết kế cơ sở dữ liệu PostgreSQL trên Supabase
  - 3.6. Thiết kế giao diện người dùng (UI/UX)
- **CHƯƠNG 4: TRIỂN KHAI THỰC TIỄN VÀ KẾT QUẢ**
  - 4.1. Xây dựng Engine Mộc Miên AI: Phân loại ý định, Ontology & TF-IDF đa lượt
  - 4.2. Thuật toán trích xuất ngân sách tiếng Việt và lọc ràng buộc tồn kho
  - 4.3. Quy trình đặt hàng, mã giảm giá, thanh toán QR và biên lai chuyển khoản
  - 4.4. Triển khai phân hệ Nhân viên, Admin và xuất báo cáo Excel
  - 4.5. Triển khai hệ thống lên Vercel & Supabase PostgreSQL
- **CHƯƠNG 5: ĐÁNH GIÁ VÀ KẾT LUẬN**
  - 5.1. Kết quả đạt được và kiểm thử tự động
  - 5.2. Những hạn chế và khó khăn trong quá trình thực hiện
  - 5.3. Bài học kinh nghiệm
  - 5.4. Hướng phát triển của đề tài trong tương lai
- **DANH MỤC TÀI LIỆU THAM KHẢO**

---

## CHƯƠNG 1: MỞ ĐẦU

### 1.1. Lý do chọn đề tài và tính cấp thiết

#### Tính cấp thiết
Trong bối cảnh thương mại điện tử và trí tuệ nhân tạo (AI) phát triển mạnh mẽ, hành vi mua sắm trực tuyến của người tiêu dùng ngày càng đòi hỏi tính cá nhân hóa và tốc độ phản hồi tức thì. Đối với ngành kinh doanh hoa tươi nghệ thuật — lĩnh vực gắn liền với cảm xúc, dịp tặng và yêu cầu thẩm mỹ cao — khách hàng thường gặp khó khăn khi phải tự tìm kiếm giữa hàng chục mẫu hoa khác nhau để chọn được bó hoa vừa đúng thông điệp (tặng mẹ, tỏ tình, sinh nhật, tốt nghiệp), vừa đúng ngân sách dự kiến.

Các website bán hoa truyền thống hiện nay đa phần chỉ dừng lại ở việc hiển thị danh mục tĩnh và lọc giá cơ bản, thiếu đi một hệ thống tư vấn thông minh gắn liền với dữ liệu tồn kho thực tế. Đồng thời, nhiều chatbot dùng LLM thuần túy dễ gặp tình trạng "ảo giác" (bịa ra mẫu hoa không có trong cửa hàng hoặc tư vấn sản phẩm đã hết hàng). Vì vậy, việc xây dựng một hệ thống web bán hoa hoàn chỉnh kết hợp **Trợ lý AI bám sát dữ liệu danh mục (Catalog-grounded AI / RAG)** là yêu cầu rất thiết thực.

#### Lý do chọn đề tài
Xuất phát từ định hướng ứng dụng phương pháp lập trình dựa trên AI vào bài toán thương mại thực tế, tác giả lựa chọn đề tài: **“Xây dựng hệ thống Web bán hoa tươi thông minh Mộc Miên tích hợp Trợ lý AI tư vấn theo ngữ cảnh”**.

Hệ thống giải quyết đồng thời 3 bài toán cốt lõi:
- **Đối với Khách hàng:** Trải nghiệm giao diện tối giản sang trọng trên mọi thiết bị; tích hợp trợ lý ảo **Mộc Miên AI** hiểu tiếng Việt tự nhiên, nhớ ngữ cảnh hội thoại nhiều lượt, giải thích minh bạch lý do gợi ý (XAI) và hỗ trợ đặt hàng nhanh (không bắt buộc đăng nhập), áp mã giảm giá, thanh toán COD hoặc quét mã QR chuyển khoản.
- **Đối với Nhân viên:** Số hóa quy trình tiếp nhận đơn, cập nhật trạng thái giao hàng, kiểm tra/bổ sung tồn kho, đối soát ảnh biên lai chuyển khoản và phản hồi tin nhắn khách hàng theo thời gian thực.
- **Đối với Người quản trị (Admin):** Theo dõi doanh thu theo ngày/tháng/năm, quản lý sản phẩm (thêm, sửa, ẩn/hiện, xóa), lập phiếu nhập kho, quản lý danh mục, nhân viên, khách hàng, xuất file Excel kho hàng/đơn hàng và theo dõi lịch sử tư vấn AI.

### 1.2. Mục tiêu và nhiệm vụ nghiên cứu

#### Mục tiêu
Xây dựng hoàn chỉnh hệ thống Web Full-stack **Mộc Miên Flower Shop** vận hành trực tuyến trên nền tảng **Vercel + Supabase PostgreSQL**, đồng thời có cơ chế **Local AI Engine (0-API)** giúp trợ lý ảo hoạt động chính xác, nhanh chóng ngay cả khi không phụ thuộc khóa API bên thứ ba.

#### Nhiệm vụ nghiên cứu
1. Thiết kế giao diện Web hiện đại bằng **React 18 + Vite**, tối ưu trải nghiệm cho cả máy tính và điện thoại.
2. Xây dựng mô hình **Mộc Miên AI** kết hợp Phân loại ý định (Intent Classification), Bản đồ ngữ nghĩa ngành hoa (Domain Ontology), Ngữ cảnh đa lượt (Multi-turn Context), thuật toán **TF-IDF + Cosine Similarity** và lọc ràng buộc cứng (ngân sách, tồn kho).
3. Xây dựng Backend REST API với **Node.js / Express 5** kết nối **Supabase PostgreSQL**, triển khai dưới dạng **Vercel Serverless Function**.
4. Hoàn thiện cơ chế kiểm thử tự động (Unit Test) cho bộ trích xuất ngân sách tiếng Việt và pipeline xếp hạng AI.

### 1.3. Đối tượng và phạm vi nghiên cứu

- **Phạm vi chức năng:**
  - **Phân hệ Khách hàng:** Xem và lọc 65 mẫu hoa theo danh mục/từ khóa, yêu thích, đánh giá sao, giỏ hàng, áp mã giảm giá (`MOCMIEN10`, `HOATUOI50K`, `FREESHIP`), đặt hàng, thanh toán COD / QR MB Bank, tải ảnh biên lai (bill), tra cứu & hủy đơn hàng, chat với nhân viên và hỏi **Mộc Miên AI**.
  - **Phân hệ Nhân viên:** Tổng quan vận hành, quản lý đơn hàng, đối soát thanh toán, xem ảnh biên lai, cập nhật & nhập thêm tồn kho, thêm mẫu hoa mới và trả lời nhanh tin nhắn khách hàng.
  - **Phân hệ Quản trị (Admin):** Thống kê doanh thu (ngày/tháng/năm) và sản phẩm bán chạy, quản lý toàn bộ sản phẩm, phiếu nhập kho, danh mục, đơn hàng, khách hàng, nhân viên, lịch sử tư vấn AI và xuất Excel tồn kho / đơn hàng.
- **Phạm vi công nghệ:** Frontend React 18 + Vite 6; Backend Node.js + Express 5; Cơ sở dữ liệu PostgreSQL trên Supabase; Triển khai Production trên Vercel; Kiến trúc dual-mode hỗ trợ cả Server API thật lẫn Local Mode (`localStorage`).
- **Phạm vi dữ liệu:** Bộ dữ liệu chuẩn hóa gồm **65 sản phẩm hoa tươi nghệ thuật**, chia thành **4 danh mục** chính (*Hoa hồng, Tulip nhập khẩu, Bó hoa tươi, Hoa chậu xinh*), kèm đầy đủ thuộc tính loài hoa, số lượng cành, cách gói, màu sắc, dịp tặng và tồn kho.

### 1.4. Kết cấu của báo cáo
Báo cáo gồm 5 chương chính:
- **Chương 1:** Mở đầu (Lý do, mục tiêu, đối tượng và phạm vi nghiên cứu).
- **Chương 2:** Cơ sở lý thuyết và công nghệ sử dụng.
- **Chương 3:** Phân tích và thiết kế hệ thống.
- **Chương 4:** Triển khai thực tiễn và kết quả đạt được.
- **Chương 5:** Đánh giá, kết luận và hướng phát triển.

---

## CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG

### 2.1. Tổng quan về React 18 và Vite trong phát triển Web hiện đại
**React 18** là thư viện xây dựng giao diện người dùng (UI) dựa trên kiến trúc thành phần (Component-based Architecture) và Virtual DOM. Trong đồ án này, giao diện được chia thành các component độc lập và tái sử dụng cao:
- `App.jsx`: Điều phối cửa hàng, bộ lọc, giỏ hàng, luồng thanh toán và hộp thoại **Mộc Miên AI**.
- `AccountPanel.jsx`: Quản lý tài khoản khách hàng, lịch sử đơn, chat với nhân viên và đánh giá sản phẩm.
- `AdminDashboard.jsx` & `StaffDashboard.jsx`: Bảng điều khiển quản trị và nhân viên theo phân quyền.
- `PaymentProof.jsx` & `OrderInvoice.jsx`: Nén/tải ảnh biên lai chuyển khoản và in hóa đơn đơn hàng.

**Vite 6** đóng vai trò là công cụ đóng gói (Build Tool) thế hệ mới sử dụng ES Modules nguyên bản, giúp thời gian khởi động môi trường phát triển tức thì và đóng gói bản Production (`npm run build`) gọn nhẹ (~440 kB JS, ~91 kB CSS).

### 2.2. Kiến trúc Full-stack Serverless (Express.js, Vercel & Supabase PostgreSQL)
Thay vì phải duy trì máy chủ vật lý chạy liên tục, hệ thống áp dụng mô hình **Serverless Full-stack**:
- **Vercel Hosting & Serverless (`api/index.js`, `vercel.json`):** Toàn bộ mã nguồn Frontend tĩnh (`dist/`) được phân phối qua CDN toàn cầu của Vercel, đồng thời mọi yêu cầu `/api/*` được định tuyến về Express app chạy dưới dạng Vercel Serverless Function.
- **Supabase PostgreSQL (`server/db.js`, `server/schema.sql`):** Cơ sở dữ liệu quan hệ PostgreSQL được lưu trữ trên đám mây Supabase, kết nối qua **Transaction Pooler (cổng 6543)** với SSL để đảm bảo hiệu năng và độ ổn định trong môi trường Serverless.

```text
┌─────────────────────────────────────────────────────────────────┐
│                    TRÌNH DUYỆT (CLIENT - REACT)                 │
│  Cửa hàng 65 mẫu hoa · Giỏ hàng · QR · Mộc Miên AI (Local/RAG) │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / REST API (/api/*)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                 VERCEL SERVERLESS (EXPRESS 5)                   │
│  - Xác thực JWT & Phân quyền (Customer / Staff / Admin)         │
│  - Kiểm tra dữ liệu đầu vào (Zod) & Logic trừ kho nguyên tử     │
│  - RAG & Hybrid AI Retrieval (server/rag.js)                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ PostgreSQL Pooler (SSL :6543)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (POSTGRESQL)                        │
│  users · categories · products · orders · order_items ·         │
│  stock_receipts · rag_documents · ai_messages · conversations   │
└─────────────────────────────────────────────────────────────────┘
```
*Hình 2.1: Kiến trúc tổng thể hệ thống Mộc Miên (React + Vercel + Supabase)*

### 2.3. Cơ sở lý thuyết về Trợ lý AI: TF-IDF, Cosine Similarity, RAG & Explainable AI (XAI)

#### Chuẩn hóa tiếng Việt và Vector hóa TF-IDF
Để AI hiểu chính xác văn bản tiếng Việt có dấu, hệ thống chuẩn hóa Unicode về dạng **NFC** (`normalize('NFC')`), chuyển chữ thường (`toLocaleLowerCase('vi')`), tách từ (tokenization) và loại bỏ từ dừng (stopwords như *“tôi”, “mình”, “muốn”, “tìm”, “bó”, “hoa”...*).
Trọng số của mỗi từ khóa $t$ trong văn bản sản phẩm $d$ được tính theo công thức **TF-IDF**:
$$w_{t,d} = (1 + \log(\text{tf}_{t,d})) \times \left(\log\left(\frac{N + 1}{\text{df}_t + 1}\right) + 1\right)$$
Trong đó $N$ là tổng số sản phẩm đang kinh doanh và $\text{df}_t$ là số sản phẩm chứa từ khóa $t$.

#### Độ tương đồng Cosine (Cosine Similarity)
Độ phù hợp giữa vector câu hỏi $q$ và vector sản phẩm $d$ được đo bằng góc cosine giữa hai vector:
$$\text{similarity}(q, d) = \frac{q \cdot d}{\|q\| \, \|d\|}$$

#### RAG (Retrieval-Augmented Generation) và Explainable AI (XAI)
- **Chống bịa thông tin (Zero Hallucination):** Hệ thống luôn truy xuất ứng viên từ kho hàng thật trước (`stock > 0`, `price <= budget`), sau đó mới tổng hợp câu trả lời.
- **Explainable AI (XAI):** Giao diện hiển thị minh bạch ý định AI nhận diện được (`🎯`), mức ngân sách đã trích xuất (`💰`), số lượng mẫu đạt ràng buộc (`📦`), danh sách token đã phân tích và lý do gợi ý trên từng sản phẩm.

### 2.4. Các thư viện và công nghệ bổ trợ
- **JWT (`jsonwebtoken`) & `bcryptjs`:** Mã hóa mật khẩu bằng Bcrypt và cấp phát token xác thực phiên đăng nhập theo vai trò (`customer`, `staff`, `admin`).
- **Zod (`zod`):** Kiểm tra chặt chẽ dữ liệu đầu vào (validation) tại các API đặt hàng, đăng ký, quản lý sản phẩm và nhập kho.
- **Write-Excel-File (`write-excel-file`):** Xuất trực tiếp danh sách tồn kho và danh sách đơn hàng ra tệp `.xlsx` chuẩn ngay trên trình duyệt.
- **Lucide React (`lucide-react`):** Bộ icon vector sắc nét, đồng nhất cho toàn bộ giao diện cửa hàng và trang quản trị.

---

## CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

### 3.1. Phân tích yêu cầu người dùng (Use-case)
Hệ thống phân tách rõ ràng quyền hạn và luồng thao tác cho 3 nhóm tác nhân chính: **Khách hàng** (khách vãng lai hoặc đã đăng ký), **Nhân viên** và **Quản trị viên (Admin)**.

### 3.2. Phân hệ Khách hàng: Mua sắm và Mộc Miên AI
- **Tìm kiếm & Bộ lọc thông minh:** Lọc theo danh mục (*Hoa hồng, Tulip nhập khẩu, Bó hoa tươi, Hoa chậu xinh*), tìm kiếm theo tên/loài hoa, xem chi tiết thông số hoa, đánh giá sao và danh sách yêu thích.
- **Trợ lý ảo Mộc Miên AI:** Nút nổi **Hỏi Mộc Miên AI** luôn sẵn sàng ở góc màn hình. Hỗ trợ hỏi đáp tự nhiên về chọn hoa theo dịp, màu sắc, ngân sách, chính sách giao hàng, mã giảm giá và thêm nhanh sản phẩm từ khung chat vào giỏ hàng.
- **Giỏ hàng & Thanh toán:** Tự động tính tạm tính, áp mã giảm giá (`MOCMIEN10`, `HOATUOI50K`, `FREESHIP`), tự động miễn phí giao hàng cho đơn từ 600.000₫, hỗ trợ đặt hàng không cần đăng nhập (Guest Checkout), thanh toán COD hoặc quét mã QR MB Bank và tải ảnh biên lai chuyển khoản (tự động nén ảnh trước khi gửi).
- **Tra cứu & Hủy đơn hàng:** Tra cứu tiến trình đơn theo mã đơn + SĐT, xem/in hóa đơn và tự hủy đơn khi đơn đang ở trạng thái *Chờ xác nhận*.

### 3.3. Phân hệ Nhân viên: Xử lý đơn hàng, tồn kho và chăm sóc khách hàng
- **Tổng quan vận hành:** Theo dõi nhanh số sản phẩm đang bán, tổng tồn kho, sản phẩm sắp hết (≤ 3 bó), đơn đang xử lý và đơn đang giao.
- **Quản lý đơn hàng & Thanh toán:** Cập nhật trạng thái đơn (*Chờ xác nhận → Đã xác nhận → Đang chuẩn bị → Đang giao → Đã giao*), xem ảnh biên lai chuyển khoản của khách và bấm xác nhận đã thu tiền.
- **Quản lý kho & Sản phẩm:** Cập nhật nhanh số lượng tồn kho, cộng thêm số lượng nhập mới và thêm mẫu hoa mới.
- **Chat với khách hàng:** Hộp thư hỗ trợ trực tuyến kèm các mẫu trả lời nhanh (*Quick Replies*).

### 3.4. Phân hệ Admin: Quản trị danh mục, nhập kho, đối soát và lịch sử AI
- **Thống kê doanh thu:** Biểu đồ doanh thu theo Ngày / Tháng / Năm, top sản phẩm bán chạy, tổng đơn hàng và cảnh báo sắp hết hàng.
- **Quản lý sản phẩm & Danh mục:** Thêm, sửa, ẩn (xóa mềm), khôi phục hiển thị (**Hiện lại**) hoặc xóa vĩnh viễn sản phẩm; thêm/sửa/xóa danh mục.
- **Quản lý kho & Nhập hàng:** Điều chỉnh tồn kho trực tiếp, cộng kho nhanh, lập phiếu nhập hàng từ nhà cung cấp và xác nhận nhập kho tự động tăng tồn.
- **Quản lý Khách hàng, Nhân viên & Lịch sử AI:** Xem thống kê số đơn và tổng chi tiêu của từng khách hàng; tạo/sửa/xóa tài khoản nhân viên; xem lại lịch sử tư vấn của **Mộc Miên AI** và xuất báo cáo Excel.

### 3.5. Thiết kế cơ sở dữ liệu PostgreSQL trên Supabase
Cơ sở dữ liệu được thiết kế chuẩn hóa tại `server/schema.sql` với các bảng chính:
- `users`: Lưu thông tin tài khoản, mật khẩu mã hóa Bcrypt và vai trò (`customer`, `staff`, `admin`).
- `categories` & `products`: Lưu danh mục và 65+ sản phẩm hoa cùng tồn kho `stock`, trạng thái `is_active`, thuộc tính `flower_type`, `flower_count`, `wrapping`, `color`, `occasions`.
- `orders`, `order_items`, `order_status_history`: Lưu đơn hàng (hỗ trợ cả khách vãng lai qua `guest_order_token`), chi tiết từng bó hoa, ảnh biên lai (`payment_proof_base64`) và lịch sử thay đổi trạng thái.
- `stock_receipts` & `stock_receipt_items`: Quản lý phiếu nhập hàng từ nhà cung cấp.
- `rag_documents` & `ai_messages`: Lưu tài liệu chỉ mục sản phẩm (văn bản + vector embedding JSONB) và lịch sử hội thoại AI.
- `conversations`, `chat_messages`, `product_reviews`, `favorites`: Phục vụ chat nội bộ, đánh giá sao và sản phẩm yêu thích.

### 3.6. Thiết kế giao diện người dùng (UI/UX)
Giao diện được thiết kế theo phong cách **Editorial Botanical Minimalism** (Tối giản tinh tế):
- **Bảng màu thương hiệu:** Nền kem sứ ấm (`#FAF7F2`), xanh rêu đậm (`#2C3E2D`) kết hợp điểm nhấn vàng đồng và đỏ đất tạo cảm giác sang trọng, tự nhiên đúng tinh thần tiệm hoa thủ công.
- **Bố cục phản hồi (Responsive):** Tự động co giãn mượt mà trên cả màn hình máy tính, máy tính bảng và điện thoại di động.
- **Trải nghiệm tiện lợi:** Nút nổi **Hỏi Mộc Miên AI** đặt cố định ở góc phải dưới giúp khách hàng mở tư vấn tại bất kỳ vị trí nào trên trang.

---

## CHƯƠNG 4: TRIỂN KHAI THỰC TIỄN VÀ KẾT QUẢ

### 4.1. Xây dựng Engine Mộc Miên AI: Phân loại ý định, Ontology & TF-IDF đa lượt
Trong tệp `src/utils/localAi.js`, trợ lý **Mộc Miên AI** được lập trình theo pipeline 4 tầng bài bản:

1. **Tầng 1 — Phân loại ý định (`classifyIntent`):** Phân tách câu hỏi chào hỏi, cảm ơn, hỏi chính sách cửa hàng (mã giảm giá, phí ship, thanh toán QR/COD, bảo quản hoa, liên hệ) với câu hỏi tìm/tư vấn hoa.
2. **Tầng 2 — Ngữ cảnh đa lượt (`inferContextFromHistory`):** Đọc lại tối đa 3 lượt hỏi gần nhất của khách để kế thừa ngân sách hoặc ngữ cảnh dịp tặng khi khách hỏi nối tiếp (ví dụ: *"Có màu trắng không?"*, *"Rẻ hơn chút đi"*).
3. **Tầng 3 — Mở rộng ngữ nghĩa ngành hoa (`expandDomainQuery`):** Áp dụng `DOMAIN_ONTOLOGY` để tự động mở rộng từ khóa cảm xúc/dịp tặng sang loài hoa phù hợp (ví dụ: *“tặng mẹ / cô giáo”* → *cẩm chướng, mẫu đơn, lan hồ điệp, hoa ly, tri ân*; *“bạn gái / tỏ tình”* → *hoa hồng, ohara, tulip, baby, lãng mạn*).
4. **Tầng 4 — Xếp hạng TF-IDF + Cosine & Giải thích XAI:** Tính điểm tương đồng với trọng số từ khóa gốc cao hơn từ mở rộng (`1.5` so với `0.75`), cộng điểm ưu tiên theo màu sắc / phân khúc giá (*rẻ* hoặc *cao cấp*) và sinh lý do gợi ý (`matchReason`) cùng nút **`+ Giỏ`** ngay trong khung chat.

```javascript
// Trích đoạn pipeline tư vấn trong src/utils/localAi.js
const explicitBudget = extractLocalBudget(cleanQuestion);
const { effectiveBudget: budget, inheritedContext } = inferContextFromHistory(
  history,
  explicitBudget,
  cleanQuestion,
);
const { normalized, matchedEntities, expandedText } = expandDomainQuery(combinedQuestion);
// Lọc cứng tồn kho > 0 và giá <= budget trước khi trả về Top 5 gợi ý
const withinBudget = scored.filter((doc) => budget == null || Number(doc.price) <= budget);
```

*[Chèn ảnh chụp màn hình: Hộp thoại Mộc Miên AI tư vấn hoa và hiển thị phân tích XAI + nút + Giỏ]*

### 4.2. Thuật toán trích xuất ngân sách tiếng Việt và lọc ràng buộc tồn kho
Hàm `extractLocalBudget` (trong `src/utils/localAi.js`) và `extractBudget` (trong `server/ai-budget.js`) xử lý chính xác các cách viết tiền tệ tiếng Việt tự nhiên:
- Nhận diện đơn vị `triệu`, `tr`, `nghìn`, `ngàn`, `k`, `đồng`, `đ`, `vnd` (ví dụ: *"tầm 1,5 triệu"* → `1500000`, *"dưới 500k"* → `500000`, *"khoảng 250 ngàn đồng"* → `250000`).
- **Phân biệt số lượng cành hoa với tiền:** Nếu sau con số là các đơn vị đếm như `cành`, `bông`, `nhành`, `chậu`, `giỏ`, `lẵng`, `bó` (ví dụ: *"Hoa 10 cành tặng mẹ"*), hệ thống bỏ qua không hiểu nhầm thành ngân sách.
- Kết hợp lọc cứng `stock > 0` để đảm bảo **0 lỗi** gợi ý sản phẩm hết hàng hoặc vượt ngân sách.

### 4.3. Quy trình đặt hàng, mã giảm giá, thanh toán QR và biên lai chuyển khoản
- **Mã giảm giá (`src/utils/coupons.js`):** Kiểm tra điều kiện đơn tối thiểu và tính mức giảm tự động (`MOCMIEN10`, `HOATUOI50K`, `FREESHIP`).
- **Trừ kho nguyên tử (Atomic Stock Deduction):** Khi khách đặt hàng trên server (`server/index.js`), hệ thống thực hiện trong PostgreSQL Transaction (`UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1`) để chống đặt vượt tồn kho khi có nhiều người mua cùng lúc.
- **Thanh toán QR & Tải ảnh bill (`PaymentProof.jsx`):** Tự động tạo thông tin chuyển khoản kèm nội dung mã đơn hàng (`MM...`) và cho phép khách tải ảnh biên lai (tự nén kích thước bằng Canvas trước khi lưu).

*[Chèn ảnh chụp màn hình: Giao diện đặt hàng thành công kèm mã QR và nút tải ảnh biên lai]*

### 4.4. Triển khai phân hệ Nhân viên, Admin và xuất báo cáo Excel
- **Admin Dashboard (`AdminDashboard.jsx`):** Đầy đủ các tab *Tổng quan, Sản phẩm, Kho & Nhập hàng, Danh mục, Đơn hàng, Chuyển khoản, Khách hàng, Nhân viên, Lịch sử AI*. Tích hợp xuất file `.xlsx` cho bảng tồn kho và bảng đơn hàng qua `src/utils/exportInventory.js`.
- **Staff Dashboard (`StaffDashboard.jsx`):** Tối ưu thao tác nhanh cho nhân viên xử lý đơn, xác nhận thu tiền, cập nhật kho và chat hỗ trợ khách hàng.

*[Chèn ảnh chụp màn hình: Giao diện Admin Dashboard thống kê doanh thu và quản lý đơn hàng]*

### 4.5. Triển khai hệ thống lên Vercel & Supabase PostgreSQL
Hệ thống đã được đóng gói và triển khai hoàn chỉnh lên môi trường Production:
- **Database Supabase:** Khởi tạo bảng và nạp dữ liệu 65 mẫu hoa + tài khoản Admin/Nhân viên qua lệnh `npm run db:seed`.
- **Vercel Production:** Kết nối tự động từ GitHub (`https://github.com/duyeenanh/-n-AI`), cấu hình biến môi trường (`DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET`, `CLIENT_ORIGIN`) và chạy trực tuyến tại **`https://moc-mien-flower-shop.vercel.app`**.

---

## CHƯƠNG 5: ĐÁNH GIÁ VÀ KẾT LUẬN

### 5.1. Kết quả đạt được và kiểm thử tự động
Qua quá trình thiết kế, lập trình và triển khai thực tế, hệ thống **Mộc Miên Flower Shop** đã hoàn thành toàn bộ các mục tiêu đặt ra:
- **Tính hoàn thiện nghiệp vụ:** Đáp ứng khép kín quy trình từ tư vấn AI → chọn hoa → áp mã giảm giá → đặt hàng → thanh toán QR/COD → đối soát biên lai → giao hàng → thống kê doanh thu & xuất Excel.
- **Độ chính xác của AI & Kiểm thử tự động:** Chạy bộ kiểm thử `npm test` (`tests/ai-budget.test.js`) đạt **14/14 test pass (100%)**, bao gồm 10 kịch bản trích xuất ngân sách tiếng Việt, kiểm tra lọc ràng buộc giá/tồn kho, xử lý truy vấn không liên quan và cơ chế fallback an toàn khi API AI ngoài gặp lỗi.
- **Đóng gói & Vận hành ổn định:** Lệnh `npm run build` hoàn tất trong ~2.0 giây, ứng dụng hoạt động ổn định trên Vercel kết nối cơ sở dữ liệu thật Supabase PostgreSQL.

### 5.2. Những hạn chế và khó khăn trong quá trình thực hiện
- **Giới hạn của tìm kiếm từ khóa thuần túy khi không có LLM:** Dù đã bổ sung `DOMAIN_ONTOLOGY` và ngữ cảnh nhiều lượt, các câu hỏi quá dài hoặc ẩn dụ phức tạp vẫn đạt độ tự nhiên cao hơn khi kết hợp thêm API LLM + Vector Embeddings.
- **Cổng thanh toán tự động:** Quy trình chuyển khoản hiện sử dụng mã QR tĩnh và đối soát thủ công qua ảnh biên lai từ Nhân viên/Admin, chưa tích hợp webhook tự động của ngân hàng (VietQR/PayOS) hoặc ví điện tử (MoMo, VNPay).
- **Thông báo thời gian thực:** Tin nhắn và trạng thái đơn hàng cập nhật qua cơ chế làm mới API định kỳ, chưa sử dụng WebSocket.

### 5.3. Bài học kinh nghiệm
- Nắm vững cách xây dựng hệ thống **Web Full-stack hiện đại** (React + Express + PostgreSQL) và triển khai thực tế lên **Vercel + Supabase**.
- Hiểu sâu cách kết hợp **AI cổ điển (TF-IDF, Cosine Similarity, Rule-based Ontology)** với ràng buộc nghiệp vụ để tạo ra Trợ lý AI nhanh, miễn phí 0-API và không bịa thông tin.
- Rèn luyện tư duy thiết kế giao diện thân thiện, xử lý đồng bộ dữ liệu (trừ kho, hoàn kho khi hủy đơn) và kiểm thử tự động trước khi đưa sản phẩm lên Production.

### 5.4. Hướng phát triển của đề tài trong tương lai
1. **Tích hợp đối soát thanh toán tự động (Webhook VietQR / PayOS / MoMo):** Tự động chuyển trạng thái `paid` ngay sau khi khách chuyển khoản thành công.
2. **Nâng cấp Vector Search với `pgvector` trên Supabase:** Kết hợp tìm kiếm ngữ nghĩa sâu (Dense Embeddings) trực tiếp trong PostgreSQL.
3. **Thông báo đẩy & WebSocket (Realtime):** Sử dụng Supabase Realtime để cập nhật tức thì đơn hàng mới và tin nhắn chat giữa khách hàng với nhân viên.
4. **Cá nhân hóa gợi ý theo lịch sử mua sắm:** Tự động nhắc lịch các dịp lễ/sinh nhật người thân của khách hàng đã từng đặt hoa.

---

## DANH MỤC TÀI LIỆU THAM KHẢO

1. React Documentation — *React 18 Reference & Hooks*, https://react.dev
2. Vite Documentation — *Next Generation Frontend Tooling*, https://vite.dev
3. Vercel Documentation — *Serverless Functions & Deployment Configuration*, https://vercel.com/docs
4. Supabase Documentation — *PostgreSQL Database & Connection Pooling*, https://supabase.com/docs
5. Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze — *Introduction to Information Retrieval (TF-IDF & Vector Space Model / Cosine Similarity)*, Cambridge University Press.
6. Express.js Documentation — *Routing & Middleware in Express 5*, https://expressjs.com
