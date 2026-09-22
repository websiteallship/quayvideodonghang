export interface VietfulMerchantAuthCredentials {
  id: string;
  realm?: string;
  auth_url?: string;
  client_id: string;
  client_secret: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // timestamp in ms
}

// In-memory token cache for Workers execution lifecycle
const tokenCache = new Map<string, CachedToken>();

/**
 * Xóa cache token của merchant (dùng khi gặp 401 Unauthorized từ VietFul)
 */
export function invalidateVietfulToken(merchantId: string): void {
  tokenCache.delete(merchantId);
}

/**
 * Lấy Access Token từ Keycloak OpenID Connect theo chuẩn OAuth2 Client Credentials
 * Tự động cache token và tái sử dụng trước khi hết hạn 5 phút (buffer 300s)
 * Tham chiếu: docs/16-tich-hop-dong-bo-don-hang-vietful.md mục 2.3
 */
export async function getVietfulAccessToken(
  merchant: VietfulMerchantAuthCredentials
): Promise<string> {
  const merchantId = merchant.id || merchant.client_id;
  const now = Date.now();
  const cached = tokenCache.get(merchantId);

  // Buffer 5 phút (300_000 ms) để tránh token hết hạn giữa chừng khi gọi API
  if (cached && now < cached.expiresAt - 300_000) {
    return cached.accessToken;
  }

  const authBaseUrl = (merchant.auth_url || 'https://auth.vnfai.com').replace(/\/+$/, '');
  const realm = merchant.realm || 'asp';
  const tokenEndpoint = `${authBaseUrl}/auth/realms/${realm}/protocol/openid-connect/token`;

  const bodyParams = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: merchant.client_id,
    client_secret: merchant.client_secret,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `VietFul Keycloak Auth Error [HTTP ${response.status}]: ${errorText || response.statusText}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  if (!data.access_token) {
    throw new Error('VietFul Keycloak không trả về access_token hợp lệ');
  }

  const expiresInMs = (data.expires_in || 86400) * 1000;
  tokenCache.set(merchantId, {
    accessToken: data.access_token,
    expiresAt: now + expiresInMs,
  });

  return data.access_token;
}
