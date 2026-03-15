// src/utils/deviceUtils.ts

/**
 * Qurilma brendi va modelini User-Agent dan aniqlash
 */
const getDeviceModel = (ua: string): string => {
  // ─── iPhone modellari ───────────────────────────────────────────
  if (/iphone/i.test(ua)) {
    // iOS versiyadan iPhone modelini taxminlash
    const iosMatch = ua.match(/os (\d+)_/i);
    const iosVersion = iosMatch ? parseInt(iosMatch[1]) : 0;
    if (iosVersion >= 17) return 'iPhone 15 seriyasi';
    if (iosVersion >= 16) return 'iPhone 14 seriyasi';
    if (iosVersion >= 15) return 'iPhone 13 seriyasi';
    if (iosVersion >= 14) return 'iPhone 12 seriyasi';
    if (iosVersion >= 13) return 'iPhone 11 seriyasi';
    return 'iPhone';
  }

  // ─── iPad modellari ─────────────────────────────────────────────
  if (/ipad/i.test(ua)) return 'iPad';

  // ─── Samsung ────────────────────────────────────────────────────
  const samsungMatch = ua.match(/samsung[- ]([a-z0-9-]+)/i) ||
                       ua.match(/sm-([a-z0-9]+)/i);
  if (samsungMatch) {
    const model = samsungMatch[1].toUpperCase();
    // Galaxy S seriyasi
    if (/S\d{2}[UE]?/i.test(model)) return `Samsung Galaxy ${model}`;
    // Galaxy A seriyasi
    if (/A\d{2,3}/i.test(model)) return `Samsung Galaxy ${model}`;
    // Galaxy M seriyasi
    if (/M\d{2}/i.test(model)) return `Samsung Galaxy ${model}`;
    return `Samsung ${model}`;
  }

  // ─── Xiaomi / Redmi / POCO ───────────────────────────────────────
  const xiaomiMatch = ua.match(/xiaomi[- ]([a-z0-9 ]+)/i) ||
                      ua.match(/redmi[- ]([a-z0-9 ]+)/i) ||
                      ua.match(/poco[- ]([a-z0-9]+)/i);
  if (xiaomiMatch) return `Xiaomi ${xiaomiMatch[1].trim()}`;
  if (/mi \d+/i.test(ua)) {
    const miMatch = ua.match(/mi (\d+[a-z]*)/i);
    return miMatch ? `Xiaomi Mi ${miMatch[1]}` : 'Xiaomi';
  }

  // ─── Huawei ─────────────────────────────────────────────────────
  const huaweiMatch = ua.match(/huawei[- ]([a-z0-9-]+)/i) ||
                      ua.match(/(CLT|VOG|ELS|HMA|ANA|NOH)-[A-Z0-9]+/i);
  if (huaweiMatch) return `Huawei ${huaweiMatch[1]}`;

  // ─── OnePlus ────────────────────────────────────────────────────
  const oneplusMatch = ua.match(/oneplus[- ]?([a-z0-9 ]+)/i);
  if (oneplusMatch) return `OnePlus ${oneplusMatch[1].trim()}`;

  // ─── Oppo ───────────────────────────────────────────────────────
  const oppoMatch = ua.match(/oppo[- ]([a-z0-9]+)/i) ||
                    ua.match(/CPH\d+/i);
  if (oppoMatch) return `OPPO ${oppoMatch[1]}`;

  // ─── Vivo ───────────────────────────────────────────────────────
  const vivoMatch = ua.match(/vivo[- ]([a-z0-9]+)/i);
  if (vivoMatch) return `Vivo ${vivoMatch[1]}`;

  // ─── Realme ─────────────────────────────────────────────────────
  const realmeMatch = ua.match(/realme[- ]([a-z0-9 ]+)/i) ||
                      ua.match(/RMX\d+/i);
  if (realmeMatch) return `Realme ${realmeMatch[1]}`;

  // ─── Nokia ──────────────────────────────────────────────────────
  const nokiaMatch = ua.match(/nokia[- ]([a-z0-9]+)/i);
  if (nokiaMatch) return `Nokia ${nokiaMatch[1]}`;

  // ─── Motorola ───────────────────────────────────────────────────
  const motoMatch = ua.match(/moto[- ]?([a-z0-9 ]+)/i) ||
                    ua.match(/motorola[- ]([a-z0-9]+)/i);
  if (motoMatch) return `Motorola ${motoMatch[1].trim()}`;

  // ─── LG ─────────────────────────────────────────────────────────
  const lgMatch = ua.match(/lg[- ]([a-z0-9]+)/i);
  if (lgMatch) return `LG ${lgMatch[1]}`;

  // ─── Sony ───────────────────────────────────────────────────────
  const sonyMatch = ua.match(/sony[- ]?([a-z0-9]+)/i) ||
                    ua.match(/xperia[- ]([a-z0-9 ]+)/i);
  if (sonyMatch) return `Sony Xperia ${sonyMatch[1]}`;

  // ─── Google Pixel ───────────────────────────────────────────────
  const pixelMatch = ua.match(/pixel[- ]?(\d+[a-z]*)/i);
  if (pixelMatch) return `Google Pixel ${pixelMatch[1]}`;

  // ─── Windows kompyuter brendlari ────────────────────────────────
  if (/windows/i.test(ua)) {
    if (/dell/i.test(ua)) return 'Dell';
    if (/hp|hewlett/i.test(ua)) return 'HP';
    if (/lenovo/i.test(ua)) return 'Lenovo';
    if (/asus/i.test(ua)) return 'ASUS';
    if (/acer/i.test(ua)) return 'Acer';
    if (/msi/i.test(ua)) return 'MSI';
    if (/toshiba/i.test(ua)) return 'Toshiba';
    if (/surface/i.test(ua)) return 'Microsoft Surface';
    return 'Windows PC';
  }

  // ─── Mac ────────────────────────────────────────────────────────
  if (/macintosh|mac os x/i.test(ua)) {
    if (/macbook/i.test(ua)) return 'MacBook';
    return 'Mac';
  }

  // ─── Linux ──────────────────────────────────────────────────────
  if (/linux/i.test(ua)) {
    if (/ubuntu/i.test(ua)) return 'Ubuntu PC';
    if (/fedora/i.test(ua)) return 'Fedora PC';
    if (/debian/i.test(ua)) return 'Debian PC';
    if (/arch/i.test(ua)) return 'Arch Linux PC';
    return 'Linux PC';
  }

  return 'Noma\'lum qurilma';
};

