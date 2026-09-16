import { ChevronDown, Camera } from 'lucide-react';

interface CameraSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  onSelect: (deviceId: string) => void;
  disabled?: boolean;
}

/**
 * CameraSelector — dropdown chọn camera từ danh sách enumerateDevices.
 * Rule 04: lưu selection qua camera-store (useCamera.switchDevice).
 * Hiện label hoặc fallback "Camera N" nếu label rỗng.
 */
export function CameraSelector({
  devices,
  selectedDeviceId,
  onSelect,
  disabled = false,
}: CameraSelectorProps) {
  if (devices.length === 0) {
    return null;
  }

  const getLabel = (device: MediaDeviceInfo, index: number): string => {
    if (device.label) return device.label;
    return `Camera ${index + 1}`;
  };

  return (
    <div className="camera-selector">
      <label className="camera-selector__label" htmlFor="camera-select">
        <Camera size={16} aria-hidden="true" />
        <span>Camera</span>
      </label>

      <div className="camera-selector__wrapper">
        <select
          id="camera-select"
          className="camera-selector__select"
          value={selectedDeviceId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
        >
          {devices.map((device, i) => (
            <option key={device.deviceId} value={device.deviceId}>
              {getLabel(device, i)}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="camera-selector__icon"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
