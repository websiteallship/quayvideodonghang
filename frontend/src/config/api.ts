// Use relative paths so all API calls go through Vite proxy (dev) or same-origin (prod).
// Avoids CORS issues and ensures consistent auth token context.
const BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${BASE_URL}/api/auth/login`,
    VERIFY: `${BASE_URL}/api/auth/verify`,
    LOGOUT: `${BASE_URL}/api/auth/logout`
  },
  BIEN_BAN: {
    LIST: `${BASE_URL}/api/bien-ban`,
    DETAIL: (id: string) => `${BASE_URL}/api/bien-ban/${id}`,
    CHECK: (code: string) => `${BASE_URL}/api/bien-ban/check/${code}`,
    VIEW_URL: (id: string) => `${BASE_URL}/api/bien-ban/${id}/view-url`,
    STREAM: (id: string) => `${BASE_URL}/api/bien-ban/${id}/stream`
  },
  UPLOAD: {
    INIT: `${BASE_URL}/api/upload/init`,
    COMPLETE: `${BASE_URL}/api/upload/complete`,
    ERROR: `${BASE_URL}/api/upload/error`,
    CANCEL: `${BASE_URL}/api/upload/cancel`
  },
  DASHBOARD: {
    STATS: `${BASE_URL}/api/dashboard/stats`
  },
  CONFIG: {
    PUBLIC: `${BASE_URL}/api/config`
  }
} as const;
