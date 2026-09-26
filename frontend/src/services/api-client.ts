import ky from 'ky';
import { ApiResponse } from '../types';

const TOKEN_KEY = 'auth_token';

/**
 * Token stored in sessionStorage (not localStorage) per 02-security.md §2:
 * "Tránh lưu trữ khóa nhạy cảm trong localStorage không mã hóa"
 * sessionStorage clears when tab closes — safer than localStorage.
 */
export const getStoredToken = (): string | null => {
  if (typeof sessionStorage === 'undefined') return null;
  let token = sessionStorage.getItem(TOKEN_KEY);
  if (!token && typeof localStorage !== 'undefined') {
    token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }
  return token;
};

export const setStoredToken = (token: string): void => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  // 02-security.md §2: Do NOT persist token in localStorage — XSS risk.
  // Upload worker receives token via postMessage (upload-worker-types.ts).
};

export const removeStoredToken = (): void => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(TOKEN_KEY);
  }
  // Also clean up legacy localStorage token if present
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

const USER_KEY = 'auth_user';

export const getStoredUser = () => {
  if (typeof sessionStorage === 'undefined') return null;
  let userStr = sessionStorage.getItem(USER_KEY);
  if (!userStr && typeof localStorage !== 'undefined') {
    userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      sessionStorage.setItem(USER_KEY, userStr);
    }
  }
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: unknown): void => {
  const userStr = JSON.stringify(user);
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(USER_KEY, userStr);
  }
  // 02-security.md §2: Do NOT persist user data in localStorage.
};

export const removeStoredUser = (): void => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(USER_KEY);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
};


export const API_BASE = ((import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://quayvideo-api.zapati-2025.workers.dev')).replace(/\/+$/, '') + '/api';

export const apiClient = ky.create({
  timeout: 30000,
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = getStoredToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      }
    ],
    afterResponse: [
      // No auto-redirect here. Auth state is managed by zustand auth-store.
      // When token expires, callers (verifyToken, upload, etc.) handle 401 
      // themselves. ProtectedRoute redirects to /login when isAuthenticated 
      // becomes false via zustand re-render.
    ]
  }
});

export async function requestJson<T>(promise: Promise<Response>): Promise<ApiResponse<T>> {
  try {
    const res = await promise;
    return await res.json() as ApiResponse<T>;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message
      }
    };
  }
}
