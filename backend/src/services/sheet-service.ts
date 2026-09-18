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

export interface SheetRetentionUpdate {
  bienBanId: string;
  action: 'archive' | 'delete';
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

  /**
   * Cập nhật trạng thái và xoá link Drive (nếu xoá) cho danh sách biên bản trên Google Sheet
   * Cột B là ID biên bản.
   * Cột K là Link xem video.
   * Cột L là Trạng thái ('Đã lưu' -> 'Đã lưu trữ' hoặc 'Đã xoá').
   */
  async updateRetentionStatuses(
    updates: SheetRetentionUpdate[]
  ): Promise<{ updatedCount: number; errors: string[] }> {
    if (!this.sheetId || updates.length === 0) {
      return { updatedCount: 0, errors: [] };
    }

    const errors: string[] = [];
    try {
      const accessToken = await this.driveService.getAccessToken();

      // Đọc cột B (ID biên bản) từ Sheet để map ID sang số hàng (1-indexed)
      const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${encodeURIComponent('DuLieu!B:B')}`;
      const getRes = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!getRes.ok) {
        const errText = await getRes.text();
        errors.push(`Sheet get B:B failed: ${getRes.status} - ${errText}`);
        return { updatedCount: 0, errors };
      }

      const getData = (await getRes.json()) as { values?: string[][] };
      const rows = getData.values || [];

      // Map bienBanId -> row index (1-indexed)
      const idToRowMap = new Map<string, number>();
      for (let i = 0; i < rows.length; i++) {
        const idVal = rows[i]?.[0];
        if (idVal) {
          idToRowMap.set(idVal.trim(), i + 1);
        }
      }

      const batchData: Array<{ range: string; values: string[][] }> = [];

      for (const update of updates) {
        const rowNum = idToRowMap.get(update.bienBanId.trim());
        if (!rowNum) continue;

        if (update.action === 'archive') {
          batchData.push({
            range: `DuLieu!L${rowNum}`,
            values: [['Đã lưu trữ']]
          });
        } else if (update.action === 'delete') {
          batchData.push({
            range: `DuLieu!K${rowNum}:L${rowNum}`,
            values: [['', 'Đã xoá']]
          });
        }
      }

      if (batchData.length === 0) {
        return { updatedCount: 0, errors: [] };
      }

      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values:batchUpdate`;
      const batchRes = await fetch(batchUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: batchData
        })
      });

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        errors.push(`Sheet batchUpdate failed: ${batchRes.status} - ${errText}`);
        return { updatedCount: 0, errors };
      }

      return { updatedCount: batchData.length, errors: [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Sheet retention error: ${msg}`);
      return { updatedCount: 0, errors };
    }
  }
}

