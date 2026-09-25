# 18 — CẤU HÌNH KHUNG HÌNH & GÓC XOAY VIDEO (VIDEO ORIENTATION & ROTATION)

Đặc tả kỹ thuật tính năng cho phép nhân viên kho vận cấu hình **khung hình quay video** (ngang/dọc) và **góc xoay camera** (0°/90°/180°/270°) — đặc biệt hữu ích cho các trạm đóng gói sử dụng **giá đỡ overhead** gắn điện thoại úp xuống bàn.

---

## 1. BỐI CẢNH & BÀI TOÁN

### 1.1 Vấn đề hiện tại

Hệ thống hiện tại sử dụng **auto-detect orientation** dựa trên:
- `window.innerHeight > window.innerWidth`
- `window.matchMedia('(orientation: portrait)')`

| Tình huống | Kết quả detect | Vấn đề |
|---|---|---|
| Cầm điện thoại dọc | ✅ Đúng | Không có |
| Cầm điện thoại ngang | ✅ Đúng | Không có |
| **Điện thoại trên giá đỡ overhead, úp xuống** | ❌ **Sai** | Trọng lực đi xuyên màn hình → accelerometer không xác định được portrait/landscape → phụ thuộc vào rotation lock của OS |
| **Điện thoại gắn nghiêng trên kẹp** | ⚠️ Không chắc chắn | Kết quả tùy thuộc góc nghiêng |

### 1.2 Kịch bản thực tế tại kho

**Trạm đóng gói overhead (phổ biến nhất):**
```
         ┌─ Thanh ngang giá đỡ ─┐
         │                       │
    ┌────┴────┐                  │
    │ 📱 Phone│ ← úp xuống      │
    │ (camera │    nhìn bàn     ┌┴┐
    │  xuống) │                 │ │ ← Trụ đứng
    └─────────┘                 │ │
    ═══════════════════════════ │ │
    ║  BÀN ĐÓNG GÓI          ║ │ │
    ║  ┌─────────────┐        ║ └─┘
    ║  │ 📦 Hàng hóa │        ║
    ║  └─────────────┘        ║
    ═══════════════════════════
```

**Yêu cầu:**
- User **không muốn quan tâm** cách gắn phone (dọc/ngang/nghiêng)
- Setting chọn "Ngang" → video output **luôn** là landscape (16:9)
- Setting chọn "Dọc" → video output **luôn** là portrait (9:16)
- Có thể xoay nội dung camera 0°/90°/180°/270° để hình ảnh đúng hướng

### 1.3 Giải thích kỹ thuật: Camera Sensor & Pixel Orientation

Camera sensor trên điện thoại **luôn cố định** theo thân máy:

```
PORTRAIT MOUNT                 LANDSCAPE MOUNT
┌──────────────┐               ┌──────────────────────────┐
│   📷 notch   │ ← row 0      │                    📷    │ ← row 0
│              │               │                          │
│    720px     │               │        1280px            │
│   (width)    │               │        (width)           │
│              │               │                          │
│   1280px     │               └──────────────────────────┘
│   (height)   │                       720px (height)
│     ⭕       │
└──────────────┘ ← row cuối

Camera stream: 720×1280        Camera stream: 1280×720
```

**Khi phone úp xuống (overhead):** Browser nhận pixel theo thân máy, không phụ thuộc trọng lực.

---

## 2. THIẾT KẾ SETTING MỚI

### 2.1 Tách biệt 4 nhóm cấu hình video

| Nhóm | Setting | Giá trị | Mặc định |
|---|---|---|---|
| **Độ phân giải** | `videoResolution` | `'720p'` \| `'1080p'` | `'720p'` (sync hệ thống) |
| **Khung hình** | `videoOrientation` | `'auto'` \| `'landscape'` \| `'portrait'` | `'auto'` |
| **Góc xoay** | `videoRotation` | `0` \| `90` \| `180` \| `270` | `0` |
| **Tốc độ khung hình** | `videoFps` | `15` \| `20` \| `24` \| `30` \| `48` \| `60` | `30` |

### 2.2 Ma trận Canvas Output

| Phân giải | Khung ngang (landscape) | Khung dọc (portrait) |
|---|---|---|
| **720p** | Canvas: **1280×720** | Canvas: **720×1280** |
| **1080p** | Canvas: **1920×1080** | Canvas: **1080×1920** |

