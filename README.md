# Mộc Miên — Flower Studio

Đồ án website bán hoa xây dựng bằng React, Express, MySQL và AI tư vấn sản phẩm, định hướng môn **AI-based Programming Methods**. Trọng tâm AI là một pipeline truy xuất giải thích được (TF-IDF, cosine similarity, lọc ràng buộc và RAG), có thể chạy nội bộ; dịch vụ embedding/LLM là phần mở rộng tùy chọn.

## Công nghệ

- React + Vite: cửa hàng responsive, sản phẩm, tìm kiếm/lọc, yêu thích, giỏ hàng, so sánh và các màn hình tài khoản/quản trị.
- Node.js + Express: REST API, kiểm tra dữ liệu bằng Zod, xác thực JWT và phân quyền khách hàng/nhân viên/quản trị.
- MySQL 8: người dùng, danh mục, sản phẩm/kho, đơn hàng, dòng đơn, lịch sử trạng thái, thanh toán và hội thoại AI.
- AI/RAG: xếp hạng sản phẩm bằng TF-IDF và cosine similarity; tùy chọn kết hợp embedding và mô hình chat để tạo câu trả lời dựa trên sản phẩm được truy xuất.

## Chạy trên Windows

Yêu cầu Node.js 20 trở lên và MySQL 8 đang chạy.

1. Mở PowerShell tại thư mục dự án và cài thư viện:

   ```powershell
   npm install
   Copy-Item .env.example .env
   ```

2. Mở `.env`, nhập mật khẩu MySQL và một `JWT_SECRET` dài, ngẫu nhiên. Nếu dùng MySQL không phải `root`, sửa `DB_USER`/`DB_PASSWORD`. Đặt `ADMIN_PASSWORD` mới trước khi đưa dự án lên mạng. Cấu hình AI provider là tùy chọn; không gửi khóa bí mật lên chat hoặc đưa vào mã nguồn.
3. Khởi tạo schema, 65 sản phẩm mẫu, danh mục (bao gồm hoa tốt nghiệp), và tài khoản quản trị:

   ```powershell
   npm run db:seed
   ```
   Sau khi cập nhật danh mục sản phẩm mẫu, dùng `npm run db:catalog` để thêm mẫu mới vào MySQL mà không thay đổi tài khoản quản trị/nhân viên. Tồn kho hiện tại của sản phẩm đã có sẽ được giữ nguyên. Khách có thể yêu cầu viết lời nhắn lên thiệp chúc mừng miễn phí khi đặt hoa.

   Lệnh này tạo cơ sở dữ liệu `moc_mien` nếu người dùng MySQL có quyền tạo database. Khi nâng cấp từ phiên bản cũ có đơn hàng, chạy lại `npm run db:seed` để thêm các cột lưu bill chuyển khoản và mã truy cập đơn khách vãng lai.
4. Chạy máy chủ API và giao diện cùng lúc:

   ```powershell
   npm run dev:full
   ```

   Mở địa chỉ Vite, thường là `http://localhost:5173`. Kiểm tra API tại `http://localhost:3001/api/health`.

Tài khoản quản trị mặc định lấy từ `.env.example`: `admin@mocmien.local` / `ChangeMe123!`. Đây là mật khẩu mặc định chỉ dành cho máy cá nhân; hãy đổi trước khi triển khai. Khách hàng đăng ký trực tiếp ở mục Tài khoản.

## Tài khoản nhân viên

Đăng nhập bằng khách hàng rồi chọn **Đăng nhập nhân viên** ở màn hình tài khoản. Quản trị viên vào mục **Tài khoản nhân viên** trong trang quản trị để tạo tài khoản (mật khẩu tối thiểu 12 ký tự) hoặc thu hồi tài khoản. Nhân viên có trang làm việc riêng để kiểm kê số lượng tồn kho, xem đơn và người nhận, theo dõi lịch sử giao hàng, rồi chuyển trạng thái lần lượt: **Chờ xác nhận → Đã xác nhận → Đang chuẩn bị → Đang giao → Đã giao**. Mỗi lần đổi trạng thái được lưu vào lịch sử đơn để khách hàng xem trong tài khoản.

