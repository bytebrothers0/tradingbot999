"""TickPulse MT5 Bridge - runs on the trader's Windows PC next to MetaTrader 5.

Listens only on 127.0.0.1. The TickPulse app must send the pairing code shown
in this window. Live (real-money) orders are refused unless --allow-live is set.
Run with --mock to test without MT5 (any OS).
"""
import argparse, json, secrets, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERSION = "1.0.0"
ALLOWED_ORIGINS = {"https://tickpulse0.lovable.app", "https://id-preview--a350a039-8ca5-45ea-898a-0257428c421d.lovable.app", "http://localhost:8080"}
SYMBOLS = {"EUR/USD": "EURUSD", "GBP/USD": "GBPUSD", "XAU/USD": "XAUUSD", "XAG/USD": "XAGUSD", "BTC/USD": "BTCUSD", "ETH/USD": "ETHUSD", "US30": "US30", "USTEC": "USTEC"}


class MockMT5:
    def __init__(self):
        self.positions = []
    def account(self):
        return {"login": 10012345, "server": "Exness-MT5Trial", "name": "Mock Trader", "currency": "USD", "balance": 10000.0, "equity": 10000.0 + sum(p["profit"] for p in self.positions), "leverage": 200, "demo": True}
    def order(self, symbol, side, volume):
        p = {"ticket": 1000 + len(self.positions), "symbol": symbol, "side": side, "volume": volume, "price": 1.0, "profit": 0.0}
        self.positions.append(p); return p
    def list_positions(self):
        return self.positions
    def close_all(self):
        n = len(self.positions); self.positions = []; return n


class RealMT5:
    def __init__(self, path=None):
        import MetaTrader5 as mt5  # Windows only
        self.mt5 = mt5
        ok = mt5.initialize(path) if path else mt5.initialize()
        if not ok:
            raise RuntimeError(f"Could not reach MetaTrader 5: {mt5.last_error()}. Open MT5 and sign in to your Exness account first.")
    def account(self):
        a = self.mt5.account_info()
        if a is None:
            raise RuntimeError("MT5 is open but not signed in to an account.")
        return {"login": a.login, "server": a.server, "name": a.name, "currency": a.currency, "balance": a.balance, "equity": a.equity, "leverage": a.leverage, "demo": a.trade_mode == self.mt5.ACCOUNT_TRADE_MODE_DEMO}
    def order(self, symbol, side, volume):
        m = self.mt5
        if not m.symbol_select(symbol, True):
            raise RuntimeError(f"Symbol {symbol} not available on this account.")
        tick = m.symbol_info_tick(symbol)
        buy = side == "buy"
        req = {"action": m.TRADE_ACTION_DEAL, "symbol": symbol, "volume": float(volume), "type": m.ORDER_TYPE_BUY if buy else m.ORDER_TYPE_SELL, "price": tick.ask if buy else tick.bid, "deviation": 20, "magic": 770077, "comment": "TickPulse", "type_time": m.ORDER_TIME_GTC, "type_filling": m.ORDER_FILLING_IOC}
        r = m.order_send(req)
        if r is None or r.retcode != m.TRADE_RETCODE_DONE:
            raise RuntimeError(f"Order rejected: {getattr(r, 'comment', m.last_error())}")
        return {"ticket": r.order, "symbol": symbol, "side": side, "volume": r.volume, "price": r.price, "profit": 0.0}
    def list_positions(self):
        ps = self.mt5.positions_get() or []
        return [{"ticket": p.ticket, "symbol": p.symbol, "side": "buy" if p.type == 0 else "sell", "volume": p.volume, "price": p.price_open, "profit": p.profit} for p in ps if p.magic == 770077]
    def close_all(self):
        m = self.mt5; n = 0
        for p in self.mt5.positions_get() or []:
            if p.magic != 770077: continue
            tick = m.symbol_info_tick(p.symbol)
            sell = p.type == 0
            r = m.order_send({"action": m.TRADE_ACTION_DEAL, "position": p.ticket, "symbol": p.symbol, "volume": p.volume, "type": m.ORDER_TYPE_SELL if sell else m.ORDER_TYPE_BUY, "price": tick.bid if sell else tick.ask, "deviation": 20, "magic": 770077, "comment": "TickPulse stop", "type_filling": m.ORDER_FILLING_IOC})
            if r and r.retcode == m.TRADE_RETCODE_DONE: n += 1
        return n


