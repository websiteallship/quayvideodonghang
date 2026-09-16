# 11 — UI DESIGN SYSTEM & WIREFRAMES

---

## 1. Design Tokens

### 1.1 Color Palette

```css
:root {
  /* Primary — Deep Navy + Electric Blue */
  --color-primary-50:  #e8eaf6;
  --color-primary-100: #c5cae9;
  --color-primary-200: #9fa8da;
  --color-primary-500: #3f51b5;
  --color-primary-600: #3949ab;
  --color-primary-700: #303f9f;
  --color-primary-900: #1a237e;

  /* Accent — Vibrant Teal */
  --color-accent-400: #26c6da;
  --color-accent-500: #00bcd4;
  --color-accent-600: #00acc1;

  /* Status Colors */
  --color-success:  #4caf50;    /* 🟢 Đã upload */
  --color-warning:  #ff9800;    /* 🟡 Chờ upload */
  --color-error:    #f44336;    /* 🔴 Lỗi */
  --color-info:     #2196f3;    /* 🔵 Đang upload */

  /* Neutral (Dark Theme) */
  --color-bg-primary:    #0f0f23;
  --color-bg-secondary:  #1a1a2e;
  --color-bg-card:       #16213e;
  --color-bg-elevated:   #1e2a4a;
  --color-text-primary:  #e8e8e8;
  --color-text-secondary: #a0a0b8;
  --color-text-muted:    #6c6c80;
  --color-border:        #2a2a40;

  /* Recording State */
  --color-recording:     #ff1744;  /* Đỏ nổi bật khi đang quay */
  --color-recording-pulse: rgba(255, 23, 68, 0.3);
}
```

### 1.2 Typography

```css
:root {
  /* Font — Inter (Google Fonts) */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Scale */
  --text-xs:   0.75rem;   /* 12px — caption, badge */
  --text-sm:   0.875rem;  /* 14px — secondary text */
  --text-base: 1rem;      /* 16px — body */
  --text-lg:   1.125rem;  /* 18px — sub-heading */
  --text-xl:   1.25rem;   /* 20px — heading */
  --text-2xl:  1.5rem;    /* 24px — page title */
  --text-3xl:  2rem;      /* 32px — hero number (dashboard count) */

  /* Weight */
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;
}
```

### 1.3 Spacing

```css
:root {
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-5:  1.25rem;   /* 20px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
}
```

### 1.4 Border Radius

```css
:root {
  --radius-sm:   0.375rem;  /* 6px — inputs, small buttons */
  --radius-md:   0.5rem;    /* 8px — cards */
  --radius-lg:   0.75rem;   /* 12px — modals */
  --radius-xl:   1rem;      /* 16px — large cards */
  --radius-full: 9999px;    /* circle/pill */
}
```

### 1.5 Shadows & Glass

```css
:root {
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.3);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.3);
  --shadow-lg:  0 10px 25px rgba(0,0,0,0.4);
  --shadow-glow: 0 0 20px rgba(0, 188, 212, 0.15);

  /* Glassmorphism */
  --glass-bg:     rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur:   blur(12px);
}
```

---

## 2. Component Specifications

### 2.1 Button

```
┌─────────────────────────────────┐
│         Quét mã đơn             │   ← Primary Large: 56px height, full-width mobile
│            📷                    │      Gradient: primary-600 → accent-500
└─────────────────────────────────┘     Border-radius: radius-lg
                                        Font: text-lg, font-semibold
                                        Box-shadow: shadow-glow

┌──────────────┐ ┌──────────────┐
│   Đóng gói   │ │  Khui hàng   │   ← Secondary: 48px height
└──────────────┘ └──────────────┘     Outline style, border 2px

┌────────┐                            ← Icon Button: 44px × 44px circle
│   🔄   │                              Dùng cho: đổi camera, thử lại, đóng modal
└────────┘

┌──────────────────────────────────────────────┐
│              ⏹  DỪNG QUAY                    │   ← Danger Large: 64px height
└──────────────────────────────────────────────┘     Background: color-recording
                                                      Pulse animation khi đang quay
```

### 2.2 Input

```
┌─ Mã nhân viên ─────────────────┐
│  NV003                         │   ← 48px height, radius-sm
└────────────────────────────────┘     Focus: border accent-500 + glow
                                       Font: text-base, monospace cho mã

┌─ PIN ──────────────────────────┐
│  ● ● ● ●                      │   ← 4 ô riêng biệt, auto-focus next
└────────────────────────────────┘     Font: text-2xl, center
```

### 2.3 Toast / Notification

```
Success:  ┌─ ✅ Upload thành công ─────────────────────┐
          │  Video GHN0123456789 đã lưu trữ            │
          └────────────────────────────────────────────┘
          Background: success + opacity 95%, radius-lg, auto-dismiss 4s

Error:    ┌─ ❌ Lỗi upload ────────────────── [Thử lại] ┐
          │  Mất kết nối mạng                            │
          └──────────────────────────────────────────────┘
          Background: error, persist until dismissed or action

Warning:  ┌─ ⚠️ Còn 3 video chưa upload ──────────────┐
          │  Giữ app mở và kết nối mạng                 │
          └─────────────────────────────────────────────┘
          Background: warning, semi-persistent (30s)
```

### 2.4 Badge / Status

```
🟢 Đã lưu      → Background: success, text-xs, radius-full, padding 2px 8px
🟡 Chờ upload   → Background: warning
🔵 Đang upload  → Background: info, kèm spinner nhỏ
🔴 Lỗi          → Background: error
```

### 2.5 Card

```
┌────────────────────────────────────────────────┐
│  GHN0123456789                     🟢 Đã lưu  │   ← Glass card
│  GHN · Đóng gói · NV003                       │      Background: glass-bg
│  14/09/2026 14:30 · 1:05 · 18.5MB             │      Border: glass-border
│                                                │      Backdrop: glass-blur
└────────────────────────────────────────────────┘      Hover: translateY(-2px) + shadow
```

---

## 3. Wireframes (ASCII)

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