Khi `videoOrientation = 'auto'`: giữ nguyên logic detect hiện tại (fallback behavior).

### 2.3 Góc xoay camera — Xử lý Canvas

Khi `videoRotation ≠ 0`, hệ thống sử dụng `CanvasRenderingContext2D.rotate()` để xoay nội dung camera **trước khi vẽ overlay**.

```
Rotation 0° (mặc định)         Rotation 90° (xoay phải)
┌────────────────┐              ┌────────────────┐
│ Camera content │              │ Camera content │
│ (không xoay)   │              │ (xoay 90° CW)  │
│                │              │                │
│ ── Overlay ──  │              │ ── Overlay ──  │
│ Text luôn đọc  │              │ Text luôn đọc  │
│ được (không    │              │ được (không    │
│ bị xoay)       │              │ bị xoay)       │
└────────────────┘              └────────────────┘

Rotation 180° (lật ngược)      Rotation 270° (xoay trái)
┌────────────────┐              ┌────────────────┐
│ Camera content │              │ Camera content │
│ (lật 180°)     │              │ (xoay 270° CW) │
│                │              │                │
│ ── Overlay ──  │              │ ── Overlay ──  │
│ Text luôn đọc  │              │ Text luôn đọc  │
│ được           │              │ được           │
└────────────────┘              └────────────────┘
```

**Quan trọng:** Overlay text (watermark, mã vận đơn, timestamp) **KHÔNG bị xoay** — luôn render sau bước xoay camera, đảm bảo đọc được.

#### Pseudo-code xử lý xoay trong `drawCanvasOverlay`:

```typescript
function drawCanvasOverlay(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,   // canvas width
  height: number,  // canvas height
  overlay: OverlayInfo,
  now: Date,
  duration: number,
  rotation: 0 | 90 | 180 | 270 = 0  // NEW param
): void {
  // 1. Vẽ camera frame với xoay
  ctx.save();

  if (rotation === 0) {
    // Không xoay — giữ nguyên logic crop object-fit:cover hiện tại
    drawCameraFrame(ctx, video, width, height);
  } else if (rotation === 180) {
    // Lật ngược 180° — canvas size giữ nguyên
    ctx.translate(width / 2, height / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-width / 2, -height / 2);
    drawCameraFrame(ctx, video, width, height);
  } else {
    // 90° hoặc 270° — cần swap width/height cho camera frame
    // vì camera đang quay 90° so với canvas
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    // Vẽ camera frame với chiều swap
    ctx.translate(-height / 2, -width / 2);
    drawCameraFrame(ctx, video, height, width);
  }

  ctx.restore();

  // 2. Vẽ overlay text — KHÔNG bị xoay (vẽ trực tiếp lên canvas gốc)
  drawOverlayText(ctx, width, height, overlay, now, duration);
}
```

---

## 3. LƯU TRỮ SETTING

### 3.1 Vị trí lưu: `localStorage` per user per device

| Tiêu chí | Quyết định | Lý do |
|---|---|---|
| **Lưu ở đâu?** | `localStorage` (key: `user_settings_{maNhanVien}`) | Setting này là **device-specific** — cùng 1 user, phone A gắn ngang, phone B gắn dọc |
| **Tại sao không lưu DB?** | Góc xoay + khung hình phụ thuộc vật lý thiết bị, không có ý nghĩa cross-device | Nếu lưu DB, user đăng nhập máy khác sẽ nhận setting sai |
| **Khi xóa cache?** | Setting bị mất → kích hoạt **Onboarding Camera Setup** (Mục 4) | |
| **Thay đổi setting?** | Áp dụng ngay lần quay tiếp theo, không ảnh hưởng video đã quay | |

### 3.2 Cấu trúc dữ liệu trong `user-settings-store.ts`

