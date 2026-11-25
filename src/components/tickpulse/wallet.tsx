import { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, LockKeyhole, ExternalLink, Wallet as WalletIcon, ShieldCheck, Unplug, ArrowUpRight, Eye, EyeOff, AlertCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTrading, money } from '@/lib/tickpulse-store';
import { useBinance } from '@/lib/binance-client';
import { Input } from '@/components/ui/input';
import { Download, Plug } from 'lucide-react';
import { PageHeading, Logo, AssistantPending } from './shell';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function Wallet() {
  const { account: tradingAccount, setAccount } = useTrading();
  const { apiKey, apiSecret, useTestnet, account, error, busy, corsWarning, connect, disconnect, setCredentials, refreshAccount } = useBinance();
  const [showSecret, setShowSecret] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const connected = !!account;

  const handleConnect = async () => {
    try {
      await connect();
      toast.success(useTestnet ? 'Connected to Binance Testnet' : 'Connected to Binance Live');
    } catch {
      // error shown via toast in connect
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setAccount(null);
    toast.info('Disconnected from Binance');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAccount();
      toast.success('Account refreshed');
    } catch {
      // error shown via toast
    } finally {
      setRefreshing(false);
    }
  };

  const usdtBalance = account ? getUSDTDisplay(account) : null;
  const isCORSError = corsWarning || (error && (error.includes('CORS') || error.includes('Failed to fetch') || error.includes('NetworkError')));

  return (
    <>
      <PageHeading
        title="Wallet & accounts"
        subtitle="Your capital, connected to your command center."
      >
        <AssistantPending />
        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <Switch
              checked={!useTestnet}
              onCheckedChange={(checked) => setCredentials(apiKey, apiSecret, !checked)}
              disabled={busy || connected}
              aria-label="Live mode"
            />
            <span>{useTestnet ? 'Testnet' : 'Live'}</span>
          </Label>
        </div>
      </PageHeading>

      <div className="wallet-summary">
        <WalletIcon size={21} />
        <div>
          <span className="metric-label">Portfolio value</span>
          <strong>{usdtBalance ? money(usdtBalance) : '—'}</strong>
        </div>
        <span className="small-tag">
          {connected ? (useTestnet ? 'TESTNET' : 'LIVE') : 'NOT CONNECTED'}
        </span>
        <span className="wallet-summary-note">
          <ShieldCheck size={15} />
          {connected ? 'API keys stored locally in browser' : 'Connect Binance to view live balance'}
        </span>
      </div>

      {isCORSError && (
        <section className="cors-warning">
          <div className="cors-banner">
            <WifiOff size={20} />
            <div>
              <strong>CORS Blocked</strong>
              <p>Binance API doesn't allow direct browser requests from localhost.</p>
            </div>
          </div>
          <div className="cors-solutions">
            <h4>Quick fixes (pick one):</h4>
            <div className="solution-grid">
              <div className="solution-card">
                <AlertCircle size={18} className="text-amber-500" />
                <strong>Browser Extension (easiest)</strong>
                <ul>
                  <li>Install <a href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf" target="_blank" rel="noopener">Allow CORS: Access-Control-Allow-Origin</a> (Chrome/Edge)</li>
                  <li>Or <a href="https://addons.mozilla.org/en-US/firefox/addon/cors-everywhere/" target="_blank" rel="noopener">CORS Everywhere</a> (Firefox)</li>
                  <li>Enable it, reload this page, click Connect again</li>
                </ul>
              </div>
              <div className="solution-card">
                <AlertCircle size={18} className="text-blue-500" />
                <strong>Local Proxy (reliable)</strong>
                <ul>
                  <li>Run: <code>npx cors-anywhere</code> in a terminal</li>
                  <li>Or use a local proxy tool</li>
                </ul>
              </div>
              <div className="solution-card">
                <AlertCircle size={18} className="text-green-500" />
                <strong>Deploy to Vercel/Netlify</strong>
                <ul>
                  <li>Your domain won't be blocked by Binance</li>
                  <li>CORS works automatically on deployed domains</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="desktop-connection">
        <div className="connection-icon">
          {connected ? <Plug size={23} /> : <Unplug size={23} />}
        </div>
        <div>
          {connected ? (
            <>
              <h3>Binance {useTestnet ? 'Testnet' : 'Live'} connected</h3>
              <p>Account type: {account?.accountType ?? 'Spot'} · Can trade: {account?.canTrade ? 'Yes' : 'No'}</p>
            </>
          ) : (
            <>
              <h3>Connect Binance</h3>
              <p>
                Create an API Key on Binance (Spot trading, no withdrawals). Keys are stored
                locally in your browser and never leave this device.
              </p>
              {error && !isCORSError && <p className="text-destructive">{error}</p>}
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RotateCw className={refreshing ? 'animate-spin' : ''} size={14} /> Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder="Binance API Key"
                    value={apiKey}
                    onChange={(e) => setCredentials(e.target.value, apiSecret, useTestnet)}
                    disabled={busy || connected}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <div className="relative">
                    <Input
                      id="apiSecret"
                      type={showSecret ? 'text' : 'password'}
                      placeholder="Binance API Secret"
                      value={apiSecret}
                      onChange={(e) => setCredentials(apiKey, e.target.value, useTestnet)}
                      disabled={busy || connected}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-[38px]"
                      onClick={() => setShowSecret(!showSecret)}
                      disabled={busy || connected}
                    >
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={busy || connected || !apiKey || !apiSecret} onClick={handleConnect}>
                {busy ? 'Connecting…' : 'Connect Binance'}
              </Button>
              <Button variant="outline" asChild>
                <a
                  href="https://www.binance.com/en/my/settings/api-management"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get API Key <ExternalLink />
                </a>
              </Button>
            </>
          )}
        </div>
      </section>

      {connected && account && (
        <section className="balances-table">
          <h3>Non-zero balances</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Available</th>
                  <th>Locked</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {getNonZeroBalances(account).map((b) => (
                  <tr key={b.asset}>
                    <td><strong>{b.asset}</strong></td>
                    <td>{parseFloat(b.free).toFixed(8)}</td>
                    <td>{parseFloat(b.locked).toFixed(8)}</td>
                    <td>{formatBalance(b.free, b.locked).toFixed(8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function getUSDTDisplay(account: any): number {
  const usdt = account.balances.find((b: any) => b.asset === 'USDT');
  return usdt ? parseFloat(usdt.free) + parseFloat(usdt.locked) : 0;
}

function getNonZeroBalances(account: any) {
  return account.balances.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
}

function formatBalance(free: string, locked: string): number {
  return parseFloat(free) + parseFloat(locked);
}