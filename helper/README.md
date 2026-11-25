# TickPulse MT5 Bridge (Windows)

1. Install MetaTrader 5 and sign in to your Exness account (start with a demo account).
2. In MT5: Tools > Options > Expert Advisors > tick "Allow algorithmic trading".
3. Install Python 3.11+ from python.org (tick "Add Python to PATH").
4. Double-click `start-bridge.bat`. Note the 6-digit PAIRING CODE it shows.
5. In TickPulse open Wallet > Connect MT5, enter the code. Your account number and balance appear.
6. Click "Test trade" (demo accounts only) and confirm a 0.01 lot EURUSD trade appears in MT5.

Real-money orders are blocked unless you start with: `start-bridge.bat --allow-live`.
Testing without MT5: `python tickpulse_bridge.py --mock`.
The bridge only listens on 127.0.0.1 and only accepts the TickPulse website.
