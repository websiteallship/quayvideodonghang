// ---------------------------------------------------------------------------
// Carrier Detection & Merged List Resolver
// Tham chiếu: docs/01-tong-quan-san-pham.md (4.1 item 2)
// Uses prefixPatterns from config/constants.ts (built-in only)
// ---------------------------------------------------------------------------

import type { DonViVanChuyen } from '../types';
import { BUILT_IN_CARRIERS, BUILT_IN_CARRIER_IDS, type CarrierEntry } from '../config/constants';

/**
 * Auto-detect shipping carrier from barcode prefix.
 * Matches against regex patterns defined in BUILT_IN_CARRIERS.
 * Chỉ built-in carriers mới có regex — admin-added carriers không auto-detect.
 *
 * @param code - Scanned barcode value
 * @returns Detected carrier ID, or 'Khac' if no match
 */
export function detectCarrier(code: string): DonViVanChuyen {
  if (!code || code.length < 2) {
    return 'Khac';
  }

  const trimmed = code.trim();

  for (const carrier of BUILT_IN_CARRIERS) {
    if (!carrier.prefixPatterns) continue;

    for (const pattern of carrier.prefixPatterns) {
      if (pattern.test(trimmed)) {
        return carrier.id;
      }
    }
  }

  return 'Khac';
}

/**
 * Hợp nhất danh sách ĐVVC built-in với danh sách từ server (systemConfig.don_vi_vc).
 *
 * Server list format: mỗi entry có thể là:
 * - `"GHN"` (chỉ id, built-in → lấy label từ catalog)
 * - `"AhaMove:Aha Move"` (id:label, admin-added → tách ra)
 *
 * Rules:
 * - Built-in carriers luôn giữ nguyên metadata (label, regex, isBuiltIn=true)
 * - Admin-added carriers: isBuiltIn=false, không có regex
 * - 'Khac' luôn ở cuối danh sách
 * - Dedup theo id
 */
export function getMergedCarrierList(serverList?: string[]): CarrierEntry[] {
  const result: CarrierEntry[] = [];
  const addedIds = new Set<string>();

  // 1. Thêm tất cả built-in carriers (trừ 'Khac', sẽ thêm cuối)
  for (const carrier of BUILT_IN_CARRIERS) {
    if (carrier.id === 'Khac') continue;
    result.push(carrier);
    addedIds.add(carrier.id);
  }

  // 2. Thêm admin-added carriers từ server list (skip tất cả built-in IDs, kể cả 'Khac')
  if (serverList) {
    for (const entry of serverList) {
      const [id, label] = parseCarrierEntry(entry);
      if (!id || addedIds.has(id) || BUILT_IN_CARRIER_IDS.has(id)) continue;
      result.push({
        id,
        label: label || id,
        isBuiltIn: false,
      });
      addedIds.add(id);
    }
  }

  // 3. 'Khac' luôn ở cuối
  const khac = BUILT_IN_CARRIERS.find((c) => c.id === 'Khac');
  if (khac) {
    result.push(khac);
  }

  return result;
}

/**
 * Parse một entry từ server list.
 * Hỗ trợ format: `"id:label"` hoặc `"id"` (backward compat).
 */
function parseCarrierEntry(entry: string): [string, string] {
  const colonIdx = entry.indexOf(':');
  if (colonIdx > 0) {
    return [entry.slice(0, colonIdx).trim(), entry.slice(colonIdx + 1).trim()];
  }
  return [entry.trim(), ''];
}

/**
 * Get the display label for a carrier ID.
 * Tra cứu từ built-in catalog trước, fallback về id nếu là admin-added.
 *
 * @param id - Carrier ID
 * @param serverList - Optional server list for admin-added carrier labels
 */
export function getCarrierLabel(id: DonViVanChuyen, serverList?: string[]): string {
  // Built-in lookup
  const builtIn = BUILT_IN_CARRIERS.find((c) => c.id === id);
  if (builtIn) return builtIn.label;

  // Admin-added: tìm trong server list
  if (serverList) {
    for (const entry of serverList) {
      const [entryId, entryLabel] = parseCarrierEntry(entry);
      if (entryId === id) return entryLabel || id;
    }
  }

  return id;
}

/**
 * Kiểm tra một carrier ID có phải built-in hay không.
 */
export function isBuiltInCarrier(id: string): boolean {
  return BUILT_IN_CARRIER_IDS.has(id);
}
