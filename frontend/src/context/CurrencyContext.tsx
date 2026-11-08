import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { money as formatMoney } from '@/lib/format';

export type DisplayCurrency = 'USD' | 'EUR';

interface ExchangeRate {
  usdToEur: number;
  date: string;
  fetchedAt: number;
}

interface CurrencyState {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  usdToEur: number | null;
  rateDate: string | null;
  rateError: string | null;
  formatMoney: (amount?: number | null, sourceCurrency?: string) => string;
}

const RATE_CACHE_KEY = 'skillconnect-usd-eur-rate';
const CURRENCY_KEY = 'skillconnect-display-currency';
const CurrencyContext = createContext<CurrencyState | null>(null);

function isDisplayCurrency(value: string | null): value is DisplayCurrency {
  return value === 'USD' || value === 'EUR';
}

function parseRateCache(value: string): ExchangeRate {
  const parsed: unknown = JSON.parse(value);
  if (
    typeof parsed !== 'object'
    || parsed === null
    || !('usdToEur' in parsed)
    || !('date' in parsed)
    || !('fetchedAt' in parsed)
    || typeof parsed.usdToEur !== 'number'
    || !Number.isFinite(parsed.usdToEur)
    || parsed.usdToEur <= 0
    || typeof parsed.date !== 'string'
    || typeof parsed.fetchedAt !== 'number'
  ) {
    throw new Error('Saved exchange rate is invalid.');
  }
  return {
    usdToEur: parsed.usdToEur,
    date: parsed.date,
    fetchedAt: parsed.fetchedAt,
  };
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>('USD');
  const [usdToEur, setUsdToEur] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_KEY);
      if (isDisplayCurrency(saved)) setCurrencyState(saved);
    } catch (error) {
      setRateError(`Could not load your saved currency preference: ${error instanceof Error ? error.message : String(error)}`);
    }

    let active = true;
    const controller = new AbortController();
    let cached: ExchangeRate | null = null;
    try {
      const rawCache = localStorage.getItem(RATE_CACHE_KEY);
      if (rawCache) {
        cached = parseRateCache(rawCache);
        setUsdToEur(cached.usdToEur);
        setRateDate(cached.date);
      }
    } catch (error) {
      setRateError(`Could not load the saved EUR/USD exchange rate: ${error instanceof Error ? error.message : String(error)}`);
    }

    async function refreshRate() {
      try {
        const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Exchange-rate service returned ${response.status}.`);
        const data: unknown = await response.json();
        if (
          typeof data !== 'object'
          || data === null
          || !('rates' in data)
          || typeof data.rates !== 'object'
          || data.rates === null
          || !('EUR' in data.rates)
          || typeof data.rates.EUR !== 'number'
          || !Number.isFinite(data.rates.EUR)
          || data.rates.EUR <= 0
          || !('date' in data)
          || typeof data.date !== 'string'
        ) {
          throw new Error('Exchange-rate service returned invalid data.');
        }

        const nextRate: ExchangeRate = {
          usdToEur: data.rates.EUR,
          date: data.date,
          fetchedAt: Date.now(),
        };
        if (!active) return;
        setUsdToEur(nextRate.usdToEur);
        setRateDate(nextRate.date);
        setRateError(null);
        try {
          localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(nextRate));
        } catch (error) {
          setRateError(`The live rate is available for this session, but could not be cached: ${error instanceof Error ? error.message : String(error)}`);
        }
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        const reason = error instanceof Error ? error.message : String(error);
        setRateError(cached
          ? `Live exchange-rate update failed (${reason}); using the saved rate from ${cached.date}.`
          : `Live EUR/USD conversion is unavailable (${reason}). Check your connection and reload.`);
      }
    }

    void refreshRate();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const setCurrency = useCallback((next: DisplayCurrency) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(CURRENCY_KEY, next);
      setRateError((current) => current?.startsWith('Could not load your saved currency preference:') ? null : current);
    } catch (error) {
      setRateError(`Could not save your currency preference: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  const money = useCallback(
    (amount?: number | null, sourceCurrency = 'USD') => formatMoney(amount, sourceCurrency, currency, usdToEur),
    [currency, usdToEur],
  );
  const value = useMemo<CurrencyState>(
    () => ({ currency, setCurrency, usdToEur, rateDate, rateError, formatMoney: money }),
    [currency, setCurrency, usdToEur, rateDate, rateError, money],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used inside CurrencyProvider');
  return context;
}

export function useMoney() {
  return useCurrency().formatMoney;
}
