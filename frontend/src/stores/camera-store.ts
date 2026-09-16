import { create } from 'zustand';

const PREFERRED_CAMERA_KEY = 'preferred_camera_device_id';

interface CameraState {
  selectedDeviceId: string | null;
  facingMode: 'environment' | 'user';
  devices: MediaDeviceInfo[];

  setDevice: (deviceId: string) => void;
  toggleFacing: () => void;
  setDevices: (devices: MediaDeviceInfo[]) => void;
}

function getStoredDeviceId(): string | null {
  try {
    return localStorage.getItem(PREFERRED_CAMERA_KEY);
  } catch {
    return null;
  }
}

function setStoredDeviceId(deviceId: string): void {
  try {
    localStorage.setItem(PREFERRED_CAMERA_KEY, deviceId);
  } catch {
    // Ignore quota or security errors (e.g. private mode, iframe)
  }
}

export const useCameraStore = create<CameraState>((set, get) => ({
  selectedDeviceId: getStoredDeviceId(),
  facingMode: 'environment',
  devices: [],

  setDevice: (deviceId: string) => {
    setStoredDeviceId(deviceId);
    set({ selectedDeviceId: deviceId });
  },

  toggleFacing: () => {
    const next = get().facingMode === 'environment' ? 'user' : 'environment';
    set({ facingMode: next });
  },

  setDevices: (devices: MediaDeviceInfo[]) => {
    set({ devices });
  }
}));
