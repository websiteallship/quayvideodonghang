/**
 * Format số giây thành chuỗi mm:ss (hoặc hh:mm:ss nếu >= 3600)
 */
export function formatDuration(seconds: number): string {
  const rounded = Math.floor(seconds);
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Format dung lượng bytes sang KB, MB, GB dễ đọc
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Parse input string/number/Date to Date object, normalizing SQLite UTC datetime strings without timezone
 */
function parseDateInput(dateInput: string | number | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return new Date(NaN);
    // SQLite datetime('now') produces 'YYYY-MM-DD HH:mm:ss' in UTC without 'Z' or offset.
    // If no timezone suffix exists, append 'Z' so JavaScript treats it as UTC.
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
      return new Date(trimmed.replace(' ', 'T') + 'Z');
    }
    return new Date(trimmed);
  }
  return new Date(dateInput);
}

/**
 * Format thời gian theo chuẩn múi giờ Hồ Chí Minh (+7): DD/MM/YYYY HH:mm:ss
 */
export function formatDateTimeVN(dateInput: string | number | Date): string {
  if (!dateInput) return '—';
  const date = parseDateInput(dateInput);
  if (isNaN(date.getTime())) return '—';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return formatter.format(date).replace(',', '');
}

/**
 * Format thời gian cho card kho vận có đầy đủ năm theo múi giờ Hồ Chí Minh (+7): DD/MM/YYYY HH:mm:ss
 */
export function formatDateTimeShortVN(dateInput: string | number | Date): string {
  return formatDateTimeVN(dateInput);
}

