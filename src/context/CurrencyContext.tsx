import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type CurrencyType = 'UZS' | 'USD' | 'RUB';

interface ExchangeRates {
  USD: number;
  RUB: number;
}

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  rates: ExchangeRates;
  convert: (amount: number, from?: CurrencyType, to?: CurrencyType) => number;
  format: (amount: number, showSymbol?: boolean) => string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyType>(() => {
    return (localStorage.getItem('selectedCurrency') as CurrencyType) || 'UZS';
  });

  const [rates, setRates] = useState<ExchangeRates>({
    USD: 12850, // Default fallback
    RUB: 140,   // Default fallback
  });
  const [loading, setLoading] = useState(true);

  const setCurrency = (newCurrency: CurrencyType) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('selectedCurrency', newCurrency);
    // Custom event to sync across tabs if needed
    window.dispatchEvent(new Event('currencyChange'));
  };

  const fetchRates = async () => {
    try {
      const response = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
      if (!response.ok) throw new Error('Failed to fetch rates');
      const data = await response.json();
      
      const usdRate = data.find((item: any) => item.Ccy === 'USD')?.Rate;
      const rubRate = data.find((item: any) => item.Ccy === 'RUB')?.Rate;

      if (usdRate && rubRate) {
        setRates({
          USD: parseFloat(usdRate),
          RUB: parseFloat(rubRate),
        });
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    // Refresh rates every hour
    const interval = setInterval(fetchRates, 3600000);
    return () => clearInterval(interval);
  }, []);

  const convert = useCallback((amount: number, from: CurrencyType = 'UZS', to: CurrencyType = currency) => {
    if (from === to) return amount;

    // Convert from source to UZS first
    let amountInUZS = amount;
    if (from === 'USD') amountInUZS = amount * rates.USD;
    if (from === 'RUB') amountInUZS = amount * rates.RUB;

    // Convert from UZS to target
    if (to === 'UZS') return amountInUZS;
    if (to === 'USD') return amountInUZS / rates.USD;
    if (to === 'RUB') return amountInUZS / rates.RUB;

    return amount;
  }, [currency, rates]);

  const format = useCallback((amount: number, showSymbol = true) => {
    const converted = convert(amount, 'UZS', currency);
    
    let formatted = '';
    if (currency === 'UZS') {
      formatted = new Intl.NumberFormat('uz-UZ').format(Math.round(converted));
      return showSymbol ? `${formatted} so'm` : formatted;
    } else if (currency === 'USD') {
      formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
      return showSymbol ? `$ ${formatted}` : formatted;
    } else if (currency === 'RUB') {
      formatted = new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
      return showSymbol ? `${formatted} ₽` : formatted;
    }
    
    return converted.toString();
  }, [currency, convert]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
};
