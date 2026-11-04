// Do'kon KATEGORIYASI bo'yicha sahifa ruxsatlari.
//
// Kategoriyani OnDex belgilaydi (admin panelda do'kon yaratganda): qurt | store |
// pharmacy. Bu yerda faqat QURT cheklangan; boshqalar avvalgidek.
//
// DIQQAT: bu faqat ko'rinish qatlami (menyu va sahifaga kirish). Haqiqiy
// himoya BACKEND'da: `ShoxPosProBackend/services/storeAccess.js` ruxsat
// etilmagan API yo'llarini 403 bilan rad etadi. Ikkala ro'yxat BIR XIL bo'lishi shart.

const PAGES_BY_CATEGORY: Record<string, readonly string[]> = {
  // Mahsulot qo'shish, Mahsulotlar bazasi, Sotuvlar, Kirim bazasi,
  // Savdo statistikasi, Qarzlar, Sozlamalar.
  qurt: ["add-product", "products", "orders", "logistics", "sales", "kirim-bazasi", "reports", "debts", "settings"],
};

/** Faqat QURT do'konida bor sahifalar: boshqa kategoriyada (cheklanmagan) ham yashirin. */
const QURT_ONLY_PAGES: readonly string[] = ["orders", "logistics"];

/** Sahifa (URL'ning birinchi qismi, masalan "products") ruxsat etilganmi. */
export function isPageAllowed(category: string | undefined | null, pageId: string): boolean {
  if (QURT_ONLY_PAGES.includes(pageId)) return category === "qurt";
  const pages = category ? PAGES_BY_CATEGORY[category] : undefined;
  if (!pages) return true; // cheklanmagan kategoriya
  return pages.includes(pageId);
}

/** Kirgandan keyin (yoki taqiqlangan sahifadan) yo'naltiriladigan sahifa. */
export function landingPath(role: string | undefined | null, category?: string | null): string {
  if ((role || "").toLowerCase() === "admin") return "/admin-panel";
  const pages = category ? PAGES_BY_CATEGORY[category] : undefined;
  return pages ? `/${pages[0] === "add-product" ? "products" : pages[0]}` : "/menu";
}
