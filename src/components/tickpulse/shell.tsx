import { Link, useLocation } from '@tanstack/react-router';
import { Activity, LayoutGrid, Bot, ChartNoAxesCombined, Wallet, Settings, ChevronDown, ShieldCheck, CircleStop, ArrowUpRight, Unplug, Plug } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTrading } from '@/lib/tickpulse-store';
import { useBinance } from '@/lib/binance-client';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/bots', label: 'Bots', icon: Bot },
  { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <svg viewBox="0 0 44 36" className="brand-mark" role="img" aria-label="TickPulse monogram">
        <path
          d="M4 8h27l-5 5H16L7 28H1L13 8M24 8h17L27 22l12 6h-9l-8-4-5 4h-8L29 10"
          fill="currentColor"
        />
      </svg>
      {!compact && <span>Tick<span className="text-gold">Pulse</span></span>}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useLocation({ select: (s) => s.pathname });
  const { account, setAccount, bots, stopAll, stopped } = useTrading();
  const [liveModal, setLiveModal] = useState(false);
  const binance = useBinance((st) => st.account);
  const useTestnet = useBinance((st) => st.useTestnet);
  const active = bots.filter((b) => b.active).length;

  return (
    <div className="app-shell">
      <aside className="navigation">
        <Link to="/" className="nav-brand" aria-label="TickPulse dashboard">
          <Logo compact />
        </Link>
        <nav>
          {navigation.map((item) => (
            <Button variant="ghost" asChild key={item.to}>
              <Link
                to={item.to}
                className={`nav-item ${path === item.to ? 'is-active' : ''}`}
              >
                <item.icon size={22} strokeWidth={1.7} />
                <span>{item.label}</span>
              </Link>
            </Button>
          ))}
        </nav>
        <div className="nav-bottom">
          <ShieldCheck size={20} />
          <span>Personal workspace</span>
          <div className="nav-version">v1.0</div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="global-header">
          <div className="connection-group">
            <span className="connection-pill">
              <span className="status-dot" />
              {binance ? (
                <>
                  Binance {useTestnet ? 'Testnet' : 'Live'}{' '}
                  <span className="small-tag">
                    {binance.accountType ?? 'Spot'}
                  </span>
                </>
              ) : (
                <span className="connection-label">Binance not connected</span>
              )}
            </span>
          </div>
          <div className="header-actions">
            <div className="mode-switch">
              <span className="text-foreground">Testnet</span>
              <Switch
                checked={!useTestnet}
                onCheckedChange={() => setLiveModal(true)}
                aria-label="Enable live trading"
              />
              <span>Live</span>
            </div>
            <Button
              variant="destructive"
              className="stop-button"
              onClick={() => {
                stopAll();
                toast.success('All bots stopped. No real positions were changed.');
              }}
            >
              <CircleStop size={17} />STOP ALL BOTS
            </Button>
          </div>
        </header>
        <div className="workspace">{children}</div>
        <footer className="status-bar">
          <span>
            <span className={`status-dot ${stopped ? 'is-stopped' : ''}`} />
            {stopped ? 'All bots stopped' : `${active} bots running`}
            <span className="footer-separator">/</span>
            <span>Simulated market data</span>
          </span>
          <span>
            <Activity size={12} />
            {binance ? `Binance connected (${binance.accountType})` : 'Binance not connected'}
          </span>
        </footer>
      </div>
      <Dialog open={liveModal} onOpenChange={setLiveModal}>
        <DialogContent>
          <div className="dialog-symbol">
            <Plug />
          </div>
          <DialogHeader>
            <DialogTitle>Connect Binance before going live</DialogTitle>
            <DialogDescription>
              TickPulse is currently in testnet mode. Live trading requires a Binance
              API key with Spot trading enabled (no withdrawals). Your keys are stored
              locally in your browser and never leave this device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button asChild onClick={() => setLiveModal(false)}>
              <Link to="/wallet">
                Connect Binance on Wallet <ArrowUpRight />
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setLiveModal(false)}>
              Continue in testnet mode
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-line" />TICKPULSE TERMINAL
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}

export { AssistantButton as AssistantPending } from './assistant';