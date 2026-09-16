// ---------------------------------------------------------------------------
// useGeolocation — Single-shot GPS position with optional reverse geocoding
// Tham chiếu: docs/roadmap.md (Step 2.1b)
// Rules: 03-performance.md — gọi 1 lần khi start recording, không watchPosition
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef } from 'react';

export interface GeoLocationResult {
  lat: number;
  lng: number;
  address?: string;
}

export interface UseGeolocationReturn {
  coords: GeoLocationResult | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<GeoLocationResult | null>;
  clearCache: () => void;
}

/**
 * Reverse geocode coordinates via BigDataCloud API (free client-side API, no key required).
 * Returns a short address string like "Bình Trưng, Thủ Đức, TP Hồ Chí Minh".
 *
 * BigDataCloud response structure for Vietnam:
 * - administrative[]: country(order 3) → region(6) → city(7,adminLevel 4) → city_dup(8) → ward(12-13,adminLevel 6)
 * - informative[]: timezone, religious regions, **district/TP-level** (e.g. "Thành phố Thủ Đức" order 11)
 * - locality: ward-level name, city: city-level, principalSubdivision: province/city
 */

// L1: Proper type definitions replacing `any` per 06-code-quality.md §1
interface BigDataCloudInfoEntry {
  order: number;
  name: string;
  adminLevel?: number;
}

interface BigDataCloudLocalityInfo {
  administrative?: BigDataCloudInfoEntry[];
  informative?: BigDataCloudInfoEntry[];
}

interface BigDataCloudResponse {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  localityInfo?: BigDataCloudLocalityInfo;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json() as BigDataCloudResponse;

    const parts: string[] = [];

    // 1. Ward/Phường: locality field is the most reliable for ward-level
    if (data.locality) {
      parts.push(data.locality);
    }

    // 2. District/Quận: often in informative array at order 11+ (e.g. "Thành phố Thủ Đức", "Quận 7")
    if (data.localityInfo?.informative) {
      const infoEntries = data.localityInfo.informative;
      // District-level entries usually have order >= 9 and Vietnamese names
      const districtEntry = infoEntries.find(
        (e) =>
          e.order >= 9 &&
          e.name &&
          !e.name.includes('/') && // exclude timezone like "Asia/Ho_Chi_Minh"
          !e.name.includes('(') && // exclude "Ho Chi Minh City (former)"
          !e.name.toLowerCase().includes('diocese') &&
          !e.name.toLowerCase().includes('province') &&
          !e.name.toLowerCase().includes('ecclesiastical') &&
          e.name !== data.locality // not duplicate of ward
      );
      if (districtEntry?.name) {
        parts.push(districtEntry.name);
      }
    }

    // 3. City/Province: principalSubdivision (always present)
    if (data.principalSubdivision) {
      // Shorten common long names
      let cityName = data.principalSubdivision;
      if (cityName === 'Thành phố Hồ Chí Minh') cityName = 'TP.HCM';
      if (cityName === 'Thủ đô Hà Nội' || cityName === 'Thành phố Hà Nội') cityName = 'Hà Nội';
      if (!parts.includes(cityName)) {
        parts.push(cityName);
      }
    }

    return parts.length > 0 ? parts.join(', ') : null;
  } catch {
    // Offline or timeout — silently fail
    return null;
  }
}

/**
 * Hook lấy GPS position 1 lần, cache kết quả.
 * Gọi `requestLocation()` khi bắt đầu quay video.
 * Không block recording flow nếu GPS fail.
 */
export function useGeolocation(): UseGeolocationReturn {
  const [coords, setCoords] = useState<GeoLocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cachedRef = useRef<GeoLocationResult | null>(null);

  const requestLocation = useCallback(async (): Promise<GeoLocationResult | null> => {
    // Return cached if available (same session)
    if (cachedRef.current) {
      setCoords(cachedRef.current);
      return cachedRef.current;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ GPS');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,  // Cell tower đủ cho kho cố định (roadmap spec)
          timeout: 5000,              // 5s — tránh block recording flow
          maximumAge: 60000,          // Cache 60s — đủ cho nhiều lần quay liên tiếp
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Attempt reverse geocoding (non-blocking, best-effort)
      const address = await reverseGeocode(lat, lng);

      const result: GeoLocationResult = { lat, lng, address: address ?? undefined };
      cachedRef.current = result;
      setCoords(result);
      setIsLoading(false);
      return result;
    } catch (err) {
      const geoError = err as GeolocationPositionError;
      let msg = 'Không thể xác định vị trí';
      if (geoError.code === GeolocationPositionError.PERMISSION_DENIED) {
        msg = 'Quyền GPS bị từ chối';
      } else if (geoError.code === GeolocationPositionError.TIMEOUT) {
        msg = 'GPS timeout — thử lại sau';
      }
      setError(msg);
      setCoords(null);
      setIsLoading(false);
      return null;
    }
  }, []);

  const clearCache = useCallback(() => {
    cachedRef.current = null;
    setCoords(null);
    setError(null);
  }, []);

  return { coords, isLoading, error, requestLocation, clearCache };
}
