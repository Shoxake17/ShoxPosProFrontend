import { api } from '../utils/api';

const DB_NAME = 'ShoxPosDB';
const DB_VERSION = 6; // Versiyani 6 ga ko'tardik
const STORE = 'products';
const PENDING_STORE = 'pendingSync';
const CATEGORY_STORE = 'categories'; // Yangi store

// Reports DB
const REPORTS_DB_NAME = 'ShoxPosReports';
const REPORTS_DB_VERSION = 2;
const REPORTS_STORE = 'reports';

// ─── Reports DB ochish ───────────────────────────────────────────────────
export function openReportsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(REPORTS_DB_NAME, REPORTS_DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains(REPORTS_STORE)) {
        db.createObjectStore(REPORTS_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Reports olish ───────────────────────────────────────────────────────
export async function getReportsFromIDB(): Promise<any[]> {
  try {
    const db = await openReportsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(REPORTS_STORE, 'readonly');
      const store = tx.objectStore(REPORTS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        resolve(req.result || []);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch { return []; }
}

// ─── Report o'chirish (sync dan keyin) ───────────────────────────────────
export async function deleteReportFromIDB(id: number): Promise<void> {
  try {
    const db = await openReportsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(REPORTS_STORE, 'readwrite');
      tx.objectStore(REPORTS_STORE).delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch { /* silent */ }
}

// ─── Reports sync qilish ─────────────────────────────────────────────────
export async function syncReportsToMongoDB(login: string): Promise<number> {
  if (!navigator.onLine) return 0;

  const reports = await getReportsFromIDB();
  if (reports.length === 0) return 0;

  // Login bo'yicha filterlash
  const userReports = reports.filter(r => r.login === login);
  if (userReports.length === 0) return 0;

  let synced = 0;
  try {
    const res = await api(`/api/sell-product/${login}`, {
      method: 'POST',
      body: JSON.stringify({ sales: userReports }),
    });

    if (res.ok) {
      for (const r of userReports) {
        if (r.id) await deleteReportFromIDB(r.id);
      }
      synced = userReports.length;
    }
  } catch (err) {
    console.error('Reports sync xatosi:', err);
  }

  return synced;
}

// ─── Background sync throttle — 5 daqiqada bir marta ─────────────────────
// Har chaqirilganda MongoDB ga bormaydi, throttle qiladi
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 daqiqa
const lastSyncMap = new Map<string, number>(); // login → timestamp

function shouldSync(login: string): boolean {
  const last = lastSyncMap.get(login) || 0;
  return Date.now() - last > SYNC_INTERVAL_MS;
}

function markSynced(login: string): void {
  lastSyncMap.set(login, Date.now());
}

// ─── IndexedDB ochish ──────────────────────────────────────────────────────
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'barcode' });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        const pending = db.createObjectStore(PENDING_STORE, { keyPath: 'barcode' });
        pending.createIndex('action', 'action', { unique: false });
      }
      // Kategoriyalar uchun store qo'shish
      if (!db.objectStoreNames.contains(CATEGORY_STORE)) {
        db.createObjectStore(CATEGORY_STORE, { keyPath: 'login' });
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── IndexedDB: Kategoriyalarni saqlash ───────────────────────────────────
export async function saveCategoriesToIDB(login: string, categories: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CATEGORY_STORE, 'readwrite');
    tx.objectStore(CATEGORY_STORE).put({ login, categories, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── IndexedDB: Kategoriyalarni olish ─────────────────────────────────────
export async function getCategoriesFromIDB(login: string): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CATEGORY_STORE, 'readonly');
    const store = tx.objectStore(CATEGORY_STORE);
    const req = store.get(login);
    req.onsuccess = () => {
      resolve(req.result?.categories || []);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─── IndexedDB: mahsulotlarni olish ───────────────────────────────────────
export async function getAllFromIDB(login: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const all: any[] = req.result || [];
      resolve(all.filter(p => p.login === login));
    };
    req.onerror = () => reject(req.error);
  });
}

// ─── IndexedDB: mahsulot saqlash ──────────────────────────────────────────
export async function saveToIDB(product: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      ...product,
      updatedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── IndexedDB: bir nechta mahsulotni saqlash ──────────────────────────────
export async function saveAllToIDB(products: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    products.forEach(p => {
      store.put({
        ...p,
        updatedAt: new Date().toISOString(),
      });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── IndexedDB: mahsulot o'chirish ────────────────────────────────────────
export async function deleteFromIDB(barcode: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(barcode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Pending sync: qo'shish ───────────────────────────────────────────────
export async function addToPending(
  product: any,
  action: 'add' | 'delete' | 'update'
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).put({ ...product, action });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Pending sync: barchasini olish ───────────────────────────────────────
async function getPending(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readonly');
    const req = tx.objectStore(PENDING_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ─── Pending sync: o'chirish ──────────────────────────────────────────────
async function removeFromPending(barcode: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).delete(barcode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── MongoDB dan mahsulotlarni olish ──────────────────────────────────────
export async function fetchFromMongoDB(login: string): Promise<any[]> {
  try {
    const res = await api(`/api/products/user-products/${login}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ─── MongoDB ga mahsulot qo'shish ─────────────────────────────────────────
async function addToMongoDB(product: any): Promise<boolean> {
  try {
    const res = await api('/api/products/update-or-add-user-product', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── MongoDB dan mahsulot o'chirish ───────────────────────────────────────
async function deleteFromMongoDB(barcode: string, login: string): Promise<boolean> {
  try {
    const res = await api('/api/products/delete-product', {
      method: 'POST',
      body: JSON.stringify({ barcode, login }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── ASOSIY: Mahsulot qo'shish (offline-first) ───────────────────────────
export async function addProductOfflineFirst(productData: any): Promise<void> {
  await saveToIDB(productData);

  if (navigator.onLine) {
    const ok = await addToMongoDB(productData);
    if (!ok) {
      await addToPending(productData, 'add');
    }
  } else {
    await addToPending(productData, 'add');
  }
}

// ─── ASOSIY: Mahsulot o'chirish (offline-first) ──────────────────────────
export async function deleteProductOfflineFirst(
  barcode: string,
  login: string
): Promise<void> {
  await deleteFromIDB(barcode);

  if (navigator.onLine) {
    const ok = await deleteFromMongoDB(barcode, login);
    if (!ok) {
      await addToPending({ barcode, login }, 'delete');
    }
  } else {
    await addToPending({ barcode, login }, 'delete');
  }
}

// ─── ASOSIY: Mahsulotlarni yuklash (offline-first + fallback) ────────────
// ✅ TUZATISH: syncInBackground endi throttle qilingan —
//    5 daqiqada bir martadan ko'p MongoDB ga bormaydi
export async function loadProductsOfflineFirst(login: string): Promise<any[]> {
  // 1. IndexedDB dan ol
  const idbProducts = await getAllFromIDB(login);

  if (idbProducts.length > 0) {
    // ✅ Faqat throttle o'tsa background sync qilamiz
    if (navigator.onLine && shouldSync(login)) {
      syncInBackground(login); // fire-and-forget
    }
    return idbProducts;
  }

  // 2. IndexedDB bo'sh — MongoDB dan yukla
  if (navigator.onLine) {
    const mongoProducts = await fetchFromMongoDB(login);
    if (mongoProducts.length > 0) {
      await saveAllToIDB(mongoProducts.map(p => ({ ...p, login })));
    }
    markSynced(login); // ✅ birinchi yuklash ham hisoblanadi
    return mongoProducts;
  }

  return [];
}

// ─── Background sync: pending mahsulotlarni MongoDB ga yubor ─────────────
export async function syncPendingToMongoDB(login: string): Promise<number> {
  if (!navigator.onLine) return 0;

  const pending = await getPending();
  let synced = 0;

  for (const item of pending) {
    let ok = false;
    if (item.action === 'add' || item.action === 'update') {
      ok = await addToMongoDB(item);
    } else if (item.action === 'delete') {
      ok = await deleteFromMongoDB(item.barcode, item.login);
    }
    if (ok) {
      await removeFromPending(item.barcode);
      synced++;
    }
  }

  // Sotuvlarni ham sync qilamiz
  await syncReportsToMongoDB(login);

  return synced;
}

// ─── Background sync: MongoDB + IndexedDB merge ───────────────────────────
// ✅ TUZATISH: MongoDB dagi o'zgarishlarni IDB da yangilaydi
async function syncInBackground(login: string): Promise<void> {
  // ✅ Throttle check — agar hali vaqt bo'lmasa chiqib ketamiz
  if (!shouldSync(login)) return;

  // ✅ Darhol mark qilamiz — parallel chaqiruvlar kelsa ham bir marta ishlaydi
  markSynced(login);

  try {
    await syncPendingToMongoDB(login);

    const mongoProducts = await fetchFromMongoDB(login);
    if (mongoProducts.length > 0) {
      await saveAllToIDB(mongoProducts.map(p => ({ ...p, login })));
    }
  } catch (err) {
    console.error('Background sync xatosi:', err);
    // ✅ Xato bo'lsa — keyingi urinishda qayta sync qilish uchun reset
    lastSyncMap.delete(login);
  }
}

// ─── Online event listener: avtomatik sync ───────────────────────────────
// ✅ Online bo'lganda throttle ni reset qilamiz — chunki ancha vaqt offline edi
export function setupOnlineListener(
  login: string,
  onSynced?: (count: number) => void
): () => void {
  const handler = async () => {
    // ✅ Online bo'lganda throttle ni reset — yangi sync kerak
    lastSyncMap.delete(login);

    const count = await syncPendingToMongoDB(login);
    await syncInBackground(login);
    if (onSynced && count > 0) onSynced(count);
  };

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

// ─── Manual sync: foydalanuvchi tugma bossa ───────────────────────────────
// ✅ Throttle ni bypass qiladi — va IDB ni MongoDB dagi ma'lumotlar bilan yangilaydi
export async function forceSyncFromMongoDB(login: string): Promise<any[]> {
  lastSyncMap.delete(login); // throttle reset
  const mongoProducts = await fetchFromMongoDB(login);
  
  if (mongoProducts.length > 0) {
    await saveAllToIDB(mongoProducts.map(p => ({ ...p, login })));
  }
  
  markSynced(login);
  return mongoProducts;
}
