# HƯỚNG DẪN HOẠT ĐỘNG CHO AI AGENT (AGENTS.MD)

## 1. TỔNG QUAN DỰ ÁN
Ứng dụng Web PWA chuyên dụng cho nhân viên kho vận thực hiện:
1. Quét mã vận đơn (bằng súng quét barcode chuyên dụng hoặc camera thiết bị).
2. Quay video quy trình đóng gói / mở hàng (kèm âm thanh, watermark thời gian và mã đơn).
3. Tải video trực tiếp lên Google Drive thông qua Cloudflare Workers backend.
4. Quản lý trạng thái, cảnh báo quét trùng, và đồng bộ tự động khi có mạng (Offline-First).

---

## 2. TECH STACK CHUẨN
- **Frontend**: React 18+ (TypeScript), Vite 5+, Zustand (quản lý state), Tailwind CSS v4, shadcn/ui & Radix UI (Core UI Primitives), `lucide-react` (icon), IndexedDB (`idb` lưu trữ offline).
- **Backend API**: Cloudflare Workers + Hono framework (TypeScript).
- **Database**: Cloudflare D1 (SQLite at Edge).
- **Video Storage**: Google Drive API v3 (Shared Drive qua Service Account, Resumable Upload protocol).
- **Hosting**: Cloudflare Pages (Frontend) + Cloudflare Workers (Backend) - Tối ưu 100% miễn phí.

---

