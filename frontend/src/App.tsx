import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/auth-store';
import { useConfigStore } from './stores/config-store';
import { toast } from 'sonner';
import { ToastContainer } from './components/ui/Toast';
import { Toaster } from './components/ui/sonner';

// Tải lazy loading cho các trang
const HomePage = React.lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const QueuePage = React.lazy(() => import('./pages/QueuePage').then((m) => ({ default: m.QueuePage })));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const VideoDetailPage = React.lazy(() => import('./pages/VideoDetailPage').then((m) => ({ default: m.VideoDetailPage })));
const UserSettingsPage = React.lazy(() => import('./pages/UserSettingsPage').then((m) => ({ default: m.UserSettingsPage })));
const AdminSettingsPage = React.lazy(() => import('./pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));
const AdminCarriersPage = React.lazy(() => import('./pages/AdminCarriersPage').then((m) => ({ default: m.AdminCarriersPage })));
const AdminEmployeesPage = React.lazy(() => import('./pages/AdminEmployeesPage').then((m) => ({ default: m.AdminEmployeesPage })));
const AdminWarehousesPage = React.lazy(() => import('./pages/AdminWarehousesPage').then((m) => ({ default: m.AdminWarehousesPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));

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
        path: '/dashboard',
        element: <DashboardPage />,
      },
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
        path: '/admin/carriers',
        element: (
          <AdminGuard>
            <AdminCarriersPage />
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
      {
        path: '/admin/warehouses',
        element: (
          <AdminGuard>
            <AdminWarehousesPage />
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