```typescript
export type VideoOrientation = 'auto' | 'landscape' | 'portrait';
export type VideoRotation = 0 | 90 | 180 | 270;

export interface UserSettingsState {
  // ... (existing fields) ...
  videoResolution: VideoResolution;
  videoFps: VideoFps;

  // NEW: Orientation & Rotation
  videoOrientation: VideoOrientation;       // Khung hình: auto/ngang/dọc
  videoRotation: VideoRotation;             // Góc xoay: 0/90/180/270
  isCameraConfigured: boolean;              // Flag: đã qua setup camera chưa?
}

export const DEFAULT_USER_SETTINGS = {
  // ... (existing defaults) ...
  videoOrientation: 'auto' as VideoOrientation,
  videoRotation: 0 as VideoRotation,
  isCameraConfigured: false,    // Mặc định chưa cấu hình
};
```

### 3.3 Persist format trong localStorage

```json
{
  "videoResolution": "1080p",
  "isResolutionOverridden": true,
  "videoFps": 30,
  "isFpsOverridden": false,
  "videoOrientation": "landscape",
  "videoRotation": 90,
  "isCameraConfigured": true,
  "autoRecordAfterScan": true,
  "soundBeepEnabled": true,
  "shiftTarget": 300
}
```

---

## 4. ONBOARDING: BẮT BUỘC CẤU HÌNH CAMERA LẦN ĐẦU

### 4.1 Trigger điều kiện

Khi user **bấm bắt đầu quay** (hoặc quét barcode để auto-record), hệ thống kiểm tra:

```typescript
const { isCameraConfigured } = useUserSettingsStore();

if (!isCameraConfigured) {
  // Hiện dialog yêu cầu cấu hình
  showCameraSetupDialog();
  return; // Chặn quay
}

// Tiếp tục flow quay bình thường
startRecording();
```

### 4.2 Dialog "Cấu hình Camera lần đầu"

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  📹 Cấu hình Camera lần đầu                          │
│                                                      │
│  Trước khi quay, vui lòng thiết lập khung hình       │
│  và góc xoay phù hợp với giá đỡ/vị trí camera       │
│  của bạn.                                            │
│                                                      │
│  Bạn có thể thay đổi lại bất cứ lúc nào trong       │
│  mục Cài đặt → Ghi hình & Âm thanh.                 │
│                                                      │
│  ┌──────────────────────────────────────────┐        │
│  │                                          │        │
│  │        🔴 LIVE CAMERA PREVIEW            │        │
│  │        (real-time, có overlay mẫu)       │        │
│  │                                          │        │
│  │  [ĐÓNG GÓI] DEMO123456                  │        │
│  │  NV: NV001 | ĐVVC: GHN                  │        │
│  │  GPS: N/A                                │        │
│  │  Kho: Kho Quận 7 - HCM                  │        │
│  │  14:30:00 25/09/2026 · REC 00:05        │        │
│  │                                          │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  Khung hình:                                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│  │ 🔄 Tự động │ │ 📺 Ngang   │ │ 📱 Dọc     │       │
│  │            │ │   (16:9)   │ │   (9:16)   │       │
│  └────────────┘ └────────────┘ └────────────┘       │
│                                                      │
│  Góc xoay: (hiện khi khung hình ≠ Tự động)          │
│  ┌─────┐ ┌─────┐ ┌──────┐ ┌──────┐                  │
│  │  0° │ │ 90° │ │ 180° │ │ 270° │                  │
│  └─────┘ └─────┘ └──────┘ └──────┘                  │
│                                                      │
│  💡 Nhấn các nút trên để xem thay đổi trực tiếp     │
│     trên camera preview phía trên                    │
│                                                      │
│  ┌──────────────────────────────────────────┐        │
│  │           ✅ Lưu và bắt đầu quay         │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 4.3 Flow hoàn chỉnh

```
User bấm Quay / Quét barcode
        │
        ▼
┌─ isCameraConfigured? ─┐
│                        │
▼ NO                     ▼ YES
Hiện Dialog Setup        Quay bình thường
│                        (dùng setting đã lưu)
│ User chọn orientation
│ User chọn rotation
│ Xem live preview
│ Bấm "Lưu và bắt đầu quay"
│
▼
isCameraConfigured = true
(lưu localStorage)
│
▼
Bắt đầu quay với setting mới
```

### 4.4 Khi nào hiện lại dialog?

| Sự kiện | Hành vi |
|---|---|
| **Xóa cache/localStorage** | `isCameraConfigured = false` → hiện lại dialog khi quay |
| **Đăng nhập thiết bị mới** | User chưa có localStorage trên thiết bị → hiện dialog |
| **Đăng nhập user khác** | Mỗi user có key riêng → nếu user mới chưa setup → hiện dialog |
| **User tự reset trong Settings** | Bấm "Đặt lại cấu hình camera" → `isCameraConfigured = false` |

