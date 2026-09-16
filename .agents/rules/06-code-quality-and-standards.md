# Quy định Chuẩn Code & Kiến trúc (Code Quality & Architecture Rules)

## 1. Tiêu chuẩn TypeScript & Kiểm soát Kiểu
- Bật `strict: true` trong `tsconfig.json`. Tuyệt đối cấm sử dụng kiểu `any` (sử dụng `unknown` kết hợp type guards hoặc Zod schema inference).
- Mọi DTO gửi/nhận qua mạng bắt buộc định nghĩa bằng Zod schema và suy diễn kiểu bằng `z.infer<typeof Schema>`.
- Đặt tên nhất quán: Tiếng Việt không dấu chuẩn snake_case cho database columns và API payloads (khớp tài liệu `07-database-schema.md`); camelCase cho frontend code, PascalCase cho React Components và TypeScript types.

## 2. Chuẩn hóa Phản hồi API (API Response Envelope)
Tất cả endpoint backend (Cloudflare Workers + Hono) bắt buộc trả về format thống nhất:
```typescript
// Thành công
{
  success: true,
  data: T,
  meta?: { page?: number; limit?: number; total?: number }
}

// Thất bại
{
  success: false,
  error: {
    code: string,       // Ví dụ: "MA_VAN_DON_TRUNG", "AUTH_PIN_INVALID"
    message: string,    // Thông điệp tiếng Việt thân thiện với người dùng kho
    details?: unknown
  }
}
```

## 3. Kiến trúc Frontend Phân lớp
- **Hooks Layer**: Quản lý truy cập phần cứng (`useCamera`, `useBarcodeScanner`, `useMediaRecorder`, `useWakeLock`).
- **Store Layer (Zustand)**: Quản lý trạng thái toàn cục ứng dụng (`authStore`, `recordingStore`, `syncQueueStore`, `deviceConfigStore`).
- **Service Layer**: Đóng gói API calls và IndexedDB operations (`apiClient.ts`, `dbStorage.ts`, `driveUpload.ts`).
- **Component Layer**: Giao diện thuần túy, bọc `ErrorBoundary` tại cụm Camera và Video Preview để tránh crash toàn bộ ứng dụng khi lỗi phần cứng.

## 4. Giới hạn Thực thi Cloudflare Workers
- Workers chạy trên V8 isolates: Không giữ state trong biến toàn cục (stateless giữa các request).
- Tôn trọng giới hạn thời gian CPU (50ms execution time): Tác vụ nặng (mã hóa video, nén) phải thực hiện trên Client Browser qua WebCodecs/Canvas hoặc giao cho Cloudflare Cron / Workflows.
