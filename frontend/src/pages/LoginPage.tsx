import React, { useState, useRef } from 'react';
import { Video, ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/config/constants';
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

      let body: any;
      try {
        body = await res.json();
      } catch {
        throw new Error(`Không thể kết nối đến máy chủ backend (Port 8787). Vui lòng kiểm tra backend.`);
      }

      if (!res.ok || !body?.success) {
        throw new Error(body?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }

      setAuth(body.data.token, body.data.nhan_vien);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <Video size={24} />
          </div>
          <h1 className="login-title">Quay Video Đóng Hàng</h1>
          <p className="login-subtitle">
            Hệ thống kiểm soát & lưu trữ đóng gói kho vận
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          {/* Mã nhân viên */}
          <div className="login-field-group">
            <div className="login-field-header">
              <label htmlFor="ma_nhan_vien">Mã nhân viên</label>
            </div>
            <input
              id="ma_nhan_vien"
              type="text"
              placeholder="Nhập mã nhân viên..."
              value={maNhanVien}
              onChange={(e) => setMaNhanVien(e.target.value)}
              className="input-field input-mono"
              autoFocus
              autoComplete="username"
            />
          </div>

          {/* Mã PIN 4 số */}
          <div className="login-field-group">
            <div className="login-field-header">
              <label>Mã PIN (4 số)</label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="login-toggle-btn"
                aria-label={showPin ? "Ẩn số PIN" : "Hiện số PIN"}
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPin ? 'Ẩn' : 'Hiện'}</span>
              </button>
            </div>
            <div className="pin-inputs-grid">
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
            <div className="alert-banner alert-banner--error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-large login-submit-btn"
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
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          Hệ thống nội bộ kho vận • Phiên bản {APP_CONFIG.VERSION}
        </div>
      </div>
    </div>
  );
};
