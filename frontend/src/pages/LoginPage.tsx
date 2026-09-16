import React, { useState, useRef } from 'react';
import { Video, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/config/constants';
import { API_ENDPOINTS } from '@/config/api';

export const LoginPage: React.FC = () => {
  const [maNhanVien, setMaNhanVien] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
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
    // Chỉ nhận ký tự số
    const num = val.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = num;
    setPin(newPin);

    // Auto focus ô tiếp theo
    if (num && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
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
          ma_nhan_vien: maNhanVien.trim().toUpperCase(),
          pin: fullPin
        })
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }

      // Lưu token thật vào store
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
      <div className="glass-panel-elevated animate-fade-in login-card">
        {/* App Logo */}
        <div className="flex-col-center" style={{ gap: 'var(--space-2)' }}>
          <div className="login-logo">
            <Video size={36} />
          </div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', textAlign: 'center' }}>
            Quay Video Đóng Hàng
          </h2>
          <span className="text-xs-secondary">
            Hệ thống đóng gói & kiểm soát kho vận
          </span>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <Input
            label="Mã nhân viên"
            placeholder="VD: NV001"
            value={maNhanVien}
            onChange={(e) => setMaNhanVien(e.target.value)}
            isMono
            autoFocus
          />

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}
            >
              Mã PIN (4 số)
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={pinRefs[index]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  className="pin-digit"
                  aria-label={`Số PIN thứ ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div
              className="alert-banner alert-banner--error"
              style={{ justifyContent: 'center', fontSize: 'var(--text-xs)', padding: '8px' }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="large"
            variant="primary"
            isLoading={isLoading}
            leftIcon={<LogIn size={20} />}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            ĐĂNG NHẬP
          </Button>
        </form>

        <span className="text-xs-muted">
          Phiên bản {APP_CONFIG.VERSION}
        </span>
      </div>
    </div>
  );
};
