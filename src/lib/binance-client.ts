import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BinanceAccount {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: BinanceBalance[];
  permissions: string[];
}

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface BinanceOrder {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  fills: BinanceFill[];
}

export interface BinanceFill {
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  tradeId: number;
}

export interface BinanceTrade {
  id: number;
  orderId: number;
  orderListId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}

const PROXY_URL = '/.netlify/functions/binance';

interface ProxyRequest {
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  params: Record<string, string>;
  testnet?: boolean;
  apiKey?: string;
  apiSecret?: string;
}

async function proxyFetch(
  path: string,
  apiKey: string | undefined,
  apiSecret: string | undefined,
  useTestnet: boolean,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  params: Record<string, string> = {}
): Promise<any> {
  const body: any = {
    path: `/api/v3${path}`,
    method,
    params,
    testnet: useTestnet,
  };
  if (apiKey) body.apiKey = apiKey;
  if (apiSecret) body.apiSecret = apiSecret;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ msg: res.statusText }));
    throw new Error(err.error ?? err.msg ?? `Proxy error ${res.status}`);
  }
  return res.json();
}

interface BinanceState {
  apiKey: string;
  apiSecret: string;
  useTestnet: boolean;
  account: BinanceAccount | null;
  error: string | null;
  busy: boolean;
  corsWarning: boolean;
  setCredentials: (apiKey: string, apiSecret: string, useTestnet?: boolean) => void;
  disconnect: () => void;
  connect: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  placeOrder: (symbol: string, side: 'BUY' | 'SELL', quantity: string, price?: string) => Promise<BinanceOrder>;
  getTrades: (symbol: string) => Promise<BinanceTrade[]>;
  getKlines: (symbol: string, interval: string, limit?: number) => Promise<BinanceKline[]>;
  getExchangeInfo: () => Promise<any>;
}

// Read defaults from env (Vite exposes import.meta.env.VITE_* at build time)
const ENV_API_KEY = import.meta.env.VITE_BINANCE_API_KEY ?? '';
const ENV_API_SECRET = import.meta.env.VITE_BINANCE_API_SECRET ?? '';
const ENV_TESTNET = import.meta.env.VITE_BINANCE_TESTNET === 'false' ? false : true;

export const useBinance = create<BinanceState>()(
  persist(
    (set, get) => ({
      apiKey: ENV_API_KEY,
      apiSecret: ENV_API_SECRET,
      useTestnet: ENV_TESTNET,
      account: null,
      error: null,
      busy: false,
      corsWarning: false,

      setCredentials: (apiKey, apiSecret, useTestnet = true) =>
        set({ apiKey, apiSecret, useTestnet, error: null, account: null, corsWarning: false }),

      disconnect: () =>
        set({ apiKey: '', apiSecret: '', account: null, error: null, corsWarning: false }),

      connect: async () => {
        const { apiKey, apiSecret, useTestnet } = get();
        if (!apiKey || !apiSecret) {
          set({ error: 'API Key and Secret required' });
          return;
        }
        set({ busy: true, error: null });
        try {
          const account = await proxyFetch('/account', apiKey, apiSecret, useTestnet);
          set({ account, busy: false, corsWarning: false });
        } catch (e) {
          const msg = (e as Error).message;
          set({
            error: msg,
            busy: false,
            account: null,
            corsWarning: false,
          });
          throw e;
        }
      },

      refreshAccount: async () => {
        const { apiKey, apiSecret, useTestnet } = get();
        if (!apiKey || !apiSecret) return;
        try {
          const account = await proxyFetch('/account', apiKey, apiSecret, useTestnet);
          set({ account, corsWarning: false });
        } catch (e) {
          set({ error: (e as Error).message, corsWarning: false });
        }
      },

      placeOrder: async (symbol, side, quantity, price) => {
        const { apiKey, apiSecret, useTestnet } = get();
        if (!apiKey || !apiSecret) throw new Error('Not connected');
        const params: Record<string, string> = {
          symbol,
          side,
          type: price ? 'LIMIT' : 'MARKET',
          quantity,
          ...(price ? { price, timeInForce: 'GTC' } : {}),
        };
        return proxyFetch('/order', apiKey, apiSecret, useTestnet, 'POST', params);
      },

      getTrades: async (symbol) => {
        const { apiKey, apiSecret, useTestnet } = get();
        if (!apiKey || !apiSecret) throw new Error('Not connected');
        return proxyFetch('/myTrades', apiKey, apiSecret, useTestnet, 'GET', { symbol });
      },

      getKlines: async (symbol, interval, limit = 500) => {
        const { useTestnet } = get();
        const data = await proxyFetch('/klines', undefined, undefined, useTestnet, 'GET', {
          symbol,
          interval,
          limit: limit.toString(),
        });
        return data.map((k: any) => ({
          openTime: k[0],
          open: k[1],
          high: k[2],
          low: k[3],
          close: k[4],
          volume: k[5],
          closeTime: k[6],
          quoteAssetVolume: k[7],
          numberOfTrades: k[8],
          takerBuyBaseAssetVolume: k[9],
          takerBuyQuoteAssetVolume: k[10],
          ignore: k[11],
        }));
      },

      getExchangeInfo: async () => {
        const { useTestnet } = get();
        return proxyFetch('/exchangeInfo', undefined, undefined, useTestnet, 'GET', {});
      },
    }),
    {
      name: 'binance-creds',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        apiSecret: state.apiSecret,
        useTestnet: state.useTestnet,
      }),
    }
  )
);

export function formatBalance(free: string, locked: string): number {
  return parseFloat(free) + parseFloat(locked);
}

export function getNonZeroBalances(account: BinanceAccount): BinanceBalance[] {
  return account.balances.filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
}

export function getUSDTBalance(account: BinanceAccount): number {
  const usdt = account.balances.find((b) => b.asset === 'USDT');
  return usdt ? formatBalance(usdt.free, usdt.locked) : 0;
}

export function getTotalUSDEstimate(account: BinanceAccount, prices: Record<string, number>): number {
  let total = 0;
  for (const b of account.balances) {
    const qty = formatBalance(b.free, b.locked);
    if (qty === 0) continue;
    if (b.asset === 'USDT') {
      total += qty;
    } else if (prices[`${b.asset}USDT`]) {
      total += qty * prices[`${b.asset}USDT`];
    } else if (prices[`${b.asset}BUSD`]) {
      total += qty * prices[`${b.asset}BUSD`];
    }
  }
  return total;
}