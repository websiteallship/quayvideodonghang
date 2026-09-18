import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { QueuePage } from './pages/QueuePage';
import { HistoryPage } from './pages/HistoryPage';
import { VideoDetailPage } from './pages/VideoDetailPage';
import { UserSettingsPage } from './pages/UserSettingsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminEmployeesPage } from './pages/AdminEmployeesPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/auth-store';
import { useConfigStore } from './stores/config-store';
import { toast } from 'sonner';
import { ToastContainer } from './components/ui/Toast';
import { Toaster } from './components/ui/sonner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, verifyToken } = useAuthStore();
  
  useEffect(() => {
    if (isAuthenticated && !user) {
      void verifyToken();
    }
  }, [isAuthenticated, user, verifyToken]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (user?.vai_tro !== 'admin') {
    toast.error('Bạn không có quyền truy cập trang quản trị');
    return <Navigate to="/settings" replace />;
  }

  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/queue',
        element: <QueuePage />,
      },
      {
        path: '/history',
        element: <HistoryPage />,
      },
      {
        path: '/history/:id',
        element: <VideoDetailPage />,
      },
      {
        path: '/settings',
        element: <UserSettingsPage />,
      },
      {
        path: '/admin/settings',
        element: (
          <AdminGuard>
            <AdminSettingsPage />
          </AdminGuard>
        ),
      },
      {
        path: '/admin/employees',
        element: (
          <AdminGuard>
            <AdminEmployeesPage />
          </AdminGuard>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export function App() {
  const { theme } = useConfigStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
      <Toaster />
    </>
  );
}

export default App;
