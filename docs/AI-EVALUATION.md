# Đánh giá chất lượng gợi ý hoa bằng AI

## Dữ liệu và cách đánh giá

- Bộ câu hỏi: `evaluation/flower-relevance.json`, phiên bản 1.
- Bộ hiện có **8 câu hỏi tiếng Việt**. Mỗi câu được gán thủ công danh sách mã sản phẩm được xem là phù hợp.
- Danh mục dùng trong lần đo này có **65 tài liệu sản phẩm đang hoạt động**.
- Phương pháp được đo: TF-IDF nội bộ kết hợp độ tương đồng cosine. Chương trình đánh giá cố ý không dùng embedding, kể cả khi có cấu hình dịch vụ AI, để kết quả có thể chạy lại và không phát sinh phí API.
- Hệ thống lọc sản phẩm hết hàng và sản phẩm vượt ngân sách trước khi trả về tối đa 5 gợi ý.
- Bộ câu hỏi còn nhỏ và nhãn phù hợp do người viết tự chọn. Đây là kiểm tra ban đầu, không đại diện cho tất cả khách hàng thực tế.

## Ý nghĩa các chỉ số

- **Precision@5 (độ chính xác trong 5 gợi ý đầu):** trong 5 sản phẩm được gợi ý, có bao nhiêu sản phẩm phù hợp với nhãn đã chấm. Ví dụ: 4/5 sản phẩm phù hợp thì chỉ số là 80%.
- **Recall@5 (mức tìm đủ sản phẩm phù hợp):** trong tổng số sản phẩm được đánh dấu phù hợp, hệ thống tìm được bao nhiêu sản phẩm trong 5 gợi ý đầu.
- **MRR (thứ hạng trung bình của kết quả phù hợp đầu tiên):** đo sản phẩm phù hợp đầu tiên xuất hiện sớm đến đâu. MRR bằng 1 nghĩa là trong các câu hỏi của bộ thử nghiệm, một sản phẩm phù hợp luôn đứng đầu.
- **Lỗi ngân sách/tồn kho:** số câu hỏi mà hệ thống trả về sản phẩm vượt ngân sách hoặc đã hết hàng. Mục tiêu là 0.

## Kết quả chạy thử baseline

Kết quả được ghi ngày 15/11/2026 khi chạy `npm run ai:evaluate`.

| Chỉ số | Kết quả |
|---|---:|
| Số câu hỏi được đánh giá | 8 |
| Số sản phẩm trong danh mục | 65 |
| Độ chính xác trung bình trong 5 gợi ý đầu | 80,0% |
| Mức tìm đủ sản phẩm phù hợp trung bình | 59,7% |
| Thứ hạng trung bình của gợi ý phù hợp đầu tiên (MRR) | 1,000 |
| Số câu vi phạm ngân sách hoặc tồn kho | 0 |

| Nhu cầu trong câu hỏi | Độ chính xác @5 | Mức tìm đủ @5 |
|---|---:|---:|
| Tặng mẹ, ngân sách dưới 300 nghìn | 100,0% | 71,4% |
| Hoa vàng tặng tốt nghiệp | 100,0% | 62,5% |
| Hoa hồng đỏ để tỏ tình | 60,0% | 100,0% |
| Hoa chậu tặng tân gia | 40,0% | 33,3% |
| Hoa sinh nhật tặng bạn gái, dưới 400 nghìn | 80,0% | 28,6% |
| Hoa trắng để cảm ơn | 100,0% | 55,6% |
| Hoa cúc tặng sinh nhật | 60,0% | 42,9% |
| Chậu lan chúc mừng khai trương | 100,0% | 83,3% |

## Nhận xét và giới hạn

Trong 8 câu hỏi thử nghiệm, gợi ý phù hợp đầu tiên luôn đứng ở vị trí số 1 (MRR = 1). Tuy nhiên, khả năng tìm được nhiều lựa chọn phù hợp còn chưa đồng đều. Ví dụ, câu hỏi về hoa chậu tặng tân gia và hoa cúc sinh nhật có độ chính xác thấp hơn. Đây là những trường hợp có thể dùng để cải thiện dữ liệu hoặc cách tìm kiếm.

Các con số trên chỉ đo phương pháp TF-IDF chạy nội bộ. Chưa có kết quả so sánh với embedding hoặc LLM thật vì dự án chưa được cấu hình khóa API. Sau khi tự cấu hình dịch vụ AI, cần chạy kiểm tra provider, làm mới chỉ mục RAG, rồi đánh giá riêng trên cùng bộ câu hỏi và cùng danh mục trước khi kết luận phương pháp nào tốt hơn.
