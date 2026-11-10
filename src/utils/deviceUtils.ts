// src/utils/deviceUtils.ts

import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Qurilma brendi va modelini User-Agent dan aniqlash
 */
const getDeviceModel = (ua: string): string => {
  const uaLower = ua.toLowerCase();

  // ─── iPhone modellari ───────────────────────────────────────────
  if (/iphone/i.test(uaLower)) {
    const iosMatch = uaLower.match(/os (\d+)_/i);
    const iosVersion = iosMatch ? parseInt(iosMatch[1]) : 0;
    if (iosVersion >= 18) return 'iPhone 16 seriyasi';
    if (iosVersion >= 17) return 'iPhone 15 seriyasi';
    if (iosVersion >= 16) return 'iPhone 14 seriyasi';
    if (iosVersion >= 15) return 'iPhone 13 seriyasi';
    return 'iPhone';
  }

  // ─── Samsung ────────────────────────────────────────────────────
  const samsungMatch = uaLower.match(/sm-([a-z0-9]+)/i);
  if (samsungMatch) {
    const model = samsungMatch[1].toUpperCase();
    return `Samsung ${model}`;
  }

  // ─── Xiaomi / Redmi / POCO ───────────────────────────────────────
  if (/redmi/i.test(uaLower)) return 'Redmi';
  if (/poco/i.test(uaLower)) return 'POCO';
  if (/mi /i.test(uaLower) || /xiaomi/i.test(uaLower)) return 'Xiaomi';

  // ─── Kompyuter brendlari ────────────────────────────────────────
  if (/windows/i.test(uaLower)) {
    if (/surface/i.test(uaLower)) return 'Microsoft Surface';
    return 'Windows PC';
  }
  if (/macintosh/i.test(uaLower)) return 'MacBook/iMac';
  if (/linux/i.test(uaLower)) return 'Linux PC';

  return 'Noma\'lum qurilma';
};

/**
 * Brauzer nomini aniqlash
 */
const getBrowser = (ua: string): string => {
  const uaLower = ua.toLowerCase();
  if (uaLower.includes('edg/')) return 'Edge';
  if (uaLower.includes('opr/') || uaLower.includes('opera')) return 'Opera';
  if (uaLower.includes('chrome') && !uaLower.includes('chromium')) return 'Chrome';
  if (uaLower.includes('firefox')) return 'Firefox';
  if (uaLower.includes('safari') && !uaLower.includes('chrome')) return 'Safari';
  return 'Brauzer';
};

/**
 * Qurilma ma'lumotlarini aniqlash
 */
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  let deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = 'tablet';
  else if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) deviceType = 'mobile';

  let deviceOS = 'Unknown';
  if (/windows nt 10/i.test(ua)) deviceOS = 'Windows 10/11';
  else if (/android (\d+)/i.test(ua)) deviceOS = `Android ${ua.match(/android (\d+)/i)?.[1] || ''}`;
  else if (/iphone os (\d+)/i.test(ua)) deviceOS = `iOS ${ua.match(/os (\d+_\d+)/i)?.[1].replace('_', '.') || ''}`;
  else if (/mac os x/i.test(ua)) deviceOS = 'macOS';
  else if (/linux/i.test(ua)) deviceOS = 'Linux';

  return { 
    deviceType, 
    deviceOS: deviceOS.trim(), 
    deviceModel: getDeviceModel(ua), 
    browser: getBrowser(ua) 
  };
};

/**
 * IP va lokatsiya ma'lumotlarini olish
 * ip-api.com — Chidamliroq va CORS muammosi kamroq
 */
export const getLocationInfo = async () => {
  const fallbackData = { 
    ip: 'Noma\'lum', 
    city: 'Toshkent', 
    region: 'Toshkent', 
    country: 'O\'zbekiston', 
    flag: 'https://flagcdn.com/24x18/uz.png', 
    isp: 'Local ISP', 
    location: 'Toshkent, O\'zbekiston' 
  };
  
  try {
    // 1-urinish: freeipapi.com (professional, CSP-ga mos)
    const res = await fetch('https://freeipapi.com/api/json', {
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error('First service failed');
    const data = await res.json();

    return {
      ip: data.ipAddress || data.ip || 'Noma\'lum',
      city: data.cityName || data.city || 'Toshkent',
      region: data.regionName || data.region || '',
      country: data.countryName || data.country || 'O\'zbekiston',
      flag: `https://flagcdn.com/24x18/${data.countryCode?.toLowerCase() || 'uz'}.png`,
      isp: data.isp || 'Internet Service Provider',
      location: `${data.cityName || data.city || 'Toshkent'}, ${data.countryName || data.country || 'O\'zbekiston'}`,
    };
  } catch (error) {
    console.warn("API xatosi, zaxira servisga o'tilmoqda...");
    try {
      // 2-urinish: ipapi.co (HTTPS bepul versiyasi)
      const res2 = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(5000)
      });
      const data2 = await res2.json();
      if(data2.error) throw new Error();
      
      return {
        ip: data2.ip,
        city: data2.city,
        region: data2.region,
        country: data2.country_name,
        flag: `https://flagcdn.com/24x18/${data2.country_code?.toLowerCase()}.png`,
        isp: data2.org,
        location: `${data2.city}, ${data2.country_name}`,
      };
    } catch {
      return fallbackData;
    }
  }
};

/**
 * Login uchun to'liq ma'lumotlar
 */
export const getFullDeviceInfo = async () => {
  const device = getDeviceInfo();
  const location = await getLocationInfo();

  return {
    ...device,
    ...location,
    timestamp: new Date().toISOString()
  };
};

export const getRpId = () => {
  const hostname = window.location.hostname;
  return (hostname === 'localhost' || hostname === '127.0.0.1') ? 'localhost' : hostname;
};

/**
 * Zaxira (fallback) qurilma identifikatori.
 * FingerprintJS ishlamasa, userAgent va ekran ma'lumotlaridan hosil qilinadi.
 */
function getFallbackDeviceId(): string {
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const language = navigator.language;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Oddiy xeshlash (SHA-256 emas, shunchaki noyoblik uchun)
  const str = `${ua}|${screen}|${language}|${timezone}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `fb-${Math.abs(hash).toString(16)}`;
}

let cachedDeviceId: string | null = null;

/**
 * FingerprintJS orqali noyob qurilma identifikatorini olish.
 * localStorage va sessionStorage dan foydalanmaydi.
 */
export const getDeviceId = async (): Promise<string | null> => {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    // FingerprintJS v3+ load() funksiyasini ishlatadi
    // monitoring: false — kutubxona uchinchi tomonga (openfpcdn.io) telemetriya
    // yubormasin (CSP baribir bloklaydi; maxfiylik).
    const fpPromise = FingerprintJS.load({ monitoring: false });
    const fp = await fpPromise;
    const result = await fp.get();
    cachedDeviceId = result.visitorId;
    return cachedDeviceId;
  } catch (err) {
    console.warn("FingerprintJS xatosi, fallback ishlatilmoqda:", err);
    cachedDeviceId = getFallbackDeviceId();
    return cachedDeviceId;
  }
};
