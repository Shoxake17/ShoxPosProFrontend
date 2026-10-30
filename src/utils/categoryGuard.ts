// Backend `403 CATEGORY_FORBIDDEN` (do'kon turi bu bo'limga ruxsat bermaydi) ni
// foydalanuvchiga xom xato sifatida ko'rsatmaydi, balki holatni O'ZI TUZATADI.
//
// Bunday javob odatda EGASI kategoriyasi o'zgargach (masalan admin do'konni
// "Qurt" qilgach) eski ochiq tab eski menyu/kesh bilan ishlayotganini bildiradi:
// backend yangi cheklovni tokenni yangilaganda oladi, brauzer esa hali eski
// kategoriyani biladi. Davo: keshni tozalab, `/auth/complete` orqali sessiyani
// yangidan o'qish — u yangi kategoriyaga mos sahifaga olib boradi.

const FLAG = 'categoryRecoverAt';
const MIN_GAP_MS = 10_000; // takroriy so'rovlar sahifani qayta-qayta yuklamasin

export const CATEGORY_FORBIDDEN = 'CATEGORY_FORBIDDEN';

export function recoverFromCategoryForbidden(): void {
  const here = window.location.pathname;
  if (here.startsWith('/auth/') || here.startsWith('/login')) return;
  try {
    const last = Number(sessionStorage.getItem(FLAG) || 0);
    if (Date.now() - last < MIN_GAP_MS) return;
    sessionStorage.setItem(FLAG, String(Date.now()));
  } catch { /* sessionStorage yo'q — baribir davom etamiz */ }

  // ProtectedRoute.invalidateAuthCache bilan bir xil (u yerdan import qilinmaydi: aylana bog'liqlik).
  try {
    sessionStorage.removeItem('authCache');
    sessionStorage.removeItem('currentUser');
  } catch { /* ruxsat yo'q */ }
  window.location.replace('/auth/complete');
}

let installed = false;

/**
 * Sahifa ichidagi BARCHA to'g'ridan-to'g'ri `fetch` chaqiruvlarini (`api()` va
 * axios'dan tashqari, masalan Kassa sahifasidagi printer tekshiruvi) ham
 * qamrab oladi: har qanday `/api` javobi `403 CATEGORY_FORBIDDEN` bo'lsa,
 * holat o'zi tuzatiladi. Bir marta o'rnatiladi; javob o'zgarmaydi (klon o'qiladi).
 */
export function installCategoryGuard(): void {
  if (installed || typeof window === 'undefined' || !window.fetch) return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await original(...args);
    if (res.status === 403) {
      res.clone().json()
        .then((d) => { if (d && d.code === CATEGORY_FORBIDDEN) recoverFromCategoryForbidden(); })
        .catch(() => { /* JSON emas */ });
    }
    return res;
  };
}
