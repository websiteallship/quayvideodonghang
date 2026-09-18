import { importPKCS8, SignJWT } from 'jose';

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export interface ResumableSessionResult {
  uploadUrl: string;
  fileName: string;
}
export interface OAuth2Credentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

export class DriveService {
  private creds: ServiceAccountCredentials | null = null;
  private oauth2Creds: OAuth2Credentials | null = null;

  // M4: Module-level token cache — persists across requests within same Workers isolate.
  // Workers are stateless across isolates but module-level variables survive within one.
  private static cachedToken: string | null = null;
  private static tokenExpiresAt: number = 0;

  constructor(serviceAccountJson?: string, oauth2Creds?: OAuth2Credentials) {
    if (oauth2Creds && oauth2Creds.client_id && oauth2Creds.refresh_token) {
      this.oauth2Creds = oauth2Creds;
    } else if (serviceAccountJson) {
      try {
        this.creds = JSON.parse(serviceAccountJson) as ServiceAccountCredentials;
      } catch (err) {
        console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', err);
      }
    }
  }

  /**
   * Lấy OAuth2 Access Token từ Google sử dụng JWT Assertion (Service Account) hoặc Refresh Token (OAuth2)
   */
  async getAccessToken(): Promise<string> {
    if (!this.creds && !this.oauth2Creds) {
      throw new Error('Chưa cấu hình GOOGLE_SERVICE_ACCOUNT_JSON hoặc GOOGLE_REFRESH_TOKEN');
    }

    const now = Math.floor(Date.now() / 1000);
    if (DriveService.cachedToken && DriveService.tokenExpiresAt > now + 60) {
      return DriveService.cachedToken;
    }

    let tokenRes: Response;

    if (this.oauth2Creds) {
      // Dùng Refresh Token (Cho Personal Drive)
      tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.oauth2Creds.client_id,
          client_secret: this.oauth2Creds.client_secret,
          refresh_token: this.oauth2Creds.refresh_token,
          grant_type: 'refresh_token'
        })
      });
    } else if (this.creds) {
      // Dùng Service Account
      const privateKey = await importPKCS8(this.creds.private_key, 'RS256');

      const jwt = await new SignJWT({
        iss: this.creds.client_email,
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token'
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(privateKey);

      tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });
    } else {
       throw new Error('Invalid credentials state');
    }

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Google OAuth2 error: ${tokenRes.status} - ${errText}`);
    }

    const data = await tokenRes.json() as { access_token: string; expires_in: number };
    DriveService.cachedToken = data.access_token;
    DriveService.tokenExpiresAt = now + data.expires_in;

    return DriveService.cachedToken;
  }


  /**
   * Khởi tạo Resumable Upload Session với Google Drive API v3
   * Trả về Location Header (Upload URL) để client PUT video trực tiếp lên Google Drive
   */
  async initResumableUpload(
    fileName: string,
    mimeType: string,
    folderId: string,
    fileSize: number,
    clientOrigin?: string
  ): Promise<ResumableSessionResult> {
    const accessToken = await this.getAccessToken();

    const metadata: Record<string, unknown> = {
      name: fileName,
      mimeType
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(fileSize)
    };

    // LÀM RÕ CƠ CHẾ CORS TẠI ĐÂY (Task 2.2):
    // API Google Drive (v3/files) mặc định không trả về header `Access-Control-Allow-Origin` cho browser
    // nếu request khởi tạo resumable session không truyền kèm header `Origin`.
    // Điều này sẽ khiến browser chặn request PUT tiếp theo (để đẩy data lên URL resumable) vì vi phạm chính sách CORS.
    // Việc Backend chèn `Origin` giả lập clientOrigin sẽ ép Google Drive trả về header CORS hợp lệ trong Session URI,
    // nhờ đó trình duyệt của Frontend có thể upload video trực tiếp (direct upload) mà không bị lỗi CORS.
    if (clientOrigin) {
      headers['Origin'] = clientOrigin;
    }

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(metadata)
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Drive init resumable error: ${res.status} - ${errText}`);
    }

    const uploadUrl = res.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('Google Drive API không trả về Location header cho resumable upload');
    }

    return {
      uploadUrl,
      fileName
    };
  }

  /**
   * Kiểm tra service account credentials hoặc OAuth2 credentials đã được cấu hình chưa
   */
  isConfigured(): boolean {
    return this.creds !== null || this.oauth2Creds !== null;
  }

  /**
   * Tìm hoặc tạo folder trên Google Drive theo tên trong parent folder
   */
  async findOrCreateFolder(folderName: string, parentId: string): Promise<string> {
    const accessToken = await this.getAccessToken();

    // Search for existing folder
    // Escape single quotes to prevent query injection (02-security.md §3)
    const safeFolderName = folderName.replace(/'/g, "\\'");
    const safeParentId = parentId.replace(/'/g, "\\'");
    const query = `name='${safeFolderName}' and mimeType='application/vnd.google-apps.folder' and '${safeParentId}' in parents and trashed=false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true&corpora=allDrives`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      throw new Error(`Drive search folder error: ${searchRes.status} - ${errText}`);
    }

    const searchData = await searchRes.json() as { files?: Array<{ id: string; name: string }> };
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create folder if not found
    const createRes = await fetch(
      'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        })
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Drive create folder error: ${createRes.status} - ${errText}`);
    }

    const createData = await createRes.json() as { id: string };
    return createData.id;
  }

  /**
   * Tìm hoặc tạo cấu trúc thư mục ngày: rootFolder/YYYY/MM/DD
   */
  async findOrCreateDateFolder(rootFolderId: string): Promise<string> {
    const now = new Date();
    const parts = [
      now.getFullYear().toString(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ];

    let parentId = rootFolderId;
    for (const part of parts) {
      parentId = await this.findOrCreateFolder(part, parentId);
    }
    return parentId;
  }

  /**
   * Kiểm tra kết nối Google Drive (gọi Drive about/get)
   */
  async testConnection(): Promise<{ ok: boolean; email?: string }> {
    const accessToken = await this.getAccessToken();
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive test connection failed: ${res.status} - ${text}`);
    }

    const data = await res.json() as { user?: { emailAddress?: string } };
    return {
      ok: true,
      email: data.user?.emailAddress || this.creds?.client_email
    };
  }

  /**
   * Kiểm tra kết nối Google Drive, trả về chi tiết dung lượng và test quyền ghi
   */
  async testConnectionDetailed(folderId?: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive test connection failed: ${res.status} - ${text}`);
    }

    const data = await res.json() as any;
    
    let file_test_ok = false;
    if (folderId) {
      try {
        const createRes = await fetch(
          'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: 'test_write.txt',
              parents: [folderId]
            })
          }
        );
        if (createRes.ok) {
          const createData = await createRes.json() as { id: string };
          await fetch(`https://www.googleapis.com/drive/v3/files/${createData.id}?supportsAllDrives=true`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          file_test_ok = true;
        }
      } catch (err) {
        console.warn('File test failed:', err);
      }
    }

    const quota = data.storageQuota || {};
    const usageBytes = parseInt(quota.usage || '0', 10);
    const limitBytes = parseInt(quota.limit || '0', 10);
    
    const dung_luong_da_dung_gb = usageBytes / (1024 ** 3);
    const dung_luong_tong_gb = limitBytes ? limitBytes / (1024 ** 3) : 0;
    const dung_luong_con_lai_gb = dung_luong_tong_gb ? (dung_luong_tong_gb - dung_luong_da_dung_gb) : 0;

    return {
      ket_noi_ok: true,
      service_account_email: data.user?.emailAddress || this.creds?.client_email,
      dung_luong_da_dung_gb: parseFloat(dung_luong_da_dung_gb.toFixed(2)),
      dung_luong_tong_gb: parseFloat(dung_luong_tong_gb.toFixed(2)),
      dung_luong_con_lai_gb: parseFloat(dung_luong_con_lai_gb.toFixed(2)),
      file_test_ok
    };
  }

  /**
   * Tạo URL xem video trực tiếp từ Google Drive preview.
   * Cấp quyền reader tạm thời cho bất kỳ ai có link nếu cấu hình Drive thật.
   */
  async getFileViewUrl(fileId: string): Promise<string> {
    if (this.isConfigured()) {
      try {
        const accessToken = await this.getAccessToken();
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: 'reader', type: 'anyone' })
        }).catch(() => {});
      } catch (err) {
        console.warn('Could not set file permission for preview:', err);
      }
    }
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  /**
   * Stream file nội dung video trực tiếp từ Google Drive API.
   * Hỗ trợ Range request để native <video> có thể seek.
   * Trả về Response streaming (không buffer toàn bộ video vào memory).
   */
  async streamFile(
    fileId: string,
    rangeHeader?: string | null
  ): Promise<Response> {
    const accessToken = await this.getAccessToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`
    };

    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
      { headers }
    );

    if (!driveRes.ok && driveRes.status !== 206) {
      const errText = await driveRes.text();
      throw new Error(`Drive stream error: ${driveRes.status} - ${errText}`);
    }

    // Pipe response body directly — no buffering in Worker memory
    const responseHeaders = new Headers();
    const contentType = driveRes.headers.get('Content-Type') || 'video/webm';
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Accept-Ranges', 'bytes');

    const contentLength = driveRes.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = driveRes.headers.get('Content-Range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    // Cache video trên CDN 5 phút, client 1 phút
    responseHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=300');

    return new Response(driveRes.body, {
      status: driveRes.status, // 200 hoặc 206 (Partial Content)
      headers: responseHeaders
    });
  }

  /**
   * Xoá vĩnh viễn file trên Google Drive (hỗ trợ cả Shared Drive với supportsAllDrives=true).
   * Trả về true nếu xoá thành công hoặc file đã không còn tồn tại (404).
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (res.ok || res.status === 204 || res.status === 404) {
      return true;
    }

    const errText = await res.text();
    throw new Error(`Drive delete error: ${res.status} - ${errText}`);
  }
}

