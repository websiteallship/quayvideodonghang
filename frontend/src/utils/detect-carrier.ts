// ---------------------------------------------------------------------------
// Carrier Detection from Barcode Prefix
// Tham chiếu: docs/01-tong-quan-san-pham.md (4.1 item 2)
// Uses prefixPatterns from config/constants.ts
// ---------------------------------------------------------------------------

import type { DonViVanChuyen } from '../types';
import { DON_VI_VAN_CHUYEN_LIST } from '../config/constants';

/**
 * Auto-detect shipping carrier from barcode prefix.
 * Matches against regex patterns defined in DON_VI_VAN_CHUYEN_LIST.
 *
 * @param code - Scanned barcode value
 * @returns Detected carrier ID, or 'Khac' if no match
 */
export function detectCarrier(code: string): DonViVanChuyen {
  if (!code || code.length < 2) {
    return 'Khac';
  }

  const trimmed = code.trim();

  for (const carrier of DON_VI_VAN_CHUYEN_LIST) {
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
 * Get the display label for a carrier ID.
 */
export function getCarrierLabel(id: DonViVanChuyen): string {
  const carrier = DON_VI_VAN_CHUYEN_LIST.find((c) => c.id === id);
  return carrier?.label ?? 'Đơn vị khác';
}
