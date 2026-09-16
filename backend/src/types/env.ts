export interface Env {
  // Cloudflare D1 Database binding
  DB: D1Database;

  // Environment variables
  ALLOWED_ORIGINS: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  DRIVE_FOLDER_ID: string;
  GOOGLE_SHEET_ID: string;
  UPLOAD_CHUNK_SIZE: string;

  // Secrets (Cloudflare Secret)
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
}

export interface JwtPayload {
  sub: string;            // ma_nhan_vien
  ten: string;            // ten nhan vien
  vai_tro: 'admin' | 'nhan_vien';
  iat?: number;
  exp?: number;
}