Việc thêm vai trò nhân viên cần cập nhật cấu trúc cơ sở dữ liệu. Chạy `npm run db:seed` một lần sau khi cập nhật phiên bản dự án. Có thể tạo tài khoản nhân viên trong trang quản trị; hoặc khai báo từng bộ `STAFF_1_NAME`, `STAFF_1_EMAIL`, `STAFF_1_PASSWORD` (tương tự cho nhân viên 2 và 3) trong `.env` rồi chạy seed. Mật khẩu ngắn hơn 12 ký tự được cảnh báo là không an toàn.

Tạo bản frontend production bằng `npm run build`; chạy riêng API bằng `npm run server:dev` hoặc `npm run server:start`.

## Tư vấn AI và RAG

Đồ án minh họa pipeline AI có thể chạy ngay cả khi chưa cấu hình dịch vụ AI bên ngoài:

1. **Biểu diễn văn bản:** chuẩn hóa tiếng Việt và tách token trong yêu cầu khách hàng, tên/mô tả/loài hoa/màu sắc/dịp tặng của sản phẩm.
2. **TF-IDF:** tính trọng số từ dựa trên tần suất trong tài liệu và độ hiếm trong toàn bộ danh mục.
3. **Cosine similarity:** xếp hạng mức tương đồng giữa câu hỏi và tài liệu sản phẩm. Ngân sách và tồn kho là điều kiện lọc cứng; hệ thống không gợi ý sản phẩm hết hàng hoặc vượt ngân sách đã nhận diện.
4. **RAG:** lấy tối đa 5 sản phẩm phù hợp làm ngữ cảnh. Khi chưa có API, câu trả lời được tạo theo mẫu từ kết quả truy xuất và được ghi rõ trên giao diện.
5. **LLM tùy chọn:** có thể kết nối Gemini Developer API để diễn đạt câu trả lời dựa trên các sản phẩm truy xuất. Gói miễn phí có giới hạn và điều khoản riêng; xem thông tin hiện hành tại [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing). Khi chưa có khóa, ứng dụng dùng TF-IDF/cosine nội bộ.