def make_handler(mt5, code, allow_live, max_volume):
    class H(BaseHTTPRequestHandler):
        def log_message(self, fmt, *a):
            sys.stdout.write("[bridge] " + fmt % a + "\n")
        def cors(self):
            origin = self.headers.get("Origin", "")
            if origin in ALLOWED_ORIGINS:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Pairing-Code")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Private-Network", "true")
        def reply(self, status, body):
            data = json.dumps(body).encode()
            self.send_response(status); self.cors()
            self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data)))
            self.end_headers(); self.wfile.write(data)
        def do_OPTIONS(self):
            self.send_response(204); self.cors(); self.end_headers()
        def guard(self):
            origin = self.headers.get("Origin")
            if origin and origin not in ALLOWED_ORIGINS:
                self.reply(403, {"error": "Origin not allowed"}); return False
            if self.path != "/status" and not secrets.compare_digest(self.headers.get("X-Pairing-Code", ""), code):
                self.reply(401, {"error": "Wrong pairing code"}); return False
            return True
        def do_GET(self):
            if not self.guard(): return
            try:
                if self.path == "/status": return self.reply(200, {"app": "tickpulse-bridge", "version": VERSION, "mock": isinstance(mt5, MockMT5)})
                if self.path == "/account": return self.reply(200, mt5.account())
                if self.path == "/positions": return self.reply(200, {"positions": mt5.list_positions()})
                self.reply(404, {"error": "Not found"})
            except Exception as e:
                self.reply(502, {"error": str(e)})
        def do_POST(self):
            if not self.guard(): return
            try:
                body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
                if self.path == "/order":
                    acct = mt5.account()
                    if not acct["demo"] and not allow_live:
                        return self.reply(403, {"error": "Live account detected. Start the bridge with --allow-live to permit real-money orders."})
                    side = body.get("side"); volume = float(body.get("volume", 0))
                    symbol = SYMBOLS.get(body.get("pair"), body.get("pair"))
                    if side not in ("buy", "sell") or not (0 < volume <= max_volume):
                        return self.reply(400, {"error": f"Side must be buy/sell and volume between 0 and {max_volume} lots."})
                    return self.reply(200, mt5.order(symbol, side, volume))
                if self.path == "/close-all": return self.reply(200, {"closed": mt5.close_all()})
                self.reply(404, {"error": "Not found"})
            except Exception as e:
                self.reply(502, {"error": str(e)})
    return H


def main():
    ap = argparse.ArgumentParser(description="TickPulse MT5 Bridge")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--mock", action="store_true", help="Simulate MT5 (for testing)")
    ap.add_argument("--mt5-path", help="Path to terminal64.exe if MT5 is not found automatically")
    ap.add_argument("--allow-live", action="store_true", help="Permit orders on real-money accounts")
    ap.add_argument("--max-volume", type=float, default=1.0, help="Largest lot size per order")
    ap.add_argument("--code", help="Fixed pairing code (default: random each start)")
    a = ap.parse_args()
    try:
        mt5 = MockMT5() if a.mock else RealMT5(a.mt5_path)
    except Exception as e:
        print(f"ERROR: {e}"); input("Press Enter to close...") if sys.stdin.isatty() else None; sys.exit(1)
    code = a.code or f"{secrets.randbelow(1000000):06d}"
    print("=" * 46)
    print(" TickPulse MT5 Bridge", VERSION, "(MOCK)" if a.mock else "")
    print(f" Listening on http://127.0.0.1:{a.port}")
    print(f" PAIRING CODE:  {code}")
    print(" Live orders:", "ALLOWED" if a.allow_live else "blocked (demo accounts only)")
    print(" Keep this window open while TickPulse trades.")
    print("=" * 46, flush=True)
    ThreadingHTTPServer(("127.0.0.1", a.port), make_handler(mt5, code, a.allow_live, a.max_volume)).serve_forever()


if __name__ == "__main__":
    main()
