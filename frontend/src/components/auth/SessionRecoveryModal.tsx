import React, { useState, useRef, useEffect } from 'react';
import { LogIn, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth-store';

interface SessionRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const { user, silentLogin, logout } = useAuthStore();

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError(null);
      setIsLoading(false);
      setIsShaking(false);
      // Auto focus first input after render
      setTimeout(() => {
        pinRefs[0].current?.focus();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handlePinChange = (index: number, val: string) => {
    const num = val.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = num;
    setPin(newPin);

    // Auto focus next input
    if (num && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const fullPin = pin.join('');
    if (fullPin.length < 4) {
      setError('Vui lòng nhập đủ 4 số PIN');
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const success = await silentLogin(fullPin);
      
      if (success) {
        onSuccess();
      } else {
        setError('Mã PIN không chính xác');
        triggerShake();
        setPin(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.join('').length === 4 && !isLoading && isOpen) {
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleFullLogout = () => {
    onClose();
    logout();
    window.location.href = '/login';
  };

  if (!isOpen || !user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phiên đăng nhập hết hạn"
      maxWidth="400px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-warning)' }} />
          <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
            Phiên đăng nhập của <strong>{user.ten} ({user.ma_nhan_vien})</strong> đã hết hạn. Vui lòng nhập mã PIN để tiếp tục mà không làm gián đoạn công việc.
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            alignItems: 'center',
            transform: isShaking ? 'translateX(0)' : 'none',
            animation: isShaking ? 'shake 0.5s' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', width: '100%', padding: '0 10%' }}>
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
                disabled={isLoading}
                className="pin-digit"
                style={{
                  width: '50px',
                  height: '60px',
                  fontSize: '24px',
                  textAlign: 'center',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
                  backgroundColor: 'var(--color-bg-elevated)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxShadow: error ? '0 0 0 2px rgba(244, 67, 54, 0.2)' : 'none'
                }}
                aria-label={`Số PIN thứ ${index + 1}`}
              />
            ))}
          </div>

          {error && (
            <div style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
              20%, 40%, 60%, 80% { transform: translateX(4px); }
            }
          `}</style>
        </form>

        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button
            variant="secondary"
            onClick={handleFullLogout}
            disabled={isLoading}
            style={{ minHeight: '38px', height: '38px', fontSize: '12px' }}
          >
            Đăng xuất
          </Button>
          <Button
            variant="primary"
            leftIcon={<LogIn size={14} />}
            onClick={() => handleSubmit()}
            isLoading={isLoading}
            style={{ minHeight: '38px', height: '38px', fontSize: '12px' }}
          >
            Tiếp tục
          </Button>
        </div>
      </div>
    </Modal>
  );
};
