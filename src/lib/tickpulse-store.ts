import { create } from 'zustand';

export const riskRates = { Conservative: 0.5, Optimal: 1, Aggressive: 2 } as const;
export type Risk = keyof typeof riskRates;
export type Strategy = 'AI Auto' | 'AI Grid' | 'AI DCA' | 'AI Scalper';
export interface Bot { pair: string; name: string; group: string; symbol: string; strategy: Strategy; risk: Risk; pnl: number; active: boolean; amount: number; timeframe: string; }
export const initialBots: Bot[] = [
  { pair: 'EUR/USD', name: 'Euro / US Dollar', group: 'forex', symbol: '€', strategy: 'AI DCA', risk: 'Conservative', pnl: 124.85, active: true, amount: 3000, timeframe: '15m' },
  { pair: 'XAU/USD', name: 'Gold / US Dollar', group: 'gold', symbol: 'Au', strategy: 'AI Grid', risk: 'Optimal', pnl: 224.34, active: true, amount: 5000, timeframe: '5m' },
  { pair: 'BTC/USD', name: 'Bitcoin / US Dollar', group: 'crypto', symbol: '₿', strategy: 'AI Auto', risk: 'Optimal', pnl: 186.20, active: true, amount: 4000, timeframe: '15m' },
  { pair: 'US30', name: 'Dow Jones Industrial', group: 'indices', symbol: '30', strategy: 'AI Grid', risk: 'Optimal', pnl: 87.42, active: true, amount: 2500, timeframe: '5m' },
  { pair: 'GBP/USD', name: 'Pound / US Dollar', group: 'forex', symbol: '£', strategy: 'AI Scalper', risk: 'Aggressive', pnl: -32.18, active: true, amount: 2000, timeframe: '1m' },
  { pair: 'XAG/USD', name: 'Silver / US Dollar', group: 'silver', symbol: 'Ag', strategy: 'AI DCA', risk: 'Conservative', pnl: 28.60, active: false, amount: 1500, timeframe: '15m' },
  { pair: 'ETH/USD', name: 'Ethereum / US Dollar', group: 'ethereum', symbol: 'Ξ', strategy: 'AI Auto', risk: 'Optimal', pnl: 41.27, active: true, amount: 3000, timeframe: '1H' },
  { pair: 'USTEC', name: 'Nasdaq 100', group: 'indices', symbol: 'NQ', strategy: 'AI Scalper', risk: 'Conservative', pnl: -18.00, active: false, amount: 2000, timeframe: '5m' },
];
export const defaultSettings = { dailyDrawdown: 5, accountDrawdown: 15, closePositions: true, autoTrade: true, switchAccounts: true, dailySummary: false, clearCookies: true };
export type Settings = typeof defaultSettings;
interface State {
  bots: Bot[]; account: string; settings: Settings; stopped: boolean;
  setAccount: (account: string) => void;
  toggleBot: (pair: string, active: boolean) => void;
  setRisk: (pair: string, risk: Risk) => void;
  launchBot: (bot: Pick<Bot, 'pair' | 'strategy' | 'risk' | 'amount' | 'timeframe'>) => void;
  stopAll: () => void;
  setSettings: (settings: Settings) => void;
}
export const useTrading = create<State>((set) => ({
  bots: initialBots.map(b => ({ ...b })), account: 'Standard', settings: { ...defaultSettings }, stopped: false,
  setAccount: account => set({ account }),
  toggleBot: (pair, active) => set(s => ({ bots: s.bots.map(b => b.pair === pair ? { ...b, active } : b), stopped: active ? false : s.stopped })),
  setRisk: (pair, risk) => set(s => ({ bots: s.bots.map(b => b.pair === pair ? { ...b, risk } : b) })),
  launchBot: bot => set(s => ({ bots: s.bots.map(b => b.pair === bot.pair ? { ...b, ...bot, active: true } : b), stopped: false })),
  stopAll: () => set(s => ({ bots: s.bots.map(b => ({ ...b, active: false })), stopped: true })),
  setSettings: settings => set({ settings }),
}));
export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
export const signedMoney = (n: number) => `${n >= 0 ? '+' : '−'}${money(Math.abs(n))}`;
