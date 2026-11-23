export const trades = [
  { time: '14:42:08', account: 'Standard', pair: 'EUR/USD', strategy: 'AI DCA', side: 'Buy', entry: '1.08462', exit: '1.08618', pnl: 124.85 },
  { time: '14:38:52', account: 'Standard', pair: 'XAU/USD', strategy: 'AI Grid', side: 'Buy', entry: '2,638.42', exit: '2,642.80', pnl: 224.34 },
  { time: '14:31:16', account: 'Cent', pair: 'BTC/USD', strategy: 'AI Auto', side: 'Buy', entry: '96,102.50', exit: '96,420.00', pnl: 186.2 },
  { time: '14:25:43', account: 'Standard', pair: 'GBP/USD', strategy: 'AI Scalper', side: 'Sell', entry: '1.26418', exit: '1.26502', pnl: -32.18 },
  { time: '14:18:09', account: 'Standard', pair: 'US30', strategy: 'AI Grid', side: 'Buy', entry: '43,782.00', exit: '43,840.50', pnl: 87.42 },
  { time: '14:12:37', account: 'Cent', pair: 'ETH/USD', strategy: 'AI Auto', side: 'Sell', entry: '3,348.20', exit: '3,340.10', pnl: 41.27 },
  { time: '14:06:21', account: 'Standard', pair: 'XAG/USD', strategy: 'AI DCA', side: 'Buy', entry: '30.248', exit: '30.534', pnl: 28.6 },
  { time: '13:54:02', account: 'Standard', pair: 'USTEC', strategy: 'AI Scalper', side: 'Sell', entry: '20,762.50', exit: '20,780.50', pnl: -18 },
];
export const performance = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month,i) => ({ month, profit: [330,860,1280,720,1150,940,1430,1000,1390,1290,1540,1320][i] ?? 0, loss: [80,270,640,190,510,390,590,460,330,540,620,750][i] ?? 0, equity: [300,660,900,870,850,1390,560,890,1200,1380,1510,1620][i] ?? 0 }));
