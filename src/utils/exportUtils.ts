// src/utils/exportUtils.ts

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

// PDF uchun umumiy funksiya
export const exportToPDF = (

  products: any[],
  reports: any[],
  debts: any[],
  t: (key: string) => string
) => {
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape

  let y = 20;

  // Sarlavha
  doc.setFontSize(18);
  doc.text("ShoxPosPro Eksport Hisoboti", 14, y);
  y += 10;
  doc.setFontSize(12);
  doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 14, y);
  y += 15;

  // Mahsulotlar
  doc.setFontSize(14);
  doc.text(t('productsDatabase') || "Mahsulotlar bazasi", 14, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Barcode', 'Mahsulot nomi', 'Narxi', 'Miqdori', 'Kategoriya']],
    body: products.map(p => [
      p.barcode,
      p.name || '-',
      p.price.toLocaleString(),
      p.quantity || 0,
      p.category
    ]),
    theme: 'grid',
    styles: { fontSize: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Sotilganlar
  doc.setFontSize(14);
  doc.text(t('sales') || "Sotilganlar", 14, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Mahsulot', 'Barcode', 'Miqdori', 'Narxi', 'Jami', 'Vaqt']],
    body: reports.map(r => [
      r.name,
      r.barcode,
      r.quantity,
      Number(r.price).toLocaleString(),
      Number(r.total).toLocaleString(),
      r.soldAt ? new Date(r.soldAt).toLocaleString('uz-UZ') : '-'
    ]),
    theme: 'grid',
    styles: { fontSize: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Qarzlar
  doc.setFontSize(14);
  doc.text(t('debtsSheet') || "Qarzlar", 14, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Mijoz nomi', 'Telefon', 'Qarz summasi', 'Oxirgi toʻlov']],
    body: debts.map(d => [
      d.name,
      d.phone,
      d.amount.toLocaleString(),
      d.lastPayment
    ]),
    theme: 'grid',
    styles: { fontSize: 10 },
  });

  doc.save(`ShoxPosPro_Hisobot_${new Date().toISOString().split('T')[0]}.pdf`);
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
  saveAs(data, `ShoxPosPro_Hisobot_${new Date().toISOString().split('T')[0]}.xlsx`);
};