import React, { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { hasOnlineOrders, isPageAllowed } from '../../utils/storeAccess';

interface NavItem {
  id: string;
  label: string;
  icon: (active: boolean) => React.ReactElement;
}

interface MobileBottomBarProps {
  theme: 'dark' | 'light';
  onScanClick?: () => void;
}

const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ theme, onScanClick }) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const isPharmacy = user?.shopType === 'dorixona';

  const REGULAR_ITEMS: NavItem[] = [
    { id: 'menu', label: t('home'), icon: (active: boolean) => <HomeIcon active={active} /> },
    { id: 'products', label: t('nav_products'), icon: (active: boolean) => <ProductIcon active={active} /> },
    { id: 'orders', label: 'Buyurtma', icon: (active: boolean) => <OrdersIcon active={active} /> }, // onlayn buyurtma moduli yoqilgan do'konda
    { id: 'logistics', label: 'Logistika', icon: (active: boolean) => <OrdersIcon active={active} /> }, // onlayn buyurtma moduli yoqilgan do'konda
    { id: 'scanner', label: t('nav_sell'), icon: (active: boolean) => <ScannerIcon active={active} /> },
    { id: 'sales', label: t('nav_sold'), icon: (active: boolean) => <SalesIcon active={active} /> },
    { id: 'reports', label: t('nav_report'), icon: (active: boolean) => <ReportIcon active={active} /> },
    { id: 'kirim-bazasi', label: t('nav_incoming'), icon: (active: boolean) => <KirimIcon active={active} /> },
    { id: 'debts', label: t('nav_debt'), icon: (active: boolean) => <DebtIcon active={active} /> },
    { id: 'settings', label: t('nav_settings'), icon: (active: boolean) => <SettingsIcon active={active} /> },
  ];

  const PHARMACY_ITEMS: NavItem[] = [
    { id: 'pharm-menu', label: t('home'), icon: (active: boolean) => <HomeIcon active={active} /> },
    { id: 'pharm-add', label: t('add'), icon: (active: boolean) => <AddIcon active={active} /> },
    { id: 'pharm-base', label: t('nav_products'), icon: (active: boolean) => <PillIcon active={active} /> },
    { id: 'pharm-scanner', label: t('nav_sell'), icon: (active: boolean) => <ScannerIcon active={active} /> },
    { id: 'pharm-sale', label: 'Sotuvlar', icon: (active: boolean) => <HistoryIcon active={active} /> },
    { id: 'pharm-kirim-base', label: 'Kirim', icon: (active: boolean) => <TrendingUpIcon active={active} /> },
    { id: 'pharm-hisobotlar', label: 'Hisobot', icon: (active: boolean) => <BarChart3Icon active={active} /> },
    { id: 'pharm-info', label: 'Ma\'lumot', icon: (active: boolean) => <SearchIcon active={active} /> },
    { id: 'pharm-qarzlar', label: 'Qarz', icon: (active: boolean) => <CreditCardIcon active={active} /> },
    { id: 'settings', label: t('nav_settings'), icon: (active: boolean) => <SettingsIcon active={active} /> },
  ];

  const ALL_ITEMS = isPharmacy ? PHARMACY_ITEMS : REGULAR_ITEMS;
  
  const FILTERED_ITEMS = ALL_ITEMS.filter(item => {
    // Buyurtmalar/Logistika faqat onlayn buyurtma moduli yoqilgan do'konda (adminda ham ko'rinmaydi).
    if (item.id === 'orders' || item.id === 'logistics') return hasOnlineOrders(user?.storeCategory);
    // Do'kon kategoriyasi: faqat ruxsat etilgan bo'limlar ko'rinadi.
    return isPageAllowed(user?.storeCategory, item.id);
  });

  const ITEM_W = 85; 
  const N = FILTERED_ITEMS.length;
  const INFINITE_ITEMS = [...FILTERED_ITEMS, ...FILTERED_ITEMS, ...FILTERED_ITEMS, ...FILTERED_ITEMS, ...FILTERED_ITEMS];

  const currentId = pathname.replace('/', '') || 'menu';

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const activeIndex = FILTERED_ITEMS.findIndex(i => i.id === currentId);
    const targetIndex = (N * 2) + activeIndex;
    const navWidth = scrollEl.offsetWidth;
    const centerOffset = (navWidth / 2) - (ITEM_W / 2);

    scrollEl.scrollLeft = (targetIndex * ITEM_W) - centerOffset;

    const handleScroll = () => {
      const x = scrollEl.scrollLeft;
      const maxScroll = (INFINITE_ITEMS.length * ITEM_W) - navWidth;

      if (x <= ITEM_W) {
        scrollEl.scrollLeft = (N * 2 * ITEM_W) + x;
      } else if (x >= maxScroll - ITEM_W) {
        scrollEl.scrollLeft = (N * 2 * ITEM_W) - (maxScroll - x);
      }
    };

    scrollEl.addEventListener('scroll', handleScroll);
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [currentId, N]);

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)';
  const centerBorder = isDark ? '#0f172a' : '#ffffff';

  return (
    <nav style={{
      position: 'fixed', bottom: 25, left: 12, right: 12, zIndex: 1000,
      background: bg, backdropFilter: 'blur(25px)', borderRadius: 40,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      boxShadow: '0 20px 50px rgba(0,0,0,0.4)', height: 80, overflow: 'visible'
    }}>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      
      <div ref={scrollRef} className="no-scrollbar" style={{
        display: 'flex', alignItems: 'center', height: '100%', overflowX: 'auto',
        scrollbarWidth: 'none' as any, borderRadius: 40, position: 'relative'
      }}>
        {INFINITE_ITEMS.map((item, idx) => {
          const isRealActiveSlot = (item.id === currentId && idx >= N * 2 && idx < N * 3);

          return (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => navigate(`/${item.id}`)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', background: 'none', border: 'none',
                width: ITEM_W, minWidth: ITEM_W, height: '100%',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                visibility: isRealActiveSlot ? 'hidden' : 'visible',
                opacity: item.id === currentId ? 0.2 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              {item.icon(false)}
              <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{
        position: 'absolute', left: '50%', top: -35, transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none'
      }}>
        <button
          onClick={(e) => {
            if (onScanClick) {
              onScanClick();
            } else {
              navigate(`/${currentId}`);
            }
          }}
          style={{
            width: 75, height: 75, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `6px solid ${centerBorder}`,
            boxShadow: '0 15px 35px rgba(99,102,241,0.6)',
            pointerEvents: 'all', cursor: 'pointer', outline: 'none'
          }}
        >
          {React.cloneElement(FILTERED_ITEMS.find(i => i.id === currentId)?.icon(true) as any, { 
    stroke: 'white', 
    width: 32, 
    height: 32 
})}
        </button>
        <span style={{
          fontSize: 11, fontWeight: 900, color: '#818cf8',
          textTransform: 'uppercase', marginTop: 8, letterSpacing: '1.2px',
        }}>
          {FILTERED_ITEMS.find(i => i.id === currentId)?.label}
        </span>
      </div>

      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 60, background: `linear-gradient(to right, ${isDark ? '#0f172a' : '#fff'}, transparent)`, pointerEvents: 'none', borderRadius: '40px 0 0 40px' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: `linear-gradient(to left, ${isDark ? '#0f172a' : '#fff'}, transparent)`, pointerEvents: 'none', borderRadius: '0 40px 40px 0' }} />
    </nav>
  );
};

const HomeIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ProductIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const AddIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const ScannerIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const SalesIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const ReportIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const KirimIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const OrdersIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>;
const DebtIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
const SettingsIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const PillIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>;
const HistoryIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const SearchIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const TrendingUpIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const BarChart3Icon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;
const CreditCardIcon = ({ active }: { active: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;

export default MobileBottomBar;
