import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings, initialBots, riskRates, useTrading } from '@/lib/tickpulse-store';
describe('TickPulse trading rules', () => {
  beforeEach(() => useTrading.setState({ bots: initialBots.map(b => ({...b})), settings: {...defaultSettings}, stopped: false }));
  it('supports exactly the eight requested instruments', () => { expect(initialBots.map(b => b.pair).sort()).toEqual(['EUR/USD','GBP/USD','XAU/USD','XAG/USD','BTC/USD','ETH/USD','US30','USTEC'].sort()); });
  it('uses 0.5% risk for Conservative', () => { expect(riskRates.Conservative).toBe(0.5); });
  it('uses 1% risk for Optimal', () => { expect(riskRates.Optimal).toBe(1); });
  it('uses 2% risk for Aggressive', () => { expect(riskRates.Aggressive).toBe(2); });
  it('defaults daily drawdown to 5%', () => { expect(useTrading.getState().settings.dailyDrawdown).toBe(5); });
  it('defaults account drawdown to 15%', () => { expect(useTrading.getState().settings.accountDrawdown).toBe(15); });
  it('immediately stops every demo bot', () => { expect(useTrading.getState().bots.some(b => b.active)).toBe(true); useTrading.getState().stopAll(); expect(useTrading.getState().bots.filter(b => b.active)).toHaveLength(0); expect(useTrading.getState().stopped).toBe(true); });
  it('launches a bot using its selected configuration', () => { useTrading.getState().launchBot({pair:'XAU/USD', strategy:'AI Grid', risk:'Conservative', amount:5000,timeframe:'5m'}); expect(useTrading.getState().bots.find(b => b.pair === 'XAU/USD')).toMatchObject({active:true,strategy:'AI Grid',risk:'Conservative',amount:5000,timeframe:'5m'}); });
});
