import { useEffect, useRef } from 'react';
import { AreaSeries, CandlestickSeries, ColorType, createChart, type UTCTimestamp } from 'lightweight-charts';

export function TradingChart({ candle = false, period = '1D', pair = 'XAU/USD' }: { candle?: boolean; period?: string; pair?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const css = getComputedStyle(element);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const primary = color('--chart-profit');
    const chart = createChart(element, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: color('--chart-surface') }, textColor: color('--chart-text'), fontFamily: '"DM Sans", sans-serif', fontSize: 11, attributionLogo: false },
      grid: { vertLines: { visible: candle, color: color('--chart-grid') }, horzLines: { color: color('--chart-grid') } },
      rightPriceScale: { borderVisible: false, visible: true },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { vertLine: { color: color('--chart-text'), labelBackgroundColor: color('--chart-grid') }, horzLine: { color: color('--chart-text'), labelBackgroundColor: color('--chart-grid') } },
      handleScroll: candle, handleScale: candle,
    });
    const offset = period === '1W' ? 700 : period === '1M' ? 1300 : period === 'ALL' ? 2100 : 0;
    const base = pair === 'BTC/USD' ? 96420 : pair === 'EUR/USD' ? 1.085 : pair === 'GBP/USD' ? 1.265 : pair === 'ETH/USD' ? 3340 : pair === 'XAG/USD' ? 30.5 : pair === 'US30' ? 43840 : pair === 'USTEC' ? 20780 : 2642;
    if (candle) {
      const series = chart.addSeries(CandlestickSeries, { upColor: primary, downColor: color('--chart-loss'), borderVisible: false, wickUpColor: primary, wickDownColor: color('--chart-loss') });
      let last = base * 0.996;
      series.setData(Array.from({ length: 75 }, (_, i) => {
        const open = last;
        const close = open + (Math.sin(i * 1.8) * 0.0007 + 0.00009) * base;
        last = close;
        return { time: (1795431600 + i * 300) as UTCTimestamp, open, close, high: Math.max(open, close) + base * (0.00015 + Math.abs(Math.cos(i)) * 0.0004), low: Math.min(open, close) - base * (0.00015 + Math.abs(Math.sin(i)) * 0.0004) };
      }));
    } else {
      const series = chart.addSeries(AreaSeries, { lineColor: primary, topColor: color('--chart-fill'), bottomColor: color('--chart-fill-end'), lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 4 });
      series.setData(Array.from({ length: 100 }, (_, i) => ({ time: (1795392000 + i * 864) as UTCTimestamp, value: 24120 - offset + i * (7.1 + offset / 100) + Math.sin(i / 4.4) * 54 + Math.sin(i / 10) * 43 })));
    }
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candle, period, pair]);
  return <div ref={ref} className={candle ? 'price-chart' : 'equity-chart'} aria-label={candle ? `${pair} demonstration candlestick chart` : `${period} demonstration equity chart`} />;
}
