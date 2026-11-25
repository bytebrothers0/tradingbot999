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

async function signParams(params: Record<string, string>, secret: string): Promise<string> {
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(queryString);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const getBaseUrl = (testnet: boolean) => (testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com');

async function directFetch(
  baseUrl: string,
  path: string,
  apiKey: string | undefined,
  apiSecret: string | undefined,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  params: Record<string, string> = {}
): Promise<any> {
  const url = new URL(`${baseUrl}/api/v3${path}`);
  if (method === 'GET' || method === 'DELETE') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = {};
  if (apiKey) headers['X-MBX-APIKEY'] = apiKey;
  if (method === 'POST') headers['Content-Type'] = 'application/x-www-form-urlencoded';

  const body = method === 'POST' ? new URLSearchParams(params).toString() : undefined;

  const res = await fetch(url.toString(), { method, headers, body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ msg: res.statusText }));
    throw new Error(err.msg ?? `Binance error ${res.status}`);
  }
  return res.json();
}

async function signedDirectFetch(
  baseUrl: string,
  path: string,
  apiKey: string,
  apiSecret: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  params: Record<string, string> = {}
): Promise<any> {
  const timestamp = Date.now().toString();
  const allParams = { ...params, timestamp };
  const signature = await signParams(allParams, apiSecret);
  return directFetch(baseUrl, path, apiKey, apiSecret, method, { ...allParams, signature });
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
          const baseUrl = getBaseUrl(useTestnet);
          const account = await signedDirectFetch(baseUrl, '/account', apiKey, apiSecret);
          set({ account, busy: false, corsWarning: false });
        } catch (e) {
          const msg = (e as Error).message;
          const isCORS = msg.includes('Failed to fetch') || msg.includes('CORS') || msg.includes('NetworkError');
          set({
            error: isCORS
              ? 'CORS blocked. Install a CORS browser extension (see Wallet page) or use a local proxy.'
              : msg,
            busy: false,
            account: null,
            corsWarning: isCORS,
          });
          throw e;
        }
      },

      refreshAccount: async () => {
        const { apiKey, apiSecret, useTestnet } = get();
        if (!apiKey || !apiSecret) return;
        try {
          const baseUrl = getBaseUrl(useTestnet);
          const account = await signedDirectFetch(baseUrl, '/account', apiKey, apiSecret);
          set({ account, corsWarning: false });
        } catch (e) {
          const msg = (e as Error).message;
          const isCORS = msg.includes('Failed to fetch') || msg.includes('CORS') || msg.includes('NetworkError');
          set({ error: msg, corsWarning: isCORS });
        }
      },

      placeOrder: async (symbol, side, quantity, price) => {
        const { apiKey, apiSecret, useTestnet } = get();
        if (!apiKey || !apiSecret) throw new Error('Not connected');
        const baseUrl = getBaseUrl(useTestnet);
        const params: Record<string, string> = {
          symbol,
          side,
          type: price ? 'LIMIT' : 'MARKET',
          quantity,
          ...(price ? { price, timeInForce: 'GTC' } : {}),
        };
        return signedDirectFetch(baseUrl, '/order', apiKey, apiSecret, 'POST', params);
      },

      getTrades: async (symbol) => {
        const { apiKey, apiSecret, useTestnet } = get();
        if (!apiKey || !apiSecret) throw new Error('Not connected');
        const baseUrl = getBaseUrl(useTestnet);
        return signedDirectFetch(baseUrl, '/myTrades', apiKey, apiSecret, 'GET', { symbol });
      },

      getKlines: async (symbol, interval, limit = 500) => {
        const { useTestnet } = get();
        const baseUrl = getBaseUrl(useTestnet);
        const data = await directFetch(baseUrl, '/klines', undefined, undefined, 'GET', {
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
        const baseUrl = getBaseUrl(useTestnet);
        return directFetch(baseUrl, '/exchangeInfo', undefined, undefined, 'GET', {});
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