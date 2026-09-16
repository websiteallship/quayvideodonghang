import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user || user.vai_tro !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
