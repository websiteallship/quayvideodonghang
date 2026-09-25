import React, { useState, useEffect } from 'react';
import { Camera, Check, RotateCw, Monitor, Smartphone } from 'lucide-react';
import type { VideoOrientation, VideoRotation } from '../../stores/user-settings-store';
import { useUserSettingsStore, getEffectiveResolution } from '../../stores/user-settings-store';
import { CameraPreviewPanel } from '../settings/CameraPreviewPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export interface CameraSetupDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Callback fired after user saves settings and confirms */
  onComplete: () => void;
  /** Optional existing stream from parent to reuse in preview */
  sourceStream?: MediaStream | null;
}

const ORIENTATION_OPTIONS: Array<{
  value: VideoOrientation;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'auto',
    label: 'Tự động',
    sublabel: 'Nhận diện theo máy',
    icon: RotateCw,
  },
  {
    value: 'landscape',
    label: 'Ngang (16:9)',
    sublabel: 'Giá đỡ bàn / Overhead',
    icon: Monitor,
  },
  {
    value: 'portrait',
    label: 'Dọc (9:16)',
    sublabel: 'Cầm tay / Đứng',
    icon: Smartphone,
  },
];

const ROTATION_OPTIONS: Array<{
  value: VideoRotation;
  label: string;
  description: string;
}> = [
  { value: 0, label: '0°', description: 'Gốc' },
  { value: 90, label: '90°', description: 'Phải' },
  { value: 180, label: '180°', description: 'Lật' },
  { value: 270, label: '270°', description: 'Trái' },
];

export const CameraSetupDialog: React.FC<CameraSetupDialogProps> = ({
  isOpen,
  onComplete,
  sourceStream,
}) => {
  const storeOrientation = useUserSettingsStore((s) => s.videoOrientation);
  const storeRotation = useUserSettingsStore((s) => s.videoRotation);
  const setVideoOrientation = useUserSettingsStore((s) => s.setVideoOrientation);
  const setVideoRotation = useUserSettingsStore((s) => s.setVideoRotation);
  const setCameraConfigured = useUserSettingsStore((s) => s.setCameraConfigured);

  const [selectedOrientation, setSelectedOrientation] = useState<VideoOrientation>(storeOrientation);
  const [selectedRotation, setSelectedRotation] = useState<VideoRotation>(storeRotation);
  const currentResolution = getEffectiveResolution();

  // Synchronize local choices with store when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedOrientation(storeOrientation);
      setSelectedRotation(storeRotation);
    }
  }, [isOpen, storeOrientation, storeRotation]);

  const handleSave = () => {
    setVideoOrientation(selectedOrientation);
    setVideoRotation(selectedRotation);
    setCameraConfigured(true);
    onComplete();
  };

  // Keyboard accessibility for warehouse stations (1-3 for frames, Enter to save)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') {
        setSelectedOrientation('auto');
      } else if (e.key === '2') {
        setSelectedOrientation('landscape');
      } else if (e.key === '3') {
        setSelectedOrientation('portrait');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedOrientation, selectedRotation]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-h-[92vh] overflow-y-auto max-w-xl rounded-3xl border-border bg-card p-4 sm:p-6 shadow-xl"
      >
        <DialogHeader className="gap-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Camera className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              Cấu hình Camera lần đầu
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Thiết lập hướng khung hình và góc xoay camera phù hợp với vị trí giá đỡ overhead của bạn trước khi bắt đầu quay.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Live Preview Embed */}
          <CameraPreviewPanel
            orientation={selectedOrientation}
            rotation={selectedRotation}
            resolution={currentResolution}
            isOpen={isOpen}
            sourceStream={sourceStream}
            className="border border-border/70 rounded-2xl"
          />

          {/* Orientation Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-foreground">
              1. Khung hình quay video:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ORIENTATION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedOrientation === opt.value;
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => setSelectedOrientation(opt.value)}
                    className={cn(
                      'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center transition-all',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-bold leading-tight">{opt.label}</span>
                    <span className="hidden sm:inline-block text-[10px] opacity-80">{opt.sublabel}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Rotation Selector (Only active when orientation is landscape or portrait) */}
          {selectedOrientation !== 'auto' && (
            <div className="flex flex-col gap-2 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  2. Góc xoay camera (Overhead Stand):
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Quan sát live preview để canh đúng chiều
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ROTATION_OPTIONS.map((rot) => {
                  const isSelected = selectedRotation === rot.value;
                  return (
                    <Button
                      key={rot.value}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => setSelectedRotation(rot.value)}
                      className={cn(
                        'flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl p-1 text-center transition-all',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                    >
                      <span className="text-xs font-bold">{rot.label}</span>
                      <span className="text-[10px] opacity-75">{rot.description}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <Button
              type="button"
              size="lg"
              onClick={handleSave}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.99]"
            >
              <Check className="size-5" aria-hidden="true" />
              <span>Lưu và bắt đầu quay</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
