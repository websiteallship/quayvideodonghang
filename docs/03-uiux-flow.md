# 03 — UI/UX & LUỒNG THAO TÁC

## 1. Bản đồ màn hình (Screen Map)

```
Màn hình Đăng nhập (mã NV/PIN)
   └─ Màn hình Chính (Home)
        ├─ [Chọn chế độ làm việc: Đóng gói / Khui hàng] (BẮT BUỘC CHỌN TRƯỚC KHI QUÉT, nhớ phiên)
        ├─ [Chọn camera] (chỉ hiện khi máy có >1 camera — chủ yếu nhóm B/C)
        ├─ Màn hình Quét mã (hiển thị HUD chế độ đã chọn) → Màn hình Quay video → Màn hình Xác nhận & Lưu
        ├─ Màn hình Hàng đợi Upload (trạng thái các video)
        ├─ Màn hình Lịch sử/Tra cứu
        └─ Màn hình Cài đặt (chỉ Admin): kết nối Google Drive, quản lý danh sách nhân viên
```

---

## 2. Luồng chính (Nguyên tắc Mode-First — Chọn chế độ trước khi quét)

Trong vận hành kho thực tế, nhân viên luôn làm việc theo ca hoặc theo bàn chuyên biệt (bàn đóng gói xuất hàng loạt đơn đi, bàn hoàn trả khui kiểm hàng loạt đơn về). Việc bắt chọn loại biên bản sau mỗi lần quét gây lãng phí thao tác và làm gián đoạn nhịp làm việc. Do đó, hệ thống áp dụng luồng **Mode-First (Pre-selection)**:

1. **Đăng nhập nhẹ**: Nhập mã nhân viên + PIN 4 số (lưu phiên trên thiết bị, không cần đăng nhập lại mỗi lượt trong ca làm).
2. **Chọn chế độ làm việc trên Màn hình Chính (BẮT BUỘC TRƯỚC KHI QUÉT)**:
   - Trên Màn hình Chính có bộ chuyển chế độ nổi bật (Segmented Control / 2 thẻ chọn lớn):
     - 📦 **Đóng gói hàng** (`dong_goi`): Dành cho đóng kiện mới xuất kho (Màu nhận diện: Primary Blue / Emerald).
     - 📬 **Khui hàng / Trả hàng** (`khui_hang`): Dành cho bàn bóc kiểm kiện hoàn trả (Màu nhận diện: Amber / Purple).
   - **Ghi nhớ phiên (Session Persistence)**: Chế độ được lưu trong `localStorage` / Zustand. Nhân viên chỉ cần chọn 1 lần khi bắt đầu ca làm việc, sau đó quét liên tục hàng trăm đơn mà KHÔNG bị hỏi lại.
   - **Chốt chặn an toàn (Guard Rail)**: Nếu chưa chọn chế độ, nút "Quét mã đơn" ở trạng thái nhắc nhở hoặc bấm vào sẽ hiện dialog yêu cầu chọn chế độ trước khi bật camera / nhận diện mã.
3. **Kích hoạt Quét mã**:
   - Nhân viên bấm nút lớn **"Bắt đầu quét mã"** hoặc **bắn súng quét barcode USB**.
   - Camera mở lên, phía trên cùng luôn hiển thị **HUD Badge chế độ hiện tại** (VD: `[ ĐANG Ở CHẾ ĐỘ: ĐÓNG GÓI ]`), có nút chạm nhanh để đổi sang "Khui hàng" nếu cần xử lý đơn ngoại lệ.
4. **Quét mã & Xác nhận (Scan & Quick Confirm)**:
   - Khung quét tự động nhận diện mã vận đơn → Tự động detect ĐVVC.
   - Popup `ScanResult` hiển thị mã + ĐVVC, loại biên bản đã được điền sẵn theo chế độ đã chọn trước.
   - Nhân viên chỉ cần kiểm tra nhanh và bấm **"Bắt đầu quay"** (hoặc ấn `Enter`/bóp cò súng quét). Giảm 50% số lần click chuột/chạm màn hình so với flow cũ.
