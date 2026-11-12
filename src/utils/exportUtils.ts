// src/utils/exportUtils.ts

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Mahsulotlar uchun
export const exportProductsToExcel = (products: any[]) => {
  const ws = XLSX.utils.json_to_sheet(products.map(p => ({
    Barcode: p.barcode,
    "Mahsulot nomi": p.name || '-',
    Narxi: p.price,
    Miqdori: p.quantity || 0,
    Kategoriya: p.category
  })));
  return ws;
};

// Sotilganlar uchun
export const exportReportsToExcel = (reports: any[]) => {
  const ws = XLSX.utils.json_to_sheet(reports.map(r => ({
    "Mahsulot": r.name,
    Barcode: r.barcode,
    Miqdori: r.quantity,
    Narxi: r.price,
    Jami: r.total,
    "Sotilgan vaqt": r.soldAt ? new Date(r.soldAt).toLocaleString('uz-UZ') : '-'
  })));
  return ws;
};

// Qarzlar uchun
export const exportDebtsToExcel = (debts: any[]) => {
  const ws = XLSX.utils.json_to_sheet(debts.map(d => ({
    "Mijoz nomi": d.name,
    Telefon: d.phone,
    "Qarz summasi": d.amount,
    "Oxirgi toʻlov": d.lastPayment
  })));
  return ws;
};

// PDF eksport — brauzerning o'z "Chop etish -> PDF sifatida saqlash" oynasi orqali.
//
// 2026-11-12 (SEC-ZERO, Plane 448): jspdf olib tashlandi — uning bog'liqligi
// fflate 0.8.3 da yamoqsiz High zaiflik (SNYK-JS-FFLATE-22392372) bor edi.
// Brauzer chop etishi qo'shimcha kutubxonasiz ishlaydi, kirill/lotin
// harflarini to'g'ri chiqaradi (jspdf standart shrifti chiqarmasdi).
//
// XAVFSIZLIK: mahsulot nomi, mijoz ismi kabi qiymatlar foydalanuvchi kiritgan
// matn. Ular FAQAT `textContent` orqali qo'yiladi (innerHTML yo'q) — HTML/skript
// sifatida talqin qilinmaydi. Iframe `about:blank` (same-origin), tashqi manba yuklamaydi.
type Cell = string | number | null | undefined;

const fmtNum = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('uz-UZ') : '-';
};

function appendTable(doc: Document, parent: HTMLElement, title: string, head: string[], rows: Cell[][]) {
  const h2 = doc.createElement('h2');
  h2.textContent = title;
  parent.appendChild(h2);
  const table = doc.createElement('table');
  const thead = doc.createElement('thead');
  const trh = doc.createElement('tr');
  for (const h of head) {
    const th = doc.createElement('th');
    th.textContent = h;
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);
  const tbody = doc.createElement('tbody');
  for (const row of rows) {
    const tr = doc.createElement('tr');
    for (const c of row) {
      const td = doc.createElement('td');
      td.textContent = c === null || c === undefined || c === '' ? '-' : String(c);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  parent.appendChild(table);
}

export const exportToPDF = (
  products: any[],
  reports: any[],
  debts: any[],
  t: (key: string) => string
) => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  const date = new Date().toISOString().split('T')[0];
  doc.title = `OnDexMerchant_Hisobot_${date}`;
  const style = doc.createElement('style');
  style.textContent = [
    '@page { size: A4 landscape; margin: 12mm; }',
    'body { font-family: Arial, sans-serif; color: #111; }',
    'h1 { font-size: 18px; margin: 0 0 4px; } h2 { font-size: 14px; margin: 18px 0 6px; }',
    'p { font-size: 12px; margin: 0 0 8px; }',
    'table { width: 100%; border-collapse: collapse; font-size: 10px; }',
    'th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; }',
    'th { background: #eee; } tr { page-break-inside: avoid; }',
  ].join('\n');
  doc.head.appendChild(style);

  const body = doc.body;
  const h1 = doc.createElement('h1');
  h1.textContent = 'OnDex Merchant Eksport Hisoboti';
  body.appendChild(h1);
  const p = doc.createElement('p');
  p.textContent = `Sana: ${new Date().toLocaleDateString('uz-UZ')}`;
  body.appendChild(p);

  appendTable(doc, body, t('productsDatabase') || 'Mahsulotlar bazasi',
    ['Barcode', 'Mahsulot nomi', 'Narxi', 'Miqdori', 'Kategoriya'],
    products.map(x => [x.barcode, x.name, fmtNum(x.price), x.quantity || 0, x.category]));
  appendTable(doc, body, t('sales') || 'Sotilganlar',
    ['Mahsulot', 'Barcode', 'Miqdori', 'Narxi', 'Jami', 'Vaqt'],
    reports.map(r => [r.name, r.barcode, r.quantity, fmtNum(r.price), fmtNum(r.total),
      r.soldAt ? new Date(r.soldAt).toLocaleString('uz-UZ') : '-']));
  appendTable(doc, body, t('debtsSheet') || 'Qarzlar',
    ['Mijoz nomi', 'Telefon', 'Qarz summasi', 'Oxirgi toʻlov'],
    debts.map(d => [d.name, d.phone, fmtNum(d.amount), d.lastPayment]));

  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  win.addEventListener('afterprint', cleanup, { once: true });
  win.focus();
  win.print();
  // Ba'zi brauzerlar afterprint chiqarmaydi — baribir tozalanadi.
  setTimeout(() => { if (iframe.isConnected) iframe.remove(); }, 60_000);
};

// Excel uchun umumiy funksiya
export const exportToExcel = (
  products: any[],
  reports: any[],
  debts: any[],
  t: (key: string) => string
) => {
  const wb = XLSX.utils.book_new();

  const productsWS = exportProductsToExcel(products);
  XLSX.utils.book_append_sheet(wb, productsWS, t('productsDatabase')?.slice(0, 31) || "Mahsulotlar");

  const reportsWS = exportReportsToExcel(reports);
  XLSX.utils.book_append_sheet(wb, reportsWS, t('sales')?.slice(0, 31) || "Sotilganlar");

  const debtsWS = exportDebtsToExcel(debts);
  XLSX.utils.book_append_sheet(wb, debtsWS, t('debtsSheet')?.slice(0, 31) || "Qarzlar");

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, `OnDexMerchant_Hisobot_${new Date().toISOString().split('T')[0]}.xlsx`);
};
