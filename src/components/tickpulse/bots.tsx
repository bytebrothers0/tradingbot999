import { useState, useEffect } from 'react';
import { Crosshair, ChevronDown, Play, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTrading, riskRates, type Risk, type Strategy } from '@/lib/tickpulse-store';
import { TradingChart } from './chart';
import { PageHeading, AssistantPending } from './shell';
import { useBinance } from '@/lib/binance-client';

const binancePairs = [
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', group: 'crypto', display: '₿' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT', group: 'ethereum', display: 'Ξ' },
  { symbol: 'BNBUSDT', name: 'BNB / USDT', group: 'crypto', display: 'BNB' },
  { symbol: 'SOLUSDT', name: 'Solana / USDT', group: 'crypto', display: 'SOL' },
  { symbol: 'XRPUSDT', name: 'XRP / USDT', group: 'crypto', display: 'XRP' },
  { symbol: 'ADAUSDT', name: 'Cardano / USDT', group: 'crypto', display: 'ADA' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin / USDT', group: 'crypto', display: 'DOGE' },
  { symbol: 'AVAXUSDT', name: 'Avalanche / USDT', group: 'crypto', display: 'AVAX' },
  { symbol: 'LINKUSDT', name: 'Chainlink / USDT', group: 'crypto', display: 'LINK' },
  { symbol: 'MATICUSDT', name: 'Polygon / USDT', group: 'crypto', display: 'MATIC' },
];

const intervalMap: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
};

export function Bots() {
  const { launchBot, account } = useTrading();
  const { getKlines, useTestnet } = useBinance();
  const [pair, setPair] = useState('BTCUSDT');
  const [target, setTarget] = useState(account);
  const [strategy, setStrategy] = useState<Strategy>('AI Auto');
  const [timeframe, setTimeframe] = useState('5m');
  const [risk, setRisk] = useState<Risk>('Optimal');
  const [amount, setAmount] = useState('5000');
  const [sl, setSl] = useState('2');
  const [tp, setTp] = useState('4');
  const [error, setError] = useState('');
  const [klines, setKlines] = useState<any[]>([]);
  const [loadingKlines, setLoadingKlines] = useState(false);

  const pairInfo = binancePairs.find((p) => p.symbol === pair) ?? binancePairs[0];

  // Fetch klines when pair or timeframe changes
  useEffect(() => {
    const fetchKlinesData = async () => {
      setLoadingKlines(true);
      try {
        const interval = intervalMap[timeframe] || '5m';
        const data = await getKlines(pair, interval, 200);
        setKlines(data);
      } catch (e) {
        console.error('Failed to fetch klines:', e);
        setKlines([]);
      } finally {
        setLoadingKlines(false);
      }
    };
    fetchKlinesData();
  }, [pair, timeframe, getKlines]);

  return (
    <>
      <PageHeading
        title="Bot builder"
        subtitle="Build your edge. Let your strategy do the work."
      >
        <AssistantPending />
      </PageHeading>
      <div className="builder-layout">
        <section className="builder-market">
          <div className="market-toolbar">
            <div className={`asset-symbol asset-${pairInfo.group}`}>
              {pairInfo.display}
            </div>
            <div>
              <h2>{pair.replace('USDT', '/USDT')}</h2>
              <span className="text-muted-foreground">{pairInfo.name}</span>
            </div>
            <div className="market-price">
              {klines.length > 0 ? (
                <>
                  <strong>${parseFloat(klines[klines.length - 1].close).toLocaleString()}</strong>
                  <span className="text-primary">Live from Binance</span>
                </>
              ) : (
                <>
                  <strong>—</strong>
                  <span className="text-muted-foreground">
                    {loadingKlines ? 'Loading…' : 'Connect Binance for live price'}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="candle-toolbar">
            <div className="segment-control">
              {['1m', '5m', '15m', '1H'].map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={timeframe === t ? 'secondary' : 'ghost'}
                  onClick={() => setTimeframe(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
            <span>
              <Crosshair size={14} />OHLC
            </span>
          </div>
          <TradingChart candle pair={pair} period={timeframe} klines={klines} />
          <div className="market-chart-footer">
            <span>
              <span className="status-dot" />
              {klines.length > 0 ? 'Live Binance data' : 'Simulated candles'}
            </span>
            <span>TradingView Lightweight Charts</span>
          </div>
        </section>
        <form
          className="strategy-panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (!(Number(amount) > 0) || !(Number(sl) > 0) || !(Number(tp) > 0)) {
              setError('Enter a positive investment, stop loss, and take profit.');
              return;
            }
            setError('');
            launchBot({ pair, strategy, risk, amount: Number(amount), timeframe });
            toast.success(`${pair} bot launched`, {
              description: `${strategy} · ${risk} · ${target}. No real order was placed.`,
            });
          }}
        >
          <div className="strategy-title">
            <h2>Configure strategy</h2>
          </div>
          <div className="strategy-body">
            <label className="field-label">
              Asset pair
              <div className="select-wrap">
                <select value={pair} onChange={(e) => setPair(e.target.value)}>
                  {binancePairs.map((b) => (
                    <option key={b.symbol} value={b.symbol}>
                      {b.symbol.replace('USDT', '/USDT')}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>
            <label className="field-label">
              Target account
              <div className="select-wrap">
                <select
                  value={target ?? ''}
                  onChange={(e) => setTarget(e.target.value || null)}
                  disabled={!account}
                >
                  <option value="">Select account</option>
                  {account && <option value={account}>{account}</option>}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>
            <fieldset>
              <legend className="field-label">Strategy</legend>
              <div className="strategy-options">
                {(['AI Auto', 'AI Grid', 'AI DCA', 'AI Scalper'] as Strategy[]).map(
                  (s) => (
                    <Button
                      type="button"
                      variant={strategy === s ? 'selected' : 'outline'}
                      key={s}
                      onClick={() => setStrategy(s)}
                      aria-pressed={strategy === s}
                    >
                      {s}
                    </Button>
                  )
                )}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">Timeframe</legend>
              <div className="segment-control full-width">
                {['1m', '5m', '15m', '1H'].map((t) => (
                  <Button
                    type="button"
                    size="sm"
                    key={t}
                    variant={timeframe === t ? 'secondary' : 'ghost'}
                    onClick={() => setTimeframe(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">Risk preset</legend>
              <div className="risk-options">
                {(Object.keys(riskRates) as Risk[]).map((r) => (
                  <Button
                    type="button"
                    size="sm"
                    key={r}
                    variant={risk === r ? 'selected' : 'ghost'}
                    onClick={() => setRisk(r)}
                    aria-pressed={risk === r}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </fieldset>
            <label className="field-label">
              Investment (USDT)
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 5000"
                min="1"
                step="100"
              />
            </label>
            <div className="sl-tp-row">
              <label className="field-label">
                Stop Loss (%)
                <Input
                  type="number"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  placeholder="2"
                  min="0.1"
                  step="0.1"
                />
              </label>
              <label className="field-label">
                Take Profit (%)
                <Input
                  type="number"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  placeholder="4"
                  min="0.1"
                  step="0.1"
                />
              </label>
            </div>
            {error && <p className="text-destructive">{error}</p>}
            <Button className="launch-button" type="submit">
              <Play />Launch bot
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}