---

## 5. UI TRONG TRANG CÀI ĐẶT (UserSettingsPage)

### 5.1 Vị trí: Tab "Ghi hình & Âm thanh"

Thêm section mới **sau** "Webcam quay đóng gói" và **trước** "Độ phân giải video ghi hình":

```
Tab "Ghi hình & Âm thanh"
├── Webcam quay đóng gói (dropdown chọn camera)     ← existing
├── ✨ Khung hình & Góc xoay (NEW section)           ← NEW
│   ├── Live Camera Preview Panel
│   ├── Khung hình: [Tự động] [Ngang 16:9] [Dọc 9:16]
│   ├── Góc xoay: [0°] [90°] [180°] [270°]
│   └── Nút [Lưu cài đặt camera]
├── Độ phân giải video ghi hình (1080p/720p)         ← existing
├── Tốc độ khung hình FPS                            ← existing
└── Chuyển hướng camera (Trước/Sau)                  ← existing
```

### 5.2 Wireframe UI chi tiết

```
┌─────────────────────────────────────────────────────────┐
│ 📐 Khung hình & Góc xoay                               │
│ Cấu hình hướng quay phù hợp với giá đỡ/vị trí camera  │
│                                                          │
│ ┌────────────────────────────────────────────────┐      │
│ │ ▶ Mở xem trước camera                          │      │
│ └────────────────────────────────────────────────┘      │
│   (Bấm để mở Live Preview — tắt được, tiết kiệm pin)   │
│                                                          │
│ ═══════════════════════════════════════════════════      │
│                                                          │
│ Khung hình video:                                        │
│ ┌───────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │ 🔄 Tự động    │ │ 📺 Ngang     │ │ 📱 Dọc       │    │
│ │ (Nhận diện    │ │ (16:9)       │ │ (9:16)       │    │
│ │  thiết bị)    │ │ Giá đỡ ngang │ │ Cầm tay dọc  │    │
│ │       ✓       │ │              │ │              │    │
│ └───────────────┘ └──────────────┘ └──────────────┘    │
│                                                          │
│ Góc xoay hình ảnh camera:                ← ẩn khi Auto  │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│ │  0°  │ │  90° │ │ 180° │ │ 270° │                    │
│ │Không │ │ Xoay │ │ Lật  │ │ Xoay │                    │
│ │ xoay │ │phải ↻│ │ngược │ │trái ↺│                    │
│ │  ✓   │ │      │ │      │ │      │                    │
│ └──────┘ └──────┘ └──────┘ └──────┘                    │
│                                                          │
│ ┌──────────────────────────────────────────────┐        │
│ │    ✅ Lưu cài đặt camera                      │        │
│ └──────────────────────────────────────────────┘        │
│ ┌──────────────────────────────────────────────┐        │
│ │    🔄 Đặt lại cấu hình camera (Tự động, 0°)  │        │
│ └──────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Live Camera Preview Panel (mở khi bấm)

```
┌─────────────────────────────────────────────────────────┐
│ 📹 Xem trước camera                           [✕ Đóng] │
│                                                          │
│ ┌──────────────────────────────────────────────┐        │
│ │                                              │        │
│ │    LIVE CAMERA PREVIEW                       │        │
│ │    (canvas render real-time với đúng          │        │
│ │     orientation + rotation + overlay mẫu)     │        │
│ │                                              │        │
│ │  🔴 REC 00:05                                │        │
│ │                                              │        │
│ │  [ĐÓNG GÓI] DEMO123456                      │        │
│ │  NV: {maNhanVien} | ĐVVC: GHN               │        │
│ │  GPS: N/A                                    │        │
│ │  Kho: {warehouseName}                        │        │
│ │  {time} {date} · REC 00:05                   │        │
│ │                         QuayVideo Kho - by.. │        │
│ │                                              │        │
│ └──────────────────────────────────────────────┘        │
│                                                          │
│ ⚡ Preview cập nhật ngay khi thay đổi khung hình/góc xoay│
│ 📏 Canvas: 1280×720 (Landscape 16:9)                     │
│ 📷 Camera: 720×1280 (Portrait stream) → Xoay 90°        │
└─────────────────────────────────────────────────────────┘
```

---

## 6. ẢNH HƯỞNG ĐẾN CÁC MODULE HIỆN CÓ

### 6.1 Danh sách file cần sửa

| # | File | Thay đổi | Mức độ |
|---|---|---|---|
| 1 | `stores/user-settings-store.ts` | Thêm `videoOrientation`, `videoRotation`, `isCameraConfigured` + setter + persist | **Medium** |
| 2 | `hooks/use-media-recorder.ts` | Nhận `forceOrientation` + `rotation` props, xử lý canvas size + `ctx.rotate()` trong `drawCanvasOverlay()` và `startRecording()` | **High** |
| 3 | `hooks/use-camera.ts` | `getResolutionChain()` nhận thêm param `forceOrientation` để request đúng chiều camera constraints | **Low** |
| 4 | `pages/HomePage.tsx` | Đọc setting từ `useUserSettingsStore`, truyền vào `useMediaRecorder`. Thêm check `isCameraConfigured` trước khi quay | **Medium** |
| 5 | `pages/UserSettingsPage.tsx` | Thêm section UI: Khung hình selector, Góc xoay selector, Live Preview toggle | **High** |
| 6 | **NEW:** `components/settings/CameraPreviewPanel.tsx` | Component live preview với canvas overlay mẫu, nhận orientation/rotation props, render real-time | **High** |
| 7 | **NEW:** `components/recording/CameraSetupDialog.tsx` | Dialog onboarding lần đầu với live preview + orientation/rotation selector | **Medium** |

### 6.2 Luồng dữ liệu

```
┌─────────────────────┐
│ UserSettingsPage     │ ← User chọn orientation + rotation
│ hoặc SetupDialog     │
└──────────┬──────────┘
           │ set()
           ▼
