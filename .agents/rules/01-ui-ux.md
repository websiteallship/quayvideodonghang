# Quy định UI/UX & Design Systems (UI/UX Rules)
*Tham chiếu và kế thừa chỉ dẫn từ các skills: `shadcn`, `radix-ui-design-system`, `ui-ux-pro-max`, `ui-ux-designer`, `ui-component`, `ui-skills`*

---

## 1. Nghiêm cấm Icon Ký tự (Unicode Emoji)
- **CẤM TUYỆT ĐỐI**: Không sử dụng emoji hoặc ký tự unicode làm biểu tượng (ví dụ: `📦`, `🎥`, `✅`, `❌`, `⚠️`, `🔍`, `⚙️`, `▶️`, `⏹️`).
- **BẮT BUỘC**: Sử dụng thư viện icon chuyên dụng `lucide-react` hoặc inline SVG chuẩn.
- Mỗi icon phải có `aria-hidden="true"` nếu đi kèm label text, hoặc `aria-label` khi là icon-only button.

---

## 2. Chuẩn hóa Core UI Primitives (shadcn/ui & Radix UI) & Design Tokens
- **BẮT BUỘC 100% Core UI Primitives từ `@/components/ui/*`**:
  - `Button`: Sử dụng variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) và sizes (`default`, `sm`, `lg`, `icon`). Cấm viết thẻ `<button className="...">` với style ad-hoc. Nút bấm tương tác phải luôn đảm bảo touch target ≥ 48px.
  - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`: Dùng làm chuẩn container thay thế hoàn toàn `.glass-panel`, `.card` div tự chế.
  - `Input`: Dùng `Input` primitive chuẩn của shadcn, kết hợp font monospace (`font-mono`) cho ô nhập mã vận đơn.
  - `Dialog` & `AlertDialog`: Bắt buộc thay thế custom `Modal.tsx` và `.modal-backdrop`.
    - **A11y Rule**: BẮT BUỘC có `DialogTitle` (dùng class `sr-only` nếu muốn ẩn visual) cho trợ năng WCAG.
    - Dùng `asChild` khi bọc component nút bấm để tránh nested button. Tận dụng focus trap và phím Escape có sẵn của Radix UI.
  - `Alert` & `AlertDescription`: Dùng hiển thị lỗi camera, cảnh báo quét mã trùng, thông báo hệ thống.
  - `Sonner`: Sử dụng toast notification qua `toast.success()`, `toast.error()`, `toast.warning()` từ `sonner`. Cấm tạo floating alert divs tự chế.
  - `Badge`: Dùng hiển thị trạng thái đơn hàng (`default`, `secondary`, `destructive`, `outline`), ĐVVC, loại biên bản.
  - `Progress`: Dùng cho dung lượng bộ nhớ (Storage Quota Bar) và tiến trình upload video.
  - `Skeleton`: Dùng thay spinner cho các khối dữ liệu có khuôn hình định sẵn (History list, Queue list).
  - `Separator`: Phân cách các phần tử nội dung thay cho thẻ `<hr>` hoặc border rườm rà.
  - `Select`, `Tabs`, `Collapsible`, `ScrollArea`: Dùng cho dropdown lọc, chuyển tab chế độ, mở rộng chi tiết đơn, và cuộn danh sách.
- **Quy tắc Styling với Tailwind & shadcn Tokens**:
  - **Semantic Tokens Only**: Bắt buộc dùng `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `bg-destructive`, `border-border`. Cấm tự bịa mã màu hex tuỳ tiện (ví dụ: `bg-[#1a2b3c]`).
  - **Layout Spacing**: Bắt buộc dùng `flex`/`grid` đi kèm `gap-*` (ví dụ `gap-3`, `gap-4`). Cấm dùng `space-y-*` hoặc margin hack.
  - **Kích thước hình khối**: Dùng utility `size-*` cho các phần tử vuông (icon, avatar, button icon: `size-4`, `size-9`, `size-12`).
  - **Ghép class động**: Bắt buộc dùng hàm tiện ích `cn(...)` (kết hợp `clsx` + `tailwind-merge`).

---

## 3. Thiết kế cho Môi trường Kho vận (`ui-ux-designer`, `ui-ux-pro-max`)
- **Kích thước Vùng bấm (Touch Targets)**:
  - Tối thiểu `48px x 48px` cho toàn bộ các nút bấm và icon interactive.
  - Ưu tiên `56px x 56px` hoặc thanh bấm full-width cho các CTA chính: *Bắt đầu quay*, *Dừng & Lưu*, *Quét mã*.
- **Typography & Tương phản cao**:
  - Font chữ sans-serif dễ đọc: Inter, Roboto hoặc system fonts.
  - Text nội dung tối thiểu `14px`, mã vận đơn / mã quét hiển thị font monospace cỡ lớn (`18px - 24px`, bold) trên nền tương phản cao.
  - Tuân thủ độ tương phản WCAG 2.2 AA (>= 4.5:1 với text thường, >= 3:1 với icon và UI components).
- **Hệ thống Trạng thái Trực quan (Semantic Status System)**:
  - **Thành công (Success)**: Xanh lá (`emerald-500` / `#10B981`) - Mã hợp lệ, upload hoàn tất.
  - **Đang quay / Ghi hình (Recording)**: Đỏ (`rose-500` / `#F43F5E`) kèm chấm tròn hiệu ứng nhịp thở (pulse animation).
  - **Cảnh báo / Quét trùng (Warning)**: Vàng hổ phách (`amber-500` / `#F59E0B`) - Cảnh báo trùng mã, mạng yếu.
  - **Tiến trình / Đồng bộ (Info/Sync)**: Xanh lam (`sky-500` / `#0EA5E9`) - Đang tải video lên Drive, đang đợi đồng bộ.
  - **Empty States**: Luôn có icon minh họa SVG, tiêu đề rõ ràng và nút hành động khắc phục, không để màn hình trống rỗng.

---

## 4. Phản hồi Đa giác quan (Haptic, Audio & Visual)
- **Quét barcode thành công**: Phát âm thanh beep ngắn (800Hz, 100ms) + rung haptic `navigator.vibrate(100)`.
- **Lỗi quét / Trùng mã**: Phát âm thanh warning đôi (400Hz, 200ms x 2) + rung haptic `navigator.vibrate([100, 50, 100])`.
- **Bắt đầu / Dừng ghi hình**: Âm báo xác nhận rõ ràng để công nhân thao tác tự tin mà không cần nhìn chằm chằm vào màn hình.

---

## 5. Quản lý Màn hình & Hiển thị Thiết bị
- **Screen Wake Lock API**: Phải kích hoạt giữ sáng màn hình trong toàn bộ quá trình quay video (`navigator.wakeLock.request('screen')`), tự giải phóng khi dừng hoặc unmount.
- **Bố cục Thích ứng (Responsive Layout)**:
  - **Mobile (dọc)**: Video preview chiếm 60-70% khung hình phía trên; cụm điều khiển, trạng thái mã và danh sách hàng đợi ở nửa dưới.
  - **Desktop / Tablet (ngang)**: Split-screen 2 cột (Trái: Camera Preview lớn toàn màn hình; Phải: Bảng thông tin đơn, lịch sử quét và tiến độ upload Drive).
