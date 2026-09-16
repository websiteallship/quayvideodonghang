import { DriveService } from '../src/services/drive-service';
import { SheetService } from '../src/services/sheet-service';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

async function testConnection() {
  console.log('--- BẮT ĐẦU KIỂM TRA KẾT NỐI GOOGLE CLOUD ---');

  const devVarsPath = fileURLToPath(new URL('../.dev.vars', import.meta.url));
  if (!existsSync(devVarsPath)) {
    console.error('LỖI: Không tìm thấy file .dev.vars');
    process.exit(1);
  }

  const raw = readFileSync(devVarsPath, 'utf8');
  let serviceAccountJson = '';
  let driveFolderId = '';
  let googleSheetId = '';

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('GOOGLE_SERVICE_ACCOUNT_JSON=')) {
      serviceAccountJson = trimmed.slice('GOOGLE_SERVICE_ACCOUNT_JSON='.length);
    } else if (trimmed.startsWith('DRIVE_FOLDER_ID=')) {
      driveFolderId = trimmed.slice('DRIVE_FOLDER_ID='.length);
    } else if (trimmed.startsWith('GOOGLE_SHEET_ID=')) {
      googleSheetId = trimmed.slice('GOOGLE_SHEET_ID='.length);
    }
  }

  console.log('1. Cấu hình kiểm tra:');
  console.log(' - DRIVE_FOLDER_ID:', driveFolderId);
  console.log(' - GOOGLE_SHEET_ID:', googleSheetId);
  console.log(' - SA Email:', JSON.parse(serviceAccountJson).client_email);

  const driveService = new DriveService(serviceAccountJson);

  // Test 1: Access Token
  console.log('\n2. Kiểm tra xác thực Google OAuth2 Access Token...');
  try {
    const token = await driveService.getAccessToken();
    console.log(' -> THÀNH CÔNG! Token:', token.substring(0, 15) + '...');
  } catch (err: any) {
    console.error(' -> THẤT BÀI:', err.message);
    return;
  }

  // Test 2: Drive About / Permission
  console.log('\n3. Kiểm tra Google Drive API & quyền truy cập thư mục...');
  try {
    const conn = await driveService.testConnection();
    console.log(' -> Drive API kết nối thành công với user:', conn.email);

    // Kiểm tra quyền trên folder cụ thể
    const token = await driveService.getAccessToken();
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFolderId}?supportsAllDrives=true&fields=id,name,mimeType,capabilities`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!folderRes.ok) {
      const err = await folderRes.text();
      console.error(` -> THẤT BÀI truy cập folder (${folderRes.status}):`, err);
    } else {
      const folderData = await folderRes.json() as any;
      console.log(' -> THÀNH CÔNG! Thư mục gốc:', folderData.name, `(${folderData.id})`);

      // Test 3: Tạo thư mục theo ngày
      console.log('\n4. Kiểm tra tạo/tìm thư mục ngày YYYY/MM/DD...');
      const dateFolderId = await driveService.findOrCreateDateFolder(driveFolderId);
      console.log(' -> THÀNH CÔNG! Date Folder ID:', dateFolderId);
    }
  } catch (err: any) {
    console.error(' -> LỖI Drive API:', err.message);
  }

  // Test 4: Google Sheet API
  console.log('\n5. Kiểm tra Google Sheets API & ghi dòng kiểm thử...');
  try {
    const sheetService = new SheetService(driveService, googleSheetId);
    const testId = 'test-' + Date.now();
    const ok = await sheetService.appendRow({
      id: testId,
      ma_van_don: 'TEST_VD_' + Date.now(),
      don_vi_vc: 'TEST_LOG',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'DEV_TEST',
      thoi_gian_tao: new Date().toISOString(),
      thoi_luong_video: 10,
      kich_thuoc_bytes: 1024000,
      drive_file_id: 'test_file_id_mock',
      drive_file_name: 'test_file.webm'
    });

    if (ok) {
      console.log(' -> THÀNH CÔNG! Đã ghi 1 dòng kiểm thử vào tab DuLieu của Google Sheet');
    } else {
      console.error(' -> THẤT BÀI: appendRow trả về false. Vui lòng kiểm tra tên tab "DuLieu" hoặc quyền Editor của Sheet');
    }
  } catch (err: any) {
    console.error(' -> LỖI Sheets API:', err.message);
  }

  console.log('\n--- HOÀN THÀNH KIỂM TRA ---');
}

testConnection();
