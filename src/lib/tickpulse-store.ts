import { create } from 'zustand';

export const riskRates = { Conservative: 0.5, Optimal: 1, Aggressive: 2 } as const;
export type Risk = keyof typeof riskRates;
export type Strategy = 'AI Auto' | 'AI Grid' | 'AI DCA' | 'AI Scalper';
export interface Bot { pair: string; name: string; group: string; symbol: string; strategy: Strategy; risk: Risk; pnl: number; active: boolean; amount: number; timeframe: string; }
export const initialBots: Bot[] = [];
export const defaultSettings = { dailyDrawdown: 5, accountDrawdown: 15, closePositions: true, autoTrade: true, switchAccounts: true, dailySummary: false, clearCookies: true };
export type Settings = typeof defaultSettings;
interface State {
  bots: Bot[]; account: string | null; settings: Settings; stopped: boolean;
  setAccount: (account: string | null) => void;
  toggleBot: (pair: string, active: boolean) => void;
  setRisk: (pair: string, risk: Risk) => void;
  launchBot: (bot: Pick<Bot, 'pair' | 'strategy' | 'risk' | 'amount' | 'timeframe'>) => void;
  stopAll: () => void;
  setSettings: (settings: Settings) => void;
}
export const useTrading = create<State>((set) => ({
  bots: [], account: null, settings: { ...defaultSettings }, stopped: false,
  setAccount: account => set({ account }),
  toggleBot: (pair, active) => set(s => ({ bots: s.bots.map(b => b.pair === pair ? { ...b, active } : b), stopped: active ? false : s.stopped })),
  setRisk: (pair, risk) => set(s => ({ bots: s.bots.map(b => b.pair === pair ? { ...b, risk } : b) })),
  launchBot: bot => set(s => ({ bots: [...s.bots, { ...bot, active: true, pnl: 0, name: '', group: '', symbol: '' }], stopped: false })),
  stopAll: () => set(s => ({ bots: s.bots.map(b => ({ ...b, active: false })), stopped: true })),
  setSettings: settings => set({ settings }),
}));
export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
export const signedMoney = (n: number) => `${n >= 0 ? '+' : '−'}${money(Math.abs(n))}`;
