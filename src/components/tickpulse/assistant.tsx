import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useTrading } from '@/lib/tickpulse-store';

type Msg = { role: 'user' | 'assistant'; content: string };
const KEY = 'tickpulse-assistant-conversation';

export function AssistantButton() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const { bots, account, settings } = useTrading();

  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) setMsgs(JSON.parse(s) as Msg[]); } catch { /* ignore */ } }, []);
  useEffect(() => { if (!busy) localStorage.setItem(KEY, JSON.stringify(msgs)); end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs([...next, { role: 'assistant', content: '' }]); setInput(''); setBusy(true);
    const context = `Account ${account}. Drawdown limits daily ${settings.dailyDrawdown}%, account ${settings.accountDrawdown}%. Bots: ${bots.map(b => `${b.pair} ${b.strategy} ${b.risk} ${b.active ? 'running' : 'stopped'} P&L ${b.pnl}`).join('; ')}`;
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: next, context }) });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = '';
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); setMsgs([...next, { role: 'assistant', content: acc }]); }
      if (!acc) setMsgs([...next, { role: 'assistant', content: '[No reply received.]' }]);
    } catch { setMsgs([...next, { role: 'assistant', content: '[The assistant could not reply. Please try again.]' }]); }
    setBusy(false);
  }

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><Button variant="outline"><MessageSquare />Bot AI Assistant</Button></SheetTrigger>
    <SheetContent className="flex w-full flex-col gap-3 sm:max-w-md">
      <SheetHeader><SheetTitle>Bot AI Assistant</SheetTitle><SheetDescription>Strategy help for your demo bots. Saved on this device. Not financial advice.</SheetDescription></SheetHeader>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">Ask about strategies, risk presets, or how your demo bots are doing.</p>}
        {msgs.map((m, i) => <div key={i} className={`whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${m.role === 'user' ? 'ml-8 bg-secondary text-secondary-foreground' : 'mr-8 border border-border bg-card text-card-foreground'}`}>{m.content || (busy ? 'Thinking…' : '')}</div>)}
        <div ref={end} />
      </div>
      <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); void send(); }}>
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Ask the assistant…" rows={3} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} />
        <div className="flex justify-between"><Button type="button" variant="ghost" size="sm" disabled={busy || !msgs.length} onClick={() => { setMsgs([]); localStorage.removeItem(KEY); }}><Trash2 />Clear</Button><Button type="submit" size="sm" disabled={busy || !input.trim()}><Send />Send</Button></div>
      </form>
    </SheetContent>
  </Sheet>;
}
