import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { Video, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { APP_CONFIG } from '@/config/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_ENDPOINTS } from '@/config/api';

export const LoginPage: React.FC = () => {
  const [maNhanVien, setMaNhanVien] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handlePinChange = (index: number, val: string) => {
    const num = val.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = num;
    setPin(newPin);

    if (num && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const newPin = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newPin[i] = pasted[i];
    }
    setPin(newPin);
    const targetIdx = Math.min(pasted.length, 3);
    pinRefs[targetIdx].current?.focus();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullPin = pin.join('');
    if (!maNhanVien.trim()) {
      setError('Vui lòng nhập mã nhân viên');
      return;
    }
    if (fullPin.length < 4) {
      setError('Vui lòng nhập đủ 4 số PIN');
      return;
    }

    try {
      setIsLoading(true);
      
      const res = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ma_nhan_vien: maNhanVien.trim(),
          pin: fullPin
        })
      });

      let body: import('@/types').ApiResponse<import('@/types').LoginResponse> | null = null;
      try {
        body = await res.json() as import('@/types').ApiResponse<import('@/types').LoginResponse>;
      } catch {
        throw new Error(`Không thể kết nối đến máy chủ backend (Port 8787). Vui lòng kiểm tra backend.`);
      }

      if (!res.ok || !body?.success) {
        throw new Error(body?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }

      const data = body.data!;
      setAuth(data.token, data.nhan_vien);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="w-full max-w-md p-8 flex flex-col gap-6 bg-card border border-border rounded-2xl shadow-lg relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="size-13 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md mb-2">
            <Video size={24} />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Quay Video Đóng Hàng</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hệ thống kiểm soát & lưu trữ đóng gói kho vận
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Mã nhân viên */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ma_nhan_vien" className="text-xs font-medium text-foreground">
              Mã nhân viên
            </label>
            <Input
              id="ma_nhan_vien"
              type="text"
              placeholder="Nhập mã nhân viên..."
              value={maNhanVien}
              onChange={(e) => setMaNhanVien(e.target.value)}
              className="font-mono tracking-wider"
              autoFocus
              autoComplete="username"
            />
          </div>

          {/* Mã PIN 4 số */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-foreground mb-0.5">
              <label>Mã PIN (4 số)</label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="inline-flex items-center gap-1 bg-transparent border-none p-0 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                aria-label={showPin ? "Ẩn số PIN" : "Hiện số PIN"}
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPin ? 'Ẩn' : 'Hiện'}</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 w-full">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={pinRefs[index]}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  onPaste={handlePinPaste}
                  aria-label={`Số PIN ${index + 1}`}
                  className="pin-digit"
                />
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle size={16} />
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit CTA */}
          <Button
            type="submit"
            disabled={isLoading}
            size="lg"
            className="w-full h-14 text-base font-bold mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          Hệ thống nội bộ kho vận • Phiên bản {APP_CONFIG.VERSION}
        </div>
      </div>
    </div>
  );
};