5. **Quay video**:
   - Màn hình quay video full-screen, đồng hồ đếm giờ, nút Dừng lớn (>=56px).
   - Video overlay watermark hiển thị đúng loại biên bản (`ĐÓNG GÓI` hoặc `KHUI HÀNG`), mã đơn, thời gian realtime và mã nhân viên.
6. **Xác nhận & Lưu**:
   - Xem lại đoạn cuối video (preview 3 giây), chọn: "Lưu & Tiếp tục" (mặc định, đưa vào hàng đợi upload) hoặc "Quay lại" (huỷ, quay lại từ đầu).
7. **Quay lại sẵn sàng cho đơn kế tiếp**:
   - Hệ thống tự động trở về trạng thái sẵn sàng quét mã, **vẫn giữ nguyên chế độ làm việc đã chọn**, nhân viên chỉ việc đưa đơn tiếp theo vào quét.

### 2.1 Luồng Tự động quay (Hands-Free / Auto-Record Mode — Tối ưu vượt bậc nhờ Mode-First)
Nhờ loại biên bản đã được định sẵn từ trước khi quét, tính năng Tự động quay hoạt động trơn tru 100%:
1. **Quét mã**: Nhân viên đưa kiện hàng trước camera hoặc bấm súng quét USB.
2. **Nhận diện & Check trùng tức thì**:
   - Hệ thống phát âm báo beep ngắn, tự động gán loại biên bản đang active, và gọi API check mã trùng.
   - **Nếu mã hợp lệ & không trùng:** Ứng dụng tự động phát hiện ĐVVC, hiển thị banner HUD "Đang tự động quay [Đóng gói/Khui hàng]..." (đếm lùi 500ms), sau đó **chuyển thẳng sang Màn hình Quay video** mà nhân viên hoàn toàn KHÔNG CẦN chạm vào màn hình hay chuột.
   - **Nếu mã trùng hoặc lỗi:** Ngay lập tức ngắt cơ chế tự động, phát âm cảnh báo `warning_sound_scan.mp3` và bật popup cảnh báo để nhân viên quyết định.
3. **Quay & Kết thúc**: Nhân viên đóng/khui hàng xong bấm nút "Dừng", tiếp tục quy trình lưu trữ chuẩn hoặc quay liên tục.

---

## 3. Luồng riêng theo nhóm thiết bị

### 3.1 Nhóm A — Di động (iPhone/Android)
- Camera mặc định: **camera sau**. Không hỏi chọn thiết bị (trừ khi cần chuyển sang camera trước để quay góc khác).
- Bố cục dọc (portrait), nút bấm to, dễ thao tác một tay.
- Cảnh báo đặc thù iOS: nếu người dùng rời app quá lâu khi còn video chưa upload, hiện banner đỏ "Còn N video chưa lưu trữ, vui lòng mở lại app và giữ kết nối mạng để hoàn tất".

### 3.2 Nhóm B — PC bàn với webcam rời
- Ngay khi vào Màn hình Chính lần đầu trên máy đó: tự động liệt kê danh sách camera (`enumerateDevices`), nếu chỉ có 1 → tự chọn luôn, không làm phiền.
- Nếu máy có nhiều camera ảo (ví dụ phần mềm OBS Virtual Camera cài sẵn) → hiện dropdown rõ tên thiết bị để nhân viên chọn đúng webcam vật lý, tránh chọn nhầm camera ảo không có hình thật.
- Bố cục ngang (landscape), phù hợp màn hình để bàn, video preview to ở giữa.
- Gợi ý đặt webcam: hiển thị hướng dẫn nhỏ "Đặt webcam hướng xuống bàn đóng gói, cách 40-60cm" lần đầu sử dụng.

