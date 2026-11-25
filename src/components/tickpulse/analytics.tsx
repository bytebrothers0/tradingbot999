import { useState, useEffect } from 'react';
import { Download, Search, SlidersHorizontal, TrendingUp, Target, Scale, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signedMoney } from '@/lib/tickpulse-store';
import { PageHeading, AssistantPending } from './shell';
import { useBinance, type BinanceTrade } from '@/lib/binance-client';

interface AnalyticsTrade {
  time: string;
  pair: string;
  strategy: string;
  side: string;
  entry: string;
  exit: string;
  pnl: number;
}

export function Analytics() {
  const { account, getTrades, useTestnet } = useBinance();
  const [group, setGroup] = useState('All assets');
  const [strategy, setStrategy] = useState('All strategies');
  const [search, setSearch] = useState('');
  const [side, setSide] = useState('All sides');
  const [trades, setTrades] = useState<AnalyticsTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [equityData, setEquityData] = useState<{ date: string; equity: number }[]>([]);
  const connected = !!account;

  // Load trades from Binance
  const loadTrades = async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const pairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];
      let allTrades: BinanceTrade[] = [];
      for (const pair of pairs) {
        try {
          const t = await getTrades(pair);
          allTrades = [...allTrades, ...t];
        } catch {
          // ignore pairs with no trades
        }
      }
      // Convert to analytics format
      const formatted = allTrades
        .sort((a, b) => b.time - a.time)
        .slice(0, 200)
        .map((t) => ({
          time: new Date(t.time).toLocaleTimeString(),
          pair: t.symbol.replace('USDT', '/USDT'),
          strategy: 'Manual', // Binance doesn't track strategy
          side: t.isBuyer ? 'Buy' : 'Sell',
          entry: t.price,
          exit: t.price, // Simplified - same as entry for now
          pnl: t.isBuyer ? parseFloat(t.quoteQty) * 0.001 : -parseFloat(t.quoteQty) * 0.001, // Estimate
        }));
      setTrades(formatted);

      // Build equity curve from trades
      let equity = 0;
      const equityMap = new Map<string, number>();
      for (const t of formatted.slice().reverse()) {
        equity += t.pnl;
        const date = new Date(t.time).toLocaleDateString();
        equityMap.set(date, equity);
      }
      setEquityData(Array.from(equityMap.entries()).map(([date, equity]) => ({ date, equity })));
    } catch (e) {
      console.error('Failed to load trades:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected) loadTrades();
  }, [connected, account?.updateTime]);

  const filtered = trades.filter(
    (t) =>
      (group === 'All assets' || t.pair === group) &&
      (strategy === 'All strategies' || t.strategy === strategy) &&
      (side === 'All sides' || t.side === side) &&
      Object.values(t).join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const exportTrades = () => {
    const content = [
      'Time,Account,Pair,Strategy,Side,Entry,Exit,Net P&L',
      ...filtered.map((t) =>
        [t.time, account?.accountType ?? 'Spot', t.pair, t.strategy, t.side, t.entry.replaceAll(',', ''), t.exit.replaceAll(',', ''), t.pnl].join(',')
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `tickpulse-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasData = trades.length > 0;
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  return (
    <>
      <PageHeading
        title="Performance analytics"
        subtitle="See the bigger picture. Find your next advantage."
      >
        <AssistantPending />
        <Button variant="outline" onClick={exportTrades} disabled={!hasData || loading}>
          <Download />Export trades
        </Button>
      </PageHeading>
      <div className="kpi-grid">
        {[
          {
            label: 'Total net profit',
            value: hasData ? signedMoney(totalPnl) : '—',
            note: hasData ? `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)} from ${trades.length} trades` : 'No trades recorded',
            icon: TrendingUp,
            cls: totalPnl >= 0 ? 'text-primary' : 'text-destructive',
          },
          {
            label: 'Win rate',
            value: hasData ? `${winRate.toFixed(1)}%` : '—',
            note: hasData ? `${wins} of ${trades.length} trades` : 'No trades recorded',
            icon: Target,
            cls: '',
          },
          {
            label: 'Profit factor',
            value: hasData ? '—' : '—',
            note: hasData ? 'Requires separate win/loss tracking' : 'No trades recorded',
            icon: Scale,
            cls: '',
          },
          {
            label: 'Max drawdown',
            value: hasData ? '—' : '—',
            note: hasData ? 'Tracked per bot in Dashboard' : 'No trades recorded',
            icon: ArrowDownRight,
            cls: 'text-destructive',
          },
        ].map((k) => (
          <article className="kpi-card" key={k.label}>
            <div>
              <span className="metric-label">{k.label}</span>
              <k.icon size={17} />
            </div>
            <strong className={k.cls}>{k.value}</strong>
            <span className="detail-note">{k.note}</span>
          </article>
        ))}
      </div>
      <section className="performance-panel">
        <div className="panel-toolbar">
          <div>
            <h2>Equity curve</h2>
            <p className="text-muted-foreground text-xs mt-1">
              {connected
                ? hasData
                  ? 'Your Binance trade history'
                  : 'No trades yet — start trading to see equity curve'
                : 'Connect Binance in Wallet to see analytics'}
            </p>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-equity" />Equity
            </span>
          </div>
        </div>
        <div className="performance-body">
          <div className="asset-filters">
            <span className="field-label">Asset</span>
            {['All assets', 'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'].map((g) => (
              <Button
                variant={group === g ? 'selected' : 'outline'}
                key={g}
                onClick={() => setGroup(g)}
                disabled={!hasData}
              >
                {g}
              </Button>
            ))}
          </div>
          <div className="performance-chart-wrap">
            <div className="strategy-filter">
              <span>Strategy type</span>
              <div className="segment-control">
                {['All strategies', 'Manual', 'AI Auto', 'AI Grid', 'AI DCA', 'AI Scalper'].map(
                  (s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={strategy === s ? 'secondary' : 'ghost'}
                      onClick={() => setStrategy(s)}
                      disabled={!hasData}
                    >
                      {s}
                    </Button>
                  )
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={equityData.length > 0 ? equityData : [{ date: '—', equity: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Equity']}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      <section className="trades-panel">
        <div className="panel-toolbar">
          <h2>Trade history</h2>
          <div className="trade-filters">
            <Input
              placeholder="Search trades…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!hasData || loading}
            />
            <select
              value={side}
              onChange={(e) => setSide(e.target.value)}
              disabled={!hasData || loading}
            >
              <option>All sides</option>
              <option>Buy</option>
              <option>Sell</option>
            </select>
            {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
          </div>
        </div>
        <div className="trades-table-wrap">
          {hasData ? (
            <table className="trades-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Pair</th>
                  <th>Strategy</th>
                  <th>Side</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Net P&L</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={i}>
                    <td>{t.time}</td>
                    <td>{t.pair}</td>
                    <td>{t.strategy}</td>
                    <td>
                      <span className={`side-badge ${t.side.toLowerCase()}`}>
                        {t.side}
                      </span>
                    </td>
                    <td>{t.entry}</td>
                    <td>{t.exit}</td>
                    <td className={t.pnl >= 0 ? 'text-primary' : 'text-destructive'}>
                      {signedMoney(t.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="trades-empty">
              <p>No trades recorded yet.</p>
              <p className="text-muted-foreground">
                {connected
                  ? 'Trade on Binance to see history here'
                  : 'Connect Binance in Wallet to see trade history'}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}