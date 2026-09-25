// ---------------------------------------------------------------------------
// useCheckBarcode — Kiểm tra mã vận đơn trùng (local IndexedDB + remote API)
// Tham chiếu: docs/08-frontend-architecture.md, docs/10-error-handling.md (mục 2.7)
// Rules: 01-ui-ux.md (haptic + warning tone), 05-offline-and-reliability.md
// Skills: frontend-api-integration-patterns (race condition & request cancellation)
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import { checkBarcodeDuplicate } from '../services/bien-ban-service';
import { idbService } from '../services/idb-service';
import { feedbackWarning } from '../utils/barcode-feedback';
import { formatDateTimeVN } from '../utils/format';
import type { CheckMaVanDonResult, LoaiBienBan, QueueItem } from '../types';

export interface DuplicateInfo {
  nhanVien: string;
  thoiGian: string;
  soLuong: number;
  /** Video trùng nằm trong IndexedDB local (hàng đợi) */
  localItems: QueueItem[];
  /** Nguồn phát hiện: local (IndexedDB), remote (backend), hoặc cả hai */
  source: 'local' | 'remote' | 'both';
}

export interface UseCheckBarcodeReturn {
  /** Đang gọi API kiểm tra mã */
  isChecking: boolean;
  /** Mã đã có video trước đó hay chưa */
  isDuplicate: boolean;
  /** Chi tiết video cũ nếu quét trùng */
  duplicateInfo: DuplicateInfo | null;
  /** Lỗi kiểm tra nếu có */
  error: string | null;
  /** Thực hiện kiểm tra mã vận đơn (cùng loại biên bản) */
  checkCode: (code: string, loaiBienBan?: LoaiBienBan) => Promise<CheckMaVanDonResult | null>;
  /** Reset trạng thái về ban đầu */
  reset: () => void;
}

export function useCheckBarcode(): UseCheckBarcodeReturn {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Dọn dẹp request đang chạy khi unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsChecking(false);
    setIsDuplicate(false);
    setDuplicateInfo(null);
    setError(null);
  }, []);

  const checkCode = useCallback(async (code: string, loaiBienBan: LoaiBienBan = 'dong_goi'): Promise<CheckMaVanDonResult | null> => {
    // 1. Hủy request trước nếu đang chạy dở (chống race condition khi quét nhanh)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsChecking(true);
    setError(null);
    setIsDuplicate(false);
    setDuplicateInfo(null);

    try {
      // --- Step 1: Kiểm tra local IndexedDB trước (instant, offline-safe) ---
      let localItems: QueueItem[] = [];
      try {
        localItems = await idbService.findByMaVanDonAndLoaiBienBan(code, loaiBienBan);
      } catch (localErr) {
        console.warn('Lỗi kiểm tra IndexedDB local:', localErr);
      }

      const hasLocalDuplicate = localItems.length > 0;

      // --- Step 2: Kiểm tra remote API (backend D1) ---
      const res = await checkBarcodeDuplicate(code, loaiBienBan, { signal: controller.signal });

      // Nếu đã bị hủy bởi request mới hơn thì bỏ qua
      if (controller.signal.aborted) {
        return null;
      }

      if (!res.success) {
        // API lỗi nhưng có local duplicate → vẫn cảnh báo
        if (hasLocalDuplicate) {
          const newestLocal = localItems[localItems.length - 1];
          setIsDuplicate(true);
          setDuplicateInfo({
            nhanVien: newestLocal.ma_nhan_vien,
            thoiGian: formatDateTimeVN(new Date(newestLocal.created_at).toISOString()),
            soLuong: localItems.length,
            localItems,
            source: 'local',
          });
          feedbackWarning();
          setIsChecking(false);
          return null;
        }

        feedbackWarning();
        setError(res.error?.message || 'Không thể kiểm tra mã vận đơn');
        setIsChecking(false);
        return null;
      }

      const result = res.data ?? {
        da_co_video: false,
        so_luong_video: 0,
        video_gan_nhat: null,
      };

      const hasRemoteDuplicate = result.da_co_video;

      // --- Step 3: Merge kết quả local + remote ---
      if (hasLocalDuplicate || hasRemoteDuplicate) {
        setIsDuplicate(true);

        const totalCount = localItems.length + result.so_luong_video;
        let source: DuplicateInfo['source'] = 'remote';
        if (hasLocalDuplicate && hasRemoteDuplicate) source = 'both';
        else if (hasLocalDuplicate) source = 'local';

        // Ưu tiên hiển thị thông tin mới nhất
        const newestLocal = localItems.length > 0 ? localItems[localItems.length - 1] : null;
        const remoteNhanVien = result.video_gan_nhat?.ma_nhan_vien || 'N/A';
        const remoteThoiGian = result.video_gan_nhat?.thoi_gian_tao
          ? formatDateTimeVN(result.video_gan_nhat.thoi_gian_tao)
          : 'Vừa xong';

        setDuplicateInfo({
          nhanVien: newestLocal ? newestLocal.ma_nhan_vien : remoteNhanVien,
          thoiGian: newestLocal
            ? formatDateTimeVN(new Date(newestLocal.created_at).toISOString())
            : remoteThoiGian,
          soLuong: totalCount,
          localItems,
          source,
        });

        // Báo động quét trùng: warning tone đôi + rung 2 nhịp (Rule 01)
        feedbackWarning();
      } else {
        setIsDuplicate(false);
        setDuplicateInfo(null);
      }

      setIsChecking(false);
      return result;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Bị abort do scan mã mới — không update state lỗi
        return null;
      }

      // API lỗi mạng — vẫn check local duplicate
      let localItems: QueueItem[] = [];
      try {
        localItems = await idbService.findByMaVanDonAndLoaiBienBan(code, loaiBienBan);
      } catch {
        // Ignore
      }

      if (localItems.length > 0) {
        const newestLocal = localItems[localItems.length - 1];
        setIsDuplicate(true);
        setDuplicateInfo({
          nhanVien: newestLocal.ma_nhan_vien,
          thoiGian: formatDateTimeVN(new Date(newestLocal.created_at).toISOString()),
          soLuong: localItems.length,
          localItems,
          source: 'local',
        });
        feedbackWarning();
        setIsChecking(false);
        return null;
      }

      feedbackWarning();
      setError('Lỗi khi kiểm tra mã vận đơn');
      setIsChecking(false);
      return null;
    }
  }, []);

  return {
    isChecking,
    isDuplicate,
    duplicateInfo,
    error,
    checkCode,
    reset,
  };
}

