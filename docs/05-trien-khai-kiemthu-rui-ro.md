# 05 — TRIỂN KHAI, KIỂM THỬ & RỦI RO

## 1. Kế hoạch triển khai (đề xuất theo sprint)

| Giai đoạn | Nội dung | Thời lượng đề xuất |
|---|---|---|
| Sprint 0 | Dựng khung dự án (Vite + React + PWA plugin), Backend trung gian rỗng, kết nối thử Google Drive Service Account | 1 tuần |
| Sprint 1 | Module Camera + chọn thiết bị (3 nhóm) + Module quét mã (BarcodeDetector + fallback) | 1-2 tuần |
| Sprint 2 | Module quay video + IndexedDB hàng đợi + Module upload resumable | 1-2 tuần |
| Sprint 3 | Màn hình Lịch sử/Tra cứu + đồng bộ Google Sheet + đăng nhập mã NV/PIN | 1 tuần |
| Sprint 4 | Pilot thực tế tại 1 kho, thu thập lỗi, tối ưu UX | 1-2 tuần |
| Sprint 5 | Tính năng nâng cao: auto-scan tự quay, quay liên tục, watermark | 1-2 tuần |

---

## 2. Ma trận kiểm thử bắt buộc trước khi chạy thật

| Kịch bản | Thiết bị/Trình duyệt cần test |
|---|---|
| Cài app lên màn hình chính, mở lại từ icon | iPhone Safari, Android Chrome, Windows Chrome, Windows Edge |
| Quét mã QR & Code128 trong điều kiện ánh sáng kho (thường không đều) | Cả 4 môi trường trên |
| Quay video 60-120 giây liên tục, kiểm tra định dạng phát lại được | Đặc biệt chú trọng iOS Safari (khác codec so với Chrome) |
| Chọn đúng webcam khi máy có nhiều camera | Windows PC có 2+ webcam gắn cùng lúc |
| Mất mạng giữa chừng lúc upload, có mạng lại → tự tiếp tục | Cả 4 môi trường |
| Rời app iOS >10 phút với video chưa upload, quay lại app | Bắt buộc test riêng, vì đây là rủi ro lớn nhất của Safari |
| Máy gần đầy bộ nhớ trình duyệt | Test dung lượng thấp giả lập |
| Nhiều nhân viên dùng chung 1 máy PC (đăng nhập/đăng xuất mã NV) | Nhóm B/C |

---

## 3. Rủi ro kỹ thuật & phương án giảm thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|---|---|---|
| iOS Safari không hỗ trợ background sync → video có thể "kẹt" nếu nhân viên thoát app sớm | Cao | Upload ngay lập tức sau khi quay xong thay vì gom lại; banner cảnh báo rõ khi còn video tồn đọng; huấn luyện nhân viên "không tắt app khi còn video đang upload" |
| Dữ liệu IndexedDB trên iOS có thể bị hệ thống dọn nếu app không mở >7 ngày | Trung bình (thấp nếu app dùng hàng ngày) | Gọi `navigator.storage.persist()`; nhắc nhân viên mở app hàng ngày (vốn đã đúng theo quy trình làm việc) |
| BarcodeDetector không chạy trên Safari/Firefox | Cao nếu không xử lý | Bắt buộc tích hợp thư viện fallback (zxing-wasm) ngay từ Sprint 1, test kỹ trên Safari trước khi coi module quét mã là "xong" |
| Webcam rời trên PC bị nhận sai (chọn nhầm camera ảo, camera laptop thay vì webcam thật) | Trung bình | Hiển thị rõ tên thiết bị trong dropdown, lưu lựa chọn theo từng máy, cho phép đổi camera dễ dàng ngay tại màn hình chính |
| Dung lượng Google Drive tăng nhanh, vượt gói đang dùng | Trung bình | Nén video hợp lý (720p, ~2.5Mbps), có chính sách dọn dẹp video cũ, theo dõi dung lượng định kỳ |
| Rò rỉ Service Account key nếu vô tình đưa vào frontend | Cao nếu xảy ra | Review code bắt buộc trước deploy, đảm bảo key chỉ tồn tại ở Backend/secret manager, không commit vào Git |
| Quay video nơi làm việc — vấn đề pháp lý/nhân sự | Trung bình | Thông báo bằng văn bản cho nhân viên trước khi triển khai, xác nhận với bộ phận nhân sự/pháp chế về phạm vi quay (chỉ quay tay/hàng hoá, hạn chế quay khuôn mặt nếu không cần thiết) |

---

## 4. Kế hoạch pilot (thử nghiệm thực tế)

1. Chọn 1 kho/1 ca làm việc, 2-3 nhân viên, đủ đại diện cả 3 nhóm thiết bị (nếu kho đó có cả điện thoại lẫn PC/laptop).
2. Chạy pilot 1-2 tuần, thu thập số liệu: tỷ lệ quét mã thành công lần đầu, tỷ lệ upload thành công trong 24h, thời gian thao tác trung bình/đơn, phản hồi UX từ nhân viên.
3. Điều chỉnh trước khi nhân rộng toàn bộ kho.

---

## 5. Định hướng Phase 2 (nhắc lại để đồng bộ)

- Web admin portal đầy đủ: phân quyền, dashboard trực quan (thay cho Google Sheet tạm ở Phase 1), báo cáo nâng cao.
- Tích hợp API trực tiếp với hệ thống quản lý đơn hàng để tự động đối soát mã đơn (giảm phụ thuộc quét tay).
- Cân nhắc chuyển kho lưu trữ chính từ Google Drive sang Google Cloud Storage/S3 nếu quy mô video tăng lớn, tối ưu chi phí & hiệu năng hơn Drive về lâu dài.
- Toàn bộ codebase Backend trung gian ở Phase 1 có thể tái sử dụng trực tiếp làm nền API cho Phase 2, không phải xây lại từ đầu.

---

*Đây là tài liệu cuối trong bộ 5 tài liệu: 01-tong-quan-san-pham, 02-dac-ta-ky-thuat, 03-uiux-flow, 04-tich-hop-luu-tru-du-lieu, 05-trien-khai-kiemthu-rui-ro.*
