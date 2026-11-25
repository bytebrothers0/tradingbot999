import { create } from 'zustand';
export const BRIDGE_URL = 'http://127.0.0.1:8765';
export interface Mt5Account { login: number; server: string; name: string; currency: string; balance: number; equity: number; leverage: number; demo: boolean; }
async function call<T>(path: string, code: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BRIDGE_URL}${path}`, { method: body ? 'POST' : 'GET', headers: { 'X-Pairing-Code': code, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch { throw new Error('Bridge not found. Start the TickPulse bridge on this Windows PC and keep its window open.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Bridge error ${res.status}`);
  return data as T;
}
interface BridgeState {
  code: string; account: Mt5Account | null; error: string | null; busy: boolean;
  connect: (code: string) => Promise<void>; disconnect: () => void;
  testTrade: () => Promise<{ ticket: number }>; closeAll: () => Promise<number>;
}
export const useBridge = create<BridgeState>((set, get) => ({
  code: '', account: null, error: null, busy: false,
  connect: async code => {
    set({ busy: true, error: null });
    try { const account = await call<Mt5Account>('/account', code.trim()); set({ account, code: code.trim() }); }
    catch (e) { set({ error: (e as Error).message, account: null }); throw e; }
    finally { set({ busy: false }); }
  },
  disconnect: () => set({ account: null, code: '', error: null }),
  testTrade: () => call<{ ticket: number }>('/order', get().code, { pair: 'EUR/USD', side: 'buy', volume: 0.01 }),
  closeAll: async () => (await call<{ closed: number }>('/close-all', get().code, {})).closed,
}));
