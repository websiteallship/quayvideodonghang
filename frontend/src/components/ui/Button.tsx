import React from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'record-stop' | 'icon';
  size?: 'default' | 'large' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'default',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  ...props
}) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    'record-stop': 'btn-record-stop',
    icon: 'btn-secondary btn-icon'
  }[variant];

  const sizeClass = size === 'large' ? 'btn-large' : size === 'icon' ? 'btn-icon' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={cn('btn', variantClass, sizeClass, className)}
      {...props}
    >
      {isLoading ? (
        <Spinner size={size === 'large' ? 24 : 18} />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
