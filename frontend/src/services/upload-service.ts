import { apiClient, API_BASE } from './api-client';

export const uploadService = {
  /**
   * Notifies backend that an upload was cancelled by the user.
   * Fails gracefully so offline cancellation doesn't block UI state revert.
   */
  async cancelUpload(id: string): Promise<void> {
    try {
      await apiClient.post(`${API_BASE}/upload/cancel`, {
        json: { id },
        throwHttpErrors: false
      });
    } catch {
      // Offline / network failure when notifying backend is non-blocking
    }
  }
};