/**
 * Brauzer nomini aniqlash
 */
const getBrowser = (ua: string): string => {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/samsung/i.test(ua)) return 'Samsung Internet';
  return 'Brauzer';
};

/**
 * Qurilma ma'lumotlarini aniqlash
 */
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const uaLower = ua.toLowerCase();

  // ─── Qurilma turi ───────────────────────────────────────────────
  let deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = 'mobile';
  }

  // ─── Operatsion tizim ───────────────────────────────────────────
  let deviceOS = 'Unknown';
  if (/windows nt 10/i.test(ua)) deviceOS = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) deviceOS = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(ua)) deviceOS = 'Windows 7';
  else if (/windows/i.test(ua)) deviceOS = 'Windows';
  else if (/android (\d+)/i.test(ua)) {
    const v = ua.match(/android (\d+)/i)?.[1];
    deviceOS = `Android ${v || ''}`.trim();
  }
  else if (/iphone os (\d+)/i.test(ua)) {
    const v = ua.match(/iphone os (\d+_\d+)/i)?.[1]?.replace('_', '.');
    deviceOS = `iOS ${v || ''}`.trim();
  }
  else if (/ipad.*os (\d+)/i.test(ua)) {
    const v = ua.match(/os (\d+_\d+)/i)?.[1]?.replace('_', '.');
    deviceOS = `iPadOS ${v || ''}`.trim();
  }
  else if (/mac os x (\d+[._]\d+)/i.test(ua)) {
    const v = ua.match(/mac os x (\d+[._]\d+)/i)?.[1]?.replace('_', '.');
    deviceOS = `macOS ${v || ''}`.trim();
  }
  else if (/ubuntu/i.test(ua)) deviceOS = 'Ubuntu';
  else if (/linux/i.test(ua)) deviceOS = 'Linux';

  // ─── Qurilma modeli ─────────────────────────────────────────────
  const deviceModel = getDeviceModel(uaLower);
  const browser = getBrowser(ua);

  return { deviceType, deviceOS, deviceModel, browser };
};

/**
 * IP va lokatsiya ma'lumotlarini olish
 * ipapi.co — bepul, ro'yxatdan o'tish shart emas
 */
export const getLocationInfo = async (): Promise<{
  ip: string;
  city: string;
  region: string;
  country: string;
  flag: string;
  isp: string;
  location: string; // "Toshkent, O'zbekiston"
}> => {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000), // 5 sekund timeout
    });

    if (!res.ok) throw new Error('Lokatsiya xatosi');

    const data = await res.json();

    return {
      ip:       data.ip || '',
      city:     data.city || '',
      region:   data.region || '',
      country:  data.country_name || '',
      flag:     data.country_code
                  ? `https://flagcdn.com/24x18/${data.country_code.toLowerCase()}.png`
                  : '',
      isp:      data.org || '',
      location: [data.city, data.country_name].filter(Boolean).join(', '),
    };
  } catch {
    return { ip: '', city: '', region: '', country: '', flag: '', isp: '', location: '' };
  }
};

/**
 * Login uchun to'liq qurilma ma'lumotlari (lokatsiya bilan)
 * Serverga yuborishdan oldin chaqiriladi
 */
export const getFullDeviceInfo = async () => {
  const device = getDeviceInfo();
  const location = await getLocationInfo();

  return {
    deviceType:  device.deviceType,
    deviceOS:    device.deviceOS,
    deviceModel: device.deviceModel,
    browser:     device.browser,
    ...location,
  };
};

/**
 * WebAuthn uchun RP ID
 */
export const getRpId = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'localhost';
  return hostname;
};