Để bật Gemini, tạo API key trong [Google AI Studio](https://aistudio.google.com/apikey), đặt khóa vào `AI_API_KEY` trong `.env`, giữ `AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, `AI_CHAT_MODEL=gemini-3.1-flash-lite` và `AI_EMBEDDINGS_ENABLED=false`, rồi khởi động lại ứng dụng. API key không được đưa vào giao diện hoặc commit vào kho mã. Kiểm tra cấu hình bằng `npm run ai:provider-check`; với cấu hình mặc định chỉ chat, lệnh này gửi một yêu cầu chat thử. Gói miễn phí có giới hạn, có thể thay đổi, và dữ liệu có thể được sử dụng theo điều khoản của Google.

Tìm kiếm sản phẩm vẫn dùng TF-IDF/cosine cục bộ; không cần embeddings hay reindex sau khi cấu hình Gemini. Chatbot dùng Gemini để diễn đạt câu trả lời dựa trên sản phẩm được truy xuất. Giao diện không hiển thị nhãn phương pháp AI.

Quản trị sản phẩm sẽ đồng bộ lại tài liệu RAG sau thao tác thêm/sửa/xóa. Lịch sử tư vấn được lưu cho tài khoản đăng nhập; lời nhắn của khách chưa đăng nhập không được lưu.

### Đánh giá và tài liệu trình bày AI

- Xem sơ đồ kiến trúc, thuật toán, ranh giới dịch vụ và cách kiểm tra chế độ chạy tại [docs/AI-ARCHITECTURE.md](./docs/AI-ARCHITECTURE.md).
- Tập truy vấn tiếng Việt và nhãn sản phẩm phù hợp được lưu tại [evaluation/flower-relevance.json](./evaluation/flower-relevance.json). Nhãn hiện được tuyển chọn thủ công, không phải phản hồi của người dùng.
- Chạy `npm test` để kiểm tra phân tích ngân sách và tránh nhầm số lượng cành với số tiền.
- Chạy `npm run ai:evaluate` khi MySQL đang chạy và đã nạp danh mục để đo Precision@5, Recall@5, MRR và lỗi ràng buộc kho/ngân sách. Bộ đo ép chạy baseline TF-IDF để kết quả không phụ thuộc API hay chi phí LLM.
- Nếu đã tự cấu hình Gemini trong `.env`, chạy `npm run ai:provider-check` để kiểm tra kết nối chat. Với cấu hình embedding được bật, lệnh cũng sẽ kiểm tra embedding. Mỗi request có thể sử dụng hạn mức provider; API key không được in ra terminal.
- Báo cáo phương pháp, công thức chỉ số, kết quả đo và giới hạn nằm trong [docs/AI-EVALUATION.md](./docs/AI-EVALUATION.md).

## Luồng đã triển khai

- Tài khoản đăng ký/đăng nhập, hồ sơ, đổi mật khẩu, yêu thích và lịch sử mua hàng.
- Khách có thể đánh giá từng sản phẩm trong đơn sau khi đơn được đánh dấu **Đã giao**; hỗ trợ chọn nửa sao đến 5 sao, viết nhận xét và cập nhật đánh giá.
- Quản trị sản phẩm, danh mục, tài khoản nhân viên (tạo/sửa/đặt lại mật khẩu/thu hồi), kiểm kê và phiếu nhập hàng có trạng thái **Đang nhập về / Đã nhập kho**. Phiếu chỉ cộng tồn sau khi quản trị viên xác nhận hàng đã về; lịch sử ghi nhà cung cấp, số lượng và giá vốn. Tổng đơn hàng trên trang admin mở danh sách đơn mới nhất trước; tổng số lượng hàng còn kho được hiển thị trong tổng quan.
- Tồn kho được trừ ngay trong transaction khi đơn hàng được tạo thành công. Số liệu kho phía admin/nhân viên tự làm mới định kỳ; sản phẩm hết hàng được đánh dấu và không thể mua. Nhân viên có mục riêng xem hàng hết cùng gợi ý sản phẩm còn tồn để tư vấn thay thế.
- Khu vực nhân viên riêng để kiểm kê tồn kho, xuất báo cáo kiểm kê Excel hằng ngày, theo dõi/cập nhật tiến trình giao hàng và nhắn tin trực tiếp với khách; quản trị viên cũng có thể xuất báo cáo Excel tại mục Quản lý kho. Báo cáo ghi ngày giờ xuất, người xuất, tồn kho và thời điểm cập nhật gần nhất.
- Khách có thể đặt hàng trực tiếp mà không cần đăng nhập hoặc tạo tài khoản; thông tin nhận hoa được nhập khi checkout. Giá và tồn kho được xác thực từ MySQL trong transaction. Khách đăng nhập vẫn có thể dùng các tính năng tài khoản và xem lịch sử đơn đã gắn với tài khoản.
- COD và chuyển khoản được theo dõi trong trang quản trị/nhân viên. QR trong `public/qr-chuyen-khoan.png` trỏ tới tài khoản MB Bank cấu hình trong `.env`; khi tạo đơn chuyển khoản, khách quét QR, nhập tổng tiền và mã đơn làm nội dung, rồi bấm **Tôi đã chuyển khoản** hoặc tải ảnh biên lai JPEG/PNG/WebP (tối đa 4 MB). Biên lai được lưu theo đơn; khách đã đăng nhập, nhân viên hoặc admin có quyền phù hợp xem, còn đơn khách vãng lai dùng mã truy cập ngẫu nhiên riêng. Nhân viên/Admin đối chiếu giao dịch thực tế trong tài khoản ngân hàng và chỉ sau đó mới bấm **Xác nhận đã nhận tiền**. Trạng thái xác nhận và người xác nhận được lưu trong đơn hàng. Ứng dụng chưa kết nối webhook ngân hàng nên không tự phát hiện tiền vào; thao tác báo chuyển khoản hoặc tải biên lai không tự xác nhận đã nhận tiền.
- Khách hàng, admin và nhân viên có thể xem/in hóa đơn từ chi tiết đơn hàng. Hóa đơn gồm thông tin người nhận, sản phẩm, số lượng, phí giao hàng và trạng thái thanh toán.

Ảnh sản phẩm lấy từ Unsplash; Google Fonts được tải từ Google Fonts. Chưa bao gồm triển khai hosting/cloud, email/SMS, cổng thanh toán, hoặc hệ thống kiểm thử thanh toán với ngân hàng.