┌─────────────────────┐
│ user-settings-store │ ← Persist to localStorage per user
│ (Zustand)           │
└──────────┬──────────┘
           │ subscribe
           ▼
┌─────────────────────┐
│ HomePage             │ ← Đọc videoOrientation, videoRotation
└──────────┬──────────┘
           │ props
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ useMediaRecorder     │ ←── │ use-camera.ts        │
│ (canvas size +       │     │ (resolution chain    │
│  rotation transform) │     │  với orientation)    │
└──────────┬──────────┘     └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Canvas Output        │
│ (video đúng tỉ lệ   │
│  + đúng hướng xoay)  │
└─────────────────────┘
```

### 6.3 Không ảnh hưởng

- ❌ Backend API: không cần thay đổi — video upload là blob, backend không quan tâm orientation
- ❌ Database schema: không thêm cột — setting là device-specific, lưu localStorage
- ❌ Upload worker: không thay đổi — nhận blob từ MediaRecorder như cũ
- ❌ Video playback (HistoryPage, VideoDetailPage): video đã render đúng orientation trong blob

---

## 7. XỬ LÝ KỸ THUẬT CHI TIẾT

### 7.1 Xác định Canvas Size từ Setting

```typescript
// Trong startRecording() của use-media-recorder.ts

function resolveCanvasSize(
  targetWidth: number,    // 1280 (720p) hoặc 1920 (1080p)
  targetHeight: number,   // 720 (720p) hoặc 1080 (1080p)
  forceOrientation: VideoOrientation,
  stream: MediaStream
): { canvasWidth: number; canvasHeight: number } {
  const landscape = Math.max(targetWidth, targetHeight); // 1280 hoặc 1920
  const portrait = Math.min(targetWidth, targetHeight);   // 720 hoặc 1080

  switch (forceOrientation) {
    case 'landscape':
      return { canvasWidth: landscape, canvasHeight: portrait };
    case 'portrait':
      return { canvasWidth: portrait, canvasHeight: landscape };
    case 'auto':
    default: {
      // Giữ logic detect hiện tại (dựa trên device orientation + camera stream)
      const isPortrait = detectIsPortrait(stream);
      return {
        canvasWidth: isPortrait ? portrait : landscape,
        canvasHeight: isPortrait ? landscape : portrait,
      };
    }
  }
}
```

### 7.2 Xử lý Rotation trong drawCanvasOverlay

```typescript
// Tách riêng hàm vẽ camera frame (không overlay)
function drawRotatedCameraFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
  rotation: VideoRotation
): void {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  if (!vW || !vH) return;

  ctx.save();

  if (rotation === 0) {
    // Không xoay → crop object-fit:cover
    drawObjectFitCover(ctx, video, 0, 0, canvasWidth, canvasHeight);
  } else if (rotation === 180) {
    // Lật 180° → canvas size giữ nguyên
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
    drawObjectFitCover(ctx, video, 0, 0, canvasWidth, canvasHeight);
  } else {
    // 90° hoặc 270° → swap draw dimensions
    // Camera frame cần vẽ với kích thước swap vì đã xoay 90°
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    // Vẽ camera frame với chiều swap
    ctx.translate(-canvasHeight / 2, -canvasWidth / 2);
    drawObjectFitCover(ctx, video, 0, 0, canvasHeight, canvasWidth);
  }

  ctx.restore();
}