## 3. BẢN ĐỒ TÀI LIỆU DỰ ÁN (BẮT BUỘC ĐỌC KHI THỰC HIỆN)
Mọi quyết định thiết kế và lập trình phải tuân thủ nghiêm ngặt hệ thống tài liệu trong thư mục `docs/`:
- [`01-tong-quan-san-pham.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/01-tong-quan-san-pham.md): Yêu cầu nghiệp vụ, đối tượng sử dụng, bài toán kho vận.
- [`02-dac-ta-ky-thuat.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/02-dac-ta-ky-thuat.md): Đặc tả kiến trúc kỹ thuật, Service Worker, nén video.
- [`03-uiux-flow.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/03-uiux-flow.md): Luồng người dùng, Wireframes, trạng thái giao diện.
- [`04-tich-hop-luu-tru-du-lieu.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/04-tich-hop-luu-tru-du-lieu.md): Cơ chế Google Drive API, phân quyền, cấu trúc thư mục.
- [`05-trien-khai-kiemthu-rui-ro.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/05-trien-khai-kiemthu-rui-ro.md): Kế hoạch kiểm thử thiết bị phần cứng, rủi ro và giải pháp.
- [`06-api-backend-specification.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/06-api-backend-specification.md): Đặc tả 15+ REST endpoints, JWT Auth, định dạng chuẩn.
- [`07-database-schema.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/07-database-schema.md): Lược đồ 5 bảng Cloudflare D1 (SQLite), indexes, triggers.
- [`08-frontend-architecture.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/08-frontend-architecture.md): Cấu trúc thư mục React, custom hooks, Zustand stores.
- [`09-environment-deployment.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/09-environment-deployment.md): Thiết lập Cloudflare Pages/Workers, Google Cloud Service Account.
- [`10-error-handling.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/10-error-handling.md): 30+ mã lỗi hệ thống, chiến lược retry và phục hồi sự cố.
- [`11-ui-design-system.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/11-ui-design-system.md): Bảng màu tương phản cao, typography, component tokens kho vận.
- [`12-huong-dan-ket-noi-google-drive-sheet.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/12-huong-dan-ket-noi-google-drive-sheet.md): Hướng dẫn kết nối Google Cloud Service Account, Shared Drive, Sheet và dev local.
- [`13-huong-dan-lay-refresh-token.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/13-huong-dan-lay-refresh-token.md): Hướng dẫn lấy OAuth2 Refresh Token cho Google Drive cá nhân (15GB miễn phí).
- [`14-admin-crud-specification.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/14-admin-crud-specification.md): Đặc tả quản trị nhân viên, kho hàng, cấu hình và retention.
- [`15-huong-dan-trien-khai-deploy.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/15-huong-dan-trien-khai-deploy.md): Quy trình triển khai Production Cloudflare Pages, Workers, D1 và checklist vận hành.

---

## 4. QUY TẮC BẮT BUỘC CHO AI AGENT (STRICT RULES)
Trước khi sinh code, Agent bắt buộc đọc các file rule tại `.agents/rules/`:
1. **Chuẩn hóa UI Primitives & Tuyệt đối cấm Icon Ký tự / Emoji** (`.agents/rules/01-ui-ux.md`): Bắt buộc dùng Core UI Primitives từ `@/components/ui/*` (dựa trên shadcn/ui & Radix UI: `Button`, `Card`, `Input`, `Dialog`, `AlertDialog`, `Badge`, `Alert`, `Sonner`, `Progress`, `Skeleton`, `Separator`, `Select`, `Tabs`, `Collapsible`, `ScrollArea`). Cấm tạo modal/button/card tự chế (ad-hoc). Không dùng `📦`, `🎥`, `✅`, `❌`... Bắt buộc dùng `lucide-react` hoặc inline SVG chuẩn. Nút bấm tối thiểu `48px x 48px`. Bắt buộc kích hoạt Screen Wake Lock khi quay.
2. **Bảo mật Tuyệt đối** (`.agents/rules/02-security.md`): Không để lộ Service Account Key ra client. Xác thực JWT, băm mã PIN bằng Argon2id/bcrypt. Validate toàn bộ input bằng Zod.
3. **Hiệu năng & Giải phóng Bộ nhớ** (`.agents/rules/03-performance.md`): Bắt buộc thu hồi `URL.revokeObjectURL()` và dừng stream tracks (`track.stop()`) khi unmount. MediaRecorder dùng `timeslice = 1000`. Cấm lưu blob video vào Cache Storage (chỉ lưu IndexedDB).
4. **Tương thích Phần cứng Kho** (`.agents/rules/04-device-and-hardware.md`): Thẻ preview video có `playsInline, autoPlay, muted` cho iOS Safari. Bắt sự kiện keydown tốc độ cao (<50ms) cho súng quét USB barcode. Ghi nhớ `deviceId` cho webcam USB.
5. **Chống Mất dữ liệu Offline** (`.agents/rules/05-offline-and-reliability.md`): Lưu tạm video vào IndexedDB khi mất mạng. Hỗ trợ Google Drive Resumable Upload theo byte offset. Đăng ký `beforeunload` chặn đóng tab khi đang quay/upload.
6. **Chuẩn Code** (`.agents/rules/06-code-quality-and-standards.md`): TypeScript `strict: true` (không dùng `any`). Envelope API response `{ success, data, error }`. Kiến trúc phân lớp tách biệt.

---

## 5. SKILLS HỖ TRỢ ĐƯỢC TÍCH HỢP
Khi thực thi các tác vụ chuyên biệt, Agent chủ động tham khảo và áp dụng hướng dẫn từ `.agents/skills/`:
- **UI/UX & Design Systems**: `ui-ux-pro-max`, `ui-ux-designer`, `ui-component`, `ui-skills`
- **Backend & Cloudflare**: `cloudflare-workers-expert`, `hono`
- **PWA & Offline**: `progressive-web-app`
- **Google Drive & Upload**: `google-drive-automation`, `file-uploads`
- **Frontend & State**: `react-best-practices`, `react-patterns`, `zustand-store-ts`, `frontend-dev-guidelines`
- **Types & Validation**: `typescript-pro`, `zod-validation-expert`
- **Độ tin cậy & Test**: `frontend-api-integration-patterns`, `error-handling-patterns`, `systematic-debugging`, `test-driven-development`, `e2e-testing`


---

## 6. PHONG CÁCH LÀM VIỆC CỦA AGENT
- Đóng vai Senior Staff Engineer: Tập trung 100% vào giải pháp kỹ thuật, trực tiếp, súc tích, zero fluff.
- Luôn kiểm tra kỹ các file docs tương ứng trước khi tiến hành viết code hoặc thay đổi cấu trúc.
