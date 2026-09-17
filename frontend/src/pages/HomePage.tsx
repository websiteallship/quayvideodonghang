import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  ScanLine,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  X,
  Barcode as BarcodeIcon,
  Package,
  PackageOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
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
import { WorkModeModal } from '@/components/work-mode';
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
    queue,
    pendingCount,
    completedCount,
    enqueue,
    storageWarning,
    loadQueue,
  } = useUploadQueue({ isRecording });

  // Get recent completed items (max 2)
  const recentCompletedItems = queue
    .filter((item) => item.status === 'da_upload')
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 2);

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

  useEffect(() => {
    if (tabSwitchWarning) {
      toast.error(tabSwitchWarning, {
        id: 'tab-switch-warning',
        duration: 10000,
        onDismiss: dismissTabWarning,
        onAutoClose: dismissTabWarning,
      });
    } else {
      toast.dismiss('tab-switch-warning');
    }
  }, [tabSwitchWarning, dismissTabWarning]);

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
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Storage Quota Warning if < 500MB */}
      {storageWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{storageWarning}</AlertDescription>
        </Alert>
      )}

      {/* Toast Notification if any */}
      {recordingMessage && (
        <Alert className="border-emerald-500/50 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 stroke-emerald-600 dark:stroke-emerald-400" />
          <AlertDescription>{recordingMessage}</AlertDescription>
        </Alert>
      )}

      {/* Mode Error */}
      {modeError && (
        <Alert variant="destructive" className="py-2 px-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">{modeError}</AlertDescription>
        </Alert>
      )}

      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="hidden lg:block">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Quét &amp; Ghi hình biên bản
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sử dụng súng quét barcode USB hoặc camera để bắt đầu quy trình biên bản
          </p>
        </div>

        {/* Big Mode Switcher Desktop */}
        <div className="hidden lg:inline-flex bg-muted/80 p-1 rounded-2xl border shadow-xs">
          <button
            onClick={() => { setWorkMode('dong_goi'); setModeError(null); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              workMode === 'dong_goi'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>1. ĐÓNG GÓI HÀNG</span>
          </button>
          <button
            onClick={() => { setWorkMode('khui_hang'); setModeError(null); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              workMode === 'khui_hang'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PackageOpen className="w-4 h-4" />
            <span>2. KHUI HÀNG / TRẢ HÀNG</span>
          </button>
        </div>

        {/* Big Mode Switcher Mobile */}
        <div className="grid lg:hidden grid-cols-2 gap-1.5 bg-muted/70 p-1 rounded-2xl border">
          <button
            onClick={() => { setWorkMode('dong_goi'); setModeError(null); }}
            className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              workMode === 'dong_goi'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>1. ĐÓNG GÓI</span>
          </button>
          <button
            onClick={() => { setWorkMode('khui_hang'); setModeError(null); }}
            className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              workMode === 'khui_hang'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PackageOpen className="w-4 h-4" />
            <span>2. KHUI HÀNG</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Col (2/3): Camera Viewport & Actions */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          
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
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <ScanLine size={20} />
                  <span className="font-bold text-base">
                    Quét mã camera
                  </span>
                </div>

                <Button
                  variant="secondary"
                  onClick={handleCloseScanner}
                  size="sm"
                >
                  <X data-icon="inline-start" />
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
              <div className="relative w-full rounded-lg overflow-hidden">
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
                  />
                </CameraPreview>
              </div>

              {cameraError && (
                <Alert variant="destructive" className="py-2 px-3">
                  <AlertDescription className="text-xs">
                    {cameraError.userMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-1">
                <BarcodeIcon size={16} />
                <span>Hướng camera vào mã vạch trên đơn hàng (Code 128, QR, Code 39)</span>
              </div>
            </Card>
          )}

          {/* 4. Idle Main View */}
          {currentView === 'idle' && (
            <Card className="min-h-[260px]">
              <CardContent className="flex flex-col items-center justify-center text-center gap-4 p-6">
                <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center border-2 transition-all ${
                  workMode === 'khui_hang'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                    : 'bg-primary/20 border-primary text-primary shadow-[0_0_24px_rgba(234,88,12,0.25)]'
                }`}>
                  <Camera size={36} />
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-1">
                    {workMode === 'dong_goi'
                      ? 'Sẵn sàng quét đơn Đóng gói'
                      : workMode === 'khui_hang'
                      ? 'Sẵn sàng quét đơn Khui hàng'
                      : 'Sẵn sàng quét mã đơn'}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-[340px] mx-auto">
                    {workMode
                      ? `Đang chọn chế độ: ${workMode === 'dong_goi' ? 'Đóng gói xuất kho' : 'Khui hàng hoàn trả'}. Quét bằng camera hoặc súng barcode.`
                      : 'Vui lòng chọn chế độ làm việc phía trên trước khi bắt đầu quét.'}
                  </p>
                </div>

                <Button
                  size="lg"
                  className={`w-full max-w-[340px] font-bold text-sm tracking-wide ${
                    workMode === 'khui_hang'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                  }`}
                  onClick={handleOpenScanner}
                >
                  <ScanLine data-icon="inline-start" />
                  {workMode === 'dong_goi'
                    ? 'BẮT ĐẦU QUÉT ĐÓNG GÓI'
                    : workMode === 'khui_hang'
                    ? 'BẮT ĐẦU QUÉT KHUI HÀNG'
                    : 'CHỌN CHẾ ĐỘ & BẮT ĐẦU QUÉT'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Col (1/3): Barcode Gun Listener & Session Info */}
        <div className="flex flex-col gap-4">
          {/* Súng quét Barcode Card */}
          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Súng quét Barcode</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Sẵn sàng
              </span>
            </div>

            <form onSubmit={handleManualSubmit} className="relative">
              <input
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder="Bắn súng quét hoặc nhập mã..."
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-muted/40 font-mono font-bold text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <BarcodeIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </form>

            <p className="text-[11px] text-muted-foreground">
              💡 Có thể cắm súng quét barcode USB trực tiếp. Hệ thống tự động bắt mã.
            </p>
          </div>

          {/* Thống kê ca làm việc */}
          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tiến độ ca làm việc</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex flex-col">
                <span className="text-[11px] text-muted-foreground">Đã quay hôm nay</span>
                <span className="text-2xl font-black text-foreground mt-1">{completedCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex flex-col">
                <span className="text-[11px] text-muted-foreground">Đang đợi tải</span>
                <span className="text-2xl font-black text-amber-500 mt-1">{pendingCount}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">Tự động đồng bộ</span>
              </div>
            </div>
          </div>

          {/* Vừa quay gần nhất */}
          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vừa quay gần nhất</span>
            <div className="flex flex-col gap-2">
              {recentCompletedItems.length > 0 ? (
                recentCompletedItems.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl border border-border/70 bg-muted/20 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-mono font-bold truncate">{item.ma_van_don}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {item.don_vi_vc} • {item.loai_bien_ban === 'dong_goi' ? 'Đóng gói' : 'Khui hàng'} • {formatDuration(item.thoi_luong_video)}
                      </div>
                    </div>
                    <span className="text-emerald-600 font-bold text-[11px] shrink-0">Đã lưu</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground text-center py-2">
                  Chưa có video nào
                </div>
              )}
            </div>
          </div>

          {/* Pending Queue Notice Mini Card */}
          {pendingCount > 0 && (
            <div className="p-4 rounded-3xl border-l-4 border-l-amber-500 bg-card shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="text-amber-500" size={20} />
                <div>
                  <div className="text-sm font-bold">{pendingCount} video chờ tải</div>
                  <div className="text-[11px] text-muted-foreground">Tự động đồng bộ</div>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/queue')}>Xem <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
            </div>
          )}
        </div>
      </div>

      {/* Scan Result Modal Popup */}
      <Dialog open={!!activeBarcode} onOpenChange={(open) => !open && handleRescan()}>
        <DialogContent className="max-w-[440px] p-0 border-none bg-transparent shadow-none" showCloseButton={false}>
          <DialogTitle className="sr-only">Kết quả quét mã vạch</DialogTitle>
          <DialogDescription className="sr-only">Hiển thị thông tin mã vạch vừa quét được.</DialogDescription>
          {activeBarcode && (
            <ScanResult
              result={activeBarcode}
              isDuplicate={isDuplicate}
              duplicateInfo={duplicateInfo ?? undefined}
              isChecking={isChecking}
              initialLoaiBienBan={workMode ?? 'dong_goi'}
              onStartRecording={handleStartRecording}
              onRescan={handleRescan}
            />
          )}
        </DialogContent>
      </Dialog>

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

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={(open) => !open && cancelExit()}>
        <AlertDialogContent className="max-w-[400px] text-center flex flex-col items-center gap-4 p-6 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-destructive/15 border-2 border-destructive flex items-center justify-center">
            <AlertTriangle size={28} className="text-destructive" />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              Đang quay video!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Video chưa được lưu. Bạn có chắc muốn dừng quay và thoát?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="w-full flex sm:flex-row gap-3">
            <AlertDialogCancel onClick={cancelExit} className="flex-1 mt-0">
              Tiếp tục quay
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Dừng và thoát
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
