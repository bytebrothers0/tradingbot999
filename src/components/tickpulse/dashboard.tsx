import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Plus, TrendingUp, ShieldCheck, Circle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTrading, money, signedMoney, riskRates, type Risk } from '@/lib/tickpulse-store';
import { TradingChart } from './chart';
import { PageHeading, AssistantPending } from './shell';
import { useBinance, getUSDTBalance, getTotalUSDEstimate, type BinanceKline } from '@/lib/binance-client';

export function Dashboard() {
  const { bots, toggleBot, setRisk, account } = useTrading();
  const { account: binanceAccount, connect, busy, useTestnet } = useBinance();
  const [period, setPeriod] = useState('1D');
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [klines, setKlines] = useState<BinanceKline[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const active = bots.filter((b) => b.active).length;
  const connected = !!binanceAccount;

  // Fetch prices and portfolio value when connected
  useEffect(() => {
    if (!connected || !binanceAccount) return;
    const fetchPrices = async () => {
      setLoadingPrices(true);
      try {
        // Get 24hr ticker for all symbols to estimate portfolio
        const res = await fetch(`${useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com'}/api/v3/ticker/24hr`);
        const data = await res.json();
        const priceMap: Record<string, number> = {};
        for (const t of data) {
          priceMap[t.symbol] = parseFloat(t.lastPrice);
        }
        setPrices(priceMap);
        const total = getTotalUSDEstimate(binanceAccount, priceMap);
        setPortfolioValue(total);
      } catch (e) {
        console.error('Failed to fetch prices:', e);
      } finally {
        setLoadingPrices(false);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [connected, binanceAccount, useTestnet]);

  // Fetch klines for equity chart
  useEffect(() => {
    if (!connected) return;
    const fetchKlines = async () => {
      try {
        const res = await fetch(
          `${useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com'}/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100`
        );
        const data = await res.json();
        setKlines(
          data.map((k: any) => ({
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
          }))
        );
      } catch (e) {
        console.error('Failed to fetch klines:', e);
      }
    };
    fetchKlines();
  }, [useTestnet]);

  return (
    <>
      <PageHeading
        title="Command center"
        subtitle="Your markets. Your strategies. One clear view."
      >
        <AssistantPending />
        <Button asChild>
          <Link to="/bots">
            <Plus />Create bot
          </Link>
        </Button>
      </PageHeading>
      <section className="balance-band">
        <div className="balance-primary">
          <span className="metric-label">
            Portfolio value{' '}
            <span className="small-tag">
              {connected ? (useTestnet ? 'TESTNET' : 'LIVE') : 'NOT CONNECTED'}
            </span>
          </span>
          <div className="balance-value">
            {connected
              ? portfolioValue !== null
                ? money(portfolioValue)
                : loadingPrices
                ? 'Loading…'
                : '—'
              : money(0)}
            <span>USDT</span>
          </div>
          <div className="balance-change">
            {connected && portfolioValue !== null ? (
              <>
                <TrendingUp size={16} />{' '}
                <span>Live from Binance {useTestnet ? '(Testnet)' : ''}</span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Connect Binance in Wallet to see live portfolio
              </span>
            )}
          </div>
        </div>
        <div className="balance-detail">
          <span className="metric-label">USDT balance</span>
          <strong>{connected ? money(getUSDTBalance(binanceAccount!)) : '—'}</strong>
          <span className="detail-note">Available stablecoin</span>
        </div>
        <div className="balance-detail">
          <span className="metric-label">Bot allocation</span>
          <strong>—</strong>
          <span className="detail-note">
            <span className="status-dot" />{active} active strategies
          </span>
        </div>
        <div className="balance-detail risk-summary">
          <ShieldCheck size={22} />
          <span className="metric-label">Risk protection</span>
          <strong className="text-primary">Enabled</strong>
          <span className="detail-note">Global drawdown guard</span>
        </div>
      </section>
      <section className="chart-panel">
        <div className="panel-toolbar">
          <div>
            <h2>Portfolio equity (BTCUSDT 1h)</h2>
            <span className="chart-subtitle">
              {connected
                ? 'Live chart from Binance'
                : 'No data — connect Binance'}
            </span>
          </div>
          <div className="segment-control">
            {['1D', '1W', '1M', 'ALL'].map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'secondary' : 'ghost'}
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
        <TradingChart period={period} klines={klines} />
      </section>
      <div className="section-heading">
        <div>
          <h2>Multi-asset bots <span className="count-badge">{bots.length}</span></h2>
          <p>Intelligence across every market.</p>
        </div>
        <span className="market-state">
          <span className="status-dot" />{active} active{' '}
          <span className="text-muted-foreground">
            · {bots.length - active} paused
          </span>
        </span>
      </div>
      <div className="bot-grid">
        {bots.map((bot) => (
          <article
            className={`bot-card ${!bot.active ? 'bot-paused' : ''}`}
            key={bot.pair}
          >
            <div className="bot-card-top">
              <div className={`asset-symbol asset-${bot.group}`}>
                {bot.symbol}
              </div>
              <div className="bot-title">
                <h3>{bot.pair}</h3>
                <span>{bot.name}</span>
              </div>
              <Switch
                checked={bot.active}
                onCheckedChange={(checked) => toggleBot(bot.pair, checked)}
                aria-label={`${bot.active ? 'Pause' : 'Start'} ${bot.pair} bot`}
              />
            </div>
            <div className="bot-strategy">
              <span>
                <Circle size={7} fill="currentColor" />{bot.strategy}
              </span>
              <span className={bot.active ? 'text-primary' : 'text-muted-foreground'}>
                {bot.active ? 'Running' : 'Paused'}
              </span>
            </div>
            <div className="bot-profit">
              <span>Net P&L</span>
              <strong className={bot.pnl >= 0 ? 'text-primary' : 'text-destructive'}>
                {bot.pnl === 0 ? '—' : signedMoney(bot.pnl)}
                <ArrowUpRight size={15} />
              </strong>
            </div>
            <div className="bot-card-bottom">
              <span>
                {bot.timeframe} <span className="text-muted-foreground">·</span>{' '}
                {bot.amount ? money(bot.amount) : '—'}
              </span>
              <select
                className={`risk-select risk-${bot.risk.toLowerCase()}`}
                value={bot.risk}
                aria-label={`${bot.pair} risk preset`}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v in riskRates) setRisk(bot.pair, v as Risk);
                }}
              >
                {Object.keys(riskRates).map((risk) => (
                  <option key={risk}>{risk}</option>
                ))}
              </select>
            </div>
          </article>
        ))}
        {bots.length === 0 && (
          <div className="bot-grid-empty">
            <p>No bots configured yet.</p>
            <Button asChild>
              <Link to="/bots">Create your first bot</Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}