// drawObjectFitCover: crop để fill đúng kích thước (giữ nguyên logic hiện tại)
function drawObjectFitCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  dx: number, dy: number,
  dWidth: number, dHeight: number
): void {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const videoRatio = vW / vH;
  const destRatio = dWidth / dHeight;

  let sx = 0, sy = 0, sW = vW, sH = vH;
  if (videoRatio > destRatio) {
    sW = vH * destRatio;
    sx = (vW - sW) / 2;
  } else {
    sH = vW / destRatio;
    sy = (vH - sH) / 2;
  }

  ctx.drawImage(video, sx, sy, sW, sH, dx, dy, dWidth, dHeight);
}
```

### 7.3 Camera Constraints với Orientation

```typescript
// Trong use-camera.ts: getResolutionChain()
export function getResolutionChain(
  resolution: '1080p' | '720p',
  fps: number = 30,
  forceOrientation?: VideoOrientation  // NEW param
): ResolutionConstraint[] {
  let isPortrait: boolean;

  if (forceOrientation === 'landscape') {
    isPortrait = false;
  } else if (forceOrientation === 'portrait') {
    isPortrait = true;
  } else {
    // Auto: detect từ window (giữ logic cũ)
    isPortrait = typeof window !== 'undefined' && (
      window.innerHeight > window.innerWidth ||
      window.matchMedia?.('(orientation: portrait)').matches
    );
  }

  const base = resolution === '1080p' ? RESOLUTION_CHAIN_1080P : RESOLUTION_CHAIN_720P;
  return base.map((c) => {
    const idealW = c.width.ideal;
    const idealH = c.height.ideal;
    return {
      width: { ideal: isPortrait ? Math.min(idealW, idealH) : Math.max(idealW, idealH) },
      height: { ideal: isPortrait ? Math.max(idealW, idealH) : Math.min(idealW, idealH) },
      frameRate: { ideal: fps },
    };
  });
}
```

---

## 8. COMPONENT MỚI: CameraPreviewPanel

### 8.1 Interface

```typescript
interface CameraPreviewPanelProps {
  /** Current orientation setting being previewed */
  orientation: VideoOrientation;
  /** Current rotation setting being previewed */
  rotation: VideoRotation;
  /** Current resolution setting */
  resolution: VideoResolution;
  /** Whether panel is visible */
  isOpen: boolean;
  /** Callback when panel closes */
  onClose: () => void;
}
```

### 8.2 Behavior

1. **Mount:** Request camera stream via `navigator.mediaDevices.getUserMedia()`
2. **Render loop:** `requestAnimationFrame` vẽ camera + overlay mẫu lên canvas
3. **Props change:** Khi user thay đổi orientation/rotation → canvas resize + re-render ngay lập tức
4. **Unmount/Close:** Stop tất cả tracks, revoke object URLs (Rule `03-performance.md`)
5. **Overlay mẫu:** Sử dụng data demo:
   ```typescript
   const demoOverlay: OverlayInfo = {
     maVanDon: 'DEMO123456789',
     donViVc: 'GHN',
     loaiBienBan: 'dong_goi',
     maNhanVien: user?.ma_nhan_vien || 'NV001',
     warehouseName: warehouseName || 'Kho Demo',
   };
   ```

### 8.3 Hiển thị thông tin kỹ thuật

Dưới preview canvas, hiển thị thông tin debug:
```
📏 Canvas output: 1280×720 (Landscape 16:9)
📷 Camera stream: 720×1280 (Portrait)
🔄 Góc xoay: 90° (Xoay phải)
```

---

## 9. COMPONENT MỚI: CameraSetupDialog

### 9.1 Interface

```typescript
interface CameraSetupDialogProps {
  /** Whether dialog is visible */
  isOpen: boolean;
  /** Callback after user saves settings */
  onComplete: () => void;
}
```

### 9.2 Behavior

1. **Trigger:** Gọi từ `HomePage.tsx` khi `isCameraConfigured === false` và user bấm quay
2. **Content:** Embed `CameraPreviewPanel` + orientation/rotation selectors
3. **Save:** Lưu settings vào store → set `isCameraConfigured = true` → gọi `onComplete()`
4. **Skip:** Không cho phép skip — bắt buộc chọn ít nhất 1 lần

---

## 10. EDGE CASES & XỬ LÝ LỖI

| Case | Xử lý |
|---|---|
| Camera không khả dụng trong Preview | Hiện placeholder "Camera không khả dụng" với icon, vẫn cho chọn setting |
| Camera bị deny permission | Toast hướng dẫn bật camera, vẫn cho lưu setting (sẽ request lại khi quay) |
| iOS Safari không hỗ trợ canvas.captureStream | Fallback: record trực tiếp stream (giữ logic hiện tại), rotation không áp dụng |
| User chọn rotation 90°/270° + camera cùng hướng | Hình sẽ xoay 90° trên preview → user thấy ngay và tự điều chỉnh |
| Thiết bị PC/webcam | Mặc định `auto`, không cần setup dialog (PC thường không gắn overhead) |
| Xoay 90° + crop lớn | Hiện warning nhẹ: "Góc xoay 90° có thể cắt bớt hình ảnh. Gắn điện thoại khớp hướng khung hình để tối ưu." |

---

## 11. KẾ HOẠCH TRIỂN KHAI

### Phase 1: Store + Core Logic (ưu tiên)
1. Thêm fields vào `user-settings-store.ts`
2. Sửa `use-media-recorder.ts` (canvas size + rotation)
3. Sửa `use-camera.ts` (resolution chain)
4. Sửa `HomePage.tsx` (truyền setting + check `isCameraConfigured`)

### Phase 2: UI Components
5. Tạo `CameraPreviewPanel.tsx`
6. Tạo `CameraSetupDialog.tsx`
7. Thêm section vào `UserSettingsPage.tsx`

### Phase 3: Polish
8. Test trên các thiết bị: iPhone, Android, iPad, PC webcam
9. Test các kịch bản overhead stand
10. Kiểm tra performance (canvas rotation + live preview)

---

## 12. CHECKLIST KIỂM THỬ

| # | Test case | Expected |
|---|---|---|
| 1 | Lần đầu quay → chưa cấu hình | Hiện dialog setup, chặn quay |
| 2 | Cấu hình xong → quay | Video output đúng orientation + rotation |
| 3 | Setting landscape + phone portrait mount + rotation 0° | Video landscape, crop top/bottom |
| 4 | Setting landscape + phone portrait mount + rotation 90° | Video landscape, camera xoay 90° → full frame |
| 5 | Setting portrait + phone landscape mount | Video portrait, crop left/right |
| 6 | Setting auto + phone ngang | Video landscape (detect đúng) |
| 7 | Setting auto + phone overhead | Video theo rotation lock OS |
| 8 | Xóa cache → quay lại | Hiện dialog setup lại |
| 9 | Đăng nhập user khác | Hiện dialog nếu user mới chưa setup |
| 10 | Thay đổi setting giữa chừng | Áp dụng lần quay tiếp, video đang quay không bị ảnh hưởng |
| 11 | Live preview thay đổi orientation | Preview cập nhật ngay, canvas resize smooth |
| 12 | Live preview thay đổi rotation | Camera content xoay ngay, overlay text không xoay |
| 13 | 1080p + landscape | Canvas 1920×1080 |
| 14 | 1080p + portrait | Canvas 1080×1920 |
| 15 | 720p + landscape | Canvas 1280×720 |
| 16 | 720p + portrait | Canvas 720×1280 |