### 3.3 Nhóm C — Laptop Windows (camera tích hợp)
- Mặc định dùng camera tích hợp của laptop.
- Nếu phát hiện có thêm webcam rời cắm vào (USB) → hiện gợi ý "Phát hiện webcam ngoài — Dùng webcam ngoài thay vì camera laptop?" vì thường webcam rời đặt được đúng góc quay bàn đóng gói hơn camera tích hợp (thường hướng vào mặt người dùng).

---

## 4. Màn hình Hàng đợi Upload (Upload Queue)

Hàng đợi upload được thiết kế tối ưu cho vận hành kho, đảm bảo không tắc nghẽn, kiểm soát chặt chẽ dung lượng thiết bị và linh hoạt xử lý đơn gấp:

### 4.1 Phân loại & Chỉ thị trực quan Biên bản (Mode Segmentation)
- **Bộ lọc loại biên bản (Segmented Tabs)**:
  - `Tất cả biên bản`: Hiển thị toàn bộ hàng đợi.
  - `Đóng gói`: Kèm icon `Package`, nhận diện màu xanh dương (`#3f51b5`).
  - `Khui hàng`: Kèm icon `PackageOpen`, nhận diện màu cam hổ phách (`#d97706`).
  - Mỗi tab hiển thị số lượng video theo thời gian thực.
- **Dải viền chỉ thị (Indicator Strip)**: Viền trái mỗi thẻ video dày `4px` (Xanh dương cho đóng gói, Cam hổ phách cho khui hàng) kèm tag loại đơn giúp nhân viên kho nhận diện ngay loại kiện mà không cần đọc chữ nhỏ.

### 4.2 Lọc trạng thái & Tìm kiếm
- Ô tìm kiếm tức thì theo mã vận đơn hoặc đơn vị vận chuyển.
- Các pills lọc trạng thái mã màu chuẩn:
  - 🟡 **Chờ tải** (`cho_upload`)
  - 🔵 **Đang tải** (`dang_upload` - kèm thanh % tiến trình realtime trên thẻ)
  - 🟢 **Đã lưu** (`da_upload`)
  - 🔴 **Lỗi** (`loi` - hiển thị nguyên nhân lỗi và nút Thử lại)

### 4.3 Thao tác Hàng loạt (Bulk Actions) & Floating Action Bar
- **Checkbox công thái học**: Vùng chạm $\ge 48\text{px}$ trên từng thẻ, tách biệt với vùng bấm mở xem video.
- **Chọn tất cả**: Nút chọn/bỏ chọn nhanh toàn bộ video trong trang hiện tại.
- **Sticky Floating Action Bar**: Thanh tác vụ nổi ghim ở cạnh dưới (ngay trên BottomNav) xuất hiện khi chọn $\ge 1$ video:
  - Hiển thị: "Đã chọn X video · Tổng Y MB".
  - Nút **"Tải lên (X)"** (Primary CTA, icon `UploadCloud`, minHeight 48px).
  - Nút **"Xóa (X)"** (Danger CTA, icon `Trash2`, minHeight 48px, bật modal xác nhận an toàn).
  - Nút **"Bỏ chọn"** (`X`).

### 4.4 Tải lên Tất cả & Tải ngay từng video (Priority Upload)
- Nút **"Tải tất cả (N)"** nổi bật trên Header khi có video chờ hoặc lỗi.
- Nút **"Tải ngay"** trên từng thẻ `cho_upload` để đẩy nhanh các kiện hàng hỏa tốc/ưu tiên.
- **Tiến trình Realtime**: Banner tổng thể hiển thị `X/Y video` đã đồng bộ, kèm nút **"Tạm dừng"** (Pause) để giải phóng băng thông khi mạng kho chập chờn.

