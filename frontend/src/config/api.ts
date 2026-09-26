const BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

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
    STREAM: (id: string) => `${BASE_URL}/api/bien-ban/${id}/stream`,
    STREAM_TOKEN: (id: string) => `${BASE_URL}/api/bien-ban/${id}/stream-token`,
    ARCHIVE: (id: string) => `${BASE_URL}/api/bien-ban/${id}/archive`,
    DELETE: (id: string) => `${BASE_URL}/api/bien-ban/${id}`,
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
    PUBLIC: `${BASE_URL}/api/config`,
    KHO_HANG: `${BASE_URL}/api/config/kho-hang`,
  },
  ADMIN: {
    NHAN_VIEN: {
      LIST: `${BASE_URL}/api/admin/nhan-vien`,
      CREATE: `${BASE_URL}/api/admin/nhan-vien`,
      UPDATE: (ma: string) => `${BASE_URL}/api/admin/nhan-vien/${ma}`,
      DELETE: (ma: string) => `${BASE_URL}/api/admin/nhan-vien/${ma}`,
      RESET_PIN: (ma: string) => `${BASE_URL}/api/admin/nhan-vien/${ma}/reset-pin`,
    },
    CAU_HINH: {
      GET: `${BASE_URL}/api/admin/cau-hinh`,
      UPDATE: `${BASE_URL}/api/admin/cau-hinh`,
      BATCH: `${BASE_URL}/api/admin/cau-hinh/batch`,
      TEST_DRIVE: `${BASE_URL}/api/admin/cau-hinh/test-drive`,
    },
    RETENTION: {
      STATUS: `${BASE_URL}/api/admin/retention/status`,
      RUN: `${BASE_URL}/api/admin/retention/run`,
    },
    KHO_HANG: {
      LIST: `${BASE_URL}/api/admin/kho-hang`,
      CREATE: `${BASE_URL}/api/admin/kho-hang`,
      UPDATE: (id: string) => `${BASE_URL}/api/admin/kho-hang/${id}`,
      DELETE: (id: string) => `${BASE_URL}/api/admin/kho-hang/${id}`,
      SET_DEFAULT: (id: string) => `${BASE_URL}/api/admin/kho-hang/${id}/set-default`,
    },
  }
} as const;
