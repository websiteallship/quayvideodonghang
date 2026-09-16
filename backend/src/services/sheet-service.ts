import { DriveService } from './drive-service';

export interface SheetRowData {
  id: string;
  ma_van_don: string;
  don_vi_vc: string;
  loai_bien_ban: string;
  ma_nhan_vien: string;
  thoi_gian_tao: string;
  thoi_luong_video: number;
  kich_thuoc_bytes: number;
  drive_file_id: string;
  drive_file_name: string;
}

export class SheetService {
  private driveService: DriveService;
  private sheetId: string;

  constructor(driveService: DriveService, sheetId: string) {
    this.driveService = driveService;
    this.sheetId = sheetId;
  }

  async appendRow(data: SheetRowData): Promise<boolean> {
    if (!this.sheetId) {
      console.warn('Google Sheet ID chưa được cấu hình, bỏ qua ghi sheet');
      return false;
    }

    try {
      const accessToken = await this.driveService.getAccessToken();

      const rowValues = [
        data.thoi_gian_tao,
        data.id,
        data.ma_van_don,
        data.don_vi_vc,
        data.loai_bien_ban,
        data.ma_nhan_vien,
        data.thoi_luong_video,
        data.kich_thuoc_bytes,
        data.drive_file_id,
        data.drive_file_name,
        `https://drive.google.com/file/d/${data.drive_file_id}/view`,
        'Đã lưu'
      ];

      const range = 'DuLieu!A:L';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Failed to append row to Google Sheet:', errText);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in appendRow to Sheet:', err);
      return false;
    }
  }
}