### 4.5 Xóa từng video & Chốt chặn an toàn (Safe Delete Confirmation)
- Nút **"Xóa"** (`Trash2`) khả dụng cho từng thẻ video bất kể trạng thái.
- **Modal Cảnh báo An toàn**: Nếu xóa video chưa tải lên Google Drive (`cho_upload` hoặc `loi`), hệ thống hiển thị hộp thoại cảnh báo nguy cơ mất dữ liệu bằng chứng kiện hàng, yêu cầu xác nhận rõ ràng trước khi xóa vĩnh viễn khỏi IndexedDB. Video đã tải (`da_upload`) được phép xóa ngay.

### 4.6 Quản lý Dung lượng Thiết bị (Storage Quota Bar)
- Thanh trạng thái bộ nhớ IndexedDB & Thiết bị hiển thị: "Dung lượng còn trống: X GB · Hàng đợi chiếm: Y MB".
- Cảnh báo vàng khi bộ nhớ trống $<1\text{GB}$, cảnh báo đỏ khi $<500\text{MB}$ (Rule 05).
- Nút nhanh **"Dọn đã tải"** để giải phóng dung lượng ngay sau ca làm việc.

### 4.7 Video Preview Modal Nâng Cấp
- Trình phát video WebM sắc nét, hiển thị đầy đủ thông tin mã, loại biên bản, thời lượng, dung lượng.
- Tích hợp 3 nút hành động trực tiếp: [Tải lên ngay], [Xóa video], [Tải file về máy (.webm)].

---

## 5. Màn hình Lịch sử / Tra cứu

- Ô tìm kiếm to ở đầu, có 2 cách nhập: **gõ tay mã đơn** hoặc **bấm icon camera để quét lại mã** (nhanh hơn khi đang cầm đơn hàng cần tra cứu).
- Bộ lọc: theo ngày (mặc định hôm nay), theo đơn vị vận chuyển, theo nhân viên, theo loại biên bản (đóng gói/khui hàng), theo trạng thái upload.
- Kết quả dạng danh sách, mỗi dòng: mã đơn — đơn vị VC — nhân viên — thời gian — thời lượng video — trạng thái, bấm vào để phát video (stream trực tiếp từ Google Drive qua link được backend cấp quyền xem tạm thời).

---

## 6. Màn hình Cài đặt (chỉ Admin)

- Kết nối Google Drive: hiển thị trạng thái đã kết nối (thư mục gốc đang dùng), nút "Kiểm tra kết nối".
- Quản lý danh sách nhân viên & PIN.
- **Cơ chế kích hoạt quay video**:
  - `Xác nhận trước khi quay (Confirm)` (Mặc định): Quét mã xong hiện popup để nhân viên kiểm tra thông tin và nhấn "Bắt đầu quay".
  - `Tự động quay ngay (Auto / Hands-free)`: Bỏ qua bước xác nhận, tự động kích hoạt quay video ngay khi mã đơn hợp lệ được phát hiện (luôn dừng cảnh báo nếu trùng mã).
- Bật/tắt các tính năng nâng cao: chế độ quay liên tục, watermark.
- Cấu hình chất lượng video (độ phân giải/bitrate) để cân bằng dung lượng Drive.

---

## 7. Nguyên tắc thiết kế chung

- Nút hành động chính luôn **to, một màu nổi bật, ở vị trí dễ bấm bằng ngón cái (di động) hoặc chuột (PC)**.
- Không bắt nhân viên gõ tay nếu có thể quét/chọn — giảm tối đa thao tác bàn phím.
- Mọi trạng thái (đang quay, đang upload, lỗi) phải hiển thị rõ bằng màu + icon, không chỉ chữ.
- Phản hồi tức thời (haptic feedback trên di động nếu có, âm thanh "tít" khi quét mã thành công) để nhân viên không cần nhìn màn hình liên tục trong lúc thao tác tay.

---

*Xem tiếp: **04-tich-hop-luu-tru-du-lieu.md** (Google Drive, cấu trúc dữ liệu, tra cứu).*
