import React, { useState, useRef, useCallback } from 'react';
import {
  Camera,
  ScanLine,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  X,
  Keyboard,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUploadQueue } from '@/hooks/use-upload-queue';
import { useNavigate } from 'react-router-dom';
import { useCamera } from '@/hooks/use-camera';
import { useBarcode } from '@/hooks/use-barcode';
import { useBarcodeGun } from '@/hooks/use-barcode-gun';
import { useCheckBarcode } from '@/hooks/use-check-barcode';
import { useRecordingGuard } from '@/hooks/use-recording-guard';
import { CameraPreview } from '@/components/camera/CameraPreview';
import { CameraSelector } from '@/components/camera/CameraSelector';
import { ScannerOverlay } from '@/components/scanner/ScannerOverlay';
import { ScanResult } from '@/components/scanner/ScanResult';
import { WorkModeSelector, WorkModeModal } from '@/components/work-mode';
import { RecordingView, VideoPreview } from '@/components/recording';
import { useWorkModeStore } from '@/stores/work-mode-store';
import { useAuthStore } from '@/stores/auth-store';
import { useConfigStore } from '@/stores/config-store';
import { useMediaRecorder, type OverlayInfo } from '@/hooks/use-media-recorder';
import { useGeolocation } from '@/hooks/use-geolocation';
import { idbService } from '@/services/idb-service';
import { feedbackSuccess } from '@/utils/barcode-feedback';
import { formatDuration } from '@/utils/format';
import type { BarcodeResult, DonViVanChuyen, LoaiBienBan } from '@/types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { warehouseName } = useConfigStore();

  const [currentView, setCurrentView] = useState<'idle' | 'scanner' | 'recording' | 'preview'>('idle');
  const [activeBarcode, setActiveBarcode] = useState<BarcodeResult | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [recordingMessage, setRecordingMessage] = useState<string | null>(null);

  // Sprint 1.2 — Work Mode selection state (Mode-First)
  const { workMode, setWorkMode } = useWorkModeStore();
  const [modeError, setModeError] = useState<string | null>(null);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [pendingGunScan, setPendingGunScan] = useState<string | null>(null);

  // Sprint 2.1 — Active recording session state
  const [activeOverlayInfo, setActiveOverlayInfo] = useState<OverlayInfo | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sprint 1.1 — Camera management
  const {
    stream,
    isLoading: isCameraLoading,
    error: cameraError,
    devices,
    selectedDevice,
    switchDevice,
    startCamera,
    stopCamera,
  } = useCamera();

  // Sprint 2.1 — Video Recording Hook
  const {
    isRecording,
    duration: recordDuration,
    previewUrl,
    error: recorderError,
    startRecording,
    stopRecording,
    discardRecording,
    attachSourceVideo,
  } = useMediaRecorder({
    stream,
    overlayInfo: activeOverlayInfo ?? {
      maVanDon: '',
      donViVc: 'GHN',
      loaiBienBan: workMode ?? 'dong_goi',
      maNhanVien: user?.ma_nhan_vien || 'NV001',
    },
  });

  // Step 2.1b — Geolocation (single-shot GPS)
  const { requestLocation } = useGeolocation();

  // Sprint 2.2 — IndexedDB Queue & Offline Storage Hook
  const {
    pendingCount,
    errorCount,
    completedCount,
    enqueue,
    storageWarning,
    loadQueue,
  } = useUploadQueue({ isRecording });

  // Recording exit guard — blocks navigation, tab switch, browser back
  const {
    showExitDialog,
    confirmExit,
    cancelExit,
    tabSwitchWarning,
    dismissTabWarning,
  } = useRecordingGuard({
    isActive: currentView === 'recording',
    onConfirmExit: async () => {
      // Stop recording gracefully before allowing exit
      if (isRecording) {
        await stopRecording();
      }
      discardRecording();
      stopCamera();
      setRecordedBlob(null);
      setActiveOverlayInfo(null);
      setCurrentView('idle');
    },
  });

  // Sprint 1.3 — Duplicate checking API hook
  const {
    isChecking,
    isDuplicate,
    duplicateInfo,
    checkCode,
    reset: resetCheck,
  } = useCheckBarcode();

  // Handle barcode detected (from camera, USB gun, or manual input)
  const handleBarcodeDetected = useCallback(
    async (result: BarcodeResult) => {
      feedbackSuccess();
      setActiveBarcode(result);
      // Check duplicate from backend API + local IndexedDB (filtered by loai_bien_ban)
      await checkCode(result.rawValue, workMode ?? 'dong_goi');
    },
    [checkCode, workMode]
  );

  // Sprint 1.2 — Barcode scanner hook with direct onDetected callback
  const {
    isScanning,
    startScanning,
    stopScanning,
    reset: resetBarcode,
  } = useBarcode(videoRef, handleBarcodeDetected);

  // Handle USB gun scan (maps raw code string to BarcodeResult)
  const handleGunScan = useCallback(
    (code: string) => {
      if (!workMode) {
        setPendingGunScan(code);
        setModeError('Vui lòng chọn chế độ làm việc trước khi quét.');
        setIsModeModalOpen(true);
        return;
      }

      void handleBarcodeDetected({
        rawValue: code,
        format: 'code_128',
        source: 'gun',
      });
    },
    [workMode, handleBarcodeDetected]
  );

  // Sprint 1.2 — USB Barcode Gun listener
  useBarcodeGun(handleGunScan, true);

  // Open camera scanner
  const handleOpenScanner = async () => {
    if (!workMode) {
      setModeError('Vui lòng chọn chế độ làm việc (Đóng gói hoặc Khui hàng) trước khi quét.');
      setIsModeModalOpen(true);
      return;
    }
    setModeError(null);
    setCurrentView('scanner');
    setActiveBarcode(null);
    resetCheck();
    resetBarcode();
    await startCamera();
    startScanning();
  };

  const handleOpenScannerWithMode = async (mode: LoaiBienBan) => {
    setWorkMode(mode);
    setModeError(null);
    setCurrentView('scanner');
    setActiveBarcode(null);
    resetCheck();
    resetBarcode();
    await startCamera();
    startScanning();
  };

  const handleSwitchWorkMode = () => {
    const nextMode: LoaiBienBan = workMode === 'dong_goi' ? 'khui_hang' : 'dong_goi';
    setWorkMode(nextMode);
  };

  // Close camera scanner
  const handleCloseScanner = () => {
    stopScanning();
    stopCamera();
    setCurrentView('idle');
    setActiveBarcode(null);
    resetCheck();
    resetBarcode();
  };

  // Rescan action
  const handleRescan = () => {
    setActiveBarcode(null);
    resetCheck();
    resetBarcode();
    if (currentView === 'scanner') {
      startScanning();
    }
  };

  // Sprint 2.1 — Start recording video with composited overlay
  const handleStartRecording = async (data: {
    maVanDon: string;
    donViVc: DonViVanChuyen;
    loaiBienBan: LoaiBienBan;
    overwrite?: boolean;
  }) => {
    // Nếu ghi đè: xóa tất cả video cũ cùng mã + loại biên bản trong IndexedDB
    if (data.overwrite) {
      try {
        const deletedCount = await idbService.deleteByMaVanDonAndLoaiBienBan(
          data.maVanDon,
          data.loaiBienBan
        );
        if (deletedCount > 0) {
          console.log(`Đã xóa ${deletedCount} video cũ cho mã ${data.maVanDon} (${data.loaiBienBan})`);
          // Refresh upload queue
          await loadQueue();
        }
      } catch (err) {
        console.error('Lỗi xóa video cũ:', err);
      }
    }

    stopScanning();
    setActiveBarcode(null);

    // Step 2.1b — Get GPS location (non-blocking, best-effort)
    const geoResult = await requestLocation();

    const info: OverlayInfo = {
      maVanDon: data.maVanDon,
      donViVc: data.donViVc,
      loaiBienBan: data.loaiBienBan,
      maNhanVien: user?.ma_nhan_vien || 'NV001',
      gpsCoords: geoResult ? { lat: geoResult.lat, lng: geoResult.lng } : null,
      gpsAddress: geoResult?.address,
      warehouseName: warehouseName || undefined,
    };
    setActiveOverlayInfo(info);

    if (!stream) {
      await startCamera();
    }

    setCurrentView('recording');
    await startRecording();
  };

  // Stop recording and show video preview
  const handleStopRecording = async () => {
    const durationRecorded = recordDuration;
    const videoBlob = await stopRecording();
    if (videoBlob) {
      setRecordedBlob(videoBlob);
      setRecordedDuration(durationRecorded);
      setCurrentView('preview');
    } else {
      setCurrentView('idle');
    }
  };

  // User confirms video preview: Save & continue
  const handleSaveAndContinue = async (blob: Blob, durationSeconds: number) => {
    if (activeOverlayInfo) {
      try {
        await enqueue(blob, {
          ma_van_don: activeOverlayInfo.maVanDon,
          don_vi_vc: activeOverlayInfo.donViVc,
          loai_bien_ban: activeOverlayInfo.loaiBienBan,
          ma_nhan_vien: activeOverlayInfo.maNhanVien,
          thiet_bi: 'pc_webcam',
          thoi_luong_video: durationSeconds,
        });
        setRecordingMessage(
          `Đã lưu IndexedDB: ${activeOverlayInfo.maVanDon} (${formatDuration(durationSeconds)}). Sẵn sàng đồng bộ!`
        );
      } catch (err) {
        console.error('Lỗi khi lưu video vào IndexedDB:', err);
      }
    }
    setTimeout(() => setRecordingMessage(null), 5000);
    discardRecording();
    setRecordedBlob(null);
    setActiveOverlayInfo(null);
    setCurrentView('idle');
  };

  // User discards video preview: Re-record
  const handleDiscardAndRetry = async () => {
    discardRecording();
    setRecordedBlob(null);
    setCurrentView('scanner');
    if (!stream) {
      await startCamera();
    }
    startScanning();
  };

  // Handle manual code submit (for quick testing on PC)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCodeInput.trim();
    if (trimmed.length < 4) return;

    if (!workMode) {
      setModeError('Vui lòng chọn chế độ làm việc trước khi quét.');
      setIsModeModalOpen(true);
      return;
    }

    void handleBarcodeDetected({
      rawValue: trimmed,
      format: 'code_128',
      source: 'manual',
    });
    setManualCodeInput('');
    setShowManualInput(false);
  };

  return (
    <div className="page-stack">
      {/* Storage Quota Warning if < 500MB */}
      {storageWarning && (
        <div className="glass-panel alert-banner alert-banner--error">
          <AlertTriangle size={18} color="var(--color-error)" />
          <span>{storageWarning}</span>
        </div>
      )}

      {/* Toast Notification if any */}
      {recordingMessage && (
        <div className="glass-panel alert-banner alert-banner--success">
          <CheckCircle2 size={18} color="var(--color-success)" />
          <span>{recordingMessage}</span>
        </div>
      )}

      {/* Quick Stats Banner — Only visible when idle */}
      {currentView === 'idle' && (
        <div className="glass-panel stat-grid">
          <div className="stat-cell">
            <div className="stat-icon-label" style={{ color: 'var(--color-success)' }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>Đã lưu</span>
            </div>
            <span className="stat-value">{completedCount}</span>
          </div>

          <div className="stat-cell stat-cell--bordered">
            <div className="stat-icon-label" style={{ color: 'var(--color-warning)' }}>
              <Clock size={16} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>Chờ tải</span>
            </div>
            <span className="stat-value">{pendingCount}</span>
          </div>

          <div className="stat-cell">
            <div className="stat-icon-label" style={{ color: 'var(--color-error)' }}>
              <AlertTriangle size={16} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>Lỗi</span>
            </div>
            <span className="stat-value">{errorCount}</span>
          </div>
        </div>
      )}

      {/* 1. Active Recording View */}
      {currentView === 'recording' && (
        <RecordingView
          stream={stream}
          overlayInfo={
            activeOverlayInfo ?? {
              maVanDon: '',
              donViVc: 'GHN',
              loaiBienBan: workMode ?? 'dong_goi',
              maNhanVien: user?.ma_nhan_vien || 'NV001',
            }
          }
          duration={recordDuration}
          isRecording={isRecording}
          error={recorderError}
          onStopRecording={handleStopRecording}
          onAttachVideoRef={attachSourceVideo}
        />
      )}

      {/* 2. Video Preview & Confirmation */}
      {currentView === 'preview' && previewUrl && recordedBlob && activeOverlayInfo && (
        <VideoPreview
          blob={recordedBlob}
          previewUrl={previewUrl}
          duration={recordedDuration}
          overlayInfo={activeOverlayInfo}
          onSaveAndContinue={handleSaveAndContinue}
          onDiscardAndRetry={handleDiscardAndRetry}
        />
      )}

      {/* 3. Camera Barcode Scanner View */}
      {currentView === 'scanner' && (
        <div
          className="glass-panel-elevated"
          style={{
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <ScanLine size={20} color="var(--color-primary-500)" />
              <span style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)' }}>
                Quét mã camera
              </span>
            </div>

            <Button
              variant="secondary"
              leftIcon={<X size={18} />}
              onClick={handleCloseScanner}
              className="btn-compact"
            >
              Đóng
            </Button>
          </div>

          {/* Device selector */}
          {devices.length > 0 && (
            <CameraSelector
              devices={devices}
              selectedDeviceId={selectedDevice}
              onSelect={switchDevice}
            />
          )}

          {/* Camera Viewfinder */}
          <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <CameraPreview
              stream={stream}
              isLoading={isCameraLoading}
              videoRef={videoRef}
            >
              <ScannerOverlay
                isScanning={isScanning}
                isSuccess={!!activeBarcode}
                stream={stream}
                workMode={workMode}
                onSwitchWorkMode={handleSwitchWorkMode}
              />
            </CameraPreview>
          </div>

          {cameraError && (
            <div
              style={{
                color: 'var(--color-error)',
                fontSize: 'var(--text-xs)',
                padding: 'var(--space-2)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {cameraError.userMessage}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <BarcodeIcon size={16} />
            <span>Hướng camera vào mã vạch trên đơn hàng (Code 128, QR, Code 39)</span>
          </div>
        </div>
      )}

      {/* 4. Idle Main View */}
      {currentView === 'idle' && (
        <>
          {/* Sprint 1.2 — Work Mode Selector (Mode-First Selection) */}
          <div
            className="glass-panel-elevated"
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <WorkModeSelector
              selectedMode={workMode}
              onSelectMode={(mode) => {
                setWorkMode(mode);
                setModeError(null);
              }}
              errorMessage={modeError}
            />
          </div>

          {/* Idle Main Action Card */}
          <div
            className="glass-panel-elevated"
            style={{
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 'var(--space-4)',
              minHeight: '260px',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: 'var(--radius-full)',
                background:
                  workMode === 'khui_hang'
                    ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(63, 81, 181, 0.2) 0%, rgba(0, 188, 212, 0.2) 100%)',
                border:
                  workMode === 'khui_hang'
                    ? '2px solid var(--color-warning)'
                    : '2px solid var(--color-accent-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: workMode === 'khui_hang' ? 'var(--color-warning)' : 'var(--color-accent-400)',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Camera size={36} />
            </div>

            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', marginBottom: '4px' }}>
                {workMode === 'dong_goi'
                  ? 'Sẵn sàng quét đơn Đóng gói'
                  : workMode === 'khui_hang'
                  ? 'Sẵn sàng quét đơn Khui hàng'
                  : 'Sẵn sàng quét mã đơn'}
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '340px' }}>
                {workMode
                  ? `Đang chọn chế độ: ${workMode === 'dong_goi' ? 'Đóng gói xuất kho' : 'Khui hàng hoàn trả'}. Quét bằng camera hoặc súng barcode.`
                  : 'Vui lòng chọn chế độ làm việc phía trên trước khi bắt đầu quét.'}
              </p>
            </div>

            <Button
              size="large"
              variant="primary"
              leftIcon={<ScanLine size={22} />}
              style={{ width: '100%', maxWidth: '340px' }}
              onClick={handleOpenScanner}
            >
              {workMode === 'dong_goi'
                ? 'BẮT ĐẦU QUÉT ĐÓNG GÓI'
                : workMode === 'khui_hang'
                ? 'BẮT ĐẦU QUÉT KHUI HÀNG'
                : 'CHỌN CHẾ ĐỘ & BẮT ĐẦU QUÉT'}
            </Button>

            {/* Quick test with manual entry or barcode gun */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={() => setShowManualInput(!showManualInput)}
              >
                <Keyboard size={16} />
                <span>{showManualInput ? 'Ẩn nhập tay' : 'Hoặc nhập tay / dùng súng barcode'}</span>
              </button>

              {showManualInput && (
                <form
                  onSubmit={handleManualSubmit}
                  style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    width: '100%',
                    maxWidth: '320px',
                    marginTop: '4px',
                  }}
                >
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder="VD: GHN123456789"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    style={{
                      flex: 1,
                      height: '42px',
                      fontSize: 'var(--text-sm)',
                      padding: '0 12px',
                    }}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    style={{ height: '42px', minHeight: '42px', padding: '0 16px' }}
                  >
                    Kiểm tra
                  </Button>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {/* Scan Result Modal Popup */}
      {activeBarcode && (
        <div className="modal-backdrop">
          <div style={{ maxWidth: '440px', width: '100%' }}>
            <ScanResult
              result={activeBarcode}
              isDuplicate={isDuplicate}
              duplicateInfo={duplicateInfo ?? undefined}
              isChecking={isChecking}
              initialLoaiBienBan={workMode ?? 'dong_goi'}
              onStartRecording={handleStartRecording}
              onRescan={handleRescan}
            />
          </div>
        </div>
      )}

      {/* Work Mode Pre-selection Guard Modal */}
      <WorkModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectMode={(mode) => {
          setWorkMode(mode);
          setModeError(null);
          setIsModeModalOpen(false);
          if (pendingGunScan) {
            const code = pendingGunScan;
            setPendingGunScan(null);
            void handleBarcodeDetected({
              rawValue: code,
              format: 'code_128',
              source: 'gun',
            });
          } else if (currentView !== 'scanner') {
            void handleOpenScannerWithMode(mode);
          }
        }}
      />

      {/* Pending Queue Notice — Only in idle */}
      {currentView === 'idle' && pendingCount > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '4px solid var(--color-warning)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Clock size={20} color="var(--color-warning)" />
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>
                {pendingCount} video đang chờ tải lên
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Tự động đồng bộ khi có kết nối ổn định
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            rightIcon={<ArrowRight size={16} />}
            className="btn-compact"
            onClick={() => navigate('/queue')}
          >
            Xem
          </Button>
        </div>
      )}

      {/* Exit Confirmation Dialog — shown when user tries to navigate during recording */}
      {showExitDialog && (
        <div className="modal-backdrop modal-backdrop--dark">
          <div
            className="glass-panel-elevated"
            style={{
              maxWidth: '400px',
              width: '100%',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid var(--color-error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}>
              <AlertTriangle size={28} color="var(--color-error)" />
            </div>
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: '8px' }}>
                Đang quay video!
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                Video chưa được lưu. Bạn có chắc muốn dừng quay và thoát?
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button
                variant="secondary"
                onClick={cancelExit}
                style={{ flex: 1 }}
              >
                Tiếp tục quay
              </Button>
              <Button
                variant="primary"
                onClick={confirmExit}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--color-error)',
                  borderColor: 'var(--color-error)',
                }}
              >
                Dừng và thoát
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo khi chuyển tab trong lúc quay video */}
      {tabSwitchWarning && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 'var(--space-4)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            backgroundColor: 'var(--color-error)',
            color: '#ffffff',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            maxWidth: 'calc(100vw - 32px)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
          }}
        >
          <AlertTriangle size={20} color="#ffffff" style={{ flexShrink: 0 }} />
          <span>{tabSwitchWarning}</span>
          <button
            type="button"
            onClick={dismissTabWarning}
            aria-label="Đóng thông báo"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              marginLeft: 'var(--space-2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
