# 11 — UI DESIGN SYSTEM & WIREFRAMES

---

## 1. Design Tokens & Theme Engine (Tailwind CSS v4 + shadcn/ui)

Hệ thống Design Tokens được xây dựng trên nền tảng **Tailwind CSS v4** kết hợp biến số ngữ nghĩa (Semantic Tokens) chuẩn của **shadcn/ui** (OKLCH color space), hỗ trợ 2 chế độ Light & Dark mode linh hoạt:

### 1.1 Semantic Color Tokens (shadcn/ui Theme Engine)

| Token CSS / Tailwind | Vai trò (Semantic Role) | Light Value (OKLCH / Hex) | Dark Value (OKLCH / Hex) |
|---|---|---|---|
| `--background` / `bg-background` | Màu nền trang chính | `oklch(1 0 0)` (#ffffff) | `oklch(0.14 0.02 255)` (#0f172a) |
| `--foreground` / `text-foreground` | Màu chữ chính | `oklch(0.20 0.025 255)` (#1e293b) | `oklch(0.98 0.005 250)` (#f8fafc) |
| `--card` / `bg-card` | Nền thẻ (Card, Panels) | `oklch(1 0 0)` (#ffffff) | `oklch(0.18 0.025 255)` (#1e293b) |
| `--card-foreground` / `text-card-foreground` | Chữ trong thẻ Card | `oklch(0.20 0.025 255)` | `oklch(0.98 0.005 250)` |
| `--primary` / `bg-primary` | Màu nhận diện chủ đạo (Trust Blue) | `oklch(0.53 0.17 250)` (#2563eb) | `oklch(0.65 0.18 250)` (#3b82f6) |
| `--primary-foreground` | Chữ trên nền Primary | `oklch(0.99 0 0)` (#ffffff) | `oklch(0.12 0.02 255)` (#090d16) |
| `--secondary` / `bg-secondary` | Nút phụ, chip, khối phụ trợ | `oklch(0.96 0.01 245)` | `oklch(0.24 0.025 255)` |
| `--muted` / `bg-muted` | Nền mờ, skeleton loading | `oklch(0.96 0.008 245)` | `oklch(0.22 0.02 255)` |
| `--muted-foreground` / `text-muted-foreground` | Text phụ, caption, nhãn thời gian | `oklch(0.52 0.025 250)` | `oklch(0.65 0.02 250)` |
| `--accent` / `bg-accent` | Hover highlight, active item | `oklch(0.94 0.025 245)` | `oklch(0.26 0.03 250)` |
| `--destructive` / `bg-destructive` | Nút nguy hiểm (Dừng quay, Xóa) | `oklch(0.58 0.20 25)` (#dc2626) | `oklch(0.62 0.22 25)` (#ef4444) |
| `--border` / `border-border` | Viền ngăn cách nhẹ | `oklch(0.92 0.01 245)` | `oklch(0.28 0.02 255)` |
| `--input` / `border-input` | Viền ô nhập liệu Input | `oklch(0.92 0.01 245)` | `oklch(0.28 0.02 255)` |
| `--ring` / `ring-ring` | Focus ring công thái học súng quét/phím | `oklch(0.53 0.17 250)` | `oklch(0.65 0.18 250)` |

### 1.2 Bảng màu Trạng thái Nghiệp vụ Kho (Logistics Status Colors)

Tuân thủ độ tương phản WCAG 2.2 AA (>= 4.5:1), dùng kết hợp với `Badge` hoặc `Alert`:
- **Thành công (Đã tải lên Drive / Quét hợp lệ)**: Emerald (`#059669` / `emerald-500`, dark: `#10b981`)
- **Chờ tải lên (IndexedDB Queue)**: Amber (`#d97706` / `amber-500`, dark: `#f59e0b`)
- **Đang tải lên / Đồng bộ**: Sky Blue (`#2563eb` / `sky-500`, dark: `#38bdf8`)
- **Đang ghi hình (Recording)**: Red Pulse (`#dc2626` / `rose-500`, dark: `#ef4444`)
- **Lỗi tải lên / Lỗi thiết bị**: Destructive Red (`#dc2626` / `destructive`)

### 1.3 Typography
- **Sans-serif font**: Geist Sans / Inter (`--font-sans`).
- **Monospace font**: JetBrains Mono / Fira Code (`font-mono`) — **BẮT BUỘC** cho mã vận đơn, mã nhân viên, chuỗi Barcode để đối chiếu ký tự chuẩn xác.
- **Scale**:
  - `text-xs`: 12px (Badge, caption)
  - `text-sm`: 14px (Secondary text, descriptions, table cells)
  - `text-base`: 16px (Body, form inputs)
  - `text-lg`: 18px (Card titles, sub-headings)
  - `text-xl`: 20px (Modal/Dialog titles)
  - `text-2xl` - `text-3xl`: 24px - 32px (Mã đơn scan lớn, hero counts)

### 1.4 Spacing & Bo góc (Border Radius)
- **Border Radius**: `--radius: 0.75rem` (12px).
  - `rounded-sm`: 6px (nhãn nhỏ)
  - `rounded-md`: 8px (input, button)
  - `rounded-lg`: 12px (card, dialog)
  - `rounded-full`: 9999px (pills, status badges)
- **Spacing Rule**: Bắt buộc dùng `gap-*` (Flexbox/Grid), không dùng `space-y-*` hoặc margin lộn xộn.

---

## 2. Đặc tả Core UI Primitives (shadcn/ui & Radix UI)

Toàn bộ giao diện chuẩn hóa 100% qua Core UI Primitives tại `@/components/ui/*`:

### 2.1 Button (`@/components/ui/button.tsx`)
Xây dựng trên Radix UI `Slot` (`asChild`) và `class-variance-authority`:
- **Variants**:
  - `default`: Nền `bg-primary`, chữ `text-primary-foreground`. Dùng cho hành động xác nhận chính.
  - `destructive`: Nền `bg-destructive`, chữ `text-destructive-foreground`. Dùng cho: Dừng quay khẩn cấp, Xoá video trong hàng đợi.
  - `outline`: Viền `border border-input`, nền `bg-background` hover `bg-accent`. Dùng cho nút đổi camera, nút huỷ, bộ lọc.
  - `secondary`: Nền `bg-secondary`, hover nhẹ. Dùng cho các hành động phụ.
  - `ghost`: Trong suốt, hover `bg-accent`. Dùng cho nút copy mã, nút đóng.
  - `link`: Dạng text link khi cần điều hướng nhẹ.
- **Sizes**:
  - `default`: `h-10 px-4 py-2`
  - `sm`: `h-9 rounded-md px-3`
  - `lg`: `h-11 rounded-md px-8`
  - `icon`: `size-9` (Đảm bảo vùng bấm công thái học kho vận ≥ 48px: `min-h-[48px] min-w-[48px]`).
- **Warehouse CTA Rule**: Nút bấm chính trên màn hình thao tác kho (Bắt đầu quay, Quét mã, Dừng & Lưu) sử dụng chiều cao tối thiểu `h-12` đến `h-14` (56px) để thao tác bằng găng tay dễ dàng.

### 2.2 Input (`@/components/ui/input.tsx`)
- Thẻ input chuẩn shadcn với viền `border-input`, focus ring `focus-visible:ring-1 focus-visible:ring-ring`.
- Kết hợp class `font-mono tracking-wider` khi nhập mã vận đơn để tối ưu việc đọc và đối chiếu mã vạch.

### 2.3 Card (`@/components/ui/card.tsx`)
Container chuẩn mực cho mọi panel, thay thế hoàn toàn `.glass-panel` hay `div` thủ công:
- **Compound Components**:
  - `<Card>`: Khung thẻ chuẩn (`rounded-lg border bg-card text-card-foreground shadow-sm`).
  - `<CardHeader>`: Phần đầu thẻ (`flex flex-col gap-1.5 p-6`).
  - `<CardTitle>`: Tiêu đề thẻ (`text-2xl font-semibold leading-none tracking-tight`).
  - `<CardDescription>`: Mô tả bổ trợ (`text-sm text-muted-foreground`).
  - `<CardContent>`: Vùng chứa nội dung chính (`p-6 pt-0`).
  - `<CardFooter>`: Chân thẻ chứa cụm nút hành động (`flex items-center p-6 pt-0`).

### 2.4 Badge (`@/components/ui/badge.tsx`)
Dùng để gắn nhãn ĐVVC, loại biên bản và trạng thái xử lý đơn hàng:
- **Variants**: `default`, `secondary`, `destructive`, `outline`.
- **Status Mapping**:
  - `Đã lưu` (Uploaded): `bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30`
  - `Chờ upload` (Pending): `bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30`
  - `Đang upload` (Syncing): `bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30`
  - `Lỗi upload` (Failed): `bg-destructive/15 text-destructive border-destructive/30`
  - `Chế độ Đóng gói`: `bg-primary/15 text-primary border-primary/30`
  - `Chế độ Khui hàng`: `bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30`

### 2.5 Dialog & AlertDialog (`@/components/ui/dialog.tsx`, `@/components/ui/alert-dialog.tsx`)
Thay thế hoàn toàn `Modal.tsx` và `.modal-backdrop`:
- Xây dựng trên **Radix UI Dialog Primitive**: Đảm bảo quản lý focus trap, chặn cuộn nền, phím `Escape` và overlay làm mờ chuẩn mực.
- **A11y Rule BẮT BUỘC**: Mọi `<DialogContent>` / `<AlertDialogContent>` PHẢI chứa `<DialogTitle>` (hoặc `<AlertDialogTitle>`). Nếu tiêu đề không muốn hiện trên màn hình, phải bọc class `sr-only` của Tailwind để thiết bị Screen Reader đọc được.
- Dùng `<DialogTrigger asChild>` để truyền sự kiện xuống nút bấm con mà không sinh thẻ lồng không hợp lệ.
- **Ứng dụng**:
  - `Dialog`: Popup xác nhận quét mã (`ScanResult`), Modal xem lại video Drive từ trang Lịch sử.
  - `AlertDialog`: Modal xác nhận xoá video cục bộ, Thoát tiến trình quay khẩn cấp.

### 2.6 Alert (`@/components/ui/alert.tsx`)
- Hiển thị thông báo trạng thái hoặc lỗi ngay trên màn hình (thay cho banner fixed thủ công):
  - Lỗi không tìm thấy Camera hoặc từ chối quyền truy cập (`variant="destructive"`).
  - Cảnh báo quét trùng mã vận đơn trong ca làm (`variant="destructive"` hoặc cảnh báo viền vàng).
- Compound: `<Alert>`, `<AlertTitle>`, `<AlertDescription>`.

### 2.7 Sonner Toast (`@/components/ui/sonner.tsx`)
Hệ thống Toast hiện đại, nhẹ và không chiếm dụng DOM:
- Tích hợp qua `<Toaster position="top-right" richColors />` tại root `App.tsx`.
- Sử dụng trực tiếp: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`.
- Tuyệt đối không tạo floating alert divs tự chế.

### 2.8 Progress (`@/components/ui/progress.tsx`)
- Radix Progress Primitive hiển thị thanh tiến trình trực quan mượt mà.
- Dùng cho: Thanh dung lượng bộ nhớ khả dụng (Storage Quota Bar), Tiến trình upload video % lên Google Drive.

### 2.9 Skeleton (`@/components/ui/skeleton.tsx`)
- Cung cấp hiệu ứng tải trang (shimmer loading) định hình trước bố cục (thay cho spinner vô định):
  - Khối danh sách đơn trong HistoryPage, QueuePage.
  - Cụm thông số thống kê Dashboard trên HomePage.

### 2.10 Separator (`@/components/ui/separator.tsx`)
- Phân cách nội dung (`orientation="horizontal"` hoặc `"vertical"`) theo chuẩn ngữ nghĩa của Radix UI thay thế `<hr>`.

### 2.11 Select (`@/components/ui/select.tsx`)
- Dropdown chuyên dụng chọn Đơn vị vận chuyển (ĐVVC), chọn Webcam thiết bị với hỗ trợ bàn phím và cảm ứng tối ưu.

### 2.12 Tabs (`@/components/ui/tabs.tsx`)
- Quản lý phân đoạn chuyển đổi chế độ làm việc (Đóng gói / Khui hàng), bộ lọc trạng thái (Tất cả / Chờ tải / Lỗi).

### 2.13 Collapsible (`@/components/ui/collapsible.tsx`)
- Đóng / mở nhanh thông tin chi tiết biên bản kiểm hàng trong danh sách Lịch sử mà không phải mở trang mới.

### 2.14 ScrollArea (`@/components/ui/scroll-area.tsx`)
- Vùng cuộn tuỳ biến với thanh cuộn thanh mảnh, không phá vỡ layout trên cả Windows và iOS.

---

## 3. Wireframes (ASCII)

> [!NOTE]
> Các ký hiệu hình ảnh trong mô hình ASCII dưới đây (như `📷`, `📦`, `🔄`) chỉ mang tính chất minh họa layout trực quan trên tài liệu. Khi triển khai mã nguồn thực tế, **BẮT BUỘC** phải tuân thủ [Rule 01-ui-ux](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/.agents/rules/01-ui-ux.md): Tuyệt đối không dùng emoji, chỉ sử dụng icon từ `lucide-react` (`Camera`, `Package`, `RefreshCw`, `Square`, `Play`, `CheckCircle2`, `AlertTriangle`, v.v.).

### 3.1 Login Page (Mobile)

```
┌──────────────────────────┐
│                          │
│      ┌────────────┐      │
│      │   📹 LOGO  │      │
│      └────────────┘      │
│                          │
│   Quay Video Đóng Hàng   │
│                          │
│  ┌────────────────────┐  │
│  │  Mã nhân viên      │  │
│  │  NV___              │  │
│  └────────────────────┘  │
│                          │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐    │
│  │  │ │  │ │  │ │  │    │   ← PIN 4 ô
│  └──┘ └──┘ └──┘ └──┘    │
│                          │
│  ┌────────────────────┐  │
│  │    ĐĂNG NHẬP       │  │   ← Primary button
│  └────────────────────┘  │
│                          │
│       v1.0.0             │
└──────────────────────────┘
```

### 3.2 Home Page (Mobile)

```
┌──────────────────────────┐
│ 📹 QuayVideo    NV003 👤 │   ← Header
├──────────────────────────┤
│                          │
│  ┌────────────────────┐  │
│  │  📊 Hôm nay        │  │   ← Dashboard card (glass)
│  │  45      42     1  │  │
│  │  Tổng   ✅Lưu  ⚠️Lỗi│  │
│  │  2 video đang chờ  │  │
│  └────────────────────┘  │
│                          │
│  CHẾ ĐỘ LÀM VIỆC (CHỌN TRƯỚC)
│  ┌──────────┐┌──────────┐│
│  │📦ĐÓNG GÓI││📬KHUI HÀNG│   ← Segmented Control lớn (bắt buộc)
│  │ [Active] ││          ││     Màu xanh (Đóng gói) / Hổ phách (Khui)
│  └──────────┘└──────────┘│     Lưu phiên, không hỏi lại
│                          │
│  ┌────────────────────┐  │
│  │                    │  │
│  │   📷 BẮT ĐẦU QUÉT  │  │   ← Primary Large button
│  │   [Đóng gói hàng]  │  │      Gắn liền với chế độ đang chọn
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  Camera: Camera sau  🔄  │   ← Camera info + đổi
│                          │
├──────────────────────────┤
│ 🏠    📤    📋    ⚙️     │   ← Bottom nav: Home, Queue, History, Settings
└──────────────────────────┘
```

### 3.3 Scan Page (Mobile — Full Screen)

```
┌──────────────────────────┐
│ ← Quay lại   [📦 ĐÓNG GÓI]│   ← Header HUD: hiển thị rõ chế độ đang quét
│                          │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│                          │
│  │   ╔═══════════╗   │   │   ← Camera preview full screen
│      ║ ▄▄▄▄▄▄▄▄▄ ║       │      Viewfinder frame (animated border)
│  │   ║ ▐░░░░░░░▌ ║   │   │
│      ║ ▀▀▀▀▀▀▀▀▀ ║       │
│  │   ╚═══════════╝   │   │
│                          │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                          │
│  Đưa mã vận đơn vào khung│
│  quét phía trên           │
│                          │
│  ┌────────────────────┐  │
│  │  ⌨️ Nhập mã tay     │  │   ← Fallback: gõ mã
│  └────────────────────┘  │
└──────────────────────────┘

── Khi quét thành công → Popup (Tối giản thao tác) ──

┌──────────────────────────┐
│     ✅ Quét thành công!   │
│                          │
│  Mã: GHN0123456789       │
│  Loại: 📦 ĐÓNG GÓI (Đổi) │   ← Đã gán sẵn, click nếu muốn đổi
│                          │
│  ĐVVC: ┌──────────────┐  │
│         │ GHN     ▼    │  │   ← Dropdown, auto-detect
│         └──────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │   ▶ BẮT ĐẦU QUAY   │  │   ← Primary (Enter/bấm tiếp tục ngay)
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │     Quét mã khác    │  │   ← Text button
│  └────────────────────┘  │
└──────────────────────────┘
```

### 3.4 Recording Page (Mobile — Full Screen)

```
┌──────────────────────────┐
│ 🔴 GHN0123456789         │   ← Overlay: mã đơn (cháy vào video)
│    14/09/2026 14:30:22   │      Timestamp realtime
│                          │
│                          │
│     [Camera Preview]     │   ← Full screen video
│     (đang quay video)    │
│                          │
│                          │
│                          │
│                          │
│                          │
│         01:05            │   ← Đồng hồ đếm (lớn, nổi)
│                          │
│  ┌────────────────────┐  │
│  │   ⏹  DỪNG QUAY     │  │   ← Danger button, 64px, pulse glow
│  └────────────────────┘  │
└──────────────────────────┘

── Sau khi dừng quay → Preview ──

┌──────────────────────────┐
│     Xem lại video        │
│                          │
│  ┌────────────────────┐  │
│  │                    │  │
│  │  [3s preview cuối] │  │   ← Auto-play 3 giây cuối
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  GHN0123456789 · GHN     │
│  Đóng gói · 1:05 · 18MB │
│                          │
│  ┌────────────────────┐  │
│  │ ✅ LƯU & TIẾP TỤC  │  │   ← Primary (mặc định)
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ ↩  QUAY LẠI        │  │   ← Secondary (huỷ, quay lại từ đầu)
│  └────────────────────┘  │
└──────────────────────────┘
```

### 3.5 Queue Page (Mobile)

```
┌──────────────────────────────────────┐
│ Hàng đợi tải lên       [Tải tất cả 3]│   ← Header + CTA Tải tất cả / Dọn đã tải
│ 12 video · Lưu cục bộ (IndexedDB)    │
├──────────────────────────────────────┤
│ [DB] Bộ nhớ: 4.2 GB trống · Đã lưu 45MB│   ← Storage Quota Bar
├──────────────────────────────────────┤
│ [Đang tải 1/3 video: GHN012... 45%]  │   ← Global Sync Progress (khi đang tải)
│ ████████████░░░░░░░░░░  [Tạm dừng]   │
├──────────────────────────────────────┤
│ [Tất cả 12] [Đóng gói 8] [Khui hàng 4]│   ← Type Segmented Filter (Border xanh/cam)
├──────────────────────────────────────┤
│ [🔍 Tìm mã vận đơn, ĐVVC...]     [X] │   ← Search bar
├──────────────────────────────────────┤
│ (Tất cả 12) (Chờ 3) (Đang tải 1) (Lỗi 1)│   ← Status filter pills
├──────────────────────────────────────┤
│ [v] Chọn tất cả trang này (10)        │   ← Select all toggle
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │[v]║ [Thumbnail]  862424803781    │ │   ← Border trái xanh: Đóng gói
│ │   ║ [ 00:21   ]  [Package] ĐG·J&T│ │   ← Checkbox công thái học (>=48px)
│ │   ║              16/09 10:20     │ │
│ │   ║              [Tải ngay] [Xóa]│ │   ← Action buttons
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │[ ]║ [Thumbnail]  SPXVN06521252...│ │   ← Border trái cam: Khui hàng
│ │   ║ [ 00:08   ]  [Open] KH · SPX │ │
│ │   ║              ████████░ 68%   │ │   ← Realtime Progress bar trên card
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │[ ]║ [Thumbnail]  VTP5551234      │ │
│ │   ║ [ 00:15   ]  Lỗi: Mất kết nối│ │   ← Lỗi kèm nguyên nhân
│ │   ║              [Thử lại] [Xóa] │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [X] Đã chọn 2 video · 8.2 MB     │ │   ← STICKY FLOATING BULK BAR
│ │ [  Xóa (2)  ]   [ Tải lên (2)  ] │ │      (Ghim trên BottomNav khi chọn >=1)
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [Quét & Quay] [Hàng đợi (3)] [Lịch sử]│   ← Bottom Navigation (Touch >= 48px)
└──────────────────────────────────────┘
```

### 3.6 History Page (Mobile)

```
┌──────────────────────────┐
│ ← Lịch sử               │
├──────────────────────────┤
│  ┌────────────────── 📷┐ │   ← Search: gõ tay hoặc quét mã
│  │ Tìm mã vận đơn...   │ │
│  └─────────────────────┘ │
│                          │
│  Hôm nay ▼  Tất cả ĐVVC ▼│   ← Filters
│  Tất cả NV ▼  Đóng gói ▼ │
│                          │
│  ┌────────────────────┐  │
│  │ GHN0123456789  🟢  │  │
│  │ GHN · ĐG · NV003   │  │
│  │ 14:30 · 1:05 · 18MB│  │
│  │              [▶ Xem]│  │   ← Bấm xem video từ Drive
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ GHTK9876543   🟢   │  │
│  │ GHTK · KH · NV001  │  │
│  │ 14:25 · 0:45 · 12MB│  │
│  │              [▶ Xem]│  │
│  └────────────────────┘  │
│           ...            │
│       Trang 1/8 →        │
├──────────────────────────┤
│ 🏠    📤    📋    ⚙️     │
└──────────────────────────┘
```

### 3.7 Desktop Layout (PC/Laptop — ≥1024px)

```
┌──────────────────────────────────────────────────────────────┐
│  📹 QuayVideo              Dashboard Nhanh         NV003 👤  │
├─────────────┬────────────────────────────────────────────────┤
│             │                                                │
│  🏠 Trang   │   ┌──────────────────────────────────────┐     │
│     chủ     │   │                                      │     │
│             │   │          Camera Preview               │     │
│  📷 Quét    │   │          (lớn, giữa màn hình)        │     │
│     mã      │   │                                      │     │
│             │   │                                      │     │
│  📤 Hàng    │   └──────────────────────────────────────┘     │
│     đợi     │                                                │
│             │   Camera: Logitech C920 ▼       [🔄 Đổi]       │
│  📋 Lịch    │                                                │
│     sử      │   ┌──────────────────────────────────────┐     │
│             │   │        📷 QUÉT MÃ ĐƠN                │     │
│  ⚙️ Cài     │   └──────────────────────────────────────┘     │
│     đặt     │                                                │
│             │   45 tổng · 42 ✅ · 2 đang chờ · 1 ⚠️ lỗi     │
│             │                                                │
├─────────────┴────────────────────────────────────────────────┤
│                         v1.0.0                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Animation Specifications

### 4.1 Micro-animations

```css
/* Viewfinder scanning line */
@keyframes scan-line {
  0%   { top: 0; }
  50%  { top: 100%; }
  100% { top: 0; }
}

/* Recording pulse (nút dừng quay) */
@keyframes recording-pulse {
  0%   { box-shadow: 0 0 0 0 var(--color-recording-pulse); }
  70%  { box-shadow: 0 0 0 15px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* Upload progress shimmer */
@keyframes shimmer {
  0%   { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}

/* Success checkmark */
@keyframes check-in {
  0%   { transform: scale(0); opacity: 0; }
  50%  { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

/* Card hover lift */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  transition: all 0.2s ease;
}

/* Page transition */
.page-enter {
  opacity: 0;
  transform: translateX(20px);
}
.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s ease;
}
```

### 4.2 Haptic & Sound Feedback

| Event | Feedback |
|---|---|
| Quét mã thành công | Vibrate 100ms + beep sound (beep.mp3) |
| Upload thành công | Vibrate 50ms (nhẹ) |
| Lỗi | Vibrate [100, 50, 100] (pattern) |
| Bấm nút chính | Vibrate 30ms (subtle) |

```js
// Haptic API
if ('vibrate' in navigator) {
  navigator.vibrate(100); // success
  navigator.vibrate([100, 50, 100]); // error pattern
}
```

---

## 5. Accessibility

| Yêu cầu | Implementation |
|---|---|
| Touch target tối thiểu | 44px × 44px cho mọi interactive element |
| Contrast ratio | ≥ 4.5:1 cho text (WCAG AA) |
| Focus indicator | Ring 2px accent-500 khi navigate bằng keyboard |
| Screen reader | `aria-label` cho icon buttons, `role` cho custom elements |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` → tắt animations |

---

*Đây là tài liệu cuối trong bộ tài liệu bổ sung. Tổng cộng: 11 tài liệu (5 gốc + 6 mới).*
